# BE12 — Test coverage report

## Thời điểm, phiên bản và phạm vi báo cáo

Rà soát và chạy kiểm tra local ngày **06/11/2026**, commit **92ca08d**. Git status
ban đầu chỉ có ba file untracked đã được yêu cầu giữ nguyên; không đọc/sửa chúng.
Không chuyển nhánh, fetch/pull, cài dependency, cập nhật lockfile hoặc chạy lại
Docker/browser để viết báo cáo này.

| Công cụ | Phiên bản/hiện trạng đã kiểm tra |
| --- | --- |
| Node.js | v24.22.0 |
| npm | 11.19.1 |
| TypeScript | 7.0.2, khớp package đã cài và lockfile |
| Vitest | 5.0.5, khớp package đã cài và lockfile |
| Lockfile | lockfileVersion 3 |
| @vitest/coverage-v8 | Không có trong lockfile hoặc package cài local |
| @vitest/coverage-istanbul | Không có trong lockfile hoặc package cài local |
| c8 / nyc | Không có trong lockfile hoặc package cài local |

Bằng chứng cấu hình: [package.json](../package.json),
[package-lock.json](../package-lock.json), [tsconfig.json](../tsconfig.json).
Script test là `vitest run`; không có script coverage hoặc file cấu hình
Vitest/Vite được Git theo dõi. Discovery thực tế tìm 41 file `.test.ts` trong
tests/unit và tests/integration. Build chỉ biên dịch src theo tsconfig; build
thành công không đồng nghĩa đã typecheck riêng toàn bộ code test.

## Coverage theo statements, branches, functions và lines

**Chưa đo được tỷ lệ code coverage vì thiếu coverage provider.** Không chạy
`--coverage`, không chấp nhận lời nhắc cài provider và không dùng npm/npx để cài
công cụ. Có Vitest không đồng nghĩa đã có provider đo coverage.

| Chỉ số | Kết quả |
| --- | --- |
| Statements | Chưa đo được; không có numerator/denominator |
| Branches | Chưa đo được; không có numerator/denominator |
| Functions | Chưa đo được; không có numerator/denominator |
| Lines | Chưa đo được; không có numerator/denominator |

Không coi thiếu số liệu là coverage 0%, không suy ra phần trăm từ số test,
file test, HTTP checks hoặc số assertion. Báo cáo JSON test bên dưới chỉ chứa
kết quả thực thi test, không phải báo cáo instrumentation/code coverage.

Phạm vi hợp lý cho lần đo Backend sau khi có provider được phép sử dụng:

- Include toàn bộ `src/**/*.ts`, kể cả file chưa được import trong test.
- Exclude declaration `src/**/*.d.ts`; không tính tests, frontend, node_modules,
  dist, output coverage, SQL migration/seed và các asset vào mẫu số TypeScript.
- Inventory hiện có **107 file src TypeScript thực thi**, ngoài một declaration
  `src/types/express-session.d.ts`. Không giới hạn vào danh sách module đã import
  hoặc chỉ chọn service có unit test để làm tăng tỷ lệ.
- Đây là phạm vi dự kiến đã rà soát, **chưa được áp dụng trong một lần đo**.
  Không thêm cấu hình coverage chưa thể chạy hoặc báo rằng 107 file đã được đo.

## Kết quả vừa chạy trong BE12

Các lệnh đã chạy, không có cờ coverage:

```powershell
npm.cmd run build
npm.cmd test -- --reporter=default --reporter=json --outputFile.json=coverage/be12-vitest.json
node --test tests/frontend/hue-api.unit.cjs tests/frontend/hue-gps-helpers.unit.cjs tests/frontend/hue-tts-helpers.unit.cjs
node --test tests/M28_mvp_contract.node.cjs
```

| Nhóm vừa chạy | File | Test cases | Passed | Failed/skipped | Exit code |
| --- | ---: | ---: | ---: | --- | ---: |
| Build TypeScript | Theo tsconfig | Không phải test cases | Thành công | Không áp dụng | 0 |
| Vitest Backend: tests/unit | 22 | 147 | 147 | 0/0 | 0 |
| Vitest Backend: tests/integration | 19 | 139 | 139 | 0/0 | 0 |
| Vitest Backend tổng | 41 | 286 | 286 | 0/0 | 0 |
| Frontend unit, node --test | 3 | 31 | 31 | 0/0 | 0 |
| MVP static contract, node --test | 1 | 3 | 3 | 0/0 | 0 |

Tổng Vitest và các dòng thành phần không được cộng lại lần nữa. Không cộng
runner hoặc số HTTP checks vào các con số test cases trên.

[coverage/be12-vitest.json](../coverage/be12-vitest.json) là artifact local đã
được xác nhận ignore bởi [gitignore](../.gitignore), không commit. Số file được
lấy từ `testResults.length`, số ca từ `assertionResults` và summary JSON, tránh
nhầm số describe/suite với số file. Dữ liệu JSON xác nhận 41 file, 286 passed,
0 failed, 0 pending; phân nhóm theo đường dẫn cho kết quả trong bảng.
Artifact này có thể không tồn tại khi clone repository mới.

## Baseline 251 tests và 35 ca BE09

Baseline **251 test/39 file** là kết quả lịch sử ngày 06/11/2026 trong
[BE07](BE07-ci.md), không phải một lần chạy lại commit baseline ở BE12.
[BE09](BE09-security-regression.md) ghi nhận bổ sung 35 ca:

| File | Ca BE09 mới theo tài liệu/code | Tổng ca trong file vừa chạy |
| --- | ---: | ---: |
| [staff-admin-security.test.ts](../tests/integration/staff-admin-security.test.ts) | 15 | 15 |
| [staff-session-config.test.ts](../tests/integration/staff-session-config.test.ts) | 15 | 15 |
| [staff-login-rate-limit.test.ts](../tests/integration/staff-login-rate-limit.test.ts) | 2 | 5 |
| [staff-route-update.test.ts](../tests/integration/staff-route-update.test.ts) | 3 | 15 |
| Tổng nhóm bốn file | 35 mới | 50, gồm cả 15 ca có sẵn |

Hai file mới thêm 30 ca; hai file cũ thêm 5 ca. Kết quả hiện tại 286 test khớp
251 + 35 và 41 file khớp 39 + 2. Không gọi cả 50 ca của nhóm chọn là ca BE09 mới.
Số lượng hiện tại đã được chạy thật ở BE12; nguồn gốc baseline/ca bổ sung vẫn
được dẫn riêng đến tài liệu lịch sử.

## Phân loại phạm vi và mức tích hợp

| Nhóm | Phạm vi bằng chứng | Mock/tích hợp | BE12 có chạy? | CI theo workflow hiện có |
| --- | --- | --- | --- | --- |
| Vitest Backend unit | Service/provider, media validation/storage/access, grounding, route repository, presence | Chạy logic module; nhiều DB/Redis/fetch/filesystem bị mock tùy file | Có: 147 ca | Có, trong npm test |
| Vitest Backend integration | Supertest/controller/router/validator/auth/role/CSRF/session/rate limit | Tích hợp trong process Express; service/repository/store thường giả lập; tên thư mục không chứng minh DB thật | Có: 139 ca | Có, trong npm test |
| Frontend unit | [hue-api](../tests/frontend/hue-api.unit.cjs), [GPS helpers](../tests/frontend/hue-gps-helpers.unit.cjs), [TTS helpers](../tests/frontend/hue-tts-helpers.unit.cjs) | Node gọi helper; API/geolocation/voice được mô phỏng, không browser/DB | Có: 31 ca | Có, frontend unit step |
| MVP contract | [M28_mvp_contract.node.cjs](../tests/M28_mvp_contract.node.cjs) kiểm tra pattern trên source | Đọc file và regex; không chạy GPS/API end-to-end | Có: 3 ca | Có, mvp-ci |
| Browser smoke | [Visitor](../tests/frontend/visitor-smoke.cjs), [audio](../tests/frontend/visitor-audio-smoke.cjs), [GPS/responsive](../tests/frontend/visitor-gps-responsive-smoke.cjs) | Có Playwright browser, nhưng API/GPS và dịch vụ ngoài được mock | Không; ba script không được quy đổi thành ba test cases | Không |
| PostgreSQL/Redis regression | [run-real-services.cjs](../tests/run-real-services.cjs) gọi BE01 analytics và BE03 session | Query PostgreSQL, bcrypt và Redis/session thật | Không chạy lại; dùng kết quả lịch sử bên dưới | Có, bước regression riêng |
| BE08 | [run-be08-smoke.cjs](../tests/run-be08-smoke.cjs), [GET assertions](../tests/BE08-smoke.cjs) | Backend/DB/Redis thật trong tài nguyên riêng, media tổng hợp | Không; đơn vị bằng chứng là bảy GET checks, không phải bảy Vitest cases | Không |
| BE10 | [validate-be10.cjs](../deploy/staging/validate-be10.cjs) | Build và Compose stack thật, proxy/static/role/bootstrap/persistence | Không; 11 asset HTTP và trạng thái stack không phải test case count | Không |
| BE11 | [run-be11-backup-restore.cjs](../tests/run-be11-backup-restore.cjs) | pg_dump/pg_restore thật trên PostgreSQL riêng, fixture tổng hợp | Không; 13 bảng/9 hàng/13 sequence là đơn vị đối chiếu dữ liệu | Không |
| BE06 performance | [BE06-performance.cjs](../tests/BE06-performance.cjs) | Request local với PostgreSQL/Redis, latency theo mẫu đo | Không; số request không phải số test cases | Không |

Bằng chứng CI là nội dung [ci.yml](../.github/workflows/ci.yml) và
[mvp-ci.yml](../.github/workflows/mvp-ci.yml). BE12 không truy xuất kết quả run
GitHub Actions nên **không xác nhận các workflow vừa PASS trên GitHub**.
Các workflow có build/test/report lỗi, chưa có bước đo coverage hoặc threshold.
Helper/fixture SQL và launcher server không được tính thành test cases độc lập.

Ví dụ phân biệt mock với tích hợp thật:

- [Attraction integration](../tests/integration/attraction.test.ts) và
  [route integration](../tests/integration/route.test.ts) mock service. Response
  contract được kiểm tra nhưng query PostgreSQL không chạy trong các ca đó.
- [Route repository unit](../tests/unit/route.repository.test.ts) mock db.query:
  kiểm tra SQL/parameter và logic mapping không thay thế thực thi SQL thật.
- [BE09 helper](../tests/helpers/be09-app.ts) import cấu hình session thật, thay
  RedisStore bằng MemoryStore và chặn DB. Middleware thật được chạy, nhưng
  persistence Redis, TTL và multi-process không được chứng minh.
- [Admin security](../tests/integration/staff-admin-security.test.ts) spy/mock
  controller accounts/analytics và service presence để kiểm tra wiring trước
  handler; không chứng minh toàn bộ nghiệp vụ admin đã chạy.
- [Gemini provider](../tests/unit/gemini-answer.provider.test.ts) mock fetch;
  không chứng minh tích hợp credential/quota/model trên dịch vụ ngoài.

**Frontend unit helper không chứng minh helper đã được production UI sử dụng.**
Các test require trực tiếp [hue-api.js](../frontend/hue-api.js),
[hue-gps-helpers.js](../frontend/hue-gps-helpers.js),
[hue-tts-helpers.js](../frontend/hue-tts-helpers.js). Rà soát index.html,
admin.html, app.js và admin-auth.js hiện không thấy nạp tên ba file helper này.
Không suy ra hành vi production UI từ kết quả unit helper; cần bằng chứng wiring
và browser riêng, không sửa frontend trong BE12.

## Bằng chứng lịch sử, không chạy lại trong BE12

| Nguồn và thời điểm ghi nhận | Kết quả lịch sử được ghi | Giới hạn |
| --- | --- | --- |
| [BE03](BE03-testing.md), 29/10/2026 | Migration trên DB trống; analytics 7/30 ngày; tạo tài khoản/bcrypt; Redis TTL, session qua app thứ hai, logout | Không phải toàn bộ endpoint login hoặc CRUD; chưa xác nhận run Actions ở thời điểm đó |
| [BE06](BE06-security-operations.md), đo 30/10/2026, 02:20:01.305Z | 90/90 request đo nhận 200, concurrency 1, ba endpoint | Trước cập nhật dependency; không phải stress test hoặc 90 test cases |
| [BE08](BE08-smoke.md), mục kết quả/điều tra ngày 06/11/2026 | Sau sửa BOM/role: sáu migration, fixture, bảy GET checks, hai attraction/hai stops, MIME/bytes media; cleanup thành công | Phần BLOCKED/lỗi trước đó không được coi là PASS; chưa chạy lại ở commit BE12 |
| [BE10](BE10-staging-validation.md), 06/11/2026 | Bốn service healthy, nginx -t, API qua proxy, 11 asset, bootstrap guards, uploads persistence, cleanup | Không nghiệm thu media HTTP published, TLS hoặc đăng nhập staging |
| [BE11](BE11-backup-restore-validation.md), 06/11/2026 | 13 bảng/9 hàng/13 sequence khớp, ba constraint probe, owner/ACL, cleanup | Cùng PostgreSQL 18; không backup uploads, Redis hoặc role cấp cluster |
| [Visitor UAT](visitor-uat.md), không có ngày/kết quả browser run trong nguồn đã rà soát | Danh sách script và checklist; Playwright chưa nằm trong package/lockfile | Không đủ bằng chứng ghi browser smoke PASS; bảng UAT thủ công còn trống |

## Khoảng trống và phần chưa có bằng chứng

1. Chưa có tỷ lệ statements/branches/functions/lines, danh sách uncovered lines
   hoặc threshold; không kết luận 107 file src đã được thực thi từ 41 file test.
2. Chưa thấy test riêng import trực tiếp
   [staff-account.service](../src/services/staff-account.service.ts),
   [staff-localization.service](../src/services/staff-localization.service.ts)
   hoặc [Gemini translation provider](../src/adapters/llm/gemini-translation.provider.ts).
   Đây là khoảng trống bằng chứng, không phải kết luận instrumentation 0%.
3. Nhiều service/repository/controller bị thay bằng mock. BE08/BE10 chỉ cung cấp
   luồng thật cơ bản đã ghi; chưa chứng minh mọi CRUD, transaction rollback,
   cạnh tranh truy cập hoặc lỗi kết nối trên PostgreSQL/Redis thật.
4. Khởi động server và kết nối phụ thuộc có bằng chứng smoke lịch sử, chưa có
   ma trận mọi nhánh startup failure/shutdown/recovery cho
   [server.ts](../src/server.ts). Readiness 200 không thay kiểm tra schema/API.
5. Session cookie/CSRF/rate limit đã có BE09 với store/clock/proxy giả lập;
   chưa chứng minh browser enforcement, TLS/proxy triển khai, Redis TTL/session
   nhiều process hoặc limiter nhiều replica. Malformed JSON/body vắng cũng
   chưa có assertion bổ sung trong BE09.
6. Chưa có bằng chứng mới cho GPS điện thoại HTTPS, TTS Android/iOS, responsive/
   keyboard qua browser và Admin Publish → Visitor refresh với DB thật.
7. Không gọi AI/OpenAI/Gemini thật, không kiểm tra credential/quota hoặc dịch vụ
   thời tiết/CDN. Unit provider dùng transport giả không thay tích hợp ngoài.
8. BE11 xác minh DB fixture nhỏ; chưa chứng minh backup đồng bộ database/uploads,
   restore khác phiên bản, dữ liệu lớn hoặc khôi phục toàn bộ cluster/roles.

## Kiểm tra thay đổi BE12

Chỉ thêm tài liệu này. Không sửa test, code ứng dụng, config/script coverage,
dependency, lockfile, CI hoặc các file untracked có sẵn. Không thêm test để tăng
số lượng/tỷ lệ. Đã chạy git diff --check và kiểm tra whitespace riêng file mới.
