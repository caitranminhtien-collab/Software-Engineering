# Sơ đồ Frontend Visitor (FE01)

> Trạng thái: `hue-api.js` và `hue-visitor-a11y.css` là file MỚI, chưa được nạp mặc định. Việc nối vào `app.js`/`index.html` nằm trong patch tuỳ chọn `optional-wire-visitor.patch`; mô tả "Luồng dữ liệu tuyến" bên dưới đúng sau khi áp dụng patch đó (code hiện tại tự có logic tải tuyến riêng trong `app.js`).

Frontend là script thuần, không framework, không build. `app.js` dùng chung cho Visitor và Admin (`IS_ADMIN = body[data-area=admin]`).

## Tệp và ranh giới
| Tệp | Vai trò | Visitor | Admin |
|---|---|---|---|
| `index.html` | Trang Visitor; nạp `hue-api.js` → `hue-map.js` → `hue-chat-api.js` → `app.js` | ✔ | |
| `admin.html` + `admin-auth.js` | Đăng nhập Staff, sau đó nạp `hue-admin-crud.js` → `app.js` | | ✔ |
| `hue-api.js` (**mới**) | Helper API thuần logic: `fetchJson` có timeout 15s, `loadAllPublishedRoutes`, `normalizeRouteDetail`. Không đụng DOM, test được bằng Node | ✔ | chưa nạp (Admin dùng fetch dự phòng trong `app.js`) |
| `hue-gps-helpers.js` (**mới**) | Logic thuần cho GPS/bản đồ: phân loại lỗi, kiểm tra tọa độ/sai số, link Google Maps/OSM, gần nhất trong bán kính, chống gọi lặp. Chưa được nạp | ✔ (khi nối) | |
| `hue-tts-helpers.js` (**mới**) | Logic thuần cho thuyết minh: 7 ngôn ngữ, chọn nội dung published/fallback, chọn giọng, chia câu, phân loại lỗi TTS. Chưa được nạp | ✔ (khi nối) | |
| `hue-map.js` | Bản đồ Leaflet/OSM, marker GPS | ✔ | |
| `hue-chat-api.js` | Phiên khách + chat | ✔ | |
| `app.js` | State, router theo hash, render từng trang, TTS, GPS, analytics, **và** toàn bộ Admin | ✔ | ✔ |

## State chính (`app.js`)
`state` (page, filter, query, activeRoute, audioLanguage, location…) · `attractionApi` (di tích) · `publicRouteApi` (tuyến published: `status`, `items`, `selectedId`, `detail`, `detailStatus`) · `hueGpsTour` (GPS) · `weather` · `staff*Api` (chỉ Admin).

## Luồng dữ liệu tuyến (FE02)
```
boot (Visitor) → loadPublishedRoutesFromBackend()
  → HueApi.loadAllPublishedRoutes()   GET /api/v1/routes?page=N&page_size=100  (lặp hết total_pages)
  → selectPublishedRoute(id)          GET /api/v1/routes/:id
  → HueApi.normalizeRouteDetail()     sắp theo `order` (=stop_order), ép số, kiểm tọa độ, gắn `issues`
  → renderRoutes()                    loading / lỗi + Thử lại / rỗng / chi tiết
```
Không còn mảng tuyến mẫu; nếu backend không có tuyến published thì hiện trạng thái rỗng.

## Điều hướng
`navigate(page)` → đổi `location.hash` → `render()` → `pages[state.page]()`. Visitor không vào được `#admin`.

## Quy ước tách tiếp (các PR sau)
Tách từng cụm khỏi `app.js` theo PR nhỏ (GPS → `hue-gps.js`, TTS → `hue-tts.js`), mỗi cụm phải: không đổi CSS/giao diện, `node --check` PASS, và báo thành viên 2 trước khi đụng đoạn Dashboard.
