# Hướng dẫn sử dụng Visitor Web — Hue Tourism Guide (FE13)

Dành cho khách tham quan và người demo. Chỉ mô tả chức năng đang có; nội dung (di tích, tuyến) lấy từ dữ liệu **đã xuất bản** của hệ thống.

Xem [hướng dẫn chọn ngôn ngữ và phạm vi hỗ trợ](visitor-language.md) và
[báo cáo QA LANG14](visitor-language-qa.md). Ảnh trong báo cáo QA dùng API giả lập,
không thay thế ảnh dữ liệu thật trong checklist bên dưới.

## 1. Mở trang
Mở địa chỉ Visitor Web (trang `index.html`). Lần đầu có màn hình chào; bấm để vào. Dùng tốt trên Chrome, Edge, Firefox (máy tính) và trình duyệt điện thoại.

## 2. Các mục ở thanh bên
| Mục | Dùng để |
|---|---|
| Tổng quan | Xem nhanh di tích nổi bật, thời tiết, tuyến hôm nay |
| Khám phá di tích | Duyệt, lọc, tìm di tích; mở chi tiết |
| Bản đồ | Xem vị trí di tích; mở Google Maps / OpenStreetMap |
| Tuyến tham quan | Chọn tuyến, xem điểm dừng theo thứ tự, mở dẫn đường |
| Thuyết minh | Nghe/đọc thuyết minh theo ngôn ngữ (nếu có nội dung đã xuất bản) |
| Hỏi đáp di sản | Hỏi trợ lý về di tích; Visitor hiện gửi mã vi, dù Chat API hỗ trợ vi/en |
| Điểm đến nổi bật | Danh sách điểm được xem nhiều |
| Thời tiết Huế | Dự báo thời tiết |

## 3. Tìm kiếm
Gõ vào ô tìm kiếm phía trên rồi Enter để tìm di tích.

## 4. Tuyến tham quan
1. Vào **Tuyến tham quan** → chọn một tuyến.
2. Xem các điểm dừng theo thứ tự 1, 2, 3…, thời gian tham quan và di chuyển.
3. **Bắt đầu hành trình** để ghi nhận bắt đầu; **Xem trên bản đồ** / dẫn đường để mở Google Maps.

## 5. Thuyết minh
Chọn di tích và ngôn ngữ. Nếu chưa có bản thuyết minh đã xuất bản cho ngôn ngữ đó, hệ thống báo và **không** đọc nhầm sang tiếng khác. Cần trình duyệt hỗ trợ đọc giọng nói; nếu không, trang vẫn dùng được nhưng nút Phát bị khóa.

## 6. Định vị (tùy chọn)
Chỉ bật khi bạn cho phép. Nếu từ chối, hết thời gian hoặc sai số lớn, hệ thống báo rõ và vẫn dùng được các mục khác.

## 7. Khi gặp lỗi
| Hiện tượng | Cách xử lý |
|---|---|
| "Không tải được dữ liệu…" | Kiểm tra mạng, bấm **Thử tải lại** |
| "Chưa có tuyến tham quan" | Chưa có tuyến được xuất bản; quay lại sau |
| "Chưa tải được ảnh" / "Chưa có ảnh" | Ảnh lỗi hoặc chưa có; nội dung vẫn đọc được |
| Bản đồ không hiện | Cần kết nối để tải bản đồ; dùng liên kết Google Maps/OSM |

## 8. Danh sách ảnh chụp cần bổ sung (chụp từ dữ liệu thật)
Ảnh chụp từ dữ liệu mock không dùng làm ảnh minh họa. Người có môi trường dữ liệu thật chụp ở 1366×768:
- [ ] Tổng quan  - [ ] Khám phá (có ảnh)  - [ ] Chi tiết di tích  - [ ] Bản đồ
- [ ] Tuyến + điểm dừng  - [ ] Thuyết minh  - [ ] Hỏi đáp  - [ ] Thời tiết
- [ ] Trạng thái lỗi (ngắt mạng)

## 9. Giới hạn đã biết
Chatbot chỉ hỗ trợ tiếng Việt/Anh. Bản đồ tương tác cần tải thư viện ngoài. Edge/Firefox chưa được chạy kiểm thử tự động (xem `docs/visitor-browser-matrix.md`).
