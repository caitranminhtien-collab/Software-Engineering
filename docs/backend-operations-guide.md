# BE13 — Backend operations guide

## Phạm vi và điều kiện

Hướng dẫn được đối chiếu code tại commit **1daf960**, ngày **06/11/2026**.
Các lệnh khởi động, SQL và thao tác vận hành dưới đây là hướng dẫn cho người
vận hành, **không được chạy trong phiên BE13**. Không có PASS vận hành mới.
Tất cả lệnh PowerShell chạy từ thư mục gốc một bản clone/local workspace riêng.
Không dùng chung uploads hoặc cấu hình của workspace chứa dữ liệu cần bảo toàn.

| Thành phần | Điều kiện dựa trên repository |
| --- | --- |
| Node.js | Khuyến nghị Node 24, khớp Dockerfile/CI. Vitest 5.0.5 trong lockfile yêu cầu `^22.12.0 || ^24.0.0 || >=26.0.0`; không chọn Node chỉ theo engine tối thiểu của một dependency khác |
| npm | Dùng npm đi cùng Node và `npm ci` với lockfile v3. Repo không pin phiên bản npm; npm 11.19.1 là phiên bản đã ghi nhận ở BE12, không phải minimum bắt buộc |
| Docker | Docker daemon hỗ trợ Linux containers; Compose plugin có profiles, depends_on/service_healthy và `up --wait` cho test/staging. Repo không pin minimum phiên bản Engine/Compose |
| PostgreSQL | PostgreSQL 18 là mốc trong compose test/staging và các runner; không suy ra đây là mọi phiên bản server được hỗ trợ |
| Redis | Redis 7 theo hai compose; cần sẵn sàng trước khi backend mở HTTP |
| Client DB | Có thể dùng psql trong image postgres:18; không cần cài psql host theo đường dựng DEV bằng Docker bên dưới |
| Frontend DEV | Node builtin, không cần package/build frontend riêng; dùng proxy dev-server, không dùng static server bất kỳ cho đăng nhập Staff |

Nguồn: [package](../package.json), [lockfile](../package-lock.json),
[Dockerfile](../Dockerfile), [compose test](../compose.test.yml),
[compose staging](../compose.staging.yml), [frontend dev server](../frontend/dev-server.js).

## Các môi trường và cổng đã xác minh

| Môi trường | Backend / Frontend | PostgreSQL / Redis | Lưu ý |
| --- | --- | --- | --- |
| DEV local theo code/mẫu | Backend 3000, có thể đổi PORT; frontend 127.0.0.1:8000, đổi bằng FRONTEND_PORT | Mẫu dùng localhost:5432 và localhost:6379 | Frontend proxy cố định tới 127.0.0.1:3000, không tự đi theo PORT backend |
| Compose test BE03 | Không chứa backend/frontend | Host 127.0.0.1:5434 → DB 5432; 127.0.0.1:6380 → Redis 6379 | Database hue_tourism_test; role hue_app do image khởi tạo là superuser của cluster test, không dùng chính sách này cho DEV/staging |
| Server đo BE06 | Backend 3001, không có frontend tương ứng | 5434 / 6380 | Xem tests/run-be06-server.cjs; UI dev 8000 vẫn proxy 3000 |
| BE08 | Backend cổng ngẫu nhiên; runner gọi qua 127.0.0.1 | DB/Redis publish cổng loopback ngẫu nhiên | Container và working directory/uploads tạm riêng |
| Docker staging mặc định | Nginx 127.0.0.1:8080 → container 80; backend 3000 nội bộ | postgres:5432 / redis:6379 nội bộ, không publish host | BE04_HTTP_PORT có thể đổi host port; không cần FRONTEND_PORT |
| BE10 nghiệm thu | Frontend loopback ngẫu nhiên, backend nội bộ | Không publish DB/Redis host | Project, DB, tag image và uploads riêng |
| BE11 | Không có backend/frontend | PostgreSQL network=none, không publish port | Chỉ backup/restore dữ liệu tổng hợp |

Backend [server.ts](../src/server.ts) gọi listen(PORT) không chỉ định host;
không khẳng định process DEV chỉ bind loopback. Không phơi máy dev ra Internet.
Frontend dev server có bind 127.0.0.1 rõ ràng.

## Biến môi trường

Backend dùng dotenv/config khi khởi động; `.env` DEV thuộc working directory.
Biến đã có trong process có thể chi phối cấu hình: dùng terminal DEV riêng,
không mang cấu hình DB/proxy của môi trường khác vào. Không in toàn bộ env để
chẩn đoán. Frontend dev-server không nạp dotenv: FRONTEND_PORT cần nằm trong
môi trường tiến trình frontend, không chỉ thêm vào `.env` backend.

| Tên | Mục đích | Bắt buộc / mặc định đã đối chiếu |
| --- | --- | --- |
| PORT | HTTP backend | Code mặc định 3000; giữ 3000 nếu dùng frontend dev proxy hiện tại |
| FRONTEND_PORT | HTTP frontend DEV | Code mặc định 8000, độc lập PORT |
| NODE_ENV | Chọn hành vi môi trường/cookie | Mẫu DEV là development, staging đặt production; code không tự mặc định production |
| DB_HOST | Host PostgreSQL | Nên đặt tường minh 127.0.0.1 ở DEV; staging là postgres. Không dựa vào fallback của driver |
| DB_PORT | Port PostgreSQL | Code dùng 5432 khi biến không tồn tại; đặt số hợp lệ, không để rỗng |
| DB_NAME | Database ứng dụng | Bắt buộc đặt đúng DB riêng về mặt vận hành; code chuyển giá trị sang driver, không tự tạo DB |
| DB_USER | Role kết nối | DEV/staging dùng hue_app được chuẩn bị trước; code không tự tạo role |
| DB_PASSWORD | Credential role DB | Đặt credential riêng khớp role; chỉ dùng placeholder `<app_password>` trong tài liệu |
| DB_SSL | TLS DB | Chỉ chuỗi true bật SSL với rejectUnauthorized=true; local/compose hiện dùng false, không áp dụng tùy tiện cho DB từ xa |
| REDIS_URL | Kết nối Redis | Code mặc định redis://localhost:6379; staging redis://redis:6379 |
| SESSION_SECRET | Ký session Staff | Đặt `<long_generated_secret>` riêng; production yêu cầu ít nhất 32 ký tự. Không dùng fallback DEV cho triển khai dùng chung |
| TRUST_PROXY | Tin một proxy trước backend | Chỉ bật khi NODE_ENV=production và giá trị là 1; staging đang đặt 1 với Nginx/tunnel tin cậy |
| EMBEDDING_PROVIDER | Embedding | dev mặc định; openai chỉ khi được phép dùng dịch vụ ngoài |
| CHAT_PROVIDER | Sinh câu trả lời | extractive mặc định; hỗ trợ openai/gemini. DEV dựng cơ bản đặt extractive |
| MEDIA_UPLOAD_MAX_BYTES | Giới hạn multipart file | 26214400 byte nếu thiếu/sai giá trị nguyên dương |
| MEDIA_MAX_IMAGE_BYTES | Giới hạn ảnh theo validator | 8388608 byte nếu thiếu/sai |
| MEDIA_MAX_AUDIO_BYTES | Giới hạn audio theo validator | 26214400 byte nếu thiếu/sai |
| MEDIA_LEGACY_ORIGINS | Danh sách origin cũ cần đổi URL local về tương đối | Mặc định rỗng; chỉ khai báo origin đã xác định, không ánh xạ mọi URL ngoài |
| MEDIA_PUBLIC_BASE_URL | Biến còn trong mẫu env | Không thấy code src hiện tại đọc biến này; đổi nó không đổi root uploads hoặc tự sửa URL media |
| KNOWLEDGE_SEMANTIC_MIN_SCORE | Ngưỡng knowledge relevance | Mặc định 0.35 khi thiếu/sai; giá trị hợp lệ trong [-1, 1] |
| LOCATION_MAX_ACCURACY_M | Sai số GPS chấp nhận | Mặc định 50 mét |
| LOCATION_MAX_SAMPLE_AGE_SECONDS | Tuổi mẫu GPS tối đa | Mặc định 30 giây |
| LOCATION_SUGGESTION_COOLDOWN_SECONDS | Cooldown gợi ý | Mặc định 300 giây |

Các biến dịch vụ ngoài không cần cho health/list API với dev/extractive:

| Tên | Mục đích / yêu cầu |
| --- | --- |
| OPENAI_API_KEY | Cần nếu chọn OpenAI; dùng `<provider_key>`, không ghi key trong frontend hoặc lệnh/log |
| OPENAI_CHAT_MODEL | Cần khi CHAT_PROVIDER=openai; chat provider không có model fallback |
| OPENAI_EMBEDDING_MODEL | Mặc định text-embedding-3-small |
| OPENAI_EMBEDDING_DIMENSIONS | Mặc định 256 |
| OPENAI_EMBEDDING_TIMEOUT_MS | Mặc định 15000 ms |
| OPENAI_EMBEDDING_ENDPOINT | Mặc định endpoint embeddings của OpenAI; không đặt URL chứa credential |
| GEMINI_API_KEY | Cần cho Gemini chat và chức năng generate/regenerate localization; chọn extractive không tự thay thế dịch vụ dịch |
| GEMINI_CHAT_MODEL | Mặc định gemini-3.1-flash-lite |
| GEMINI_TRANSLATION_MODEL | Fallback sang GEMINI_CHAT_MODEL, rồi gemini-3.1-flash-lite |

Nguồn: [mẫu DEV](../.env.example), [DB](../src/config/database.ts),
[Redis](../src/config/redis.ts), [session](../src/config/session.ts),
[embedding](../src/adapters/embedding/openai-embedding.provider.ts),
[chat](../src/adapters/llm/chat-answer.provider.ts),
[Gemini chat](../src/adapters/llm/gemini-answer.provider.ts),
[dịch](../src/adapters/llm/gemini-translation.provider.ts),
[media validator](../src/adapters/media/media-file.validator.ts),
[upload](../src/middleware/staff-media-upload.middleware.ts),
[knowledge](../src/services/knowledge.service.ts),
[location](../src/services/location-suggestion.service.ts).

Các biến Compose staging nằm trong [mẫu staging](../.env.staging.example):

| Tên | Vai trò / mặc định |
| --- | --- |
| BE04_POSTGRES_PASSWORD | Bắt buộc cho postgres quản trị; `<admin_password>` riêng |
| BE04_APP_PASSWORD | Bắt buộc; phải khớp role hue_app đã được chuẩn bị, không tự đổi password DB khi sửa env |
| BE04_SESSION_SECRET | Bắt buộc; đáp ứng điều kiện production |
| BE04_UPLOADS_PATH | Bắt buộc, đường dẫn thư mục staging riêng đã tồn tại; mount /app/uploads, create_host_path=false |
| BE04_MEDIA_LEGACY_ORIGINS | Mặc định rỗng |
| BE04_DB_NAME | Mặc định hue_tourism_staging |
| BE04_HTTP_PORT | Mặc định 8080, vẫn bind 127.0.0.1 |
| BE04_BACKEND_IMAGE / BE04_FRONTEND_IMAGE | Mặc định hue-guide-backend:be04 / hue-guide-frontend:be04 |
| BE10_RUN_ID / BE10_BOOTSTRAP_CONFIRM | Để rỗng với staging hiện hữu; chỉ validator BE10 sinh cho bài test mới |

BE10_PROJECT_NAME được Compose truyền từ project name cho bootstrap. Không tự
đặt các biến opt-in để vượt guard. TEST_DB_PORT/TEST_DB_PASSWORD/TEST_REDIS_URL
chỉ là override cho launcher regression BE03, không cấu hình DEV/staging chung.

## Dựng DEV local mới

### 1. Kiểm tra công cụ và cổng, cài dependency

Các lệnh sau chỉ kiểm tra trạng thái; nếu cổng đã dùng, xác định chủ sở hữu và
dừng quy trình dựng mới. Không kill tiến trình/stop container của người khác.

```powershell
node --version
npm.cmd --version
docker version
docker compose version
Get-NetTCPConnection -State Listen -LocalPort 3000,8000,5432,6379 -ErrorAction SilentlyContinue
```

Bước tiếp theo là cài dependency theo lockfile, không phải kiểm tra trạng thái.
`npm.cmd ci` thay thế node_modules hiện có trong workspace đang dùng:

```powershell
npm.cmd ci
```

Không npm install/audit fix hoặc sửa lockfile chỉ để vượt lỗi cài đặt. Windows
chặn npm.ps1 có thể dùng npm.cmd như trên, không cần đổi ExecutionPolicy toàn máy.

### 2. PostgreSQL/Redis riêng cho DEV

Repo không có compose DEV riêng được Git theo dõi. Ví dụ dưới đây là cách dựng
hai dependency local mới bằng chính phiên bản image đã dùng trong repo; không
biến compose.test thành DEV. Các cổng host chọn đúng giá trị mặc định của mẫu DEV.

Trong cùng terminal, đặt tên mới và ghi lại để vận hành đúng tài nguyên:

```powershell
$devId = [guid]::NewGuid().ToString("N")
$pgContainer = "hue-dev-pg-$devId"
$redisContainer = "hue-dev-redis-$devId"
$pgVolume = "hue-dev-pgdata-$devId"
$devDb = "hue_dev_$devId"
$pgAdminEnv = "<absolute_path_outside_repo>/postgres-dev.env"
```

Chuẩn bị file quản trị mới tại pgAdminEnv, chỉ có
`POSTGRES_PASSWORD=<generated_admin_password>` rồi thay placeholder bằng giá trị
riêng do bạn quản lý. Không dùng `.env.staging`, không đặt file này trong repo,
không in nội dung hoặc truyền password rõ vào command line. Chỉ dùng Docker
context local đã xác định. Nếu tên/volume đã tồn tại thì dừng, không tái sử dụng.

```powershell
docker volume create --label "hue.dev.id=$devId" $pgVolume
$postgresArgs = @(
    "run", "-d",
    "--name", $pgContainer,
    "--label", "hue.dev.id=$devId",
    "--env-file", $pgAdminEnv,
    "--env", "POSTGRES_DB=$devDb",
    "--publish", "127.0.0.1:5432:5432",
    "--mount", "type=volume,source=$pgVolume,target=/var/lib/postgresql",
    "--health-cmd", "pg_isready -h 127.0.0.1 -U postgres -d $devDb",
    "--health-interval", "2s",
    "--health-timeout", "5s",
    "--health-retries", "30",
    "postgres:18"
)
docker @postgresArgs
$redisArgs = @(
    "run", "-d",
    "--name", $redisContainer,
    "--label", "hue.dev.id=$devId",
    "--publish", "127.0.0.1:6379:6379",
    "--health-cmd", "redis-cli ping",
    "--health-interval", "2s",
    "--health-timeout", "5s",
    "--health-retries", "30",
    "redis:7-alpine"
)
docker @redisArgs
docker inspect --format '{{json .Config.Labels}}' $pgContainer
docker volume inspect --format '{{json .Labels}}' $pgVolume
docker inspect --format '{{.State.Health.Status}}' $pgContainer
docker exec $redisContainer redis-cli ping
```

Chỉ tiếp tục khi label đúng devId, PostgreSQL healthy, Redis trả PONG. Các bước
docker run/volume create phải thành công; nếu có lỗi thì dừng, không chạy lệnh
tiếp theo trên tên phỏng đoán. Nếu dùng PostgreSQL/Redis đã được quản trị cấp
riêng thay cho ví dụ này, xác minh host/port/DB/role với quản trị viên trước.

### 3. Chuẩn bị role và schema: chỉ cho DB mới, trống

Kết nối đúng container vừa tạo, không hue-pg-dev hoặc một container có sẵn:

```powershell
docker exec -it $pgContainer psql -X -v ON_ERROR_STOP=1 -U postgres -d $devDb
```

Trong psql, kiểm tra tên DB phải bằng devDb mới và số bảng public phải là 0.
Nếu khác hoặc đã có bảng thì dừng, không chạy tiếp. Sau đó tạo role; nếu role
đã tồn tại ngoài dự kiến thì dừng, không ALTER/đổi credential của role cũ.

```sql
SELECT current_database(), current_user;
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
CREATE ROLE hue_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
```

Đặt credential ứng dụng bằng prompt psql, không chèn password vào SQL:

```text
\password hue_app
\q
```

Áp dụng đúng thứ tự sau, bằng postgres quản trị của cluster local riêng:

```powershell
$migrations = @(
    "src/database/migrations/001_core_schema.sql",
    "M25_01_create_attraction_localization_revisions.sql",
    "M26_02_create_visitor_events.sql",
    "src/database/migrations/20261026_visitor_presence_last_seen.sql",
    "src/database/migrations/007_add_performance_indexes.sql",
    "src/database/migrations/008_allow_relative_media_url.sql"
)
foreach ($migration in $migrations) {
    docker cp $migration "${pgContainer}:/tmp/hue-migration.sql"
    if ($LASTEXITCODE -ne 0) {
        throw "Copy migration failed; stop."
    }
    docker exec $pgContainer psql -X -v ON_ERROR_STOP=1 -U postgres -d $devDb -f /tmp/hue-migration.sql
    if ($LASTEXITCODE -ne 0) {
        throw "Migration failed; do not rerun the initialization chain."
    }
}
docker exec -it $pgContainer psql -X -v ON_ERROR_STOP=1 -U postgres -d $devDb
```

M26 GRANT tới hue_app nên role phải có trước migration. Trong psql sau migration,
cấp quyền runtime trực tiếp, không cấp quyền tạo schema/role/database cho app:

```sql
GRANT CONNECT ON DATABASE :"DBNAME" TO hue_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO hue_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hue_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hue_app;
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
```

DBNAME là biến psql của kết nối hiện tại, không phải chuỗi password hoặc env.
Schema hiện tại có 13 bảng public; số bảng không chứng minh nội dung đầy đủ.
Thoát bằng `\q`. Chi tiết migration/test riêng: [BE03](BE03-testing.md).

**DB đã có dữ liệu hoặc đã restore:** không chạy lại chuỗi init, không DROP để
chữa lỗi và không chạy bootstrap BE10. Dừng, xác minh schema/migration đã áp dụng
và thống nhất kế hoạch nâng cấp với người quản trị. Nếu lỗi giữa chuỗi, một số
migration trước có thể đã commit; không coi ON_ERROR_STOP là transaction chung
cho cả sáu file. Quy trình backup/restore: [BE05](BE05-backup-restore.md).

### 4. Cấu hình backend DEV và chạy ứng dụng

Chỉ tạo `.env` mới nếu chưa tồn tại. Nếu có, không ghi đè; tự đối chiếu tên biến
với mẫu trong trình soạn thảo và người quản lý môi trường, không đưa giá trị vào log.

```powershell
if (Test-Path -LiteralPath ".env") {
    throw "Existing .env: do not overwrite."
}
Copy-Item -LiteralPath ".env.example" -Destination ".env"
```

Thay các placeholder bên dưới bằng cấu hình **DEV mới** trước khi khởi động.
Đặc biệt thay DB_NAME trong mẫu: không giữ tên hue_tourism nếu đó là DB gốc.

```dotenv
PORT=3000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=<hue_dev_ID_from_previous_steps>
DB_USER=hue_app
DB_PASSWORD=<app_password_set_with_psql>
DB_SSL=false
REDIS_URL=redis://127.0.0.1:6379
SESSION_SECRET=<long_generated_secret>
EMBEDDING_PROVIDER=dev
CHAT_PROVIDER=extractive
```

Giữ key AI trống nếu không sử dụng provider ngoài. Chạy backend tại repo root
để dotenv và uploads có working directory đúng. Terminal backend:

```powershell
npm.cmd run dev
```

Hoặc chạy bản build, không đồng thời với dev trên cùng port:

```powershell
npm.cmd run build
npm.cmd start
```

Terminal frontend khác, cũng tại repo root:

```powershell
node frontend/dev-server.js
```

Mở `http://127.0.0.1:8000/` hoặc `/admin.html`. Không dùng file://, Live Server
hoặc python static server thay proxy này. Nếu đổi FRONTEND_PORT, đặt biến trong
terminal frontend; đổi PORT backend một mình sẽ làm proxy hiện tại không khớp.

Khởi tạo schema chưa tạo nội dung hoặc tài khoản Staff đăng nhập. Role PostgreSQL
hue_app khác tài khoản Staff trong bảng staff_accounts. Seed DEV có hash giả,
tọa độ placeholder và media example.com; không coi là credential hợp lệ hoặc
bằng chứng media/GPS hoạt động. Cấp Staff ban đầu cần quy trình được quản trị
viên cho phép; không ghi password rõ hoặc sửa hash tùy tiện để vượt đăng nhập.

## Kiểm tra endpoint, API và uploads

Các lệnh kiểm tra GET có thể chạy sau khi chính bạn đã khởi động môi trường:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/v1/health/live" -TimeoutSec 5
Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/v1/health/ready" -TimeoutSec 5
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/health/ready" -TimeoutSec 5
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/attractions?language=vi&page=1&page_size=10" -TimeoutSec 5
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/routes" -TimeoutSec 5
```

- live: HTTP 200/status=ok khi process đang phục vụ; không kiểm tra DB/Redis.
- ready: HTTP 200/status=ready/database=connected/redis=connected; dependency
  lỗi thì 503/status=not_ready. Server chờ Redis connect trước listen nên Redis
  hỏng lúc startup có thể khiến HTTP chưa mở, không phải lúc nào cũng nhận 503.
- Readiness chỉ SELECT 1/PING, **không xác nhận schema, migration hoặc seed**.
  Kiểm tra API dữ liệu riêng; DB mới có thể trả data=[]/pagination.total=0 hợp lệ.
- Dữ liệu public cần published, localization tiếng Việt published; route còn
  cần stops hợp lệ. Không suy ra DB rỗng chỉ vì API public không thấy bản nháp.

Lấy ID từ danh sách rồi GET `/api/v1/attractions/<id>?language=vi`, đọc
`data.media[].url`; không đoán URL hoặc dùng một ID mẫu cố định. URL tương đối
được resolve theo cùng origin frontend. File phải có thật trong
`<backend-working-directory>/uploads/media/<attractionId>/<filename>`.

[Storage adapter](../src/adapters/media/local-media-storage.adapter.ts) tự tạo
thư mục khi upload, dùng UUID và ghi không đè file. [Media middleware](../src/middleware/media-access.middleware.ts)
kiểm tra DB trước static: khách cần media, attraction và localization vi đều
published; Staff hợp lệ có thể xem bản nháp theo quyền. Có file chưa đủ để được
HTTP 200. Nginx/dev proxy chuyển `/uploads/media/` về backend, không bypass guard.
Kiểm tra MIME/nội dung khi có fixture published; file tổng hợp còn sau recreate
chỉ chứng minh filesystem persistence. Xem [BE02](BE02-media.md), [BE08](BE08-smoke.md).

## Test, staging và các bài kiểm chứng đã có

| Mục đích | Lệnh từ repo root hoặc điểm vào | Điều kiện/giới hạn |
| --- | --- | --- |
| Backend unit/integration | `npm.cmd test` | Nhiều dependency bị mock; không đồng nghĩa tất cả endpoint chạy DB thật |
| Frontend helper | `node --test tests/frontend/hue-api.unit.cjs tests/frontend/hue-gps-helpers.unit.cjs tests/frontend/hue-tts-helpers.unit.cjs` | Không browser; không chứng minh production UI đã dùng helper |
| MVP static contract | `node --test tests/M28_mvp_contract.node.cjs` | Đọc source/regex, không end-to-end |
| PostgreSQL/Redis regression | `node tests/run-real-services.cjs` | Sau khi chuẩn bị compose.test + schema theo BE03; launcher dùng test ports 5434/6380, không đổi .env DEV |
| BE08 HTTP smoke | [Runner BE08](../tests/run-be08-smoke.cjs), quy trình BE08 | Tạo test container/build/uploads tạm; không dùng frontend dev 8000 |
| BE10 Docker staging validation | [Validator BE10](../deploy/staging/validate-be10.cjs), quy trình BE10 | Stack tổng hợp mới; không bootstrap staging đã restore |
| BE11 backup/restore validation | [Runner BE11](../tests/run-be11-backup-restore.cjs), quy trình BE11 | DB tổng hợp riêng; không đọc dump hoặc uploads thật |

Ba runner riêng có cleanup tài nguyên tạm của chúng; hướng dẫn này chỉ dẫn tới
runbook, không cung cấp lệnh tự động xóa DB/volume hoặc dùng runner để dọn DEV.
Không chạy các runner chỉ để kiểm tra tài liệu này. Test environment cần kế
hoạch riêng cho cổng/tài nguyên; không đưa launcher vào DB DEV để tiện chạy.
Browser smoke cần Playwright ngoài dependency hiện tại: không tự cài chỉ để
vượt lỗi. Coverage provider cũng chưa có; không nhận lời nhắc cài tự động.

Staging hiện hữu: dùng tên project/credential/uploads đã được quản trị cấp,
không tái dựng bằng ví dụ DEV. [BE04](BE04-staging.md) có lệnh config --quiet,
up/recreate/stop; [BE10](BE10-staging-validation.md) giải thích bootstrap opt-in
chỉ dành DB test UUID mới/trống. Không bật profile be10-bootstrap cho DEV,
database đã có dữ liệu hoặc staging đã restore. Backend staging dùng production,
cookie Secure và TRUST_PROXY=1; HTTP local không thay nghiệm thu HTTPS.

Chỉ kiểm tra cấu hình staging bằng chế độ không in giá trị:

```powershell
docker compose --env-file .env.staging -p hue-be04-staging -f compose.staging.yml config --quiet
```

Lệnh này dành người quản lý đúng staging đó; không đọc/in `.env.staging` hoặc
chạy config không có --quiet để chia sẻ. `--env-file` Compose phục vụ nội suy;
không tự chuyển mọi biến trong file vào container, chỉ environment đã khai báo.

## Dừng, khởi động lại và log an toàn

Backend/frontend DEV: Ctrl+C ở đúng terminal. Không cam kết graceful shutdown
đầy đủ vì server hiện chưa có signal handler đóng mọi dependency tường minh.
Khởi động lại dependency đúng tên đã lưu, không tạo container mới để thay bừa:

```powershell
docker stop $redisContainer $pgContainer
docker start $pgContainer $redisContainer
```

Kiểm tra health/PONG rồi mới chạy lại backend/frontend như trên. stop/start giữ
container và PostgreSQL named volume; không có lệnh xóa DB/volume trong hướng
dẫn này. Redis recreate có thể mất session, cần đăng nhập lại; không coi cấu
hình Redis hiện có là cam kết persistence session qua mọi sự cố.

Compose test/staging dùng stop/start hoặc up/recreate với **đúng project đã xác
minh**, theo [BE03](BE03-testing.md)/[BE04](BE04-staging.md). Khi recreate backend
staging, recreate frontend cùng để Nginx nhận upstream mới. Không dùng down kèm
xóa volume hoặc prune để chữa lỗi. Đổi password env không cập nhật role trong
volume PostgreSQL đã khởi tạo; việc rotate credential cần quy trình riêng.

Ứng dụng có chỗ log error thô, không có bằng chứng mọi log đều tự lọc secret.
Không chia sẻ docker inspect đầy đủ/Config.Env, process env, raw logs, cookie,
token hoặc connection string. Chỉ trích marker/code đã cho phép, không in cả
dòng gốc. Ví dụ với PostgreSQL DEV riêng đã xác minh tên/label:

```powershell
docker logs --tail 100 $pgContainer 2>&1 |
    Select-String -AllMatches -Pattern 'database system is ready to accept connections|database system is shut down' |
    ForEach-Object {
        $_.Matches.Value
    }
```

Nếu cần xem log staging, chỉ người quản lý đúng project thực hiện; bộ lọc dưới
chỉ xuất mã lỗi đã biết, không xuất phần còn lại của dòng có thể chứa dữ liệu:

```powershell
docker compose --env-file .env.staging -p hue-be04-staging -f compose.staging.yml logs --no-color --tail 100 backend frontend postgres redis 2>&1 |
    Select-String -AllMatches -Pattern '\b(ECONNREFUSED|EADDRINUSE|ENOTFOUND|ETIMEDOUT|28P01|3D000|42P01|42704|42501)\b' |
    ForEach-Object {
        $_.Matches.Value
    }
```

Không có output từ bộ lọc không chứng minh dịch vụ khỏe; luôn đối chiếu health,
endpoint và kiểm tra cấu hình tên biến. Log/bằng chứng lưu ngoài repo, giới hạn
quyền đọc; không đính kèm dump hoặc `.env`. Xem [BE06](BE06-security-operations.md).

## Lỗi thường gặp

| Dấu hiệu | Kiểm tra và xử lý an toàn |
| --- | --- |
| EADDRINUSE / Docker port already allocated | Dùng Get-NetTCPConnection xác định cổng/chủ sở hữu; không kill/stop tự động. Giữ backend DEV 3000 để khớp proxy; đổi FRONTEND_PORT trong terminal frontend hoặc chọn môi trường test riêng |
| Frontend 502/BACKEND_UNAVAILABLE | Frontend proxy cố định 3000; kiểm tra backend đã listen, Redis đã connect và port không bị đổi sang 3001 |
| Redis ECONNREFUSED/ENOTFOUND | Kiểm tra REDIS_URL theo host hay Docker network, container và PONG; host DEV không dùng hostname redis của Compose. Không xóa volume để chữa kết nối |
| DB 28P01 / role không tồn tại | Đối chiếu DB_USER/password của đúng role, không in password; DB role khác Staff account. Không đổi credential role dùng chung để thử. BE04_APP_PASSWORD mới không tự rotate role cũ |
| DB 3D000 / sai database | So sánh tên DB với tài nguyên đã tạo và .env được người quản lý chọn; không fallback sang hue_tourism gốc |
| DB 42P01 / relation missing nhưng ready=200 | Readiness không kiểm tra schema; xem chuỗi migration/DB đích. Không chạy init trên DB đã restore hoặc tự DROP để làm sạch |
| DB 42501 / permission denied | Migration dùng admin của DB mới; runtime cần CONNECT/USAGE/DML/sequence. Không cấp superuser, CREATE schema hoặc ownership rộng chỉ để vượt lỗi |
| Migration 42601 ở vị trí đầu / BOM | M26 có BOM UTF-8; psql -f là đường dùng ở hướng dẫn. Với driver đọc SQL thẳng, bỏ BOM trên stream/trong bộ nhớ như BE08/BE10/BE11, không sửa migration. Xem BE08 để phân biệt tiếp lỗi 42704 do thiếu hue_app |
| Migration duplicate table/object | Có thể đã áp dụng một phần hoặc DB không mới; dừng, kiểm tra lịch sử schema. Không tự chạy lại cả chuỗi hoặc dùng --clean trên DB có dữ liệu |
| API data=[] | Có thể DB chưa seed hoặc dữ liệu chưa published/thiếu localization vi; không phải mọi trường hợp đều lỗi kết nối |
| Media 404 | Kiểm tra URL lấy từ API, bản ghi DB, publication/Staff session, đường dẫn hợp lệ và file thật trong đúng cwd/uploads. Không phục vụ uploads trực tiếp để bỏ qua guard |
| EACCES / upload không ghi được | Kiểm tra quyền thư mục riêng cho user backend; Docker runtime là user node. Chown trong image không sửa quyền bind mount. Không chmod 777 toàn workspace hoặc dùng uploads thật cho test |
| Login không giữ phiên / cookie không gửi | Kiểm tra cùng origin dev proxy, NODE_ENV, SESSION_SECRET và Redis; production cookie Secure cần HTTPS/proxy tin cậy. Không tắt Secure/CSRF để thử PASS |
| Staff 401 / 403 / logout bị chặn | 401 cho thiếu/không còn session; 403 cho sai role hoặc CSRF. Lấy token từ /staff/auth/csrf trong cùng session; không dùng token agent khác hoặc token đã cấp lại |
| 429 login | Limiter cho 5 request thất bại/15 phút theo IP; chờ hoặc dùng test clock trong BE09, không brute-force/đổi IP để vượt limiter |
| npm ci/build lỗi | Đối chiếu Node 24, lockfile, network/registry và module native bcrypt; không xóa lockfile, tự nâng dependency hoặc dùng production node_modules thiếu dev tools để build |
| Coverage/Playwright thiếu | BE12 ghi provider coverage và Playwright chưa khai báo; ghi chưa đo/chưa chạy, không tự cài dependency hoặc ghi PASS |

## Nguồn chuyên sâu và bằng chứng lịch sử

| Tài liệu | Dùng khi nào / trạng thái bằng chứng |
| --- | --- |
| [BE03](BE03-testing.md) | Test DB/Redis 5434/6380 và migration; kết quả local ghi 29/10/2026, không phải lần chạy BE13 |
| [BE04](BE04-staging.md) | Vận hành staging đã chuẩn bị và proxy/tunnel; bằng chứng 31/10/2026 |
| [BE05](BE05-backup-restore.md) | Backup database/media thực cần kế hoạch dừng ghi và bảo vệ dữ liệu; lịch sử 30/10/2026 |
| [BE06](BE06-security-operations.md) | Bảo mật, log/sự cố và performance local; không coi latency cũ là SLO mới |
| [BE07](BE07-ci.md) | Workflow/checks/report lỗi; không chứng minh run Actions mới đã PASS |
| [BE08](BE08-smoke.md) | HTTP smoke thật và bài học BOM/role; kết quả sửa lỗi ghi 06/11/2026 |
| [BE09](BE09-security-regression.md) | Security tests bằng MemoryStore/clock/proxy giả lập; kết quả 06/11/2026 |
| [BE10](BE10-staging-validation.md) | Dựng/cleanup stack mới và kiểm tra bootstrap/persistence; kết quả 06/11/2026 |
| [BE11](BE11-backup-restore-validation.md) | Restore fixture DB tổng hợp, không backup uploads/cluster role; kết quả 06/11/2026 |
| [BE12](test-coverage-report.md) | 286 Vitest, 31 frontend unit, 3 contract vừa được ghi nhận 06/11/2026; tỷ lệ code coverage chưa đo do thiếu provider |

BE13 chỉ kiểm tra đọc/cú pháp: đối chiếu package/lockfile, mẫu env, source,
Docker/Compose/nginx và các tài liệu trên; kiểm tra đường dẫn/link tương đối,
cú pháp ví dụ PowerShell và whitespace. Không chạy npm ci/build/test, mở kết
nối DB/Redis, khởi động/dừng container, áp migration, thay credential hoặc restore.
Quy trình DEV mới trong tài liệu chưa được chạy end-to-end ở BE13; quyền host,
cổng còn trống, Docker context, credential người vận hành, login Staff và TLS
phải được xác minh khi triển khai thật.
