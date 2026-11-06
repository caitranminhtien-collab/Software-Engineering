# BE10 — Isolated staging validation

## Cấu hình thay đổi

`compose.staging.yml` tham số hóa các biến sau, giữ nguyên mặc định BE04:

| Biến | Mặc định |
| --- | --- |
| BE04_DB_NAME | hue_tourism_staging |
| BE04_HTTP_PORT | 8080, chỉ bind 127.0.0.1 |
| BE04_BACKEND_IMAGE | hue-guide-backend:be04 |
| BE04_FRONTEND_IMAGE | hue-guide-frontend:be04 |

PostgreSQL dùng pg_isready qua TCP. Frontend dùng wget kiểm tra index.html với
timeout/start period/retry. Backend readiness và Redis PING được giữ nguyên.
DB/Redis/backend không publish port host. Default network và postgres_data vẫn
được đặt tên theo Compose project, không external hoặc tên volume dùng chung.
Redis không được bổ sung cam kết persistence/session qua recreate trong BE10.

Hai Dockerfile, nginx, .dockerignore, mã ứng dụng, migration, dependency và CI
không bị sửa. Bootstrap là service profile `be10-bootstrap`, restart=no, chỉ
chạy theo lệnh rõ ràng; không thuộc lệnh up staging mặc định.

`.env.staging.example` chỉ là mẫu tên biến và placeholder. Không đọc hoặc sao
chép giá trị từ `.env`, `.env.staging` trong quy trình nghiệm thu.

## Bootstrap có kiểm tra đích

`deploy/staging/bootstrap.sh` chỉ chạy khi:

- BE10_RUN_ID là 32 ký tự hex; project đúng hue-be10-ID.
- PGDATABASE đúng hue_be10_test_ID, PGHOST=postgres, PGPORT=5432, PGUSER=postgres.
- BE10_BOOTSTRAP_CONFIRM đúng new-empty-ID.
- current_database/current_user khớp cấu hình; không có bảng ứng dụng, chưa có
  role hue_app và không có database người dùng khác trong cluster mới.

Mọi điều kiện trên được kiểm tra trước thao tác ghi đầu tiên. Identity được
kiểm tra lại trước từng bước role, credential, migration và grant. Script từ
chối database có schema sẵn; không có chế độ force/restore/ghi đè.

Tạo role hue_app với LOGIN nhưng NOSUPERUSER, NOCREATEDB, NOCREATEROLE,
NOINHERIT, NOREPLICATION, NOBYPASSRLS. Credential truyền qua stdin cho psql
`\password`; psql hash client-side, không chèn mật khẩu rõ vào SQL, tham số CLI
hoặc file SQL. Không bật shell tracing và không in credential, SQL hay log thô.
PGPASSWORD chỉ nằm trong môi trường tiến trình của container test.

Sáu migration được mount read-only, giữ nguyên thứ tự BE03/BE08. BOM đầu file
được bỏ trên stream bằng sed; không sửa source. psql dùng ON_ERROR_STOP=1.
Migration chạy bằng postgres; bảng/schema không chuyển quyền sở hữu cho ứng dụng.
Sau đó chỉ cấp CONNECT database, USAGE schema, SELECT/INSERT/UPDATE/DELETE bảng,
USAGE/SELECT sequence; không cấp CREATE schema hoặc quyền quản trị cho hue_app.

Nếu bootstrap lỗi sau khi đã tạo một phần schema, không tự xóa hoặc chạy tiếp.
Đối với nghiệm thu, cleanup đúng stack mới rồi bắt đầu một ID khác. Đối với
staging đã restore, tuyệt đối không dùng bootstrap này.

Các script shell dưới deploy/staging có quy tắc Git eol=lf để checkout trên
Windows không chuyển bootstrap sang CRLF.

## Chạy nghiệm thu

Yêu cầu Node 24, Git, Docker daemon với Linux containers, Compose plugin và khả
năng build hai Dockerfile. Runner không cần cài thêm dependency Node.

```powershell
node deploy/staging/validate-be10.cjs
```

Runner thực hiện:

1. Tạo ID ngẫu nhiên; project hue-be10-ID, DB hue_be10_test_ID, image tag be10-ID,
   thư mục temp/uploads riêng và port loopback ngẫu nhiên.
2. Chỉ kế thừa PATH, SystemRoot/WINDIR và biến thư mục tạm để chạy CLI. Không
   kế thừa BE04, BE10, DB, Redis, Docker context hoặc credential từ shell.
3. Tạo Docker config riêng, không đọc config/registry credential cá nhân. Trên
   Windows chỉ tìm plugin Compose cạnh Docker executable, không đọc user config.
4. Tạo build context ngoài repo từ danh sách Git tracked: Dockerfile, package,
   tsconfig, src, frontend và nginx. Không đọc ba file untracked có sẵn hoặc .env.
   Override tạm chỉ thay build context, không thay nội dung hai Dockerfile.
5. Sinh credential test ngẫu nhiên trong file env ngoài repo. Dùng --env-file và
   --project-name rõ ràng. Chỉ gọi config --quiet; không in cấu hình nội suy.
6. Build tag riêng; khởi động PostgreSQL/Redis mới; xác minh label project,
   database và DB trống; chạy bootstrap thủ công trước backend/frontend.
7. Kiểm tra schema và quyền role; thử chạy lại bootstrap trên chính DB vừa tạo
   phải bị REFUSED trước ghi. Thử PGDATABASE=hue_tourism_staging trong bootstrap
   của project test cũng phải bị REFUSED ngay ở guard, không kết nối DB đó.
   Sau đó mới khởi động backend/frontend.
8. Đọc compose ps, chỉ in service/state/health; cả bốn service phải running/healthy.
   Chạy nginx -t, GET health/live, health/ready, attractions và routes qua proxy.
   Danh sách rỗng là expected vì không nạp seed/backup cá nhân.
9. GET index/admin và asset local được script/link/img tham chiếu, cộng script
   CRUD được admin tải động. Không gọi CDN hoặc tương tác trình duyệt.
10. Backend user node ghi file tổng hợp vào bind uploads riêng; đối chiếu phía
    host, recreate backend/frontend rồi đọc lại trong container và kiểm tra HTTP.

Role/schema metadata và API có hai mục nghiệm thu riêng: health/ready chỉ
SELECT 1/PING nên không chứng minh bảng, quyền DML hoặc endpoint dữ liệu hoạt động.

Thư mục uploads tạm được cho phép ghi để kiểm tra user node trên Linux/Windows;
đây không phải khuyến nghị quyền filesystem cho uploads staging thật.

## Cleanup và kết quả lỗi

finally xác minh label project của container/network/volume, tên network/volume
và DB của Postgres/backend trước khi down --volumes --remove-orphans đúng project.
Không prune, không down project BE04/DEV hoặc dùng uploads thật. Xác minh không
còn tài nguyên có label project đó sau cleanup. Anonymous volume Redis được
ghi nhận từ mount của container đã xác minh, rồi kiểm tra không còn sau down.
Chỉ xóa hai tag image UUID của
lần chạy, không dùng force và không xóa các tag BE04.

Sau khi stack được cleanup thành công, xóa context/config/uploads tạm sau kiểm
tra đường dẫn dưới temp và tiền tố hue-be10-. Nếu không xác minh được cleanup,
trả mã lỗi và giữ thư mục cấu hình phục hồi, báo project và đường dẫn an toàn.

Deadline thực thi 10 phút, build tối đa 4 phút, CLI khác tối đa 2 phút,
request HTTP tối đa 5 giây. SIGINT/SIGTERM yêu cầu hủy và vào finally. Cleanup
không bị bỏ qua do signal đã hủy. Không bảo đảm cleanup khi bị kill cứng hoặc
daemon/hệ điều hành ngừng hoạt động.

Thiếu môi trường: BLOCKED và exit code 1. Lỗi assertion/build/bootstrap/cleanup:
FAIL và exit code 1. PASS chỉ được in sau cả nghiệm thu và cleanup thành công.
Raw stdout/stderr Docker/build/bootstrap không được in để tránh lộ cấu hình.

## Giới hạn

- File persistence không phải nghiệm thu media HTTP. Không có fixture published,
  không khẳng định GET /uploads/media/... thành công.
- Không kiểm tra đăng nhập Staff, TLS/Cloudflare, browser hoặc rate limit IP thực.
- Asset được HTML tham chiếu và script CRUD được kiểm tra qua GET; chưa kiểm tra
  toàn bộ tài nguyên tải động, CSS url(), luồng UI hoặc dịch vụ ngoài.
- Bootstrap dành cho test mới; không thay quy trình restore/upgrade staging.
- Build có thể dùng cache/base image đã có; không thử registry credential cá nhân.

## Kết quả thực tế — 06/11/2026

Đã chạy `node deploy/staging/validate-be10.cjs` ngoài sandbox để truy cập Docker
daemon. Docker config tạm chỉ định vị plugin trong thư mục cài đặt DockerDesktop;
không nạp config/credential Docker hoặc file env cá nhân.

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| Compose --profile be10-bootstrap config --quiet | Thành công; không in cấu hình nội suy |
| Hai image tag BE10 riêng | Build thành công từ context chỉ chứa file tracked được chọn |
| Project/network/volume mới, DB trống trước bootstrap | Label/identity đúng, số bảng public ban đầu 0 |
| Bootstrap sáu migration | Thành công; BOM được xử lý trên stream |
| Schema sau bootstrap | 13 bảng public |
| Role hue_app | Không superuser/createdb/createrole/inherit/replication/bypassrls; không CREATE database/schema; có từng quyền SELECT/INSERT/UPDATE/DELETE trên các bảng |
| Chạy lại bootstrap trên DB đã có schema | Bị REFUSED, exit code khác 0; vẫn 13 bảng |
| Bootstrap với tên DB staging | Bị REFUSED trước kết nối/ghi |
| Compose ps và health | PostgreSQL, Redis, backend, frontend đều running/healthy |
| Port | Frontend chỉ bind loopback; Postgres/Redis/backend không publish port host |
| nginx -t | Thành công |
| GET qua frontend proxy | health/live, health/ready, attractions và routes thành công; hai danh sách rỗng đúng DB mới |
| Static asset | 11 asset local được tham chiếu tải HTTP 200, nội dung không rỗng; index/admin tải thành công |
| Uploads persistence | Backend user node ghi được file tổng hợp; nội dung host/container khớp, còn sau recreate backend/frontend |
| Kiểm tra HTTP sau recreate | API và 11 asset vẫn thành công |
| Cleanup | Không còn container/network/named volume của project hoặc anonymous volume Redis đã ghi nhận; xóa hai tag BE10 và toàn bộ context/config/uploads tạm |
| Runner bản cuối | PASS, exit code 0, chỉ in sau cleanup |

Lần chạy đầy đủ trước đó cũng thành công và cleanup xong. Các lần kiểm tra môi
trường ban đầu không đến bước tạo stack đã trả BLOCKED và xóa thư mục tạm;
không tính các lần đó là nghiệm thu thành công.

Kiểm tra local bổ sung: cú pháp Node của validator, đọc YAML, mặc định DB/port/
image tương thích BE04, bootstrap dùng LF và review diff/whitespace thành công.
Không có thay đổi trong src, frontend, migration, Dockerfile, nginx, dependency
hoặc CI. Không khẳng định media HTTP, TLS hoặc đăng nhập staging đã được nghiệm thu.
