# Checklist truy cập (a11y) — Visitor Web (FE08)

Phạm vi: `index.html` + `app.js` (8 trang). Không đổi logic JS, không đụng `src/`.

## Kiểm tự động
`node tests/frontend/visitor-a11y-audit.cjs [--json out.json]` (Chromium, mock API, 1366px) kiểm:
tên truy cập của nút/ô nhập, `alt` ảnh, phần tử bấm được nhưng không focus được bằng phím,
vòng focus khi Tab, 1 thẻ `h1`/trang, `lang`, tương phản chữ (ước lượng, bỏ chữ trên ảnh nền).

| Trước FE08 | Sau FE08 |
|---|---|
| Ô tìm kiếm + ô chat không có vòng focus | Có outline 2px `#5b3f22` |
| `.category-count` 3.92:1, `.hue-simulation-label` 4.49:1, chữ phụ ở thẻ thuyết minh 3.68:1 | ≥ 4.5:1 |

Kết quả hiện tại: 0 điểm cần xem xét trên 8 trang.

## Kiểm tay (không tự động được)
- [ ] Tab qua toàn bộ trang theo thứ tự hợp lý; Enter/Space kích hoạt nút.
- [ ] Iframe bản đồ dự phòng (`iframe.hue-map-fallback`): Chromium không áp `:focus` lên thẻ iframe nên script bỏ qua; kiểm bằng mắt khi Tab tới.
- [ ] Bản đồ Leaflet (cần CDN) — marker có thao tác bằng phím không.
- [ ] Trình đọc màn hình (NVDA/VoiceOver): tên nút, thông báo trạng thái tải/lỗi.
- [ ] Tương phản chữ trên ảnh nền (script không đo được).
- [ ] Phóng to 200%.

## Chưa làm (ngoài phạm vi, cần sửa `app.js`)
Nếu phát hiện lỗi cần đổi logic/DOM trong `app.js`, chỉ ghi vào báo cáo cho người phụ trách.
