# Checklist ảnh & tuyến tham quan (FE12)

Tự động: `node tests/frontend/visitor-media-routes-smoke.cjs` (mock API, Chromium).

| Mục | Tự động | Kiểm tay với dữ liệu thật |
|---|---|---|
| Thẻ di tích có `<img>` + `alt` + ảnh tải được | ✅ | ảnh có đúng di tích, đúng bản quyền |
| Ảnh lỗi 404 → khối "Chưa tải được ảnh", không ảnh vỡ | ✅ | |
| Chưa có ảnh → "Chưa có ảnh" có `aria-label` | ✅ | |
| Điểm dừng sắp theo `stop_order` | ✅ (API trả lộn xộn) | thứ tự khớp thực tế tham quan |
| Liên kết Google Maps (origin/destination/waypoints) | ✅ định dạng | mở thật, đúng địa điểm |
| Liên kết OpenStreetMap theo tọa độ | ✅ định dạng | mở thật |
| `target=_blank` có `rel=noopener` | ✅ | |
| Bản đồ Leaflet hiển thị marker/đường | ❌ (CDN bị chặn khi test) | **bắt buộc kiểm tay** |
| Ảnh minh họa dùng cho tài liệu | — | chụp từ dữ liệu thật, không dùng ảnh mock |

Không tự bịa tuyến/di tích mẫu; dữ liệu trong test chỉ là mock kỹ thuật.
