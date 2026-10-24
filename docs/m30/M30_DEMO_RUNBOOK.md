# M3.0 — Hue Tourism Guide: Quy trình khởi động và demo MVP

**Cập nhật:** 24/10/2026  |  **Baseline:** `cb2cbcd`  |  **Môi trường:** máy Windows dev + PostgreSQL + Redis, không phải production.

## 1. Mục tiêu và tiêu chí

- Chạy Backend, Frontend User, Frontend Staff và kiểm tra trạng thái DB/Redis.
- Giới thiệu hành trình người dùng và quản trị nội dung, không sử dụng tài khoản khách hàng bắt buộc.
- Chỉ xác nhận những mục đã kiểm tra thực tế. GitHub Actions commit `cb2cbcd` có **3/3 checks xanh** theo ảnh ngày 24/10/2026; không đồng nghĩa GPS thực địa, chatbot chất lượng hoặc production đã nghiệm thu.
- **Không chạy thao tác duyệt/xuất bản lên nội dung đang phục vụ khách nếu không có dữ liệu demo dành riêng.**

## 2. Trước khi trình diễn

1. Bật PostgreSQL (`hue_tourism`) và Redis, kiểm tra Docker Desktop nếu Redis chạy trong container.
2. Bảo đảm `.env` máy local đã thiết lập. Không đăng `.env`, API key, mật khẩu, cookie/token lên GitHub hoặc ảnh trình chiếu.
3. Dùng 2 terminal khác nhau. Không dùng VS Code Live Server thay cho `dev-server.js` khi cần Admin session và proxy API.
4. Chạy kiểm tra M3.0 sau khi cả hai server đã bật:

```powershell
cd C:\Users\ASUS\Software-Engineering
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\M30_RELEASE_CHECK.ps1
```

Khi chưa cài tài liệu vào repo, chạy script từ thư mục ZIP đã giải nén bằng `-Project 'C:\Users\ASUS\Software-Engineering'`.

### Terminal A — Backend

```powershell
cd C:\Users\ASUS\Software-Engineering
npm.cmd run dev
```

### Terminal B — Frontend + API proxy

```powershell
cd C:\Users\ASUS\Software-Engineering\frontend
.\CHAY-WEB.bat
```

Địa chỉ:

- User: `http://localhost:8000/`
- Staff: `http://localhost:8000/admin.html`
- API live: `http://localhost:3000/api/v1/health/live`
- API ready (PostgreSQL + Redis): `http://localhost:3000/api/v1/health/ready`

**Lưu ý:** cổng 8000 là dev-server dành cho thử nghiệm nội bộ, chưa phải hệ thống phát hành công khai.

## 3. Demo gợi ý 10–15 phút

| Thứ tự | Tác vụ demo | Minh chứng cần thấy | Phương án nếu không có điều kiện |
|---|---|---|---|
| 1 | Mở Web User; xem danh sách và bản đồ di tích | Di tích published có dữ liệu | Chọn di tích thủ công |
| 2 | Chọn tuyến công khai, xem thứ tự các điểm dừng | Route + route stops có thứ tự | Nếu còn tuyến draft, không gọi là published |
| 3 | Mở Đại Nội và nội dung tiếng Việt | Nội dung đã công khai, bản đồ, ảnh | Không tự tạo nội dung chưa xác minh |
| 4 | Phát thuyết minh bằng thao tác người dùng | MP3 hoặc browser TTS hoạt động | Nêu rõ ngôn ngữ/thiết bị thực tế |
| 5 | Thử đa ngôn ngữ | Nội dung có fallback nếu thiếu bản dịch | Không tuyên bố 7 ngôn ngữ đã duyệt cho mọi di tích |
| 6 | Bật GPS có đồng ý của trình duyệt | Gợi ý gần hoặc thông báo chọn thủ công | Ở ngoài Huế: dùng kết quả HTTP fixture M2.8, **không giả vị trí thật** |
| 7 | Hỏi chatbot câu có thể kiểm chứng | Câu trả lời + citation | Không dùng câu demo làm bằng chứng đạt bộ 50 câu |
| 8 | Mở Admin/Staff, đăng nhập | Session, phân quyền và CSRF | Không chiếu password/token |
| 9 | Cho xem Draft → Review → Approve → Publish trên dữ liệu demo | Public không đổi trước duyệt, phiên bản mới khi publish | Nếu không có record demo, trình bày test M2.7 đã PASS thay vì sửa dữ liệu thật |
| 10 | Mở Analytics | Thống kê sự kiện visitor trong dashboard | Không dùng dữ liệu demo để suy ra lưu lượng thật |
| 11 | Mở commit `cb2cbcd` trên GitHub | 3/3 CI checks xanh | Ghi ngày và SHA vào báo cáo |

## 4. Các API công khai dùng để trình bày

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/api/v1/health/live` | Server còn hoạt động |
| GET | `/api/v1/health/ready` | DB và Redis đã kết nối |
| GET | `/api/v1/attractions?language=vi&page=1&page_size=100` | Danh sách published |
| GET | `/api/v1/routes?language=vi&page=1&page_size=100` | Danh sách tuyến published |
| POST | `/api/v1/visitor-sessions` | Tạo phiên khách, cần cho API Visitor có Bearer token |
| POST | `/api/v1/location-suggestions` | Gợi ý GPS theo phiên có quyền; cần tọa độ, độ chính xác và thời điểm |
| POST | `/api/v1/chat/messages` | Chatbot; có scope Visitor và citations |
| POST/PATCH | `/api/v1/audio-plays` | Tạo và cập nhật tiến trình nghe |
| POST | `/api/v1/visitor-events` | Thống kê hành vi Visitor |

**Chú ý:** script M3.0 chỉ gọi `GET` công khai; script M2.8 GPS trước đây có tạo một phiên Visitor test (ghi DB). Đừng chạy các demo có ghi dữ liệu trên production.

## 5. Kết thúc demo và rollback

- Dừng hai terminal bằng Ctrl+C (chỉ dừng server local).
- Không xóa/migrate DB trong lúc demo hoặc để "dọn dữ liệu".
- Nếu phát hiện lỗi UI: chụp thông báo, URL, bước tái hiện; **không** tùy tiện `git reset --hard` hay copy `app.js` của bản cũ.
- Bản sao M2.8 trước đó được script cài tạo tại thư mục ngoài repo; sử dụng chỉ sau khi xác định bản đang chạy và dữ liệu cần giữ.

## 6. Khi nào được chốt nghiệm thu MVP?

Xem `M30_UAT_CHECKLIST.md`: phần chức năng local/CI có bằng chứng, phần chưa đo thực địa/quality/staging phải để `CHƯA NGHIỆM THU`. Chỉ sử dụng từ **"sẵn sàng demo local"** sau khi giao diện trên trình duyệt thực tế chạy và các chức năng dự định trình diễn được quan sát trực tiếp.
