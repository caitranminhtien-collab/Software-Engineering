# Ngôn ngữ giao diện Visitor Web (LANG01–LANG06)

## Tóm tắt
Bộ chọn ngôn ngữ **toàn cục** ở góc phải trên của Visitor Web (cạnh ô tìm kiếm), 7 ngôn ngữ: Tiếng Việt (mặc định), English, 中文, 日本語, 한국어, Français, Deutsch.
Ngôn ngữ được lưu trong `localStorage` (khóa `hue-language-v1`), tải lại trang vẫn giữ. `<html lang>` đổi theo.

## Thành phần
| File | Vai trò |
|---|---|
| `frontend/hue-i18n.js` | Module: `getCurrentLanguage()`, `setCurrentLanguage(code)`, `translate(key)` (fallback: ngôn ngữ chọn → tiếng Việt → chính khóa), `onChange`, sự kiện `hue:languagechange` |
| `frontend/hue-i18n-dict.js` | Từ điển 7 ngôn ngữ (46 khóa, cùng bộ khóa ở mọi ngôn ngữ) |
| `frontend/hue-i18n-dom.js` | Bộ dịch nhãn theo DOM: dịch chuỗi tiếng Việt gốc **khớp chính xác** từ điển (nội dung, `aria-label`, `placeholder`, `title`) và phần tử `data-i18n`; theo dõi thay đổi DOM nên nhãn do `app.js` vẽ lại vẫn được dịch |
| `frontend/hue-i18n.css` | Kiểu bộ chọn (chỉ `.lang-switch`) |
| `frontend/index.html` | Thêm bộ chọn, các thuộc tính `data-i18n*`, 3 thẻ `<script>` + 1 `<link>` |

**Không sửa** `app.js`, `src/`, API, DB.

## Phạm vi dịch
- Có dịch: thanh điều hướng, nhãn thanh bên, ô tìm kiếm, chân trang, màn hình chào, tiêu đề + mô tả + nhãn nhỏ của 8 trang, vài thông báo lỗi/trống thường gặp.
- **Không dịch**: tên/mô tả di tích, tuyến, nội dung API, nội dung chatbot (chatbot chỉ hỗ trợ vi/en), chuỗi có chèn số liệu, các nút/nhãn nhỏ chưa có trong từ điển (giữ tiếng Việt, **không dịch giả**).
- Khi chọn ngôn ngữ khác, trang sẽ hiển thị **lẫn** nhãn đã dịch và nhãn tiếng Việt chưa có trong từ điển. Muốn phủ rộng hơn: bổ sung khóa vào từ điển (chuỗi gốc phải khớp từng ký tự).

## Cách thêm một nhãn
1. Thêm khóa vào **cả 7** ngôn ngữ trong `hue-i18n-dict.js` (test sẽ báo nếu lệch khóa).
2. Chuỗi tiếng Việt phải **khớp từng ký tự** với chữ hiển thị (và không trùng với khóa khác).
3. Nhãn tĩnh trong HTML có thể dùng `data-i18n="khóa"` hoặc `data-i18n-attr="placeholder:khóa;aria-label:khóa"`.

## Kiểm thử
| Lệnh | Nội dung |
|---|---|
| `node --test tests/frontend/hue-i18n.unit.cjs` | 11 test: đủ 7 ngôn ngữ, cùng bộ khóa, không rỗng, fallback, lưu/đọc, lỗi localStorage |
| `node tests/frontend/visitor-language-smoke.cjs [--browser chrome\|edge\|firefox]` | Trình duyệt thật (API mock): vị trí selector, đổi 6 ngôn ngữ, giữ sau tải lại, dữ liệu API không bị đổi, storage bị chặn, bàn phím |

## Kết quả kiểm tra trình duyệt desktop (LANG06)
| Trình duyệt | Kết quả |
|---|---|
| Chromium 153 | PASS (2026-11-08) |
| Google Chrome 153 | PASS (2026-11-08) |
| Microsoft Edge | **CHƯA CHẠY** (không có trong môi trường) |
| Firefox | **CHƯA CHẠY** (không có trong môi trường) |

Đã kiểm tra bố cục DE/FR/JA ở 1280/1366px: không tràn ngang. Một số nhãn dài (Đức/Pháp) đã được rút gọn để không xuống dòng quá nhiều.

## Lưu ý triển khai (cần trưởng nhóm/TV2 xác nhận)
Các file mới phải có trong danh sách phục vụ của từng môi trường, nếu không bộ chọn không hiện ở môi trường đó:
`frontend/dev-server.js` (allowlist), `Dockerfile.frontend`, `.github/workflows/deploy-hue-pages.yml`, `.github/workflows/ci.yml` (kiểm tra tồn tại + cú pháp). Các thay đổi này nằm trong **một commit riêng** (`chore: ...`) để có thể bỏ nếu nhóm xử lý khác.

## Bản dịch cần rà soát
Bản dịch do máy soạn, **cần người thạo từng ngôn ngữ rà soát** trước khi phát hành chính thức.

## Danh sách khóa (tiếng Việt gốc)
| Khóa | Chuỗi gốc |
|---|---|
| `lang.label` | Ngôn ngữ |
| `nav.home` | Tổng quan |
| `nav.explore` | Khám phá di tích |
| `nav.map` | Bản đồ |
| `nav.routes` | Tuyến tham quan |
| `nav.audio` | Thuyết minh |
| `nav.chat` | Hỏi đáp di sản |
| `nav.popular` | Điểm đến nổi bật |
| `nav.weather` | Thời tiết Huế |
| `side.caption` | KHÁM PHÁ CỐ ĐÔ |
| `side.visitor` | Khách tham quan |
| `side.journey` | Hành trình của bạn |
| `search.placeholder` | Tìm một câu chuyện, một di tích… |
| `search.label` | Tìm di tích |
| `menu.open` | Mở trình đơn |
| `popular.label` | Được tham quan nhiều nhất |
| `footer.tagline` | Huế, một miền di sản. |
| `footer.note` | Giao diện tương tác · Nội dung minh họa |
| `open.kicker` | MỘT MIỀN DI SẢN · MỘT HÀNH TRÌNH |
| `open.welcome` | Chào mừng bạn đến với Huế |
| `open.skip` | Bỏ qua |
| `open.aria` | Chào mừng đến với Hue Guide |
| `brand.aria` | Hue Guide trang chủ |
| `home.kicker` | HUE GUIDE · KHÔNG GIAN CỦA BẠN |
| `home.sub` | Một góc nhìn, trọn hành trình khám phá Huế. |
| `explore.title` | Khám phá di tích. |
| `explore.sub` | Xem hình ảnh, nghe thuyết minh và khám phá các di tích Huế. |
| `map.title` | Một bản đồ, nhiều lựa chọn. |
| `map.sub` | Chọn di tích, xem vị trí trên bản đồ và nghe những câu chuyện khi bạn đến gần. |
| `map.kicker` | KHÁM PHÁ KHÔNG GIAN DI SẢN |
| `routes.title` | Chọn một hành trình. |
| `routes.sub` | Khám phá những hành trình tại Huế. |
| `audio.title` | Lắng nghe câu chuyện Huế. |
| `audio.sub` | Lắng nghe câu chuyện về các di tích Huế. |
| `chat.title` | Bạn hỏi, di sản trả lời. |
| `chat.sub` | Hỏi đáp bằng Gemini dựa trên tài liệu Knowledge đã được phê duyệt. |
| `popular.title` | Điểm đến nổi bật. |
| `popular.sub` | Danh sách các di tích có thông tin đã xuất bản. |
| `popular.kicker` | HUE GUIDE · ĐIỂM ĐẾN CÔNG KHAI |
| `weather.title` | Thời tiết cho hành trình. |
| `weather.sub` | Chọn một ngày để xem dự báo và chuẩn bị trước khi khám phá Huế. |
| `weather.kicker` | DỰ BÁO · HUẾ, VIỆT NAM |
| `err.attractions` | Không tải được dữ liệu di tích |
| `err.retryLoad` | Thử tải lại |
| `err.retry` | Thử lại |
| `empty.routes` | Chưa có tuyến tham quan |
