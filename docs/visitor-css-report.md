# Báo cáo CSS chưa dùng — Visitor Web (FE09)

Sinh bởi `tests/frontend/visitor-css-audit.cjs`. **Chỉ để tham khảo**: file CSS dùng chung với Admin và nhiều trạng thái động không được kích hoạt.

| File | Byte | Được dùng | Chưa thấy dùng |
|---|---|---|---|
| styles.css | 59225 | 41.0% | 59.0% |
| theme.css | 17867 | 53.3% | 46.7% |
| hue-map.css | 7397 | 63.4% | 36.6% |

## styles.css: 491 quy tắc chưa thấy dùng (20 đầu)
- `button:focus-visible,a:focus-visible`
- `input:focus,select:focus,textarea:focus`
- `.nav-button .count`
- `.profile .icon-button`
- `.language-button`
- `.language-button span`
- `.home-top`
- `.hero-card`
- `.hero-card>img`
- `.hero-card:after`
- `.hero-inner`
- `.tag svg`
- `.hero-inner h2`
- `.hero-inner p`
- `.hero-buttons`
- `.button:hover`
- `.hero-buttons .outline`
- `.audio-card`
- `.audio-title`
- `.audio-caption`

## theme.css: 83 quy tắc chưa thấy dùng (20 đầu)
- `body button:focus-visible,body a:focus-visible`
- `body .category-choice:hover`
- `body .popular-notice`
- `body .popular-notice p,body .popular-visits span`
- `body .popular-rank`
- `body .popular-rank.top-rank`
- `body .popular-visits svg`
- `body .popularity-meter`
- `body .popularity-meter>i`
- `body .attraction-card:hover`
- `body .abstract-thumb`
- `body .abstract-thumb>span`
- `body .forecast-day`
- `body .forecast-day:hover`
- `body .forecast-day.selected`
- `body .forecast-detail`
- `body .weather-metrics b`
- `body .weather-warning`
- `body .dash-route .text-button`
- `body .step-circle`

## hue-map.css: 22 quy tắc chưa thấy dùng (20 đầu)
- `.hue-real-map .leaflet-container`
- `.hue-map-div-icon`
- `.hue-map-pin`
- `.hue-map-pin.selected`
- `.hue-map-popup`
- `.hue-map-popup strong`
- `.hue-map-popup small`
- `.hue-map-popup button`
- `/* M3.6 Visitor GPS visuals: cream / heritage brown, blue real GPS, amber simulation. */ .`
- `.hue-visitor-marker`
- `.hue-visitor-marker-real`
- `.hue-visitor-marker-demo`
- `.hue-visitor-marker-core`
- `.hue-visitor-marker-caption`
- `50%`
- `.hue-location-state.is-real`
- `.hue-location-state.is-demo`
- `.hue-simulation-select-wrap select:focus-visible,.hue-location-panel button:focus-visible`
- `.hue-visitor-marker`
- `.hue-history-list`

## Kết luận
- Không xóa quy tắc nào trong PR này.
- Muốn dọn: kiểm thêm Admin, hover/focus, popup, GPS, mobile, rồi dọn từng nhóm nhỏ có ảnh chụp trước/sau.
