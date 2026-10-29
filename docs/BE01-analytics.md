# BE01 — Đối soát Dashboard

## Định nghĩa chỉ số

| Chỉ số | Định nghĩa |
|---|---|
| Lượt xem | Số event attraction_view |
| Lượt nghe | Số event tts_started, không phải nghe hoàn tất |
| Bắt đầu tuyến | Số event route_started |
| Ngôn ngữ TTS | Số event tts_started theo language_code |
| Xếp hạng | Lượt xem của tối đa 20 di tích đang published, có bản tiếng Việt published |
| Khách online | Ước lượng số mã trình duyệt có heartbeat trong 75 giây gần nhất, đếm từ Redis |

Các chỉ số event đếm số lần phát sinh, không phải khách duy nhất.
Khoảng 7/30 ngày là ngày lịch theo Asia/Ho_Chi_Minh, gồm hôm nay.
Khoảng thời gian lấy từ 00:00 ngày đầu đến trước 00:00 ngày mai.
Khách online độc lập với bộ lọc 7/30 ngày.
Nhiều tab dùng chung mã trình duyệt được gộp thành một.

## Lỗi và thay đổi

Truy vấn ngôn ngữ TTS và xếp hạng thiếu mốc cuối,
nên tính thêm event mang thời gian của ngày mai.

Đã bổ sung mốc cuối trong staff-analytics.repository.ts.
Điều kiện thời gian của xếp hạng nằm trong LEFT JOIN
để giữ các di tích có 0 lượt xem.

## SQL và kiểm thử

- BE01-analytics-check.sql: 6 truy vấn đối soát.
- BE01-analytics-fixture.sql: dữ liệu thử local có marker riêng.
- BE01-analytics-cleanup.sql: xóa event và session của fixture.
- tests/BE01-analytics-regression.cjs: chạy repository và SQL thật
  trên PostgreSQL bằng bảng tạm, rollback sau kiểm thử.

Chạy test:

    npm.cmd run build
    node tests/BE01-analytics-regression.cjs

Script regression hiện chưa được tự chạy bởi npm test.

## Kết quả kiểm tra local — 29/10/2026

- Build thành công.
- Regression PostgreSQL: PASS cho 7 và 30 ngày.
- SQL, API và CSV khớp dữ liệu thử:
  - 7 ngày: views/listens/starts = 2; vi/en = 1/1; Đại Nội = 2.
  - 30 ngày: views/listens/starts = 4; vi/en = 2/2; Đại Nội = 4.
- CSV đủ ngày, 11 di tích và 7 ngôn ngữ; UTF-8 có BOM.
- Khách chưa đăng nhập: analytics và presence trả 401.
- Editor: cả hai API trả 403.
- Admin: cả hai API trả dữ liệu thành công.
- Một trình duyệt khách hoạt động: online = 1.
- Hai tab cùng trình duyệt: online vẫn = 1.
- Đóng các tab khách, sau 90 giây: online = 0.
- Đã dọn fixture: xóa 18 event và 1 session thử.

## Giới hạn

Khách online là ước lượng trình duyệt hoạt động, không phải số người.
Xếp hạng chỉ gồm di tích đủ điều kiện công khai và tối đa 20 mục,
nên tổng xếp hạng không bắt buộc bằng tổng lượt xem.
Tích hợp regression vào CI sẽ được xử lý trong BE03.