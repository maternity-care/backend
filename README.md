# Maternity Care API

Backend NestJS production-ready cho he thong phan mem cham soc thai san. Project dung MariaDB/MySQL, TypeORM, JWT Authentication, RBAC Role Permission, BullMQ Redis Queue, Redis cache, Swagger va Docker. App ket noi vao network ha tang san co `maternity_care_system_g44`; khong tao lai MariaDB, Redis hoac MongoDB trong compose app.

## Cong Nghe

- NestJS, TypeScript
- MariaDB 10.11/MySQL, TypeORM
- JWT, Passport, bcrypt
- RBAC roles/permissions
- BullMQ + Redis
- Redis cache cho users
- Upload file len AWS S3 hoac Vietnix S3
- Swagger OpenAPI
- class-validator, class-transformer
- Docker multi-stage build

## Cai Dat Local

```bash
npm install
cp .env.example .env
npm run start:dev
```

## Cau Hinh `.env`

```env
APP_NAME=Maternity Care API
NODE_ENV=development
PORT=84
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
DB_HOST=maternity-mariadb
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=maternity_care
REDIS_HOST=maternity-redis
REDIS_PORT=6379
REDIS_PASSWORD=password
BCRYPT_SALT_ROUNDS=10
STORAGE_DRIVER=s3
S3_BUCKET=maternity-care
S3_REGION=ap-southeast-1
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=false
CDN_BASE_URL=
UPLOAD_MAX_FILE_SIZE_MB=10
UPLOAD_PRESIGN_EXPIRES_IN=300
UPLOAD_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,application/pdf
```

## Migration

Tao migration moi:

```bash
npm run migration:create -- src/database/migrations/CreateSomething
```

Generate migration tu thay doi Entity:

```bash
npm run migration:generate -- src/database/migrations/UpdateSomething
```

Chay cac migration chua chay:

```bash
npm run migration:run
npm run migrate
```

Rollback migration moi nhat da chay:

```bash
npm run migration:revert
npm run migrate:rollback
```

Fresh database, xoa schema roi chay lai migration:

```bash
npm run migration:fresh
npm run migrate:fresh
```

Fresh database va chay seeder, giong Laravel `migrate:fresh --seed`:

```bash
npm run migration:fresh:seed
npm run migrate:fresh:seed
```

Trong Docker:

```bash
docker compose -f docker-compose.app.yml exec app npm run migration:run
docker compose -f docker-compose.app.yml exec app npm run migration:revert
docker compose -f docker-compose.app.yml exec app npm run migration:fresh
docker compose -f docker-compose.app.yml exec app npm run migration:fresh:seed
```

## Seeder

Seeder tao roles, permissions va user mau cho he thong cham soc thai san. Co the chay nhieu lan khong duplicate.

```bash
npm run seed
npm run db:seed
```

Chay seeder chi dinh, giong Laravel `db:seed --class=...`:

```bash
npm run seed -- --class=RolesAndPermissionsSeeder
npm run seed -- --class=UsersSeeder
```

Hoac dung script ngan:

```bash
npm run seed:roles-permissions
npm run seed:users
```

Danh sach seeder hien co:

```text
DatabaseSeeder
RolesAndPermissionsSeeder
UsersSeeder
```

User mau, password chung: `password`

```text
superadmin@example.com  super_admin
admin@example.com       admin
doctor@example.com      doctor
nurse@example.com       nurse
staff@example.com       staff
member@example.com      member
partner@example.com     partner
```

Trong Docker:

```bash
docker compose -f docker-compose.app.yml exec app npm run seed
docker compose -f docker-compose.app.yml exec app npm run seed -- --class=RolesAndPermissionsSeeder
docker compose -f docker-compose.app.yml exec app npm run seed -- --class=UsersSeeder
```

## Docker

Step 1 Build:

```bash
docker compose -f docker-compose.app.yml build
```

Step 2 Run:

```bash
docker compose -f docker-compose.app.yml up -d
```

Lenh khac:

```bash
docker compose -f docker-compose.app.yml logs -f app
docker compose -f docker-compose.app.yml exec app npm run migration:run
docker compose -f docker-compose.app.yml exec app npm run seed
docker compose -f docker-compose.app.yml down
```

## Swagger

Mo Swagger tai:

```text
http://localhost:84/api/docs
```

## Login Mau

```text
superadmin@example.com / password
admin@example.com      / password
doctor@example.com     / password
nurse@example.com      / password
staff@example.com      / password
member@example.com     / password
partner@example.com    / password
```


## Redis Cache

Backend dung Redis cho BullMQ queue va cache. Cac endpoint users cache danh sach/detail trong 300 giay, tu clear cache khi create/update/delete user.

## Upload CDN S3

Ho tro AWS S3 va S3-compatible provider nhu Vietnix S3.

AWS S3:

```env
S3_BUCKET=maternity-care
S3_REGION=ap-southeast-1
S3_ENDPOINT=
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_FORCE_PATH_STYLE=false
CDN_BASE_URL=https://cdn.example.com
```

Vietnix S3:

```env
S3_BUCKET=maternity-care
S3_REGION=us-east-1
S3_ENDPOINT=https://your-vietnix-s3-endpoint
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_FORCE_PATH_STYLE=true
CDN_BASE_URL=https://your-cdn-domain
```

## Troubleshooting

Khong connect duoc DB:

- Kiem tra `.env`: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`.
- Neu chay Docker, `DB_HOST` nen la service name trong network, vi du `maternity-mariadb`.
- Dam bao database `maternity_care` da ton tai trong MariaDB.

Khong connect duoc Redis:

- Kiem tra `.env`: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`.
- Neu chay Docker, `REDIS_HOST` nen la service name trong network, vi du `maternity-redis`.
- Neu Redis khong co password, de `REDIS_PASSWORD=` rong.

Network docker chua ton tai:

```bash
docker network ls
```

Dam bao co network:

```text
maternity_care_system_g44
```

Migration loi:

- Dam bao app container da chay va ket noi duoc MariaDB.
- Kiem tra bang `migrations` va log loi SQL.
- Chay lai:

```bash
docker compose -f docker-compose.app.yml exec app npm run migration:run
```
