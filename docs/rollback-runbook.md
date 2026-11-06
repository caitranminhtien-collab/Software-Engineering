# BE14 — MVP rollback runbook

## Phạm vi, kích hoạt và thẩm quyền

Đối chiếu repository tại commit **a51ef5b**, ngày **06/11/2026**. Đây là tài liệu
chuẩn bị; **chưa có rollback/deploy/restore được thực hiện hoặc nghiệm thu trong
BE14**. Mọi lệnh bên dưới chỉ dành người vận hành được phép sau khi các gate
được ký; placeholder phải được thay bằng inventory của đúng môi trường.

Kích hoạt đánh giá rollback khi candidate gây lỗi nghiêm trọng: API/health không
phục hồi trong cửa sổ đã duyệt, login/phân quyền/CSRF hoặc media public sai,
nguy cơ mất/sai dữ liệu, hay UAT bắt buộc thất bại. Không rollback chỉ vì một
ngưỡng chưa từng được thống nhất hoặc để che một lỗi môi trường chưa xác định.

Người quyết định release/incident commander chọn phương án, owner ứng dụng và
owner dữ liệu xác nhận tương thích, operator thực hiện, reviewer kiểm tra bằng
chứng. Ghi sự cố, thời điểm/múi giờ, phạm vi ảnh hưởng, quyết định và người ký.
Nếu thiếu người có thẩm quyền, giữ ngừng ghi và ghi BLOCKED; không tự restore.

## Inventory phải chuẩn bị trước triển khai

| Cần lưu | Nội dung không chứa secret |
| --- | --- |
| Phiên bản trước và candidate | Full Git SHA, cặp backend/frontend image reference, registry digest nếu có, local image ID, build/provenance record |
| Cấu hình triển khai | Phiên bản Compose/nginx/entrypoint được review, Docker context, project, port và network; tham chiếu protected runtime config và secret version, không lưu giá trị vào ticket |
| Tài nguyên dữ liệu | Tên DB/role/owner/ACL/migration/schema dự kiến; volume PostgreSQL; uploads root, quyền filesystem và manifest |
| Backup-set trước release | ID chung DB/uploads, mốc ngừng ghi, timestamp, checksum, PostgreSQL/client version, kết quả restore thử trên đích mới có bảo vệ |
| Tương thích image cũ | Kết luận schema/data/API/session/media tương thích; xác nhận entrypoint cũ không tự chạy migration nguy hiểm |
| Khả năng quay về | Image cũ còn trong cache hoặc artifact đã xác thực; không chỉ còn một tag mutable có thể đã trỏ sang build khác |
| Khôi phục vận hành | Người quyết định, owner ứng dụng/dữ liệu, operator/reviewer, thời hạn, kênh incident và tiêu chí mở traffic |

Không dùng git reset --hard, checkout/pull code cũ hoặc ghi đè workspace đang
có thay đổi để triển khai. Dùng artifact và bộ cấu hình release được duyệt ở
nơi riêng; không rebuild “cùng SHA” rồi coi đó là image cũ nếu ID/digest khác.
Không xóa bản hiện tại hoặc backup trước khi có quyết định kết thúc incident.

## 1. Ngừng ghi và bảo toàn hiện trạng

1. Đóng ingress/tunnel hoặc chế độ bảo trì của hạ tầng **đã được thiết kế và
   được phép vận hành**. Repo hiện không có maintenance/read-only flag dùng
   chung; không tự bịa biến môi trường để giả định đã ngừng ghi.
2. Dừng backend/frontend của đúng project sau khi xác minh ownership như mẫu
   bên dưới; giữ PostgreSQL/Redis. Xác nhận cả Staff, Visitor, job/import và
   client khác đều không còn ghi. Chỉ dừng ứng dụng này chưa chứng minh mọi
   writer ngoài Compose đã dừng; phối hợp owner của chúng, không kill tùy tiện.
3. Giữ trạng thái ngừng ghi trong lúc ghi nhận/sao lưu hiện trạng DB và uploads
   cùng mốc. Làm theo [BE05](BE05-backup-restore.md), không chạy lệnh mẫu gắn
   với container/DB DEV trong BE05 trên đích khác mà chưa ánh xạ và duyệt.
4. Giữ bằng chứng lỗi đã lọc và dữ liệu mới phát sinh, kể cả khi nghi ngờ dữ
   liệu đã hỏng. Không ghi đè snapshot/backup trước release; snapshot hiện trạng
   phục vụ điều tra không mặc nhiên là backup tốt để restore.

Nếu không thể xác nhận ngừng ghi hoặc đích/ownership, dừng thao tác dữ liệu.
Log chia sẻ chỉ chứa marker/code/status cần thiết, theo [BE13](backend-operations-guide.md);
không bật transcript hoặc in env, Config.Env, cookie, raw dump/log chứa secret.

## 2. Chọn rollback image hay phục hồi dữ liệu

| Tình huống | Phương án được xem xét | Gate trước thực hiện |
| --- | --- | --- |
| Lỗi ứng dụng, schema/dữ liệu hiện tại tương thích với image cũ | Rollback đúng cặp image, giữ DB/uploads/Redis | Owner ứng dụng và dữ liệu duyệt tương thích; image/cấu hình được xác thực |
| Migration hoặc dữ liệu mới không tương thích image cũ | Không rollback image đơn thuần | Chọn roll-forward/fix hoặc quy trình khôi phục dữ liệu riêng được duyệt |
| Dữ liệu hỏng/mất hoặc cần quay về mốc backup | Restore kiểm chứng vào DB và uploads mới, rồi xét chuyển kết nối | Backup/checksum/version/owner/ACL/đích và tác động dữ liệu sau backup được duyệt |
| PostgreSQL/Redis/proxy hỏng nhưng image không phải nguyên nhân | Xử lý hạ tầng theo [BE06](BE06-security-operations.md) | Không restore DB/xóa volume để chữa lỗi kết nối |

Rollback image **không** đảo migration, khôi phục bản ghi hoặc file uploads.
Không tự viết/chạy down migration, chạy lại init hoặc bật profile BE10 trên DB
hiện hữu. Compatibility không thể suy ra từ health/ready vì endpoint chỉ kiểm
tra SELECT 1/PING. Cần review schema, dữ liệu, query, session và media của image
cũ; source hiện tại không tự chạy migration lúc startup nhưng entrypoint artifact
cũ vẫn phải được xác minh riêng.

## 3. Mẫu PowerShell cho rollback image đã duyệt

### Điều kiện và định danh

Chỉ dùng khi cặp image cũ tương thích **DB/uploads hiện tại**. File runtimeEnv
là cấu hình runtime hiện hành đã kiểm tra và bảo vệ; không mù quáng dùng env cũ
làm đổi DB/password/session secret/uploads. Giữ đích dữ liệu cho image rollback.
Đổi dữ liệu là quy trình khác ở mục 4.

Mở terminal vận hành riêng, xác minh Docker context/project với inventory.
Không mang BE04_* hoặc COMPOSE_PROFILES không được kiểm soát từ shell khác;
process env có thể ưu tiên hơn --env-file. Không in giá trị để kiểm tra.

```powershell
$project = "<verified_existing_project>"
$composeFile = "<absolute_path_to_approved_compose.staging.yml>"
$runtimeEnv = "<protected_path_to_approved_current_runtime.env>"
$oldBackendImage = "<cached_backend_repo_at_digest_or_unique_tag>"
$oldFrontendImage = "<cached_frontend_repo_at_digest_or_unique_tag>"
$expectedBackendId = "sha256:<recorded_backend_image_id>"
$expectedFrontendId = "sha256:<recorded_frontend_image_id>"
$composeArgs = @(
    "compose",
    "--env-file", $runtimeEnv,
    "--project-name", $project,
    "--file", $composeFile
)
docker context show
```

Ưu tiên reference dạng repository@sha256:digest đã có local. Nếu dùng unique
tag, vẫn đối chiếu image ID vì tag có thể bị đổi. Không dùng mặc định :be04
hoặc latest mà không xác thực. Mẫu dưới không pull để tìm image thiếu: nếu
không có artifact cũ đúng ID thì BLOCKED, khôi phục artifact theo quy trình
được duyệt riêng trước, không đoán tag.

```powershell
$actualBackendId = docker image inspect --format '{{.Id}}' $oldBackendImage
if ($LASTEXITCODE -ne 0 -or $actualBackendId -ne $expectedBackendId) {
    throw "Backend rollback artifact missing or mismatched; stop."
}
$actualFrontendId = docker image inspect --format '{{.Id}}' $oldFrontendImage
if ($LASTEXITCODE -ne 0 -or $actualFrontendId -ne $expectedFrontendId) {
    throw "Frontend rollback artifact missing or mismatched; stop."
}
foreach ($service in @("backend", "frontend", "postgres", "redis")) {
    $containerIds = @(docker @composeArgs ps --all -q $service)
    if ($LASTEXITCODE -ne 0 -or $containerIds.Count -ne 1) {
        throw "Unexpected service inventory; stop."
    }
    $labelJson = docker inspect --format '{{json .Config.Labels}}' $containerIds[0]
    if ($LASTEXITCODE -ne 0) {
        throw "Cannot inspect ownership; stop."
    }
    $labels = $labelJson | ConvertFrom-Json
    if ($labels.'com.docker.compose.project' -ne $project -or $labels.'com.docker.compose.service' -ne $service) {
        throw "Project/service ownership mismatch; stop."
    }
}
```

Kiểm tra thêm DB/volume/uploads/network và config reference khớp inventory,
không chỉ dựa label. Không lấy output docker inspect đầy đủ làm bằng chứng
công khai vì có thể chứa env. Nếu inventory hoặc compatibility không rõ, chưa
được đi tiếp dù image ID khớp.

### Dừng writer, recreate đúng image, giữ dependency/data

[Compose hiện có](../compose.staging.yml) khai báo cả image lẫn build; tên image
lấy từ BE04_BACKEND_IMAGE/BE04_FRONTEND_IMAGE và có default mutable :be04.
Do đó không dùng `up --build`, `build` hoặc pull theo tag mutable trong rollback.
`--no-build` chặn build từ context hiện tại; `--pull never` yêu cầu artifact
local đã xác thực; `--no-deps` tránh tự recreate/start PostgreSQL/Redis.

Sau khi người có thẩm quyền đã đóng ingress và xác nhận không có writer ngoài:

```powershell
$previousBackendImage = [Environment]::GetEnvironmentVariable("BE04_BACKEND_IMAGE", "Process")
$previousFrontendImage = [Environment]::GetEnvironmentVariable("BE04_FRONTEND_IMAGE", "Process")
try {
    $env:BE04_BACKEND_IMAGE = $oldBackendImage
    $env:BE04_FRONTEND_IMAGE = $oldFrontendImage
    docker @composeArgs config --quiet
    if ($LASTEXITCODE -ne 0) {
        throw "Invalid approved configuration; stop."
    }
    docker @composeArgs stop backend frontend
    if ($LASTEXITCODE -ne 0) {
        throw "Writers not confirmed stopped; keep ingress closed."
    }
    $rollbackUpArgs = @(
        "up", "-d",
        "--no-build",
        "--pull", "never",
        "--no-deps",
        "--force-recreate",
        "--wait",
        "--wait-timeout", "120",
        "backend", "frontend"
    )
    docker @composeArgs @rollbackUpArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Rollback start/health failed; keep ingress closed."
    }
    docker @composeArgs ps
    if ($LASTEXITCODE -ne 0) {
        throw "Cannot verify service state."
    }
    docker @composeArgs exec -T frontend nginx -t
    if ($LASTEXITCODE -ne 0) {
        throw "Proxy configuration failed verification."
    }
}
finally {
    [Environment]::SetEnvironmentVariable("BE04_BACKEND_IMAGE", $previousBackendImage, "Process")
    [Environment]::SetEnvironmentVariable("BE04_FRONTEND_IMAGE", $previousFrontendImage, "Process")
}
```

finally chỉ khôi phục biến của terminal, **không tự undo container đã thay**.
Sau lệnh phải ghi nhận cấu hình image đã được chọn trong nơi quản lý deployment
được bảo vệ; lần up sau không được quay về default tag khác. Không in toàn bộ
Compose config; --quiet không in giá trị đã nội suy.

Recreate frontend cùng backend vì [Nginx](../deploy/nginx/default.conf) dùng
upstream backend:3000, không có cấu hình DNS refresh động trong repo. Chỉ
recreate backend có thể để frontend dùng địa chỉ cũ. Không chạm postgres/redis,
volume hoặc uploads trong bước image rollback. `--wait` chỉ là gate sức khỏe
ban đầu, không thay các kiểm chứng nghiệp vụ ở mục 6.

## 4. Restore dữ liệu: quyết định riêng, không phải image rollback

Không đưa lệnh restore tự động vào bước đổi image. Trước mọi ghi/restore, owner
dữ liệu và reviewer phải xác nhận:

1. Backup-set DB và uploads đúng nguồn, cùng mốc ngừng ghi, được phép sử dụng;
   checksum archive/ZIP/manifest khớp, archive đọc được bằng pg_restore --list.
   Truyền binary bằng file/docker cp, không qua chuỗi UTF-8/redirect PowerShell.
2. PostgreSQL source/target và pg_dump/pg_restore version tương thích; kiểm tra
   extension, encoding/collation cần thiết và migration của image được chọn.
   Restore cùng PostgreSQL 18 ở BE11 không chứng minh mọi upgrade/downgrade.
3. Chọn owner/role/ACL tường minh. Database dump không tạo role/password cấp
   cluster. Nếu bỏ owner/ACL bằng --no-owner/--no-privileges phải chuẩn bị role
   restore và runtime grants theo policy đã duyệt, không cấp superuser cho app.
4. Tạo DB đích **mới, trống**, thư mục uploads đích mới, biệt lập và có quyền
   truy cập phù hợp. Xác minh host/context/container/label/name/DB/OID/owner và
   không có dữ liệu trước ghi. Không dùng đích đang phục vụ hoặc dùng --clean
   trên DB hiện hữu. Không đổi .env rồi giả định DB mới đã được tạo.
5. Restore một transaction, dừng khi lỗi theo [BE05](BE05-backup-restore.md).
   Dùng [BE11](BE11-backup-restore-validation.md) để tham khảo guard và đối chiếu,
   không chạy runner synthetic rồi coi backup thật đã được kiểm chứng.
6. So tên bảng/count, giá trị quan trọng và quan hệ, constraint, sequence; so
   uploads với manifest/tên/kích thước/SHA-256, URL media và publication. DB
   dump chỉ chứa file_url/metadata, không chứa ảnh/audio trong bind uploads.
7. Chưa switch traffic. Xác minh app/image tương thích trên đích kiểm chứng có
   bảo vệ; không dùng bản restore chứa dữ liệu thật làm UAT ghi thử. UAT dùng
   fixture được phép trong môi trường riêng.
8. Chỉ sau ký duyệt mới chuẩn bị runtime config trỏ **đồng thời** DB mới và
   uploads tương ứng; giữ DB/uploads cũ nguyên trạng. Với Compose hiện tại,
   BE04_DB_NAME còn được dùng cho POSTGRES_DB lúc init và healthcheck postgres.
   Đổi biến không tự tạo/restore DB trên volume cũ; `--no-deps` cũng không đổi
   env của container postgres đang chạy. Kiểm tra backend thực sự đọc DB mới,
   không lấy healthcheck của DB tên cũ làm bằng chứng chuyển dữ liệu thành công.

Không chạy bootstrap BE10 hoặc chuỗi migration init trên bản restore. Nếu cần
đích/Compose layout khác (ví dụ PostgreSQL ở host khác trong khi DB_HOST đang
cố định postgres), cần kế hoạch config được review riêng; không sửa ad hoc trong
incident hoặc tự chuyển cả stack sang volume cũ/mới mà chưa kiểm chứng.

## 5. Redis/session và dữ liệu phát sinh sau backup

- Image rollback giữ DB/uploads hiện tại nếu tương thích, nên không chủ đích
  mất dữ liệu sau backup. Vẫn kiểm tra định dạng/session/API giữa hai phiên bản.
- Restore mốc cũ có thể bỏ qua mọi ghi sau mốc đó: tài khoản, duyệt/publish,
  localization, routes, visitor events, audio tiến trình và media mới. Ghi rõ
  khoảng thời gian/dữ liệu bị ảnh hưởng và quyết định chấp nhận; không cam kết
  RPO=0 chỉ vì pg_restore thành công. Giữ snapshot hiện trạng để đối soát; không
  tự merge dữ liệu/ID/sequence giữa hai bản trong runbook này.
- [Session config](../src/config/session.ts) dùng Redis prefix hue:staff: và
  cookie hue_staff_session, thời hạn 8 giờ. Compose Redis không có cam kết AOF/
  persistence riêng. DB dump/uploads backup không khôi phục Redis/session.
- Với image-only, giữ Redis và secret hiện hành nếu tương thích; không mặc định
  session chắc chắn còn hợp lệ. Đổi signing secret hoặc format có thể buộc login lại.
- Khi chuyển DB về backup, session Staff cũ có thể tham chiếu ID/quyền đã khác.
  Phải có quyết định vô hiệu hóa phạm vi session bị ảnh hưởng và yêu cầu đăng
  nhập lại. Nếu dùng rotation signing secret, thực hiện qua secret store/quy
  trình được duyệt; không ghi secret vào lệnh/tài liệu hoặc âm thầm thay credential.
  Không dùng flush toàn Redis vì còn dữ liệu ngoài Staff session; không xóa
  volume để ép logout. CSRF token phải được lấy lại trong session hợp lệ.

## 6. Xác minh sau rollback, trước mở lại ghi/traffic

Điền trạng thái theo cùng quy ước của [release checklist](mvp-release-checklist.md).
Tất cả dòng bên dưới dành cho incident thực tế, chưa được chạy ở BE14.

| ID | Kiểm chứng | Trạng thái | Bằng chứng | Người thực hiện | Thời điểm |
| --- | --- | --- | --- | --- | --- |
| V01 | Container image ID/digest khớp đúng cặp đã duyệt; project/config/DB/uploads không bị đổi ngoài kế hoạch | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| V02 | Bốn service running/healthy theo phạm vi; nginx -t thành công; không còn lỗi proxy upstream cũ | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| V03 | Qua proxy: /api/v1/health/live, /api/v1/health/ready có status/body đúng; xác minh DB đích thực tế, schema/role riêng | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| V04 | Attractions/routes/chi tiết/stops khớp manifest; published media tải đúng, uploads có file/quyền và draft không lộ cho khách | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| V05 | Login/logout/session/CSRF, 401/403 và HTTPS/proxy đúng bằng tài khoản test được phép; không thử ghi lên nội dung thật | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| V06 | Nếu phục hồi dữ liệu: checksum/manifest, bảng/giá trị/sequence/owner/ACL và DB/uploads cùng mốc được reviewer xác nhận; nếu không áp dụng ghi lý do | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| V07 | Tác động sau backup, session invalidation và rủi ro còn lại được duyệt; người quyết định cho phép mở lại traffic/ghi | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |

Đường kiểm tra và log đã lọc xem [BE13](backend-operations-guide.md). Proxy
staging mặc định localhost:8080; port do BE04_HTTP_PORT quyết định, không nhầm
frontend DEV 8000. Cookie Secure cần HTTPS/proxy thực, không chỉ GET localhost.
Giữ ingress đóng trong lúc xác minh; chỉ cho tester được phép truy cập.

## 7. Nếu rollback thất bại

Giữ ngừng ghi/ingress đóng. Ghi bước lỗi, trạng thái container/image/DB đích và
bằng chứng đã lọc; không tự chạy lặp up, đổi tag ngẫu nhiên, bỏ health gate,
migration ngược hoặc restore đè. Giữ cả backup và trạng thái trước/sau sự cố.
Escalate người quyết định/owner ứng dụng/dữ liệu để chọn sửa hạ tầng, roll-forward,
artifact khác đã xác thực hoặc kế hoạch phục hồi dữ liệu riêng. Nếu thiếu bằng
chứng an toàn thì BLOCKED/NO-GO, không tuyên bố đã phục hồi vì process chạy lại.

Không có lệnh tự động DROP DB, xóa volume hoặc prune trong runbook. Sau incident,
owner lập kế hoạch giữ/xử lý tài nguyên riêng có review, không dọn bằng script
của BE08/BE10/BE11 vì những runner đó chỉ sở hữu tài nguyên synthetic của chúng.

## Nguồn và giới hạn xác minh BE14

[BE03](BE03-testing.md), [BE04](BE04-staging.md),
[BE05](BE05-backup-restore.md), [BE06](BE06-security-operations.md),
[BE07](BE07-ci.md), [BE08](BE08-smoke.md),
[BE09](BE09-security-regression.md), [BE10](BE10-staging-validation.md),
[BE11](BE11-backup-restore-validation.md), [BE12](test-coverage-report.md),
[BE13](backend-operations-guide.md) cung cấp các quy trình/bằng chứng chuyên sâu;
không sao chép nguyên runbook hoặc coi PASS lịch sử là kết quả incident này.
Đối chiếu thêm [M30 acceptance](m30/M30_ACCEPTANCE_REPORT.md),
[M30 UAT](m30/M30_UAT_CHECKLIST.md), [Visitor UAT](visitor-uat.md).

BE14 chỉ kiểm tra tài liệu, cú pháp PowerShell, link/bảng/whitespace và trợ giúp
CLI Compose cho các flag rollback. Không chạy các ví dụ, gọi daemon/container/
DB, deploy, restore, migration hoặc cố ý làm hỏng test. Chưa xác minh image cũ
có sẵn, registry, policy thật, đích dữ liệu, TLS hay khả năng rollback runtime;
không kết luận production ready hoặc rollback đã được nghiệm thu.
