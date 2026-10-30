# BE06 — Bảo mật, hiệu năng và xử lý sự cố

## Phạm vi kiểm tra

Kiểm tra local, không thực hiện tấn công hoặc đo tải trên
website của người khác.

- Backend test: http://127.0.0.1:3001.
- PostgreSQL test: 127.0.0.1:5434, hue_tourism_test.
- Redis test: 127.0.0.1:6380.
- Không dừng container DEV hoặc thay dữ liệu DEV.

## Checklist bảo mật

| Hạng mục | Bằng chứng | Kết quả |
|---|---|---|
| Session và vai trò Staff | staff-security.test.ts | PASS |
| CSRF thiếu/sai token | staff-security.test.ts | PASS |
| Workflow và quyền API | staff-workflow.test.ts | PASS |
| Rate limit đăng nhập | staff-login-rate-limit.test.ts | PASS |
| Chữ ký file, MIME và dung lượng | media-file.validator.test.ts | PASS |
| Parse multipart và lỗi upload | staff-media-upload.middleware.test.ts | PASS |
| Quyền xem media nháp | media-access.middleware.test.ts | PASS |
| Điều kiện xuất bản media | staff-media-publish.test.ts | PASS |
| Tên file do server tạo và lưu file | local-media-storage.adapter.test.ts | PASS |

Rate limiter:
- Năm yêu cầu thất bại được xử lý, yêu cầu thứ sáu nhận 429.
- Yêu cầu thành công không tiêu hao hạn mức thất bại.
- Có Retry-After hợp lệ.
- Test dùng handler mô phỏng kết quả đăng nhập,
  không phải kiểm thử toàn bộ endpoint login.

Kiểm tra chữ ký media không thay thế giải mã toàn bộ file
hoặc quét malware.

## Dependency audit — 30/10/2026

Trước cập nhật: 2 high, 1 moderate.

| Package | Trước | Sau |
|---|---|---|
| body-parser | 2.3.0 | 2.4.0 |
| multer | 2.4.0 | 2.5.0 |
| qs | 6.16.0 | 6.17.1 |

Cập nhật bằng npm audit fix --ignore-scripts, không dùng --force.
Chỉ package-lock.json thay đổi.

Sau cập nhật:
- npm audit: 0 vulnerabilities.
- Build TypeScript: PASS.
- Vitest: 39 file, 250 test PASS.
- Regression analytics 7/30 ngày: PASS.
- Regression tài khoản, bcrypt, session Redis và logout: PASS.

Audit phản ánh dữ liệu advisory tại thời điểm chạy,
không phải bảo đảm ứng dụng không còn mọi lỗ hổng.

## Diễn tập sự cố dịch vụ thật

Kết quả trước lần cập nhật dependency:

| Tình huống | Liveness | Readiness | Phục hồi |
|---|---|---|---|
| Cả hai dịch vụ hoạt động | 200 | 200 | Không áp dụng |
| Redis test dừng | 200 | 503, redis unavailable | Redis chạy lại: readiness 200 |
| PostgreSQL test dừng | 200 | 503, database unavailable | PostgreSQL chạy lại: readiness 200 |

Backend không cần restart trong hai phép thử.

Test tự động health-ready.test.ts kiểm tra thêm trường hợp
cả hai dependency lỗi bằng mock:
liveness 200, readiness 503.

### Cách thử lại trên local

Khởi động dịch vụ và build:

```powershell
docker compose -p hue-be03-test -f compose.test.yml up -d --wait
npm.cmd run build
node tests/run-be06-server.cjs
```

Giữ backend test chạy trong Terminal riêng.
Trong Terminal khác, kiểm tra:

```powershell
curl.exe --max-time 10 -sS -w "\nHTTP %{http_code}\n" http://localhost:3001/api/v1/health/live
curl.exe --max-time 10 -sS -w "\nHTTP %{http_code}\n" http://localhost:3001/api/v1/health/ready
```

Dừng từng service test, đo lại rồi phục hồi:

```powershell
docker compose -p hue-be03-test -f compose.test.yml stop redis
docker compose -p hue-be03-test -f compose.test.yml up -d --wait redis

docker compose -p hue-be03-test -f compose.test.yml stop postgres
docker compose -p hue-be03-test -f compose.test.yml up -d --wait postgres
```

Các lệnh stop/start phải thực hiện từng dịch vụ một.
Sau mỗi thao tác, kiểm tra health trước khi chuyển bước.
Không dùng tên container DEV.

## Hướng xử lý khi readiness không phục hồi

1. Ghi HTTP status, thời điểm, response và log backend.
2. Kiểm tra trạng thái dịch vụ bằng compose ps -a.
3. Kiểm tra log bằng compose logs --tail 100 postgres redis.
4. Kiểm tra host, port và cấu hình kết nối đúng môi trường.
5. Phục hồi dịch vụ lỗi rồi kiểm tra readiness lại.
6. Chỉ restart backend sau khi lưu bằng chứng nếu vẫn chưa phục hồi.

Không xóa volume hoặc restore đè database để xử lý lỗi kết nối.
Sự cố dữ liệu dùng quy trình BE05 và backup đã kiểm chứng.

## Đo hiệu năng cơ bản

Script: tests/BE06-performance.cjs.

- Windows, Node v24.22.0, 4 CPU logic, RAM hệ thống 15,9 GiB.
- HTTP local, không qua HTTPS/proxy Internet.
- Concurrency: 1.
- Warmup: 5 yêu cầu mỗi endpoint.
- Mẫu đo: 30 yêu cầu mỗi endpoint.
- Đọc hết response body trong thời gian đo.
- 1.000 di tích giả, mỗi di tích có localization tiếng Việt.
- Endpoint danh sách dùng phân trang, không tải cả 1.000 bản ghi.
- Tổng 90/90 yêu cầu đo trả HTTP 200.

| Endpoint | Trung vị ms | p95 ms | Max ms |
|---|---:|---:|---:|
| /api/v1/health/live | 1.28 | 2.05 | 2.13 |
| /api/v1/health/ready | 2.99 | 3.91 | 3.92 |
| /api/v1/attractions | 6.14 | 7.34 | 7.37 |

Thời điểm đo: 2026-10-30T02:20:01.305Z.
Đo trước lần cập nhật dependency.

Dữ liệu thử được tạo bằng BE06-performance-fixture.sql,
dọn bằng BE06-performance-cleanup.sql.
Đã xác nhận attractions, localizations và tài khoản fixture
đều về 0 sau cleanup.

## Giới hạn và phần cần thực hiện trên staging

- Chưa kiểm thử tải đồng thời, độ bền hoặc đặt ngưỡng SLO.
- Chưa đo lại hiệu năng/sự cố sau cập nhật dependency.
- Chưa kiểm tra HTTPS, secure cookie, proxy và quyền truy cập
  trên staging; phụ thuộc BE04.
- Chưa kiểm chứng rate limit với nhiều instance server.
- Chưa kiểm chứng mọi trường hợp upload hoặc khai thác advisory.
- Kết quả test và audit không thay thế kiểm toán bảo mật đầy đủ.