# Hue Tourism Guide — Backend MVP

Backend API cho ứng dụng hướng dẫn du lịch Huế, xây dựng bằng Node.js, Express, TypeScript, PostgreSQL và Redis. Hệ thống hỗ trợ dữ liệu điểm tham quan, tuyến tham quan, phiên khách tham quan, gợi ý địa điểm theo vị trí, ghi nhận lượt phát âm thanh, trợ lý AI sử dụng RAG, và chức năng quản trị cho nhân viên.

## Công nghệ

- Node.js, Express 5, TypeScript
- PostgreSQL (`pg`) và Redis (staff session)
- Gemini API cho câu trả lời AI; tùy chọn chế độ `extractive` hoặc OpenAI
- Vitest cho unit/integration tests

## Yêu cầu chạy local

- Node.js và npm tương thích với các dependency của dự án
- PostgreSQL đang hoạt động, database/schema của dự án đã được khởi tạo
- Redis đang hoạt động (mặc định `redis://localhost:6379`)
- API key Gemini nếu muốn dùng AI thật (`CHAT_PROVIDER=gemini`)

## Cài đặt

```powershell
npm ci
Copy-Item .env.example .env
```

Cập nhật `.env` với thông tin PostgreSQL, Redis và `SESSION_SECRET`. Ví dụ phần cấu hình AI:

```dotenv
CHAT_PROVIDER=gemini
EMBEDDING_PROVIDER=dev
GEMINI_CHAT_MODEL=gemini-3.1-flash-lite
GEMINI_API_KEY=your_gemini_api_key_here
```

Các biến trên chỉ là ví dụ: **không đưa key hoặc mật khẩu thật vào Git**. Với `EMBEDDING_PROVIDER=dev`, tài liệu/embedding trong database cần tương thích với provider này.

**Lưu ý database:** Repo cần được áp dụng các migration và seed theo quy trình hiện có của dự án trước khi sử dụng API. `package.json` hiện chưa khai báo script `migrate` hoặc `seed`, vì vậy README không giả định có thể chạy `npm run migrate` / `npm run seed`.

## Chạy và kiểm thử

```powershell
npm.cmd run dev      # Local development: http://localhost:3000
npm.cmd run build    # Kiểm tra TypeScript và tạo dist/
npm.cmd test         # Vitest
npm.cmd start        # Chạy bản build trong dist/
```

Chạy `build` trước `start`. Health endpoints:

- `GET /api/v1/health/live`
- `GET /api/v1/health/ready` — kiểm tra kết nối phụ thuộc

## Các nhóm API chính

| Nhóm | Endpoint | Mục đích |
| --- | --- | --- |
| Public | `GET /api/v1/attractions` | Danh sách điểm tham quan được công bố |
| Public | `GET /api/v1/routes` | Danh sách tuyến tham quan được công bố |
| Visitor | `POST /api/v1/visitor-sessions` | Tạo phiên khách tham quan |
| Visitor | `/api/v1/audio-plays` | Ghi nhận tiến trình phát âm thanh |
| Visitor | `/api/v1/location-suggestions` | Gợi ý điểm tham quan theo vị trí |
| Visitor | `POST /api/v1/chat/messages` | Hỏi AI/RAG với Bearer token của Visitor Session |
| Visitor | `GET /api/v1/chat/messages` | Lịch sử chat theo phiên khách |
| Staff | `/api/v1/staff/auth` | Login, me, csrf, logout |
| Staff | `/api/v1/staff/attractions` | Quản lý điểm tham quan |
| Staff | `/api/v1/staff/routes` | Quản lý tuyến tham quan |
| Staff | `/api/v1/staff/knowledge-documents` | Quản lý tài liệu kiến thức |
| Staff | `/api/v1/staff/accounts` | Quản lý tài khoản nhân viên |
| Staff | `/api/v1/staff` | Các thao tác workflow quản trị |

Đây là bản tổng quan, không phải tài liệu OpenAPI đầy đủ. Các phương thức HTTP, trường dữ liệu và quyền truy cập chi tiết tuân theo router/controller/validator trong `src/`.

## Xác thực và an toàn

- Visitor Chat yêu cầu Bearer token được cấp qua Visitor Session.
- Staff API yêu cầu phiên đăng nhập hợp lệ, lưu session với Redis; các thao tác thay đổi trạng thái có thể yêu cầu CSRF token.
- Mật khẩu và API key đặt trong `.env`, không được commit.
- Dùng `SESSION_SECRET` mạnh trong triển khai thực tế, và cấu hình HTTPS, cookie/proxy, log, sao lưu database phù hợp.

## Trạng thái MVP và giới hạn

Tại lần kiểm thử nghiệm thu local gần nhất (20/10/2026), người phát triển xác nhận: `npm run build` PASS, 190/190 Vitest PASS, thử nghiệm Gemini/RAG thực tế PASS, bốn endpoint public trả HTTP 200, Staff authentication/session và bốn Staff GET endpoint PASS.

Các kết quả này chỉ xác nhận phạm vi đã thử, **không tương đương kiểm thử production**. Một số Knowledge hiện vẫn là dữ liệu demo (`DEV_SOURCE`, `example.com`); cần thay bằng nguồn được kiểm chứng trước khi đưa vào sử dụng thực tế. Cần hoàn thiện hướng dẫn migration/seed cụ thể, vận hành và các bài kiểm thử triển khai khi chuẩn bị production.

## CI

Workflow: `.github/workflows/ci.yml`.
