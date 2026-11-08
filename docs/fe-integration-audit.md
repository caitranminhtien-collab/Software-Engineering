# Kiểm kê tích hợp file FE01–FE06 (FE14)

Phương pháp: tìm tham chiếu trong `frontend/index.html`, `admin.html`, `app.js`, `dev-server.js`, `Dockerfile.frontend`, `.github/workflows/`.
Chỉ báo cáo — không sửa `app.js`.

## Kết luận ngắn
`index.html` chỉ nạp `styles.css`, `theme.css`, `hue-map.css`, `hue-map.js`, `hue-chat-api.js`, `app.js`.
**Không file FE01–FE06 nào được nạp bởi trang Visitor**; chúng được kiểm thử độc lập (`tests/frontend/*.unit.cjs`) nhưng chưa chạy trong sản phẩm.

## Bảng USED / NOT USED / DUPLICATED
| File | Trạng thái | Bằng chứng | Ghi chú |
|---|---|---|---|
| `hue-api.js` (`fetchJson`, `loadAllPublishedRoutes`, `normalizeRouteDetail`) | NOT USED + DUPLICATED | không có `<script>` nạp; `app.js` có `loadPublishedRoutesFromBackend` (dòng ~350) và `selectPublishedRoute` (~385) làm việc tương tự | logic trùng, hai bản có thể lệch nhau |
| `hue-gps-helpers.js` (`validHuePoint`, `distanceM`, `assessFix`, `nearbyAttractions`, URL Google Maps/OSM) | NOT USED + DUPLICATED | `app.js` tự định nghĩa `validHuePoint` (dòng 76) và dùng 13 lần; không dùng `HueGps` | |
| `hue-tts-helpers.js` (`resolveNarration`, `selectVoice`, `chunkText`, `classifyTtsError`…) | NOT USED + DUPLICATED | `app.js` tự xử lý `speechSynthesis` (8 chỗ) và tùy chọn giọng (`hueTtsPrefs`) | |
| `hue-visitor-a11y.css` | NOT USED | không có `<link>` | nội dung a11y (focus ring, skip-link, mục tiêu chạm 44px, reduced-motion) chưa có hiệu lực; FE08 đã đưa phần focus/tương phản vào `theme.css` |
| `tests/frontend/*.unit.cjs` | USED (bởi CI) | `node --test` trong job Frontend | chỉ kiểm thử file ở trên, không kiểm thử mã đang chạy trong `app.js` |
| `visitor-*-smoke.cjs` | USED (chạy tay) | kiểm thử trang thật qua mock API | đây mới là bảo vệ thực sự cho `app.js` |

## Điểm nối cần có nếu muốn dùng các file mới
Mọi file frontend mới phải được thêm vào **tất cả** nơi sau, nếu không sẽ 404 ở một môi trường nào đó:
1. `frontend/index.html` (thẻ `<script>`/`<link>`) — **không thuộc phạm vi TV1 nếu đổi logic**; thẻ nạp CSS/JS phụ là thay đổi presentation, cần xác nhận với trưởng nhóm.
2. `frontend/dev-server.js` — Set `allowedFiles` (hiện chỉ có 11 file).
3. `Dockerfile.frontend` — danh sách `COPY` cố định.
4. `.github/workflows/deploy-hue-pages.yml` — danh sách file triển khai cố định.
5. `.github/workflows/ci.yml` — `node --check` / `test -f` nếu muốn CI kiểm tra.

## Đề xuất (cho người phụ trách app.js / trưởng nhóm)
- Hoặc **nối** `hue-*-helpers.js` vào `app.js` (thay các bản trùng) rồi xóa logic cũ; hoặc **gỡ** các helper khỏi repo để tránh hiểu nhầm là đã dùng.
- Nếu nối `hue-visitor-a11y.css`: kiểm tra xung đột với FE07/FE08 trong `theme.css` (cùng thuộc tính outline/font-size) trước khi nạp.
- Không xóa file nào trong PR này.
