# BE08 — Backend GET smoke test

## Phạm vi

Kiểm tra backend thật bằng HTTP GET: liveness, readiness, danh sách attraction,
danh sách route, chi tiết route/stops, chi tiết attraction và media lấy từ API.
Không tích hợp CI, không thay code ứng dụng, migration, seed ứng dụng hoặc package.
Không đo SLO, kiểm tra tải, đăng nhập hoặc gọi AI/CDN.

## Điều kiện và cách chạy

- Node 24 và dependency từ lockfile đã được cài trong repository.
- Docker CLI và daemon local hoạt động với Linux containers.
- Hai image `postgres:18` và `redis:7-alpine` đã có sẵn. Runner không tự pull.
- Đủ quyền tạo container và publish cổng loopback ngẫu nhiên.

Chuẩn bị image nếu máy chưa có:

```powershell
docker pull postgres:18
docker pull redis:7-alpine
```

Chạy tại thư mục gốc repository:

```powershell
node tests/run-be08-smoke.cjs
```

Không cần chạy `npm start`, compose DEV, seed ứng dụng hoặc tạo `.env`.
Runner build TypeScript vào thư mục tạm bằng compiler đã cài, không ghi `dist/`
trong repository. Không chạy trực tiếp `tests/BE08-smoke.cjs`: file này chỉ xuất
hàm kiểm tra cho runner và trả mã lỗi nếu gọi trực tiếp.

## Cô lập môi trường và kiểm tra đích

Mỗi lần chạy tạo UUID, database `hue_be08_test_<uuid>` và hai container mang nhãn
`hue.be08.run=<uuid>`. Không nhận URL database, base URL hay credential từ môi
trường người dùng. PostgreSQL và Redis dùng cổng host ngẫu nhiên, chỉ publish tại
`127.0.0.1`. Không bind mount thư mục máy cá nhân, không tái sử dụng container DEV.

Runner chỉ kế thừa các biến cần để khởi chạy tiến trình: PATH, SystemRoot,
WINDIR và biến thư mục tạm. Docker dùng thư mục config rỗng riêng, không đọc
registry credential của người dùng. Không chọn Docker context từ cấu hình cá
nhân; daemon phải truy cập được qua endpoint mặc định của Docker CLI.

Trước khi khởi động container, runner kiểm tra tên/nhãn; với PostgreSQL kiểm tra
thêm `POSTGRES_DB`. Trước mỗi lần ghi schema hoặc fixture, kiểm tra lại container,
host/port/database của connection và `current_database()`/`current_user`.
Chỉ chấp nhận database UUID của lần chạy hiện tại và user `hue_app`.
Schema chỉ được nạp sau khi xác nhận database không có bảng ứng dụng.
Nếu không xác minh được đích thì dừng, không tiếp tục ghi.

Runner đọc và áp dụng sáu migration có sẵn theo thứ tự BE03/CI; không sửa file
migration. Khi dùng thư viện `pg`, loại UTF-8 BOM đầu file và dòng lệnh psql
`\encoding UTF8` trong bộ nhớ. Role test `hue_app` khớp các GRANT trong M26.
Healthcheck dùng TCP loopback thay vì Unix socket của server tạm khi initdb.
Fixture trong `tests/fixtures/be08/prepare.cjs` tạo tài khoản đánh dấu không hoạt
động, hai attraction/localization tiếng Việt published, một route published với
hai stop và một media image published. Không hardcode ID; dùng ID trả về từ SQL
và khám phá lại fixture qua API bằng slug.

Backend chạy bằng Node trong working directory tạm với `uploads/media` riêng.
PNG 1×1 được giải mã từ fixture tự chứa, không sao chép upload thật.
`DOTENV_CONFIG_PATH` trỏ đến file không tồn tại trong thư mục tạm;
`DOTENV_CONFIG_QUIET=true`. Cấu hình DB/Redis/session truyền tường minh;
provider dùng `dev`/`extractive`, API key rỗng, không truyền secret người dùng.
Thông tin xác thực cố định trong runner chỉ dùng cho container test dùng một lần.

## Assertions và tiêu chí kết quả

| Kiểm tra | Điều kiện thành công |
| --- | --- |
| Health live | HTTP 200, JSON, `status=ok`, message là chuỗi |
| Health ready | HTTP 200, JSON đúng ba trạng thái ready/connected/connected |
| Attractions | HTTP 200, JSON, hai fixture đúng slug/tên/tọa độ/ngôn ngữ và phân trang |
| Routes | HTTP 200, JSON, một route đúng slug/tên/thời lượng và phân trang |
| Route detail | ID/slug đúng; đúng hai stops, thứ tự, attraction, tọa độ và thời lượng |
| Attraction detail | ID/slug/tên/mô tả đúng, có đúng một image fixture |
| Media | URL lấy từ attraction detail, đúng đường dẫn fixture cùng origin; HTTP 200, MIME `image/png`, bytes khớp hoàn toàn |

Mọi ID phải là số nguyên dương an toàn; phân trang dùng `pagination.total`.
Mọi request, kể cả polling readiness, dùng GET. Không gửi cookie, token hoặc
request ghi. Không cho redirect hoặc chuyển media sang origin bên ngoài.

- Timeout toàn phần thực thi: 180 giây; mỗi CLI command: 30 giây.
- Chờ PostgreSQL healthy tối đa 35 giây, backend ready tối đa 30 giây.
- Mỗi request smoke tối đa 5 giây, polling request tối đa 1 giây, bao gồm đọc body.
- Timeout cleanup của từng Docker command là 30 giây, không dùng signal đã hủy
  của smoke để bỏ qua cleanup.
- `PASS` và exit code 0 chỉ được in sau khi cả smoke lẫn cleanup thành công.
- Assertion, timeout, build, khởi động hoặc cleanup lỗi: exit code 1.
- Thiếu dependency/Docker/image: `BLOCKED / CHƯA CHẠY`, exit code 1; không in PASS.

## Cleanup và giới hạn

`finally` dừng backend (SIGTERM, sau 2 giây dùng SIGKILL nếu cần), đóng client
PostgreSQL, kiểm tra lại tên/nhãn/đích PostgreSQL rồi xóa đúng hai container của
lần chạy cùng anonymous volume do container đó tạo. Không chạy DROP/DELETE trên
database bên ngoài. Database BE08 được xóa cùng container riêng.

Container chỉ được cleanup sau khi xác minh quyền sở hữu, kể cả khi lệnh tạo
container lỗi giữa chừng. Không xác minh được thì không xóa và báo cleanup lỗi.
Thư mục tạm chỉ được xóa sau khi xác nhận đường dẫn trực tiếp dưới thư mục temp
và có tiền tố `hue-be08-`. Không quét hoặc xóa upload trong repository.

SIGINT/SIGTERM yêu cầu hủy thực thi và đi qua cleanup. Nếu tiến trình bị cưỡng
bức kết thúc bởi hệ điều hành hoặc Docker daemon mất kết nối, không thể bảo đảm
cleanup. Khi cleanup container lỗi, thông báo chỉ rõ tên tài nguyên BE08 để
kiểm tra thủ công; không xóa container khác hoặc dùng lệnh prune.

Không in stdout/stderr thô của Docker, compiler hay backend để tránh lộ cấu hình
máy. Mỗi bước build, dịch vụ, migration, fixture và cleanup có START, OK hoặc
ERROR. Diagnostic chỉ xuất SQLSTATE, loại lỗi cố định, vị trí SQL dạng số,
schema `public`, role thiếu nếu khớp chính xác role test đã biết, một số mã lỗi
hệ thống/thông báo kết nối cố định và exit status. Không xuất message/detail/
hint/stack thô, SQL, tham số, body, cookie, biến môi trường hoặc chuỗi kết nối.
Không tạo artifact trên disk ngoài thư mục tạm.

## Kết quả thực tế ngày 06/11/2026

- `node --check` cho bốn file CJS BE08: thành công.
- Build TypeScript vào thư mục tạm: thành công, đã xóa thư mục build thử.
- PNG fixture: đã xác minh signature và CRC của từng chunk.
- Review diff/whitespace cho cả năm file mới: thành công; không stage file.
  Không có diff trong `src/`, `frontend/`, package hoặc workflow CI.
- Kiểm tra hàm smoke bằng HTTP server giả lập local: chấp nhận response hợp lệ;
  từ chối sáu trường hợp sai status, thiếu fixture, sai stops, sai schema phân
  trang, sai MIME, sai bytes; từ chối signal đã abort. Xác nhận chỉ gửi GET.
  Đây là kiểm tra bộ kiểm tra, không phải kết quả smoke backend thật.
- Lần triển khai ban đầu: `BLOCKED / CHƯA CHẠY`, exit code 1 ở prerequisites; không đi tới
  tạo container/database/fixture. Docker daemon chưa khả dụng trong môi trường này.

## Điều tra lỗi và kiểm chứng lại

Thông báo cũ `BE08 FAIL: verified test schema and fixture` nằm trong catch của
`main()`, bao phủ toàn bộ `execute()`. Nhãn này được giữ từ kiểm tra identity/DB
trống qua sáu migration, `prepareFixture`, mkdir và ghi PNG; không xác định được
thao tác thất bại chỉ bằng nhãn cũ.

Chạy lại ngoài sandbox để truy cập daemon, trên container/database UUID riêng:

1. Core và M25 thành công; M26 lỗi `42601`, `syntax_error`, vị trí 1. Kiểm tra
   đầu file xác nhận M26 có BOM U+FEFF, năm migration còn lại không có.
2. Sau khi loại BOM trong bộ nạp, M26 lỗi `42704`, `undefined_object`,
   `missingRole=hue_app`. M26 GRANT đến `hue_app`, runner cũ chỉ tạo
   `be08_runner`. Cả hai lần chưa đến INSERT fixture.
3. Đổi role test thành `hue_app` nhất quán trong container, connection, identity,
   healthcheck và backend. Không sửa migration.
4. Có một lần lỗi kết nối sau healthcheck socket; lúc đó chưa thu mã lỗi nên
   không kết luận nguyên nhân riêng. Đổi healthcheck sang TCP để xác nhận server
   cuối cùng, cùng giao thức backend dùng.
5. Sau sửa: sáu migration, toàn bộ fixture, readiness, bảy GET checks, hai
   attraction, hai stops và MIME/bytes media thành công. Backend dừng, client
   đóng, hai container cùng volume và thư mục tạm bị xóa; exit code 0.

Các lần lỗi trên đều exit code 1 và cleanup connection/container/thư mục tạm
thành công. Cleanup hiện xác minh thêm container đúng tên không còn sau rm.

Kiểm tra bổ sung: cú pháp ba file CJS thay đổi thành công; bốn trường hợp lọc
diagnostic xác nhận giữ mã/vị trí/role cần thiết và không xuất giá trị nhạy cảm
giả lập trong message, detail, hint, stack, cookie hoặc tham số kết nối.
