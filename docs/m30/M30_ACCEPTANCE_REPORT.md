# M3.0 — Biên bản trạng thái MVP Hue Tourism Guide (bản dự thảo)

**Ngày lập:** 24/10/2026  
**Nguồn đối chiếu:** PRD tiếng Việt (10/2026); ảnh commit/check GitHub; kết quả PowerShell M2.7–M2.9 mà nhóm đã xác nhận.

## 1. Baseline & CI

- Baseline GitHub **`cb2cbcd` — `test: align visitor grant tests and isolate Node contract suite`**.
- Trạng thái commit trên GitHub trong ảnh người phát triển cung cấp: **3/3 checks xanh** (Backend Test & Build, Frontend Static Checks, Hue Tourism MVP CI).
- Lỗi test từ M2.6–M2.8 được sửa ở M2.9, **không tắt kiểm thử**, không hạ cơ chế kiểm tra Visitor grant.
- **Chưa xác nhận** working tree hiện tại sau M2.9 trong phiên M3.0; script `M30_RELEASE_CHECK.ps1` sẽ kiểm tra tại máy sử dụng.

## 2. Bằng chứng kỹ thuật đạt

- M2.7: Kiểm thử Visitor scope, Media access, Revision Review–Approve–Publish, Staff Admin/Editor/Reviewer, CSRF, logout HTTP.
- M2.8: Frontend GPS gọi Backend, GPS near/manual fallback; TypeScript build, frontend JS syntax và 3/3 contract tests; 10+ di tích public trong DB test.
- M2.9: GitHub Backend Test & Build đã xanh lại sau cập nhật test cho `VisitorGrantSession`; hai check Frontend + MVP CI vẫn xanh.

## 3. Phạm vi phát hành được đề xuất

**Ứng viên demo local / báo cáo đồ án:** Có thể tiến hành kiểm thử trình duyệt theo runbook M3.0 và chốt bản demo sau khi checklist B01–B13 được xác nhận.  
**MVP nghiệm thu nghiệp vụ:** **Chưa được phê duyệt** — cần số liệu thực địa, review dữ liệu, chatbot và các điều kiện C01–C09.  
**Production:** **Chưa được phê duyệt** — chưa có bằng chứng staging, backup/restore, giám sát, hiệu năng và retention.

## 4. Quyết định cần ghi nhận

| Hạng mục | Quyết định đề xuất | Người xác nhận |
|---|---|---|
| Ticketing | Ngoài phạm vi MVP nếu chưa có quyết định bổ sung | Product Owner |
| Offline | P2, không chặn demo MVP | Product Owner |
| Revision workflow | M2.7 dùng Approve trước Publish, cập nhật PRD/Use Case | Product Owner/Reviewer |
| Ngôn ngữ | Hiển thị fallback khi chưa có bản dịch đã duyệt, không cam kết phủ 7 ngôn ngữ toàn bộ | Product Owner |
| GPS | Giữ chọn thủ công, không tự kích hoạt audio, kiểm chứng bán kính hiện trường | QA/Product Owner |

## 5. Kết luận tạm thời

Dự án đã có nền tảng Backend 3 lớp, tích hợp Frontend, bảo mật cơ bản và CI PASS 3/3. Mốc **M3.0 phát hành bản demo local** chỉ được ký sau khi chạy preflight và ghi bằng chứng thao tác trên trình duyệt. Các điều kiện đưa vào sử dụng thật vẫn cần kế hoạch nghiệm thu riêng, tránh nhầm giữa "Build xanh" và "Sản phẩm đã nghiệm thu hoàn toàn".
