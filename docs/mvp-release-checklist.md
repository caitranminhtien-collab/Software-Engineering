# BE14 — MVP release checklist

## Cách dùng và trạng thái

Mẫu được đối chiếu repository tại commit **a51ef5b**, ngày **06/11/2026**.
Đây là mốc rà soát tài liệu, không phải SHA mặc định của release sắp phát hành.
Tạo bản ghi riêng cho từng release; không ghi secret, cookie, dump hoặc cấu hình
đã nội suy vào bảng/bằng chứng. BE14 không chạy deploy, UAT hoặc test runtime.

| Trạng thái | Ý nghĩa |
| --- | --- |
| CHƯA CHẠY | Chưa thực hiện cho đúng candidate và môi trường đang xét |
| PASS | Đã kiểm tra cho candidate, có bằng chứng và thời điểm xác định |
| FAIL | Đã chạy nhưng không đạt tiêu chí |
| BLOCKED | Thiếu môi trường, quyền, dữ liệu hoặc bằng chứng cần thiết |
| không áp dụng | Có lý do theo phạm vi và reviewer chấp thuận, không dùng để che mục bắt buộc còn thiếu |

Mỗi dòng cần trạng thái, bằng chứng đã lọc, người thực hiện và thời điểm kèm múi
giờ. Nếu chia nhỏ một dòng, ghi đủ thông tin cho từng phần. Không đổi PASS bằng
cách bỏ assertion, giảm quyền bảo vệ hoặc dùng dữ liệu của môi trường khác.

## Hồ sơ release

| Trường | Giá trị cần ghi |
| --- | --- |
| Release ID, phạm vi MVP, môi trường | `<điền>` |
| Candidate Git SHA đầy đủ | `<điền; không chỉ tên branch hoặc HEAD của máy cá nhân>` |
| Backend image reference, registry digest nếu có, local image ID | `<điền>` |
| Frontend image reference, registry digest nếu có, local image ID | `<điền>` |
| Bằng chứng ánh xạ SHA → hai image | `<build record/artifact provenance đã review>` |
| Người thực hiện / người review / người quyết định GO | `<điền từng vai trò>` |
| Thời gian dự kiến / cửa sổ ngừng ghi | `<điền, gồm múi giờ>` |
| Docker context, Compose project và bản Compose được duyệt | `<điền; không giả định hue-be04-staging là mọi đích>` |
| DB/role/schema dự kiến, migration đã áp dụng | `<inventory và biên bản; không ghi password>` |
| PostgreSQL volume, uploads root và ownership | `<tham chiếu inventory được bảo vệ>` |
| Cấu hình runtime / secret version | `<ID trong nơi quản lý được phép; không ghi giá trị>` |
| Bản trước: SHA, cặp image/digest/ID, cấu hình tương thích | `<điền và xác nhận artifact còn khả dụng>` |
| Bộ backup trước release / mốc dữ liệu nhất quán | `<backup-set ID, timestamp, manifest/checksum>` |
| CI run và SHA thực sự được checkout | `<URL run, event, SHA, các job bắt buộc>` |

Tag image có thể bị ghi đè; tag hoặc tên `:be04` không đủ làm định danh phiên
bản. Dockerfile hiện không tự ghi Git SHA vào image label, nên cần build record
độc lập liên kết đúng source với image ID/digest. Dùng artifact/checkout release
riêng được review, không làm sạch workspace đang có thay đổi bằng reset/xóa file.

## Gates trước khi phát hành

| ID | Tiêu chí nghiệm thu cho release này | Trạng thái | Bằng chứng | Người thực hiện | Thời điểm |
| --- | --- | --- | --- | --- | --- |
| R01 | Chốt candidate SHA, phạm vi, người thực hiện/review/quyết định; ánh xạ đúng hai image với source đã review | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R02 | Build TypeScript thành công từ đúng candidate/dependency lock; không lấy dist/node_modules cũ làm bằng chứng | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R03 | Backend npm test thành công, ghi số file/ca/skips và phạm vi mock; không lấy số test làm tỷ lệ coverage | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R04 | Frontend unit node --test thành công; không suy ra production UI đã sử dụng helper chỉ vì helper unit PASS | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R05 | MVP static contract thành công; phân biệt kiểm tra source/regex với browser/API end-to-end | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R06 | Các CI job bắt buộc thành công trên đúng SHA/tree được phát hành; lưu run URL, event, checkout SHA và job kết quả | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R07 | Kiểm tra image thực tế, Compose/context/project/port/network/volume/uploads đúng inventory; không chạm tài nguyên DEV hoặc đích khác | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R08 | Có danh sách migration/hash/biên bản đã áp dụng; schema, constraint/index cần thiết và quyền role runtime phù hợp policy; không chỉ đếm bảng | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R09 | Phương án migration được review về khả năng chạy image cũ với schema/dữ liệu mới; nếu không tương thích phải có kế hoạch khác được phê duyệt | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R10 | Bốn service healthy; qua proxy đúng /api/v1/health/live và /api/v1/health/ready, kiểm tra JSON/status; đọc schema/API riêng | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R11 | Attractions/routes qua proxy có dữ liệu published mong đợi; ID/chi tiết/stops đúng fixture hoặc manifest đã duyệt, không chỉ HTTP 200 | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R12 | Index/admin và asset local được tham chiếu tải được trên candidate; kiểm tra luồng UI trong phạm vi release | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R13 | Media published lấy URL từ API, tải được đúng MIME/nội dung; draft không lộ cho khách; bản ghi DB khớp file, uploads root/quyền user backend đúng | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R14 | Persistence uploads được xác minh trên môi trường tách biệt; không dùng filesystem persistence để thay bằng chứng media HTTP | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R15 | Staff login/logout/session, 401/403 và CSRF đúng trên HTTPS/proxy mục tiêu, bằng tài khoản test được phép; không lộ credential/cookie trong ảnh/log | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R16 | Proxy tin cậy, cookie HttpOnly/SameSite/Secure và policy session/Redis được review; localhost HTTP hoặc MemoryStore test không thay nghiệm thu HTTPS | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R17 | UAT theo phạm vi MVP trên môi trường và dữ liệu tổng hợp/đã duyệt riêng; không duyệt/publish/upload thử vào nội dung đang phục vụ thật | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R18 | GPS/TTS/mobile, ngôn ngữ/fallback, chat có nguồn và quyền Staff được kiểm tra theo phạm vi; phần loại trừ có reviewer chấp thuận | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R19 | Chốt ngừng mọi writer, lấy DB dump và uploads cùng mốc, checksum/manifest/phiên bản/owner/ACL và vị trí bảo vệ được ghi nhận | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R20 | Bộ backup đã chọn được restore kiểm chứng ở đích mới có bảo vệ: schema/count/giá trị/sequence, file manifest và đường dẫn media khớp; không lấy BE11 synthetic làm bằng chứng thay bộ backup này | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R21 | Bản image cũ còn khả dụng, khớp digest/ID; runtime config/resource cần giữ đã ghi lại; người quyết định và phương án ngừng ghi/rollback rõ ràng | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |
| R22 | Mọi rủi ro/tồn đọng có owner và quyết định; GO hoặc NO-GO được ký trước mở ghi/traffic | CHƯA CHẠY | `<điền>` | `<điền>` | `<điền>` |

Lệnh kiểm tra local có trong [BE13](backend-operations-guide.md); phân loại và
kết quả lịch sử trong [BE12](test-coverage-report.md). Không chạy lại những lệnh
này chỉ để điền checklist bằng suy đoán. Local runner thành công không chứng
minh workflow trên GitHub đã chạy; job CI xanh cũng không thay UAT/backup thực tế.

CI hiện có [ci.yml](../.github/workflows/ci.yml): Backend Test & Build, Frontend
Static Checks; [mvp-ci.yml](../.github/workflows/mvp-ci.yml): build-and-contract.
Đối chiếu thêm branch protection hiện hành, không hardcode “3/3” từ tài liệu cũ.
Pull request có thể kiểm tra synthetic merge commit; cần ghi SHA/tree checkout
thực tế, không mặc định PR head SHA chính là artifact đã được kiểm tra. Candidate
thay đổi sau CI/build phải được đánh giá lại; không dùng một run khác SHA.

Readiness chỉ SELECT 1/PING, không chứng minh migration/seed/permission hoặc
nghiệp vụ dữ liệu. CI dùng role do image PostgreSQL test tạo, không phải bằng
chứng quyền hạn role staging. Không chạy init/BE10 bootstrap trên DB đã restore
để kiểm tra trạng thái; đối chiếu catalog và biên bản migration thay thế.

## Quyết định GO / NO-GO

| Trường quyết định | Giá trị |
| --- | --- |
| Candidate SHA, cặp image ID/digest đã duyệt | `<điền>` |
| Kết luận GO hoặc NO-GO, phạm vi cho phép | `<chưa quyết định>` |
| Người quyết định / reviewer / thời điểm | `<điền>` |
| Mục FAIL/BLOCKED/CHƯA CHẠY còn lại và tác động | `<điền>` |
| Mục không áp dụng và lý do được duyệt | `<điền>` |
| Rủi ro chấp nhận, người chịu trách nhiệm, thời hạn | `<điền>` |
| Điều kiện dừng triển khai/kích hoạt rollback | `<điền>` |
| Liên hệ và điểm tập kết bằng chứng đã lọc | `<điền>` |

Không phát hành khi chưa có GO rõ ràng. FAIL/BLOCKED/CHƯA CHẠY ở gate bắt buộc
ngăn GO; mục tùy chọn chỉ được không áp dụng khi scope/reviewer chấp thuận.
Thiếu image rollback tương thích, backup đồng bộ/khả năng restore, bằng chứng
CI đúng SHA hoặc kiểm chứng an toàn dữ liệu là điều kiện NO-GO, không đánh đổi
bằng kết quả unit test. GO chỉ áp dụng phạm vi/môi trường được ký, không tự kết
luận production ready hoặc mọi thiết bị/tình huống đã được kiểm chứng.

## Nguồn chuyên sâu và giới hạn xác minh BE14

| Nguồn | Dùng để đối chiếu |
| --- | --- |
| [BE03](BE03-testing.md), [BE04](BE04-staging.md) | Migration/test services và staging/proxy hiện có |
| [BE05](BE05-backup-restore.md), [BE11](BE11-backup-restore-validation.md) | Backup DB/uploads nhất quán và giới hạn restore fixture/role |
| [BE06](BE06-security-operations.md), [BE09](BE09-security-regression.md) | Sự cố, quyền/session/CSRF, phạm vi mock và giới hạn HTTPS |
| [BE07](BE07-ci.md), [BE12](test-coverage-report.md) | CI/report và phân loại bằng chứng test, không có tỷ lệ coverage mới |
| [BE08](BE08-smoke.md), [BE10](BE10-staging-validation.md) | HTTP fixture và stack riêng; không thay bằng chứng release hiện tại |
| [BE13](backend-operations-guide.md) | Cổng, biến môi trường, thao tác vận hành và log được lọc |
| [Visitor UAT](visitor-uat.md), [M30 UAT](m30/M30_UAT_CHECKLIST.md) | Luồng UAT, thiết bị và phạm vi MVP; dùng endpoint /api/v1 đầy đủ theo code hiện tại |
| [M30 acceptance](m30/M30_ACCEPTANCE_REPORT.md), [demo](m30/M30_DEMO_RUNBOOK.md) | Bằng chứng/bối cảnh lịch sử, không điền PASS cho candidate mới |
| [Rollback runbook](rollback-runbook.md) | Ngừng ghi, rollback image, phục hồi dữ liệu và xác minh sau sự cố |

Tất cả gate release mới còn CHƯA CHẠY. BE14 chỉ kiểm tra đọc/cú pháp, đường dẫn,
liên kết, bảng Markdown và whitespace; không gọi GitHub Actions/DB, chạy test,
deploy, migration, backup/restore hoặc container để nghiệm thu release.
