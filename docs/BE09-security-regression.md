# BE09 — Security regression tests

## Phạm vi

Chỉ thêm/sửa test và tài liệu. Middleware session, xác thực Staff, phân quyền,
CSRF, validator, rate limiter và router đang kiểm tra đều dùng code ứng dụng
thật. Không thay quy tắc bảo mật, API, dependency, CI hoặc database.

Các ca cơ bản đã có trong staff-security, staff-auth, staff-workflow và các test
đọc/cập nhật Staff được giữ nguyên. BE09 bổ sung 35 ca cho khoảng trống đã rà soát,
không tạo lại bộ test 401/403/CSRF cơ bản trên các route kiểm thử cũ.

## Các ca mới và assertion

| Nhóm | Ca bổ sung | Expected/assertion |
| --- | --- | --- |
| Admin GET wiring | Accounts, analytics, visitor-presence: anonymous, editor, reviewer, admin | Anonymous 401/UNAUTHORIZED; editor/reviewer 403/FORBIDDEN; handler không chạy khi chặn; admin 200 và handler chạy một lần, không cần CSRF cho GET |
| Thứ tự bảo vệ accounts POST | Body sai cùng với thiếu session, role editor, admin thiếu CSRF | Lần lượt 401/UNAUTHORIZED, 403/FORBIDDEN, 403/CSRF_VALIDATION_ERROR; create handler không chạy |
| Session hết hiệu lực | Lookup tài khoản trả StaffAccountNotFoundError, sau đó tài khoản hoạt động lại | Store destroy nhận đúng SID; cookie cũ vẫn 401; không lookup tài khoản lần nữa |
| CSRF cùng độ dài | Thay một ký tự token, giữ nguyên số byte | Logout 403/CSRF_VALIDATION_ERROR; không destroy session; /me vẫn 200 |
| CSRF thiếu trong session | Session đã đăng nhập nhưng chưa cấp token, request có header | Logout 403/CSRF_VALIDATION_ERROR; session còn hiệu lực |
| CSRF khác session và cấp lại | Token agent A dùng tại B; token cũ sau khi A cấp lại | Cả hai bị 403; token mới logout được; session B vẫn truy cập /me được |
| Cookie cấu hình thật | Tạo session bằng middleware từ src/config/session.ts | hue_staff_session, Path=/, HttpOnly, SameSite=Lax, không Secure trong test HTTP, Expires đúng 8 giờ |
| Cookie production | X-Forwarded-Proto=https qua proxy kiểm thử; đối chứng HTTP | HTTPS giả lập có Secure; HTTP không phát cookie Secure |
| saveUninitialized | GET không sửa session | Không Set-Cookie, không gọi store.set |
| Session rotation | Đăng nhập với cookie session đã tồn tại | Cookie/SID đổi; cookie cũ /me=401, cookie mới /me=200 |
| Logout cookie | Logout production HTTPS giả lập với token hợp lệ | Cookie rỗng, đúng tên/path/HttpOnly/SameSite/Secure, Expires trong quá khứ; cookie cũ /me=401 |
| Login input | Thiếu email/password, email object, password number, password dài 201 ký tự | 400/VALIDATION_ERROR; authenticateStaff không được gọi |
| Login password biên | Password 200 ký tự | 200 với auth service giả chấp nhận; truyền nguyên giá trị tới service đúng một lần |
| Route PATCH input | Body array, estimated_minutes dạng string hoặc số thập phân | 400/VALIDATION_ERROR; updateStaffRoute không được gọi |
| Rate-limit window | Đủ năm request thất bại, request thứ sáu bị chặn; tiến đồng hồ 15 phút + 1 ms | Trước hết hạn 429; sau hết hạn handler tiếp tục xử lý và trả 401 mô phỏng |
| Login router wiring | Router login thật, authenticateStaff giả lập từ chối | Năm request đầu 401; request thứ sáu 429/TOO_MANY_LOGIN_ATTEMPTS; auth service chỉ được gọi năm lần |

Các expected trên dựa vào middleware/router/validator/controller hiện có. Không
thêm yêu cầu bảo mật mới hoặc đổi expected để làm test thành công.

## File và phạm vi mock

- `tests/helpers/be09-app.ts`: tạo Express test app, import cấu hình session thật;
  thay RedisStore bằng MemoryStore và module Redis bằng đối tượng giả. Module
  database được thay bằng query guard: ném lỗi nếu gọi và assertion zero calls
  sau mỗi test. Không import src/app.ts hoặc src/server.ts.
- `tests/integration/staff-admin-security.test.ts`: giữ router và middleware thật;
  giả lập controller accounts/analytics và service đếm presence để kiểm tra
  quyền trước handler mà không truy cập DB/Redis.
- `tests/integration/staff-session-config.test.ts`: giữ auth router/controller và
  middleware thật; spy authenticateStaff/getActiveStaffById để điều khiển kết quả
  tài khoản. Token CSRF được tạo bằng hàm thật, không mock crypto.
- `tests/integration/staff-login-rate-limit.test.ts`: giữ ba ca cũ; thêm reset
  cửa sổ bằng fake clock và kiểm tra router login với auth service giả.
- `tests/integration/staff-route-update.test.ts`: thêm ba ca input vào harness
  MemoryStore và service mock đã có; không thay các test cũ.

Không sao chép các tùy chọn cookie hoặc session của ứng dụng vào helper. Các giá
trị như HttpOnly, Secure và thời hạn chỉ xuất hiện ở assertion để kiểm tra cấu
hình được import. `/test/session` và `/test/unmodified` chỉ tồn tại trong test.

Supertest nhận trực tiếp Express app, tự mở listener cục bộ tạm thời; không gọi
base URL/server có sẵn. Không tạo DB, Redis client thật, container hoặc upload.
Login dùng dữ liệu tổng hợp và auth service giả; không thử mật khẩu thật.
Mỗi ca rate-limit mới chỉ gửi 6 hoặc 7 request hữu hạn.

## Cô lập thời gian và trạng thái

- Test hạn cookie chỉ fake Date; thời điểm cố định, không chờ tám giờ.
- Test hết cửa sổ limiter fake Date/setInterval/clearInterval, tiến clock bằng
  advanceTimersByTimeAsync; không chờ 15 phút và không fake I/O của Supertest.
- Helper reset module trước mỗi app để có cấu hình session và limiter riêng.
- afterEach xóa dữ liệu MemoryStore, kiểm tra không gọi DB; finally luôn xóa
  fake timers, trả timer thật, restore spies, trả biến môi trường bằng
  unstubAllEnvs, bỏ module mock và reset module cache.
- Các ca mới trong route-update dùng lifecycle mock trước mỗi test của file cũ;
  không thay timer hoặc biến môi trường.

Không đọc/in credential máy, `.env`, cookie hoặc token trong log chủ động.
Cookie và token trong test đều được sinh trong MemoryStore của test; không lưu
artifact hoặc fixture chứa session thực.

## Cách chạy và kết quả thực tế — 06/11/2026

Tại thư mục gốc repository, Windows dùng npm.cmd:

```powershell
npm.cmd test -- tests/integration/staff-session-config.test.ts tests/integration/staff-admin-security.test.ts tests/integration/staff-login-rate-limit.test.ts tests/integration/staff-route-update.test.ts
npm.cmd run build
npm.cmd test
```

Đã chạy theo thứ tự trên:

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| Nhóm BE09, gồm test cũ trong file liên quan | 4 file, 50 test thành công; exit code 0 |
| Build TypeScript | Thành công; exit code 0 |
| Toàn bộ npm test | 41 file, 286 test thành công; exit code 0 |

Trong 50 test của nhóm chọn có 35 ca mới: admin 15, session/CSRF/login input 15,
rate limit 2 và route input 3. Tổng suite tăng từ 251 lên 286 test.
Không phát hiện lỗi ứng dụng trong các ca BE09 đã chạy.

## Giới hạn chưa kiểm chứng

- MemoryStore không chứng minh persistence, TTL, lỗi hoặc hành vi nhiều process
  của Redis thật. Session rotation/destroy được xác minh với store bộ nhớ.
- HTTPS chỉ mô phỏng req.secure qua proxy test. Chưa kiểm tra TLS, cấu hình trust
  proxy triển khai hoặc việc trình duyệt thực thi HttpOnly/SameSite/Secure.
- Handler admin bị giả lập: kiểm chứng wiring và chặn trước handler, không kiểm
  chứng nghiệp vụ hoặc query dữ liệu admin.
- Rate limiter chạy trong process test, không kiểm tra chia sẻ hạn mức giữa
  nhiều replica; không brute-force, load test hoặc gửi request lên staging.
- Input login bổ sung là JSON object. Body vắng, malformed JSON và parser-level
  errors chưa được bổ sung assertion 400/VALIDATION_ERROR trong BE09.
- Build hiện tại chỉ biên dịch src theo tsconfig; không phải typecheck riêng
  toàn bộ file test. Test được Vitest thực thi.
- Không coi kết quả lịch sử trong tài liệu BE06 là kết quả mới của BE09.
