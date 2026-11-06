# BE04 — Staging

## Môi trường

- Chạy bằng Docker Compose trên máy Windows.
- Có bốn service: PostgreSQL, Redis, backend và frontend Nginx.
- Database staging: hue_tourism_staging, tách riêng DEV.
- Backend dùng role hue_app, không có quyền superuser,
  tạo database hoặc tạo role.
- PostgreSQL và Redis không mở cổng ra host.
- Frontend chỉ mở tại 127.0.0.1:8080.
- HTTPS được cung cấp qua Cloudflare Quick Tunnel.
- Đây là môi trường kiểm thử tạm thời trên máy cá nhân.

## Cấu hình

- Dockerfile: build TypeScript và chạy backend bằng user node.
- Dockerfile.frontend: đóng gói các file frontend tĩnh.
- compose.staging.yml: cấu hình bốn service.
- deploy/nginx/default.conf: phục vụ frontend và proxy.
- .env.staging chứa cấu hình bí mật, được Git bỏ qua.
- .dockerignore loại file môi trường, uploads và backup
  khỏi build context.

Các biến trong .env.staging:

- BE04_POSTGRES_PASSWORD
- BE04_APP_PASSWORD
- BE04_SESSION_SECRET
- BE04_UPLOADS_PATH
- BE04_MEDIA_LEGACY_ORIGINS

BE10 bổ sung `.env.staging.example` chỉ chứa placeholder. Có thể tùy chỉnh
`BE04_DB_NAME`, `BE04_HTTP_PORT`, `BE04_BACKEND_IMAGE`, `BE04_FRONTEND_IMAGE`;
khi không đặt, giá trị vẫn là database `hue_tourism_staging`, cổng loopback
8080 và hai image tag `:be04` như trước. Không dùng file mẫu làm credential thật.

Không commit mật khẩu, cookie, bản dump hoặc ảnh upload.

## Dữ liệu ban đầu

- Khôi phục bản backup BE05 vào database staging riêng.
- Có 13 bảng thuộc hue_app, 11 di tích và 12 bản ghi media.
- Khôi phục 13 file ảnh vào thư mục staging riêng.
- Đã đối chiếu đường dẫn, kích thước và SHA-256
  của cả 13 file với manifest.

## Proxy và phiên Staff

- /api/v1/ được chuyển tới backend.
- /uploads/media/ được chuyển tới backend,
  đi qua middleware kiểm tra quyền.
- Nginx không phục vụ uploads trực tiếp.
- Backend chạy NODE_ENV=production và TRUST_PROXY=1.
- Nginx chuyển tiếp giao thức HTTPS từ Cloudflare.
- Nginx chuyển CF-Connecting-IP sang header IP cho backend;
  nếu thiếu thì dùng địa chỉ kết nối trực tiếp.
- Cách tin cậy header này áp dụng cho mô hình hiện tại:
  truy cập công khai qua Cloudflare Tunnel,
  cổng origin chỉ mở trên localhost.
- Cookie Staff được quan sát có HttpOnly, Secure
  và SameSite=Lax.

## Bằng chứng kiểm tra — 31/10/2026

- Build hai Docker image thành công.
- Nginx kiểm tra cú pháp thành công.
- Readiness qua localhost và HTTPS trả HTTP 200,
  PostgreSQL và Redis đều connected.
- Giao diện khách hiển thị danh sách di tích và ảnh.
- Admin đăng nhập qua HTTPS thành công.
- Sau F5 vẫn giữ được phiên đăng nhập.
- Phiên ẩn danh gọi Staff /auth/me nhận UNAUTHORIZED.
- Sau đăng xuất, Staff /auth/me nhận UNAUTHORIZED.
- Upload và xuất bản Media #27 thành công.
- API công khai trả URL tương đối cho Media #27.
- Khách ẩn danh xem được ảnh #27 qua HTTPS.
- Sau khi tạo lại container backend và frontend,
  ảnh #27 vẫn tải được.
- Sau cập nhật header IP, readiness HTTPS vẫn HTTP 200.

## Giới hạn và phần còn cần kiểm tra

- Quick Tunnel có URL tạm thời, phụ thuộc máy cá nhân
  và tiến trình cloudflared.
- Chưa có hostname cố định và lịch vận hành chung của nhóm.
- Chưa kiểm chứng việc tách giới hạn đăng nhập
  giữa hai IP thực tế sau cập nhật proxy.
- Chưa thử media nháp bằng phiên Staff và khách trên staging.
- Chưa diễn tập rollback phiên bản ứng dụng.
- Chưa xác nhận phục hồi toàn bộ stack sau khởi động lại máy.
- Chat đang dùng extractive, embedding dùng dev;
  chưa kiểm thử tích hợp nhà cung cấp AI trên staging.
- Chưa coi đây là triển khai production hoặc nghiệm thu đầy đủ.
## Vận hành môi trường đã khởi tạo

Chạy các lệnh tại thư mục gốc repository.
Cần có .env.staging, database đã restore và thư mục ảnh staging.

### Kiểm tra cấu hình

```powershell
docker compose --env-file .env.staging -p hue-be04-staging -f compose.staging.yml config --quiet
```

### Khởi động hoặc cập nhật

```powershell
docker compose --env-file .env.staging -p hue-be04-staging -f compose.staging.yml up -d --build --wait
```

Nếu tạo lại backend, tạo lại cả frontend để Nginx
nhận địa chỉ container backend mới:

```powershell
docker compose --env-file .env.staging -p hue-be04-staging -f compose.staging.yml up -d --force-recreate --wait backend frontend
```

### Xem trạng thái

```powershell
docker compose --env-file .env.staging -p hue-be04-staging -f compose.staging.yml ps
```

### Mở HTTPS thử nghiệm

Chạy trong cửa sổ PowerShell riêng và giữ cửa sổ hoạt động:

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:8080
```

Dùng URL mới được in ra. Không dùng lại URL cũ
sau khi tạo một Quick Tunnel khác.

### Dừng môi trường

Nhấn Ctrl+C trong cửa sổ cloudflared để đóng tunnel.
Sau đó chạy:

```powershell
docker compose --env-file .env.staging -p hue-be04-staging -f compose.staging.yml stop
```

Lệnh stop giữ lại container và dữ liệu.
Không dùng down --volumes khi cần giữ database staging.

## Bootstrap và nghiệm thu BE10 trên stack mới

Profile `be10-bootstrap` không được bật trong các lệnh vận hành staging ở trên.
Không chạy bootstrap trên database đã restore, DEV hoặc staging hiện hữu.
Script chỉ chấp nhận project `hue-be10-<id>` và DB `hue_be10_test_<id>` khớp
opt-in của một lần chạy mới; DB phải trống và chưa có role `hue_app`.

Bootstrap chạy sáu migration hiện có bằng role quản trị, rồi cấp cho `hue_app`
quyền CONNECT, USAGE schema, DML bảng và USAGE/SELECT sequence. Role ứng dụng
không sở hữu DB/schema và không được cấp quyền superuser, createdb, createrole,
replication, bypassrls hoặc CREATE schema. Không chạy migration tự động mỗi lần
backend khởi động. Readiness chỉ kiểm tra kết nối, không thay nghiệm thu schema/API.

PostgreSQL healthcheck dùng TCP; frontend có HTTP healthcheck cho index.html.
depends_on vẫn chỉ điều phối khởi động. Unhealthy không tự kích hoạt restart;
restart policy hiện tại vẫn là unless-stopped cho bốn service lâu dài.

Chạy kiểm chứng độc lập, không cần `.env.staging` hoặc dữ liệu cá nhân:

```powershell
node deploy/staging/validate-be10.cjs
```

Runner tạo cấu hình tổng hợp, context build và uploads ngoài repository, project,
DB, image tag và port riêng. Chỉ cleanup tài nguyên của lần chạy đó.
Chi tiết và kết quả thực tế: [BE10-staging-validation.md](BE10-staging-validation.md).
