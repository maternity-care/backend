# Hướng dẫn Setup CI/CD

Tài liệu hướng dẫn setup CI/CD từ đầu cho backend Maternity Care.

## Tổng quan flow

```
Push code lên main
       ↓
GitHub Actions: npm ci → build → docker build → push lên ghcr.io
       ↓
SSH vào VPS → docker compose pull → docker compose up -d
       ↓
App chạy tại http://VPS_IP:84
```

Build trên GitHub runner (nhanh, không tốn tài nguyên VPS), VPS chỉ pull image.

---

## Bước 1: Setup VPS (chỉ làm 1 lần)

SSH vào VPS rồi chạy các lệnh sau:

### 1.1. Cài Docker + Docker Compose

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Logout và login lại để apply group
```

### 1.2. Tạo network external

```bash
docker network create maternity_care_system_g44
```

### 1.3. Tạo thư mục deploy và file .env

```bash
sudo mkdir -p /opt/maternity/backend
sudo chown $USER:$USER /opt/maternity/backend
cd /opt/maternity/backend
nano .env
```

Copy nội dung từ `.env.example` và sửa giá trị production:

```env
APP_NAME=Maternity Care API
NODE_ENV=production
PORT=84
CORS_ORIGINS=https://your-domain.com

JWT_SECRET=<random_string_dài_64_ký_tự>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

DB_HOST=maternity-mariadb
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=<mật_khẩu_DB>
DB_DATABASE=maternity_care

REDIS_HOST=maternity-redis
REDIS_PORT=6379
REDIS_PASSWORD=<mật_khẩu_Redis>

BCRYPT_SALT_ROUNDS=10
```

---

## Bước 2: Tạo SSH key cho GitHub Actions

Trên **máy local**:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/gh_deploy_key
# Bấm Enter 2 lần (không đặt passphrase)
```

Sẽ ra 2 file:
- `gh_deploy_key` → private key, paste vào GitHub Secret
- `gh_deploy_key.pub` → public key, paste vào VPS

**Trên VPS**, add public key vào `authorized_keys`:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "<nội_dung_gh_deploy_key.pub>" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Test SSH từ máy local:

```bash
ssh -i ~/.ssh/gh_deploy_key root@VPS_IP
```

---

## Bước 3: Thêm Secrets vào GitHub

Vào repo trên GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret name      | Giá trị                                            |
|------------------|----------------------------------------------------|
| `SERVER_HOST`    | IP VPS (vd `1.2.3.4`)                              |
| `SERVER_USER`    | User SSH (vd `root`)                               |
| `SERVER_SSH_KEY` | Nội dung file `gh_deploy_key` (cả khối BEGIN/END)  |

> Khi paste `SERVER_SSH_KEY`, copy **toàn bộ** nội dung file gồm cả 2 dòng:
> `-----BEGIN OPENSSH PRIVATE KEY-----` và `-----END OPENSSH PRIVATE KEY-----`

---

## Bước 4: Bật permission cho GitHub Actions push GHCR

Vào repo → **Settings** → **Actions** → **General** → **Workflow permissions**:
- Tick **Read and write permissions**
- Save

Nếu không bật, workflow sẽ fail ở bước login GHCR.

---

## Bước 5: Trigger workflow lần đầu

```bash
git add .
git commit -m "ci: setup deploy workflow"
git push origin main
```

Vào tab **Actions** trên GitHub để xem progress.

**Lần đầu sẽ fail ở job `deploy`** vì image trên GHCR đang Private — VPS không pull được. Sang **Bước 6** để fix.

---

## Bước 6: Set GHCR package = Public

Sau khi job `build` chạy xong lần đầu, image đã có trên GHCR. Cần set Public:

1. Vào `https://github.com/orgs/maternity-care/packages` (hoặc `https://github.com/users/<user>/packages` nếu repo cá nhân)
2. Chọn package `backend`
3. **Package settings** → **Change visibility** → **Public**

Sau đó re-run workflow: vào tab **Actions** → workflow run gần nhất → bấm **Re-run failed jobs**.

> Nếu muốn giữ Private, phải `docker login ghcr.io` trên VPS bằng GitHub PAT. Public đơn giản hơn cho dự án nhỏ.

---

## Bước 7: Verify

Sau khi workflow chạy xong, SSH vào VPS:

```bash
docker ps                              # maternity-api phải running
docker logs maternity-api --tail 50    # xem log
curl http://localhost:84/api/docs      # check Swagger
```

Test từ ngoài: `http://VPS_IP:84/api/docs`

---

## Troubleshooting

### Workflow fail ở "Login to GHCR"
- Bước 4 chưa làm. Vào Settings → Actions → General → Workflow permissions → Read and write.

### Workflow fail ở SSH (Permission denied / Connection refused)
- Test SSH bằng key từ máy local: `ssh -i ~/.ssh/gh_deploy_key root@VPS_IP`
- Check VPS firewall mở port 22: `sudo ufw allow 22/tcp`
- Đảm bảo `SERVER_SSH_KEY` paste đủ cả `BEGIN/END PRIVATE KEY`.

### Job deploy fail ở `docker compose pull`: "unauthorized" hoặc "manifest unknown"
- Image GHCR đang Private. Làm **Bước 6** set Public.

### Container không start
```bash
docker logs maternity-api
```
- Thường do `.env` thiếu biến, hoặc DB/Redis chưa có trong network `maternity_care_system_g44`.

### Port 84 không truy cập được từ ngoài
- Firewall VPS: `sudo ufw allow 84/tcp`
- Cloud firewall (AWS Security Group, DigitalOcean Firewall, v.v.)

---

## Manual deploy (không qua CI/CD)

Khi cần redeploy nhanh:

```bash
ssh root@VPS_IP
cd /opt/maternity/backend
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Rollback về SHA cụ thể:

```bash
# Sửa image tag trong docker-compose.prod.yml:
# image: ghcr.io/maternity-care/backend:latest  →  ghcr.io/maternity-care/backend:sha-abc1234
docker compose -f docker-compose.prod.yml up -d
```

Xem các SHA tag đã push: `https://github.com/maternity-care/backend/pkgs/container/backend`
