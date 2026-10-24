# M3.0 — Checklist nghiệm thu MVP theo PRD / Use Case

**Cách ghi:** `PASS` = có bằng chứng từ test, log, ảnh hoặc biên bản; `CHƯA XÁC MINH` = không được tự đổi sang PASS; `P2/CÓ ĐIỀU KIỆN` = không bắt buộc trong bản MVP P0+P1. Dùng mã bằng chứng để đính ảnh/log theo phiên bản và ngày thực hiện.

## A. Phạm vi chức năng

| UC | Chức năng | Mức PRD | Bằng chứng hiện tại | Trạng thái nghiệm thu cuối |
|---|---|---|---|---|
| UC01 | Bản đồ / di tích công khai | P0 | Public API, ít nhất 10 published di tích theo M2.8 HTTP | Cần xác minh tọa độ, nội dung, nguồn, ảnh |
| UC02 | Tuyến tham quan | P0/P1 | Route API + stop workflow đã triển khai; có tuyến công khai | Cần demo chọn điểm/dẫn tuyến thực tế |
| UC03 | Gợi ý GPS | P1 | M2.8 API GPS nearby + low accuracy fallback PASS | Cần đo GPS thực địa tại Huế |
| UC04 | Thuyết minh audio | P0 | M2.4 TTS/media + M2.9 unit/integration CI | Cần thử Android/Safari, âm thanh thực |
| UC05 | Chatbot có nguồn | P1 | Chat endpoints/citations và các bài test hiện có | Cần bộ câu hỏi có nhãn và đánh giá chất lượng |
| UC06 | Staff đăng nhập | P0 | M2.7 Admin+CSRF và role matrix Editor/Reviewer PASS | Demo trình duyệt thực tế |
| UC07 | Quản lý di tích | P0 | Staff CRUD/workflow + M2.7 security | Cần dữ liệu demo an toàn + nguồn |
| UC08 | Quản lý tuyến | P0 | Staff routes, order/timing tests | Cần UX demo + route data verification |
| UC09 | Bản dịch/audio | P0/P1 | M2.4 thử 7 ngôn ngữ trên Đại Nội | Chưa bảo đảm mọi điểm có đủ bản dịch đã duyệt |
| UC10 | Quản lý tri thức | P1 | Endpoint và role tests | Cần kiểm tra indexing, nguồn/vòng đời |
| UC11 | Review/Publish | P0 | M2.7 Revision integration tests + PostgreSQL transaction PASS | Cần tài liệu hóa luồng Approve tách biệt Publish |
| UC12 | Quản lý tài khoản Staff | P0 | Admin/Editor/Reviewer HTTP matrix + CSRF PASS | Cần demo với tài khoản test, không lộ mật khẩu |
| UC13 | Analytics | P2 | M2.6 Dashboard + event tracking PASS | Không thay thế kiểm thử số liệu thực |
| UC14 | Offline package | P2 | Chưa triển khai | Ngoài phạm vi bắt buộc MVP |
| UC15 | Ticketing / Thanh toán | Có điều kiện | Chưa kích hoạt | Ngoài phạm vi nếu chưa qua quyết định đưa vào MVP |

## B. Checklist xác nhận tại máy demo

- [ ] B01: `git status -sb` sạch, SHA được ghi vào báo cáo; local branch đã đồng bộ origin/main.
- [ ] B02: GitHub Actions của SHA mới nhất hiển thị 3/3 check xanh (ảnh có tên check và SHA).
- [ ] B03: `npm.cmd run build`, `npm.cmd test` và `node --test tests/M28_mvp_contract.node.cjs` PASS.
- [ ] B04: `/health/live` 200 và `/health/ready` ready với DB/Redis connected.
- [ ] B05: User Web hoạt động ở `http://localhost:8000/`, không lỗi console nghiêm trọng.
- [ ] B06: Staff Web ở `/admin.html`; đăng nhập, đăng xuất, phân quyền thực tế hoạt động.
- [ ] B07: Thử chọn di tích/tuyến thủ công khi từ chối GPS.
- [ ] B08: Khi bật GPS, có gợi ý hoặc trạng thái phù hợp; không tự động phát audio; cần xin quyền.
- [ ] B09: Demo bản dịch + fallback, nghe audio/TTS trên trình duyệt dùng bảo vệ.
- [ ] B10: Chatbot trả lời câu hỏi và hiển thị nguồn; câu hỏi ngoài phạm vi được xử lý phù hợp.
- [ ] B11: Admin/Editor/Reviewer không thấy/không gọi được hành động trái quyền; CSRF từ chối request không hợp lệ.
- [ ] B12: Workflow revision chỉ được demo trên dữ liệu test; giữ lại public content trước khi Approve/Publish.
- [ ] B13: Dashboard analytics không lộ dữ liệu quản trị cho Visitor.

## C. Điều kiện nghiệm thu trước môi trường dùng thật

- [ ] C01 **Nguồn & bản quyền**: 10/10 di tích pilot có người duyệt nội dung, tọa độ thực, tác giả/nguồn ảnh và audio; không chỉ đếm bản ghi DB.
- [ ] C02 **GPS hiện trường**: ghi độ chính xác, phạm vi kích hoạt, cooldown, mẫu không chính xác và thao tác chọn thủ công trên thiết bị di động; chốt cấu hình theo số liệu thực.
- [ ] C03 **Chất lượng chatbot**: bộ 50 câu với nhãn, đánh giá citation, hallucination và prompt injection; reviewer chấp nhận kết quả.
- [ ] C04 **Hiệu năng & UX**: Android, Safari, các chế độ mạng, hỗ trợ tiếp cận và thời gian phản hồi/load.
- [ ] C05 **Backup/Restore**: sao lưu PostgreSQL và thực hành restore vào môi trường riêng biệt, đối chiếu bản ghi.
- [ ] C06 **Staging / triển khai**: tên miền HTTPS, cấu hình secrets, giám sát, rollback, logs; CI xanh không thay thế staging.
- [ ] C07 **Lưu giữ dữ liệu**: chính sách tự dọn phiên, audio, chat, events và nhật ký theo quy định chốt của dự án; có test job retention.
- [ ] C08 **An toàn**: xem lại cookie/session trong HTTPS, upload media, least privilege và lịch sử thay đổi nội dung.
- [ ] C09 **Quyết định sản phẩm**: ký xác nhận khác biệt giữa PRD và workflow Revision Approve rồi Publish riêng.

## D. Mẫu biên bản ghi kết quả

| Trường | Điền |
|---|---|
| Ngày / người thử | |
| Git SHA | |
| Môi trường / URL | |
| Thiết bị / trình duyệt | |
| Mã UC / bước thử | |
| Kết quả PASS / FAIL / BLOCKED | |
| Ảnh/log tham chiếu | |
| Người phê duyệt | |

**Kết luận:** 3/3 CI xanh là điều kiện rất tốt để dùng cho demo và tiếp tục nghiệm thu, **không** tương đương phê duyệt triển khai production.
