# Trạng thái Loading / Empty / Error — Visitor Web (FE10)

Kiểm tự động: `node tests/frontend/visitor-states-smoke.cjs` (mock API; ảnh chụp vào `test-artifacts/state-*.png`, thư mục này không commit).

| Trạng thái | Nơi | Hiện tại | Kết quả test |
|---|---|---|---|
| Error | Khám phá (API 500) | tiêu đề "Không tải được dữ liệu di tích" + nút "Thử tải lại" | PASS |
| Error | Tuyến (API 500) | thông báo + nút "Thử lại", không có tuyến mẫu | PASS |
| Empty | Tuyến (0 tuyến) | "Chưa có tuyến tham quan" | PASS |
| Empty | Ảnh di tích | "Chưa có ảnh" (`role=img` + `aria-label`) | PASS |
| Error | Ảnh lỗi 404 | "Chưa tải được ảnh" | PASS |
| Loading | API chậm | trang không trắng, không lỗi JS | PASS |

## Phát hiện cần người phụ trách `app.js` xử lý (TV1 không sửa logic)
- Chữ "Kiểm tra Backend" xuất hiện trong khối ảnh lỗi — thuật ngữ kỹ thuật hiển thị cho khách tham quan; nên đổi thành "Vui lòng thử lại sau".
- Trạng thái Loading chưa có chỉ báo riêng (spinner/skeleton) hoặc `aria-busy`; hiện chỉ không để trống trang.
- Các trạng thái lỗi/trống chưa có `role="status"`/`aria-live` để trình đọc màn hình thông báo.
