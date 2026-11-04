# Checklist UAT — Visitor (FE06)

Ghi ngày giờ, thiết bị, trình duyệt cho mỗi lần chạy. Dùng DB local riêng (xem hướng dẫn Docker), **không sửa dữ liệu thật**, không dùng key AI thật trong CI.

## Tự động
Chạy từ thư mục gốc repo. Tất cả dùng API/GPS **mock**, không backend, không DB, không AI/Open-Meteo/CDN thật.

| Lệnh | Nội dung |
|---|---|
| `node --test tests/frontend/hue-api.unit.cjs tests/frontend/hue-gps-helpers.unit.cjs tests/frontend/hue-tts-helpers.unit.cjs` | 31 test logic: tuyến 0/1/11/100/101/250, id hỏng/trùng, `stop_order`, tọa độ 0/0; GPS denied/timeout/0-0/ngoài Huế/sai số, link Google Maps/OSM, chống gọi lặp; TTS fallback ngôn ngữ, chọn giọng, chia câu, lỗi autoplay |
| `node tests/frontend/visitor-smoke.cjs` | Tuyến trên trình duyệt: 0/11/250 tuyến, lỗi 500, 360px, `route_started` đúng 1 lần, ≤1 visitor session |
| `node tests/frontend/visitor-audio-smoke.cjs` | Thuyết minh: đủ 15 điểm (không `slice(0,10)`), 7 ngôn ngữ, published/fallback/trống, thiết bị không có TTS |
| `node tests/frontend/visitor-gps-responsive-smoke.cjs` | GPS: từ chối/hết giờ/0-0/ngoài Huế/sai số lớn/API mất mạng/không gọi lặp, nút Google Maps; 8 trang × 360/390/768/1366px không tràn ngang. Ảnh ở `./test-artifacts` (hoặc `SHOT_DIR`) |

Playwright chưa nằm trong `package.json`; chỉ thêm `devDependency` khi nhóm đồng ý. Các smoke test chạy trên code **hiện có** của repo (không cần áp dụng patch tuỳ chọn).

**Chưa tự động hoá được (bắt buộc làm thủ công):** GPS thật trên HTTPS ở điện thoại, giọng TTS thật trên Android/iOS, Admin Publish → Visitor refresh với DB thật.

## Thủ công (đánh dấu ✔/✘ + ghi chú)
**Hành trình:** Trang chủ → Khám phá → chi tiết di tích → Tuyến → GPS (opt-in) → Thuyết minh/TTS → Chat.

| # | Kiểm tra | Chrome desktop | Android | iOS |
|---|---|---|---|---|
| 1 | Trang chủ tải, màn mở đầu không kẹt | | | |
| 2 | Khám phá: lọc + tìm; ảnh lỗi không vỡ bố cục | | | |
| 3 | Chi tiết: chỉ hiện nội dung published, không draft | | | |
| 4 | Tuyến: Admin Publish → Visitor refresh thấy đúng tuyến, thứ tự stops khớp DB | | | |
| 5 | Tuyến 0 tuyến published: hiện "Chưa có tuyến", không có tuyến mẫu | | | |
| 6 | Tắt mạng: thông báo lỗi mạng + nút Thử lại hoạt động | | | |
| 7 | Bắt đầu hành trình; chuyển điểm không gửi thêm `route_started` | | | |
| 8 | GPS **từ chối**: có thông báo, chọn di tích thủ công được | | | |
| 9 | GPS timeout (trong nhà): thông báo hết thời gian chờ, không treo | | | |
| 10 | GPS cho phép (HTTPS thật): gợi ý đúng bán kính; không gọi lặp | | | |
| 11 | Nút Google Maps/OSM đúng tọa độ; nội dung ghi "tham khảo" | | | |
| 12 | TTS 7 ngôn ngữ: đọc/dừng/đổi ngôn ngữ; thiếu bản dịch → hiện fallback, không đọc draft | | | |
| 13 | Giọng không tồn tại / thiết bị không hỗ trợ / autoplay bị chặn: có thông báo | | | |
| 14 | Chat: hỏi đáp trả lời; lỗi API có thông báo | | | |
| 15 | 360/390/768/1366px: không thanh ngang, không kẹt modal | | | |
| 16 | Bàn phím: Tab thấy focus, "Bỏ qua tới nội dung", Esc đóng modal | | | |

## Lỗi còn lại / ghi chú
(điền sau khi chạy thực địa; đính kèm video GPS và ảnh trước–sau)
