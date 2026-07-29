# Chatbot Gemini setup

Chatbot dùng Google AI Studio / Gemini cho câu hỏi thường và vẫn giữ socket handoff sang tư vấn viên/bác sĩ khi user cần người thật.

## Env

Thêm vào `backend/.env`:

```env
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-2.5-flash-lite
```

Lấy key tại Google AI Studio API Keys: https://aistudio.google.com/app/apikey

## Knowledge / prompt

File chính để dạy bot về hệ thống:

```text
src/modules/chatbot/maternity-care-knowledge.md
```

Muốn bot biết thêm gói thai sản, cơ sở, dịch vụ, FAQ... thì cập nhật vào file markdown này. Nên ghi ngắn gọn theo cấu trúc:

```md
## Cơ sở

- MCS Hà Nội: địa chỉ..., hotline..., dịch vụ nổi bật...
- MCS TP.HCM: địa chỉ..., hotline..., dịch vụ nổi bật...

## Gói thai sản

- Gói A: giá..., phù hợp..., bao gồm...
- Gói B: giá..., phù hợp..., bao gồm...

## FAQ

- Hỏi: ...
  Đáp: ...
```

Nếu `GEMINI_API_KEY` chưa có hoặc Gemini lỗi/quá quota, chatbot tự fallback về rule local để app vẫn chạy.
