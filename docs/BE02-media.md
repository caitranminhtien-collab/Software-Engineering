# BE02 — Media URLs

## Hành vi

- Upload local mới lưu đường dẫn `/uploads/media/<attractionId>/<filename>`.
- API chi tiết di tích chuyển URL thuộc origin cũ được cấu hình
  sang đường dẫn tương đối nếu đường dẫn local hợp lệ.
- URL media bên ngoài khác được giữ nguyên.
- Frontend dev server proxy `/uploads/media/` về backend.
- Production cần reverse proxy đường dẫn này về backend,
  đi qua middleware kiểm tra quyền; không phục vụ uploads trực tiếp.

## Cấu hình dữ liệu cũ

Trong .env:

MEDIA_LEGACY_ORIGINS=https://old-host.example.com

Có thể khai báo nhiều origin, phân cách bằng dấu phẩy.
Mỗi origin gồm protocol, hostname và port nếu có;
không thêm đường dẫn hoặc dấu / cuối.

Biến này cần được giữ khi database còn chứa URL thuộc origin cũ.
Không cần sửa SQL mỗi lần đổi địa chỉ môi trường.

## Quyền truy cập

Khách chỉ được xem khi media, di tích và bản tiếng Việt
đều đã xuất bản.

Staff đang hoạt động có vai trò admin, reviewer hoặc editor
được xem trước media chưa xuất bản.

## Bằng chứng kiểm tra

- Build TypeScript thành công trước phần bổ sung test cuối.
- Giao diện local đã tải được ảnh sau khi cấu hình origin cũ.
- Test service di tích: 11 đạt.
- Test đường dẫn local: 16 đạt.
- Test adapter lưu media: 4 đạt.
- Test service Staff media: 5 đạt.
- Test xuất bản media: 5 đạt.
- Test middleware truy cập media: 11 đạt.
- Test API workflow và bảo mật Staff: 21 đạt.

Các kết quả trên được chạy theo từng nhóm.
Test database và Staff dùng mock không chứng minh toàn bộ
luồng upload → duyệt → xuất bản trên database thật.

## Còn cần kiểm tra trước nghiệm thu

- Tạo tài khoản Staff DEV riêng.
- Thử upload → duyệt → xuất bản với PostgreSQL và Redis thật.
- Kiểm tra ảnh nháp bằng phiên khách và phiên Staff thật.
- Đối chiếu đầy đủ ảnh của 11 di tích.