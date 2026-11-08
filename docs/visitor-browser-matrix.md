# Ma trận trình duyệt desktop — Visitor Web (FE11)

Chạy: `node tests/frontend/visitor-browser-matrix.cjs --browsers chrome,edge,firefox`
(Firefox cần `npx playwright install firefox`; Edge/Chrome dùng bản cài trên máy.)
Mỗi trình duyệt × 8 trang × 1280/1366/1920px: đúng 1 `h1`, không tràn ngang, có nội dung, không lỗi JS (API được mock).

| Trình duyệt | Kết quả | Ngày / phiên bản | Ghi chú |
|---|---|---|---|
| Chromium (Playwright) | PASS | 2026-11-08, 153.0.8010.12 | môi trường CI/cloud |
| Google Chrome | PASS | 2026-11-08, 153.0.8010.12 | bản cài sẵn trong môi trường cloud, cùng lõi Chromium |
| Microsoft Edge | **CHƯA CHẠY** | — | không có Edge trong môi trường chạy |
| Mozilla Firefox | **CHƯA CHẠY** | — | chưa cài Firefox trong môi trường chạy |

> Không ghi PASS cho trình duyệt chưa chạy. Thành viên có Edge/Firefox chạy lệnh trên rồi cập nhật bảng.

## Chưa tự động hóa được (cần kiểm tay trên từng trình duyệt)
- [ ] Bản đồ Leaflet (cần tải CDN; môi trường kiểm thử chặn CDN) và iframe bản đồ dự phòng.
- [ ] Thuyết minh `speechSynthesis`: danh sách giọng khác nhau theo trình duyệt/hệ điều hành.
- [ ] Định vị GPS thật (hộp thoại cấp quyền).
- [ ] Hiển thị `backdrop-filter` (kính mờ) — Firefox cũ có thể khác.
- [ ] Màn hình mở đầu / hiệu ứng chuyển cảnh.
