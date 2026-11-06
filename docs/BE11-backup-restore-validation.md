# BE11 — Kiểm chứng backup/restore database tổng hợp

## Hiện trạng và lựa chọn triển khai

Rà soát tại commit `fd243a7`. Working tree ban đầu chỉ có ba file untracked đã
được yêu cầu giữ nguyên. Không cần fetch/pull hoặc thay nhánh để làm bài kiểm
chứng độc lập này.

[BE05](BE05-backup-restore.md) có quy trình pg_dump custom, pg_restore trong một
transaction, đối chiếu tên bảng/count và manifest media. Tuy nhiên, các lệnh mẫu
gắn với container DEV và database gốc; không dùng chúng trong BE11. Tài liệu cũng
ghi rõ count không chứng minh giá trị dữ liệu giống nhau, dump không chứa role
cấp cluster và Redis không nằm trong backup đó.

BE08/BE10 cung cấp cách đặt tên UUID, kiểm tra label ownership, database đích,
container/volume, truyền cấu hình tổng hợp, xử lý BOM và cleanup trong finally.
BE11 tái sử dụng các nguyên tắc cùng thứ tự sáu migration; không refactor hoặc
gọi runner BE08/BE10 vì chúng có vòng đời và mục đích khác.

Chỉ thêm ba file:

- `tests/run-be11-backup-restore.cjs`: runner dùng Node builtin và Docker CLI;
  không thêm dependency, không cần backend/Redis/Compose.
- `tests/fixtures/be11/fixture.sql`: fixture nhỏ, liên kết bằng ID được SQL trả
  về; không phụ thuộc ID hoặc dữ liệu máy cá nhân.
- Tài liệu BE11 này. Không sửa quy trình BE05 dành cho dữ liệu thực.

## Cách chạy

Yêu cầu Node 24, Git, Docker daemon Linux containers và image `postgres:18`
đã có sẵn. Runner không tự pull image hoặc đọc registry credential cá nhân.

```powershell
node tests/run-be11-backup-restore.cjs
```

Không cần `.env`, `.env.staging`, server ứng dụng, database hoặc dump có sẵn.
Runner không nhận tên DB/container/dump từ người dùng hoặc biến môi trường.
Chỉ kế thừa PATH, SystemRoot/WINDIR và biến thư mục tạm để chạy CLI.
Docker dùng config rỗng riêng, không đọc Docker config cá nhân.

## Quy trình và bảo vệ tài nguyên

1. Sinh ID hex ngẫu nhiên. Tạo volume và container mới có label
   `hue.be11.run=<id>`. Xác nhận tên chưa tồn tại trước tạo; không tái sử dụng
   volume. Container chạy `--network none`, không publish port, không mount
   thư mục máy cá nhân hoặc Docker socket.
2. PostgreSQL tự tạo DB nguồn `hue_be11_source_<id>` trong cluster mới. DB đích
   là `hue_be11_target_<id>`, được tạo sau bằng createdb/template0. Không dùng
   tên `hue_tourism`, DEV hoặc staging cho bất kỳ kết nối nào.
3. Trước thao tác ghi, kiểm tra container ID/tên/label, POSTGRES_DB, network,
   port và đúng một mount là volume UUID của lần chạy; kiểm tra label volume.
   Mọi truy vấn SQL chỉ chấp nhận đúng hai tên DB đã sinh.
4. Xác minh current_database/current_user và ghi nhận OID từng DB; lần sau phải
   khớp OID. DB nguồn phải trống trước khởi tạo. Trước createdb phải xác nhận DB
   đích chưa tồn tại; trước pg_restore phải xác minh DB đích mới/trống, không có
   bảng, sequence, view hoặc foreign table người dùng.
5. Tạo role tổng hợp `hue_app` để migration M26 cấp quyền và role `be11_restore`
   để restore. Cả hai NOLOGIN/NOSUPERUSER/NOCREATEDB/NOCREATEROLE. Credential
   quản trị container là giá trị ngẫu nhiên dùng một lần, không in hoặc chèn SQL.
6. Áp dụng sáu migration theo BE03/BE08 trên nguồn, bỏ BOM trong bộ nhớ nếu có;
   psql xử lý chỉ thị encoding vốn có. Nạp fixture trong transaction. Không có
   ứng dụng hoặc tiến trình khác ghi dữ liệu trong bài kiểm chứng.
7. Chạy pg_dump -Fc --no-owner --no-acl ra file trong container. Dùng docker cp
   chuyển archive ra thư mục tạm, đọc dưới dạng Buffer để kiểm tra PGDMP/SHA-256;
   không giải mã toàn bộ archive thành UTF-8 hoặc redirect binary qua PowerShell.
8. Chạy pg_restore --list, xác minh các TABLE trong TOC khớp danh sách nguồn và
   không có ACL entry. Docker cp archive trở lại đường dẫn restore riêng;
   SHA-256 phải khớp file nguồn và file host trước khi restore.
9. Restore vào đích bằng --role=be11_restore --no-owner --no-privileges
   --exit-on-error --single-transaction. Không dùng --clean, không chạy lại
   migration trên database đã restore, không DROP database nào.
10. Đối chiếu danh sách public table, count và toàn bộ giá trị từng hàng theo
    thứ tự canonical JSON. Kiểm tra fixture xác định: Unicode, dấu nháy, newline,
    JSON lưu trong text, tọa độ, liên kết ID và NULL.
11. So sánh last_value/is_called của mọi sequence public. Gọi nextval trên đích
    và so với trạng thái nguồn đã chụp. Fixture tạo gap cho attraction sequence
    nên test không chỉ kiểm tra MAX(id)+1; cũng bao phủ sequence chưa từng dùng.
12. Thử vi phạm FK, unique và CHECK trên đích trong transaction rollback, dưới
    role restore. Yêu cầu lần lượt SQLSTATE 23503, 23505, 23514. Với ON_ERROR_STOP,
    lỗi khiến psql đóng kết nối và rollback transaction. Đối chiếu dữ liệu lại;
    source sequence không được đổi do các probe ở đích.

Sequence PostgreSQL không rollback theo transaction. Vì vậy các sequence của
đích có thể tiến thêm sau nextval/probe; sự khớp trạng thái restore được kiểm
tra trước probe. Dữ liệu hàng không được thay đổi bởi các probe thất bại.

## Owner, role, ACL và giới hạn dump

Source object được tạo bởi postgres. Target DB thuộc `be11_restore`; restore
SET ROLE để tạo object dưới role đó và kiểm tra toàn bộ bảng public có đúng
owner mới. Không giữ owner nguồn và không khôi phục ACL nguồn. Kiểm tra cụ thể:
role hue_app được migration nguồn GRANT trên visitor_events nhưng không có
SELECT trên bảng tương ứng ở đích sau restore bỏ ACL.

Đây là restore cùng phiên bản PostgreSQL 18, hai DB trong cùng cluster test.
Role cluster được chuẩn bị tường minh trước restore; bài này không chứng minh
pg_dump có thể phục hồi role, password, quyền cấp cluster hoặc cấu hình server.
Không gọi pg_dumpall --globals-only và không đọc role/credential máy cá nhân.

Dump database chứa schema, dữ liệu và trạng thái sequence trong phạm vi dump.
`attraction_media.file_url` chỉ là metadata. Không tạo/đọc/sao lưu file ảnh,
audio hoặc uploads thật; DB restore thành công không có nghĩa media file đã
được backup/restore. Redis/session, TLS, ứng dụng chạy trên DB đích và phục hồi
khác phiên bản PostgreSQL cũng không nằm trong nghiệm thu.

## Cleanup, timeout và bằng chứng an toàn

Deadline thực thi 4 phút, mỗi CLI command tối đa 30 giây; đợi PostgreSQL healthy
tối đa 35 giây. SIGINT/SIGTERM yêu cầu hủy và vào finally. Cleanup dùng timeout
riêng, không bị bỏ qua bởi signal đã hủy.

Finally chỉ xóa container sau khi xác minh ID/tên/label/mount. Chỉ xóa named
volume sau khi container đã được xóa và label volume khớp. Kiểm tra không còn
container/volume đúng tên sau xóa. Không dùng prune, không xóa image postgres:18,
không DROP từng DB hoặc động đến resource ngoài lần chạy. Thư mục tạm chỉ được
xóa khi đường dẫn nằm trực tiếp dưới temp và có tiền tố hue-be11-.

Nếu không xác minh/xóa được tài nguyên, không cố ép xóa; báo tên container,
volume và thư mục phục hồi, trả exit code 1. Kill cứng, mất daemon hoặc mất điện
có thể ngăn finally hoàn tất; cần kiểm tra ownership thủ công trước xử lý.

Log chỉ có START/OK/FAIL/BLOCKED, tên bước, exit status và SQLSTATE đã lọc.
Không in stdout/stderr thô, SQL, giá trị hàng, password, biến môi trường hoặc
chuỗi kết nối. Dump/config nằm ngoài repo và được xóa khi cleanup thành công.

Báo cáo `hue-be11-evidence-<id>.json` nằm ngoài repo, được giữ có chủ đích sau
cleanup: run ID, commit, tên tài nguyên tổng hợp, count/SHA-256 từng bảng,
archive SHA-256, số sequence, SQLSTATE probe và kết quả cleanup. Không chứa
dump, hàng dữ liệu, credential hoặc raw log. Runner in đường dẫn báo cáo để
có thể lưu bằng chứng; đây là file bằng chứng còn lại, không phải dump cần giữ.

## Tiêu chí PASS/FAIL

- PASS/exit 0 chỉ sau dump, TOC, SHA-256 transport, restore atomic, toàn bộ so
  sánh/probe, cleanup và ghi bằng chứng thành công.
- Sai đích/ownership, DB đích không trống, lỗi SQL/CLI, mismatch dữ liệu/sequence,
  timeout, lỗi cleanup hoặc lỗi lưu bằng chứng: exit 1, không in PASS.
- Thiếu Docker/image/Git: BLOCKED/exit 1; không tính là đã nghiệm thu restore.
- Không dùng số liệu BE05 lịch sử hoặc nhận định đọc code làm kết quả BE11.

## Kết quả thực tế — 06/11/2026

Đã chạy runner ngoài sandbox để truy cập Docker daemon. Không fetch/pull,
chuyển nhánh, stage, commit hoặc push.

| Bảng public | Số hàng nguồn = đích |
| --- | ---: |
| attraction_localization_revisions | 0 |
| attraction_localizations | 2 |
| attraction_media | 1 |
| attractions | 2 |
| audio_plays | 0 |
| chat_messages | 0 |
| knowledge_chunks | 0 |
| knowledge_documents | 0 |
| route_stops | 2 |
| routes | 1 |
| staff_accounts | 1 |
| visitor_events | 0 |
| visitor_sessions | 0 |
| Tổng | 9 |

- pg_dump -Fc, pg_restore --list và restore thật: thành công.
- 13 bảng public: danh sách, count và toàn bộ giá trị hàng khớp.
- 13 sequence: trạng thái restore và nextval đúng, bao gồm gap/sequence chưa dùng.
- Ba probe constraint nhận đúng 23503/23505/23514; không để lại thay đổi hàng.
- Owner đích và việc bỏ ACL đúng chính sách đã mô tả.
- Cleanup container, volume và dump/config tạm: thành công.
- Runner: PASS, exit code 0. Báo cáo an toàn được giữ ngoài repo.
- Cú pháp Node và diff/whitespace: thành công.

Không chạy lại build/toàn bộ npm test vì chỉ thêm runner vận hành độc lập,
fixture tổng hợp và tài liệu; không sửa ứng dụng hoặc cấu hình dùng chung.
