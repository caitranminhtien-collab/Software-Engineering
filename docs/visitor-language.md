# Ngôn ngữ Visitor Web (LANG01–LANG14)

Cập nhật bàn giao LANG14 ngày 10/11/2026, đối chiếu code tại `89046bf`.
[Checklist, kết quả QA và ảnh minh chứng](visitor-language-qa.md) tách riêng
API giả lập với các phần chưa kiểm chứng trên môi trường thật. Các kết quả LANG06
ở cuối tài liệu là lịch sử, không phải lần chạy LANG14.

## Tóm tắt
Bộ chọn ngôn ngữ **toàn cục** ở góc phải trên của Visitor Web (cạnh ô tìm kiếm), 7 ngôn ngữ: Tiếng Việt (mặc định), English, 中文, 日本語, 한국어, Français, Deutsch.
Ngôn ngữ được lưu trong `localStorage` (khóa `hue-language-v1`), tải lại trang vẫn giữ. `<html lang>` đổi theo.

## Thành phần
| File | Vai trò |
|---|---|
| `frontend/hue-i18n.js` | Module: `getCurrentLanguage()`, `setCurrentLanguage(code)`, `translate(key)` (fallback: ngôn ngữ chọn → tiếng Việt → chính khóa), `onChange`, sự kiện `hue:languagechange` |
| `frontend/hue-i18n-dict.js` | Từ điển 7 ngôn ngữ (47 khóa, cùng bộ khóa ở mọi ngôn ngữ), gồm thông báo giới hạn Chat |
| `frontend/hue-i18n-dom.js` | Bộ dịch nhãn theo DOM: dịch chuỗi tiếng Việt gốc **khớp chính xác** từ điển (nội dung, `aria-label`, `placeholder`, `title`) và phần tử `data-i18n`; theo dõi thay đổi DOM nên nhãn do `app.js` vẽ lại vẫn được dịch |
| `frontend/hue-i18n.css` | Kiểu bộ chọn (chỉ `.lang-switch`) |
| `frontend/index.html` | Thêm bộ chọn, các thuộc tính `data-i18n*`, 3 thẻ `<script>` + 1 `<link>` |

LANG01–LANG06 cung cấp module và nhãn tĩnh; LANG08–LANG10 tích hợp nội dung
Visitor trong [app.js](../frontend/app.js). Lần bàn giao tài liệu LANG14 không
thay đổi ứng dụng, dependency, API hay DB.

## Chọn ngôn ngữ

1. Mở Visitor Web và chọn ngôn ngữ ở bộ chọn toàn cục cạnh ô tìm kiếm.
   Có các mã `vi`, `en`, `zh`, `ja`, `ko`, `fr`, `de`.
2. Lựa chọn được lưu tại `hue-language-v1`; tải lại trang sẽ khôi phục lựa chọn.
   `<html lang>` dùng mã tương ứng, riêng `zh` dùng `zh-CN`. Nếu storage bị chặn,
   vẫn đổi được trong phiên nhưng không bảo đảm giữ lựa chọn sau reload.
3. Danh sách và chi tiết di tích tải lại theo ngôn ngữ đã chọn. Nếu chưa có bản
   dịch published, đọc thông báo tiếng Việt dự phòng; không coi đó là bản dịch.
4. Trên Thuyết minh, ngôn ngữ toàn cục khởi tạo/đồng bộ locale đọc, ví dụ
   `en` → `en-US`, `zh` → `zh-CN`. Có thể chọn riêng ngôn ngữ thuyết minh tại
   `#audio-language`. Đổi ngôn ngữ toàn cục sau đó sẽ đồng bộ lại lựa chọn này.
   Lượt TTS đang phát tiếp tục với nội dung/giọng đã chọn lúc bắt đầu; locale mới
   dùng cho lượt tiếp theo. Render bị hoãn được cập nhật sau khi kết thúc hoặc dừng.
5. Trên Chat, chọn `zh/ja/ko/fr/de` sẽ hiện thông báo giới hạn; `vi/en` ẩn thông
   báo. Visitor hiện gửi câu hỏi với mã `vi` kể cả khi chọn `en`; lựa chọn giao diện
   không biến Chat thành client gửi tiếng Anh. Đổi ngôn ngữ chỉ cập nhật thông báo,
   giữ câu hỏi nháp, lịch sử và trạng thái yêu cầu đang xử lý.

## Phạm vi dịch
- Có dịch: thanh điều hướng, nhãn thanh bên, ô tìm kiếm, chân trang, màn hình chào, tiêu đề + mô tả + nhãn nhỏ của 8 trang, vài thông báo lỗi/trống thường gặp.
- Không tự dịch dữ liệu API: di tích dùng localization published do API trả;
  tuyến/stops vẫn tiếng Việt; câu trả lời Chat giữ hành vi hiện tại. Chuỗi có chèn
  số liệu và nhãn chưa có trong từ điển vẫn có thể giữ tiếng Việt.
- Khi chọn ngôn ngữ khác, trang sẽ hiển thị **lẫn** nhãn đã dịch và nhãn tiếng Việt chưa có trong từ điển. Muốn phủ rộng hơn: bổ sung khóa vào từ điển (chuỗi gốc phải khớp từng ký tự).

| Phạm vi | Hỗ trợ thực tế | Fallback / giới hạn | Bằng chứng repo |
| --- | --- | --- | --- |
| Nhãn giao diện | 7 ngôn ngữ của bộ chọn; chỉ những nhãn có trong từ điển | Thiếu/rỗng dùng tiếng Việt, thiếu cả tiếng Việt trả khóa; không bảo đảm mọi nhãn đều dịch | [Module](../frontend/hue-i18n.js), [từ điển](../frontend/hue-i18n-dict.js), [DOM](../frontend/hue-i18n-dom.js) |
| Di tích list/detail | `GET /api/v1/attractions` và `/:id` có query `language` theo lựa chọn; chỉ nội dung public/published | Đọc `requested_language`, `content_language`, `fallback_used`; thiếu bản dịch dùng tiếng Việt và có thông báo. Bảy lựa chọn không chứng minh DB có đủ bảy bản dịch | [App: loadAttractionsFromBackend](../frontend/app.js), [service](../src/services/attraction.service.ts), [repository](../src/repositories/attraction.repository.ts) |
| Tuyến và stops | Nhãn trang có thể dịch; tên/mô tả tuyến và tên stops vẫn là tiếng Việt API trả | Route API chưa hỗ trợ chọn ngôn ngữ; không dịch giả tên tuyến/stops | [Route service](../src/services/route.service.ts), [repository](../src/repositories/route.repository.ts) |
| Browser Audio/TTS | 7 locale lựa chọn; chỉ đọc description published đúng mã, không fallback | Thiếu bản dịch hoặc API fallback: không đọc tiếng Việt bằng voice ngoại ngữ; giọng có sẵn phụ thuộc hệ điều hành/trình duyệt. LANG14 chỉ kiểm tra nội dung/nút, chưa nghe âm thanh | [App: narrationLocales, ensureNarration, playAudio](../frontend/app.js), [test](../tests/frontend/visitor-attraction-language.unit.cjs) |
| File media/audio | Ngôn ngữ file theo metadata API; độc lập với nhãn giao diện và locale TTS | Đổi locale không dịch byte media. `media[].fallback_used` độc lập với fallback text; client có helper lọc audio vi/en, không khẳng định file audio bảy ngôn ngữ đã tích hợp | [App: publishedAudioMedia](../frontend/app.js), [ma trận API](visitor-language-api-matrix.md) |
| Chat | Backend chỉ chấp nhận vi/en; Visitor hiện luôn gửi `language: 'vi'` | Không đổi/ngầm dịch câu hỏi hoặc câu trả lời. Thông báo cho zh/ja/ko/fr/de, ẩn với vi/en; không chứng minh Chat thật đã chạy | [Client](../frontend/hue-chat-api.js), [validator](../src/validators/chat.validator.ts), [test](../tests/frontend/visitor-chat-language.unit.cjs) |

[Ma trận API LANG07](visitor-language-api-matrix.md) là bản rà soát lịch sử ở
`6974941`; phần nhận định TV1 chưa bàn giao trong đó không phản ánh trạng thái
`89046bf`. Dùng bảng trên cho hành vi tích hợp LANG08–LANG10 hiện tại.

## Cách thêm một nhãn
1. Thêm khóa vào **cả 7** ngôn ngữ trong `hue-i18n-dict.js` (test sẽ báo nếu lệch khóa).
2. Chuỗi tiếng Việt phải **khớp từng ký tự** với chữ hiển thị (và không trùng với khóa khác).
3. Nhãn tĩnh trong HTML có thể dùng `data-i18n="khóa"` hoặc `data-i18n-attr="placeholder:khóa;aria-label:khóa"`.

## Kiểm thử
| Lệnh | Nội dung |
|---|---|
| `node --test tests/frontend/hue-i18n.unit.cjs` | Bộ LANG11: lưu/khôi phục 7 mã và html lang, mã sai giữ lựa chọn, sự kiện, fallback thiếu/rỗng, lỗi storage |
| `node tests/frontend/visitor-language-smoke.cjs [--browser chrome\|edge\|firefox]` | Bộ LANG12 (API mock): selector, đổi ngôn ngữ, reload en, detail en/fallback vi, Chat giữ draft, nhãn/trạng thái, storage bị chặn, bàn phím |
| `node --test tests/frontend/visitor-attraction-language.unit.cjs` | LANG08–LANG09: tải nội dung theo mã, bỏ phản hồi cũ, cache tiếng Việt, lượt TTS đang phát và lượt kế tiếp |

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
| `chat.languageLimit` | Chat API chỉ hỗ trợ tiếng Việt và tiếng Anh. Giao diện Visitor hiện gửi yêu cầu với mã vi (tiếng Việt), kể cả khi bạn chọn ngôn ngữ giao diện khác. |
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
