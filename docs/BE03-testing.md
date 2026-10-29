# BE03 — Kiểm thử PostgreSQL và Redis thật

## Môi trường test local

Khởi động tại thư mục gốc repository:

```powershell
docker compose -p hue-be03-test -f compose.test.yml up -d --wait
```

- PostgreSQL: 127.0.0.1:5434, database hue_tourism_test.
- User: hue_app; mật khẩu test: hue_test_only.
- Redis: 127.0.0.1:6380.
- Không thay đổi .env DEV.

Các thông tin trên chỉ dành cho môi trường test local/CI.

## Khởi tạo schema

Trên database test mới, trống, áp dụng lần lượt:

1. src/database/migrations/001_core_schema.sql
2. M25_01_create_attraction_localization_revisions.sql
3. M26_02_create_visitor_events.sql
4. src/database/migrations/20261026_visitor_presence_last_seen.sql
5. src/database/migrations/007_add_performance_indexes.sql
6. src/database/migrations/008_allow_relative_media_url.sql

Dùng psql với ON_ERROR_STOP=1.
Không chạy lại toàn bộ chuỗi trên database đã có schema.
Không cần dump hoặc seed nội dung để chạy các regression.

Ví dụ áp dụng một file:

```powershell
docker compose -p hue-be03-test -f compose.test.yml cp ".\src\database\migrations\001_core_schema.sql" postgres:/tmp/migration.sql
docker compose -p hue-be03-test -f compose.test.yml exec -T postgres psql -X -U hue_app -d hue_tourism_test -v ON_ERROR_STOP=1 -f /tmp/migration.sql
```

Lặp lại với các file còn lại theo thứ tự trên.

## Chạy regression

```powershell
npm.cmd ci
npm.cmd run build
node tests/run-real-services.cjs
```

Launcher truyền cấu hình test vào tiến trình con,
không sửa .env hoặc môi trường Terminal.

Biến tùy chỉnh cho CI:
- TEST_DB_PORT
- TEST_DB_PASSWORD
- TEST_REDIS_URL

## Phạm vi kiểm tra

- BE01: truy vấn thống kê 7/30 ngày trên PostgreSQL thật,
  dùng bảng tạm và rollback.
- BE03: tạo tài khoản bằng service thật và xác minh bcrypt.
- Session được lưu vào Redis thật, có TTL.
- App thứ hai đọc lại session và xác thực Staff từ PostgreSQL.
- Logout xóa session; cookie cũ không còn truy cập được.
- Tài khoản thử được rollback; chỉ session Redis của test bị xóa.

Route tạo session nằm riêng trong test, không thuộc ứng dụng.
Test session chưa kiểm tra toàn bộ endpoint đăng nhập.

## AI và mạng ngoài

Launcher dùng EMBEDDING_PROVIDER=dev, CHAT_PROVIDER=extractive
và để trống API key.

Test session không nạp module AI và chặn global fetch.
Đây không phải cơ chế chặn mọi hình thức kết nối mạng ngoài.

## GitHub Actions

Job Backend Test & Build trong ci.yml:

1. Khởi động PostgreSQL 18 và Redis 7.
2. Cài dependency bằng npm ci.
3. Build TypeScript.
4. Kiểm tra database trống và áp dụng sáu migration.
5. Chạy npm test.
6. Chạy hai regression với dịch vụ thật.

Frontend Static Checks vẫn được giữ nguyên.

## Kết quả local — 29/10/2026

- Sáu migration chạy thành công từ database trống: 13 bảng.
- Regression analytics: PASS cho 7 và 30 ngày.
- Tạo tài khoản/bcrypt: PASS.
- Session Redis và TTL: PASS.
- Khôi phục session ở app thứ hai: PASS.
- Logout và từ chối cookie cũ: PASS.
- Chưa xác nhận kết quả workflow mới trên GitHub.