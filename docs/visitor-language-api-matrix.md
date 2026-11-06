# LANG07 — Visitor language API matrix

## Mốc rà soát và cách đọc

Ngày **06/11/2026**, branch local **main**, HEAD **6974941**. Ref origin/main
đang lưu local cũng là **6974941**. Không fetch hoặc truy vấn server Git từ xa;
không khẳng định ref remote đang lưu đã phản ánh mọi thay đổi mới trên GitHub.
Chỉ đọc code/test tracked và thêm tài liệu này; không gọi API/DB/provider,
không chạy test/browser hoặc xác nhận PASS runtime mới.

Các kết luận dưới đây là **contract suy ra từ code hiện tại**, được đối chiếu
với nội dung test. Một test có tên hoặc assertion tương ứng không chứng minh
đã chạy lại ở LANG07; nhiều test đang mock service/repository.

## Quy ước mã ngôn ngữ

Không có một policy language chung cho mọi endpoint:

| Phạm vi | Vị trí / validation / mặc định | Ý nghĩa |
| --- | --- | --- |
| Attraction list/detail | Query language, mặc định vi; phải là string, chuyển lowercase nhưng không trim; regex `^[a-z]{2,3}(?:-[a-z]{2})?$` | Kiểm tra cú pháp, không phải danh mục ngôn ngữ đã có bản dịch; mã hợp lệ có thể vẫn fallback |
| Route list/detail/stops | Không đọc/validate language | Gửi query language không làm đổi dữ liệu; không có response metadata ngôn ngữ |
| Visitor session | JSON body language_code, mặc định vi nếu bỏ trường; trim/lowercase, chỉ vi/en | Metadata của session, không tự trở thành query language cho attraction hoặc mặc định chat |
| Chat POST | JSON body language, trim/lowercase, chỉ vi/en; không có default | Thiếu/sai language bị 400 sau bước xác thực Visitor; không mở rộng theo bộ chọn bảy ngôn ngữ |
| Audio-play POST/PATCH | Không có tham số chọn ngôn ngữ | Chọn bản ghi bằng media_id; language_code khi POST lấy từ media, không từ ngôn ngữ session |
| Browser TTS | Locale của voice ở client, không phải REST parameter | API code và BCP-47 voice locale phải được map, không gửi locale giọng đọc như thể đó là mã DB tương đương |

Ví dụ từ validator attraction: EN được chuẩn hóa thành en; en-US thành en-us
và hợp lệ về cú pháp, nhưng không tự map về en. vi_VN, english hoặc chuỗi có
khoảng trắng đầu/cuối không hợp lệ. Array/object language bị từ chối. Đừng gửi
zh-CN rồi giả định sẽ tìm bản ghi zh; cần map theo contract được thống nhất.
Không thấy src xử lý Accept-Language để tự chọn ngôn ngữ các API này.

Bảy cặp đang có ở bộ chọn thuyết minh trong [app.js](../frontend/app.js) và
[TTS helper](../frontend/hue-tts-helpers.js):

| Locale giọng đọc | API code |
| --- | --- |
| vi-VN | vi |
| en-US | en |
| zh-CN | zh |
| ja-JP | ja |
| ko-KR | ko |
| fr-FR | fr |
| de-DE | de |

Đây là danh sách client hiện có, không phải cam kết bảy bản dịch/audio đã được
published. Attraction validator còn nhận các mã khác hợp regex; khả năng trả
nội dung phụ thuộc localization/media trong DB, chưa kiểm chứng DB thật.

## Ma trận API Visitor

Các API JSON dưới đây có prefix chính xác /api/v1; đường tệp /uploads/media
là mount riêng ngoài prefix đó. Public attraction/routes
không cần Visitor bearer; chat/audio-play cần token Visitor hợp lệ và grant phù
hợp. Không nhầm Visitor token với Staff cookie. 401/403 có thể xảy ra trước
validation language đối với endpoint được bảo vệ.

| Endpoint / method | Tham số liên quan | Ngôn ngữ hỗ trợ theo code | Response liên quan | Fallback / thiếu bản dịch | Điều kiện published / truy cập | Bằng chứng code/test |
| --- | --- | --- | --- | --- | --- | --- |
| GET /api/v1/attractions | Query language; page/page_size riêng | Mã hợp regex; mặc định vi; dữ liệu tùy DB | data[] có name, requested_language, content_language, fallback_used; pagination.total | Thiếu localization requested đã published thì name từ vi và flag fallback; không có description ở list | Attraction published và localization vi published bắt buộc; requested localization chỉ được lấy khi published | [Validator](../src/validators/attraction.validator.ts), [service](../src/services/attraction.service.ts), [repository](../src/repositories/attraction.repository.ts), [HTTP test](../tests/integration/attraction.test.ts), [service test](../tests/unit/attraction.service.test.ts) |
| GET /api/v1/attractions/:id | Path id dương; query language | Như list | data.name, description, sources, requested_language, content_language, fallback_used, media[] | Name/description dùng requested khi cả hai khác null; nếu không thì dùng vi và nguồn vi. Không có public row/không resolve được nội dung thì 404 | Attraction + vi localization published; requested draft/in_review không được join | [Controller](../src/controllers/attraction.controller.ts), [service](../src/services/attraction.service.ts), [repository](../src/repositories/attraction.repository.ts), [test](../tests/unit/attraction.service.test.ts) |
| GET /api/v1/attractions/:id — phần media | Cùng query language; không có media-language parameter riêng | Audio requested code hoặc vi; ảnh không được lọc theo language | media[].type, language, url, caption, fallback_used, duration_seconds | Có audio requested thì dùng chúng; nếu không và requested khác vi thì dùng audio vi; không có cả hai thì không có audio. Caption ảnh không được bảo đảm dịch theo requested | Chỉ media published của public attraction; ảnh được lấy chung, audio chỉ truy vấn requested/vi | [Media selection](../src/services/attraction.service.ts), [SQL filter](../src/repositories/attraction.repository.ts), [test ưu tiên/fallback audio](../tests/unit/attraction.service.test.ts) |
| GET /api/v1/routes | Query page/page_size; language không được xử lý | Nội dung route tiếng Việt | data[].name từ name_vi, description từ description_vi; không có requested_language/content_language/fallback_used | Không có cơ chế dịch/fallback theo request; query language=en/fr vẫn không chọn bản dịch | Route published, ít nhất một stop; mọi attraction của stop published và có vi localization published | [Validator](../src/validators/route.validator.ts), [service](../src/services/route.service.ts), [repository](../src/repositories/route.repository.ts), [HTTP test](../tests/integration/route.test.ts), [SQL unit test](../tests/unit/route.repository.test.ts) |
| GET /api/v1/routes/:id | Path id; không có language được xử lý | Route name/description và stop attraction_name tiếng Việt | data.stops[].order, attraction_id, attraction_slug, attraction_name, tọa độ/thời lượng; không có metadata fallback | Không có stop name đa ngôn ngữ qua endpoint này; route không public/hợp lệ thì 404 | Điều kiện public như list; stop name join localization vi published | [Service](../src/services/route.service.ts), [repository](../src/repositories/route.repository.ts), [HTTP test](../tests/integration/route.test.ts) |
| GET /uploads/media/:attractionId/:filename | URL file trả từ API; không có language negotiation | Byte của file đã chọn, không dịch khi thêm query language | Không có DTO ngôn ngữ; language phải lấy từ metadata media trước đó | Thiếu file/bản ghi hoặc không được xem thì 404; URL không phải API sinh bản dịch/audio mới | Local middleware kiểm tra media/attraction/vi published cho khách; Staff hợp lệ có thể preview. URL hosting ngoài không đi qua middleware local này | [App mount](../src/app.ts), [media middleware](../src/middleware/media-access.middleware.ts), [test](../tests/unit/media-access.middleware.test.ts) |
| POST /api/v1/visitor-sessions | JSON language_code | Chỉ vi/en; bỏ trường mặc định vi | data.language_code, session_id, token, expires_at, access_scope | Không fallback từ fr/zh/...; code ngoài tập trả 400 | Tạo public Visitor session; không tạo bản dịch hoặc yêu cầu attraction published | [Route](../src/routes/session.routes.ts), [validator](../src/validators/session.validator.ts), [service](../src/services/session.service.ts), [test](../tests/integration/visitor-session.test.ts) |
| POST /api/v1/audio-plays | Bearer; JSON media_id | Language của audio record, không whitelist vi/en tại bước chọn media | data.language_code, media_id, attraction_id, duration_seconds và tiến trình; không có requested/content/fallback metadata | Không chọn ngôn ngữ tự động, không đổi ngôn ngữ từ session; media không phải audio published thì 404 | Media audio published; parent attraction + vi localization published; grant Visitor cho attraction | [Validator](../src/validators/audio-play.validator.ts), [service](../src/services/audio-play.service.ts), [repository](../src/repositories/audio-play.repository.ts), [test](../tests/integration/audio-play.test.ts) |
| PATCH /api/v1/audio-plays/:id | Bearer; played_seconds/completed, path play id | Không có language input hoặc đổi media | data.id/session_id/media_id/started_at/played_seconds/completed; không trả language_code như POST | Chỉ ghi tiến trình play hiện tại; không có fallback/dịch | Play thuộc Visitor session; media vẫn published và grant còn phù hợp; bounds duration được kiểm tra | [Route](../src/routes/audio-play.routes.ts), [service](../src/services/audio-play.service.ts), [test](../tests/unit/audio-play.service.test.ts) |
| POST /api/v1/chat/messages | Bearer; JSON question, language, attraction_id tùy chọn theo grant | Chỉ vi/en, language bắt buộc; question trim, dài 1–2000 ký tự | data.answer, response_status, citations, requested_language, content_language, fallback_used, visitor_message/assistant_message | Knowledge requested trước; nếu không có chunk và requested=en thì tìm vi. Không đủ nguồn phù hợp thì insufficient; dependency lỗi có thể 503, không tự dịch/mở mã mới | knowledge_documents phải approved và chunk khớp version; đây không phải join localization published của attraction. Visitor grant được kiểm tra riêng | [Validator](../src/validators/chat.validator.ts), [controller](../src/controllers/chat.controller.ts), [chat service](../src/services/chat.service.ts), [knowledge](../src/services/knowledge.service.ts), [repository](../src/repositories/knowledge.repository.ts), [test](../tests/integration/chat.test.ts) |
| GET /api/v1/chat/messages | Bearer; không có language filter | Lịch sử nguyên nội dung của session | data[] có content/speaker/citations/response_status; không có bộ requested/content/fallback theo từng message trong DTO | Không dịch lại lịch sử khi đổi UI language; không thể suy chắc ngôn ngữ mỗi message chỉ từ session.language_code | Chỉ lịch sử session đã xác thực; không truy vấn lại bản dịch/published content cho từng message | [Controller](../src/controllers/chat.controller.ts), [history mapping](../src/services/chat.service.ts), [test](../tests/integration/chat.test.ts) |

Route mount được đối chiếu với [app.ts](../src/app.ts), không suy endpoint từ
comment cũ trong controller. TTS dùng description từ attraction detail và
speechSynthesis của browser: **không có REST endpoint TTS/narration riêng được
mount trong app hiện tại**. audio-plays là telemetry playback, không tạo file
âm thanh hoặc chuyển văn bản thành giọng đọc.

## Đọc metadata và tránh phát sai ngôn ngữ

Metadata text và audio độc lập. Bản text en có thể tồn tại trong khi audio en
thiếu và media trả audio vi với media.fallback_used=true. Ngược lại, audio en
có thể tồn tại dù text detail fallback vi. Không dùng top-level fallback_used
để thay cờ/language của từng media, hoặc dùng tên ở list để xác nhận description.
media[].fallback_used hiện chỉ đánh dấu audio khác requested; false trên ảnh
không chứng minh caption ảnh đã được dịch.

Với TTS description từ attraction detail:

1. Map locale UI/voice sang API code đã thống nhất, gửi query language đúng mã.
2. Đọc data.requested_language, content_language, fallback_used và text thực sự
   không rỗng; không chỉ nhìn HTTP 200 hoặc ngôn ngữ đang chọn trên UI.
3. Chỉ đọc bằng voice của ngôn ngữ được chọn khi requested_language và
   content_language khớp mã đang chọn, không fallback. Nếu fallback vi, thông báo rõ và không gán voice
   en/fr/... cho đoạn tiếng Việt. Nếu UX cho phép đọc vi, phải là lựa chọn rõ
   ràng với voice vi, không tự coi đó là bản dịch đã có.
4. Thiếu nội dung hoặc voice thiết bị thì giữ trạng thái không khả dụng, không
   thay bằng chuỗi demo/tiếng Anh mẫu hoặc tự dịch để có nội dung phát.
5. Khi đổi ngôn ngữ/điểm đang phát, dừng phát cũ; response/cache đến muộn phải
   được gắn đúng attraction/code trước khi dùng. Voice BCP-47 không tự dịch text.

Với file audio, xác nhận media.type, media.language và media.fallback_used;
file đó không đổi tiếng khi đổi voice TTS hoặc thêm language vào URL. POST
audio-plays nhận media_id đã chọn, không phát hiện hộ client việc đang gắn nhãn
ngôn ngữ sai cho file.

Đây là yêu cầu tích hợp cho LANG08–LANG10, không phải code mới đã được triển
khai. [TTS helper](../frontend/hue-tts-helpers.js) có resolveNarration,
canSpeakWithSelectedVoice, codeOf/voicesFor/selectVoice và global HueTtsHelpers;
[unit test](../tests/frontend/hue-tts-helpers.unit.cjs) mô tả ca fallback/voice.
Nhưng helper chưa được index/admin nạp, nên unit test không chứng minh helper
đã phục vụ production UI.

## Chatbot vẫn giới hạn vi/en

Validator chat và session đều chỉ nhận vi/en. Chọn fr/zh/ja/ko/de cho thuyết
minh không cấp quyền hoặc khả năng gửi chat theo mã đó; gửi nguyên mã vào POST
chat hiện bị 400 sau auth. Không thêm ngôn ngữ, giả bản dịch hoặc âm thầm đổi
câu hỏi sang vi trong LANG07.

content_language/fallback_used của chat được gán từ **nguồn knowledge truy xuất**,
không phải detector xác nhận ngôn ngữ của mọi câu answer. Extractive có thể trả
nguyên đoạn knowledge vi; câu insufficient lại được chọn theo request vi/en,
và LLM được yêu cầu trả lời theo languageCode. Vì vậy không suy rằng metadata
đó bảo đảm mọi đầu ra LLM đã dịch chính xác hoặc có thể tự đưa vào TTS.
Fallback knowledge xảy ra khi không có chunk requested, không phải mọi lần
có chunk requested nhưng kết quả relevance thấp; trường hợp sau có thể insufficient.

Bằng chứng: [knowledge fallback test](../tests/unit/knowledge.service.test.ts),
[chat/LLM tests](../tests/unit/chat-llm.service.test.ts),
[grounding](../tests/unit/chat-grounding.service.test.ts),
[provider](../src/adapters/llm/chat-answer.provider.ts).

Client hiện tại [hue-chat-api.js](../frontend/hue-chat-api.js) công bố đúng
`window.HueChatAPI = { ask, reset }`; ask(question, attractionId=null) tạo body
language=vi, ensureSession tạo language_code=vi. ask chỉ trả answer/status/citations
cho UI, chưa chuyển tiếp ba metadata language của response. Backend có thể nhận
en qua API nhưng client này chưa có đối số language. Ngôn ngữ trong body chat
không bị controller bắt buộc bằng ngôn ngữ session; session vi không tự chặn
request chat en hợp lệ, cũng không làm body language trở nên tùy chọn.

## UI tĩnh, nội dung API và tình trạng bàn giao TV1

| Thành phần hiện có trên main local | Quan sát từ code | Không được suy ra |
| --- | --- | --- |
| index.html/admin.html và nav/toast trong app.js | Nhiều nhãn tiếng Việt viết trực tiếp; HTML lang=vi | GET attraction language=en không dịch menu, nút, toast, lỗi hoặc đổi document.lang |
| Audio selector #audio-language | Native DOM change: stopAudio(false), cập nhật state.audioLanguage, lưu key hue-audio-language, ensureNarration và render | Đây là lựa chọn thuyết minh, chưa phải global UI language state/event của TV1 |
| ensureNarration/publishedNarration | Lazy GET detail theo mã; chỉ cache bản requested khi content_language khớp, không fallback và có description | Không chứng minh toàn bộ list/detail UI đã đổi theo audio selector; list/detail tải ban đầu vẫn language=vi |
| Recorded-audio helpers trong app.js | publishedAudioMedia chỉ giữ vi/en; audioForAttraction ánh xạ en*→en, còn lại→vi; có ensureEnglishAudio | Chưa có client recorded-audio bảy ngôn ngữ; chỉ thấy định nghĩa audioForAttraction/ensureEnglishAudio/realAudioControl, chưa thấy call site trực tiếp trong app.js hiện tại |
| HueTtsHelpers | Helper UMD tồn tại, không được index/admin load | Không phải bằng chứng module i18n UI TV1 đã được tích hợp |
| data-hue-i18n-* trong hue-admin-crud.js | Panel Staff biên tập/generate/review/publish localization | Không phải module dịch nhãn Visitor UI hoặc sự kiện global language change |
| hue-map-select | CustomEvent ở hue-map.js, payload detail.slug cho chọn bản đồ | Không phải sự kiện chuyển ngôn ngữ |

Nguồn: [app.js](../frontend/app.js), [index](../frontend/index.html),
[admin](../frontend/admin.html), [Admin CRUD](../frontend/hue-admin-crud.js),
[map](../frontend/hue-map.js). Không dùng nội dung demo/hardcoded p.en như bản
dịch đã được DB duyệt.

**Bàn giao TV1 chưa được xác nhận trên mốc main đã rà soát.** Không thấy file
module i18n Visitor riêng, global/API i18n chung hoặc custom language-change event
được định nghĩa và nạp trong các file frontend tracked. Tìm tên file trên tree
origin/main đang lưu và nội dung tracked cho cùng kết quả; đây không phải bằng
chứng TV1 chưa làm trên branch riêng hoặc remote vừa cập nhật.

Chưa có interface/event TV1 thực tế để ghi nhận; không tự đặt tên getter/setter,
global hoặc event rồi coi là contract đã bàn giao. Cần TV1 xác nhận:

- Commit/PR đã merge, đường dẫn module, cách load và phạm vi Visitor/Admin.
- Tên export/global, getter/setter thực tế; state trả API code hay locale voice.
- Tên event, target dispatch, payload, thời điểm phát và hành vi đổi lại cùng mã.
- Mặc định, persisted key, danh sách mã và mapping locale→API; tách UI language,
  content_language thực tế và voice locale, không ép cả ba thành một giá trị.
- Namespace/key dịch nhãn và trạng thái thiếu bản dịch/fallback/chat vi/en.
- Thứ tự load, xử lý fetch/cache cũ và playback khi đổi ngôn ngữ.
- Việc nạp file trong index/admin, allowlist [dev server](../frontend/dev-server.js)
  và COPY [Dockerfile frontend](../Dockerfile.frontend). Có file trong repo chưa
  chứng minh file đã được phục vụ trong DEV hoặc image.

## Tác động cho LANG08–LANG10

| Hạng mục tích hợp tiếp theo | Có thể dùng ngay từ contract API | Chưa được API/client hỗ trợ hoặc cần thống nhất |
| --- | --- | --- |
| Tên di tích ở danh sách | Gọi lại attractions với query language đã map; hiển thị requested/content/fallback theo từng item | Client list hiện hardcode vi; chống response cũ/cache sai mã cần được triển khai ở công việc sau |
| Chi tiết/thuyết minh text | GET detail chọn name/description/sources đã published, fallback vi có metadata | Không tự dịch nhãn UI hoặc suy ra nguồn/caption ảnh đã dịch; dataset/ngôn ngữ published thực tế chưa xác minh |
| Routes/stops | Giữ ID/order/time và nội dung vi hiện có; nếu cần tên attraction dịch có thể lấy riêng attraction API theo ID | Chưa có route name/description/stops language parameter hay metadata. Dịch tên attraction riêng không biến route description thành bản dịch |
| TTS/file audio | Dùng description đúng ngôn ngữ và metadata từng audio, mapping bảy locale hiện có | Browser voice phụ thuộc thiết bị; client recorded audio hiện chưa có wiring bảy mã; thiếu bản dịch không được tự điền text hoặc đổi giọng sai |
| Chat | Backend POST hỗ trợ vi/en, có metadata nguồn/fallback; giữ lịch sử nguyên bản | Client ask hiện chỉ vi; bảy UI language không đồng nghĩa bảy chat language. Chốt UX chỉ vi/en và fallback với TV1, không mở backend trong LANG07 |
| Nhãn giao diện và thông báo | Lấy chuỗi từ module TV1 sau khi contract thực sự bàn giao | Không có endpoint dịch menu/toast/validation strings; module/event/persisted state TV1 hiện chưa xác minh |

Ma trận áp dụng cho LANG08–LANG10 mà không tự gán lại phạm vi từng thành viên
hoặc tạo phần TV1. Trước tích hợp phải chốt API module/event TV1 và ghi rõ phần
không thể đạt chỉ bằng đổi query language.

## Giới hạn và kiểm tra tài liệu

- Không kiểm tra remote main trực tiếp; chỉ main local và cached origin/main
  cùng 6974941. Cần merge SHA của TV1 để xác minh bàn giao mới hơn.
- Không biết DB hiện có bao nhiêu bản dịch/audio published hoặc file media thật;
  không giả lập dữ liệu để chứng minh bảy ngôn ngữ.
- Không gọi server/DB/AI, không chạy lại các test được dẫn. Dẫn test là bằng
  chứng contract đọc từ source, không phải kết quả runtime LANG07.
- Không xác minh voice/browser, phát audio, cache race hoặc UI ngôn ngữ end-to-end.
- Chỉ thêm tài liệu này; kiểm tra link tương đối, cấu trúc bảng Markdown và
  whitespace. Không sửa frontend, backend, schema/migration hoặc phạm vi chatbot.
