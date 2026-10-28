# BE02 — Media URLs

## Hành vi

- Upload local mới lưu đường dẫn `/uploads/media/<attractionId>/<filename>`.
- API chi tiết di tích và API Staff media chuyển URL thuộc origin cũ
  được cấu hình sang đường dẫn tương đối nếu đường dẫn local hợp lệ.
- URL media bên ngoài khác được giữ nguyên.
- Frontend dev server proxy `/uploads/media/` về backend.
- Production cần reverse proxy đường dẫn này về backend,
  đi qua middleware kiểm tra quyền; không phục vụ uploads trực tiếp.

## Cấu hình dữ liệu cũ

Trong `.env`:

```dotenv
MEDIA_LEGACY_ORIGINS=https://old-host.example.com
```

Có thể khai báo nhiều origin, phân cách bằng dấu phẩy.
Mỗi origin gồm protocol, hostname và port nếu có;
không thêm đường dẫn hoặc dấu `/` cuối.

Biến này cần được giữ khi database còn chứa URL thuộc origin cũ.
Không cần sửa SQL mỗi lần đổi địa chỉ môi trường.

## Migration database

File: `src/database/migrations/008_allow_relative_media_url.sql`.

Migration giữ hỗ trợ URL HTTPS và HTTP localhost hiện có,
đồng thời cho phép đường dẫn media local hợp lệ.

Migration đã được áp dụng trên database DEV local.
Môi trường khác cần review và áp dụng migration trước khi dùng
adapter upload lưu đường dẫn tương đối.

## Quyền truy cập

Khách chỉ được xem khi media, di tích và bản tiếng Việt
đều đã xuất bản.

Staff đang hoạt động có vai trò admin, reviewer hoặc editor
được xem trước media chưa xuất bản.

## Kiểm thử tự động

Build TypeScript thành công.

Một lần chạy chung 6 file unit test: 52/52 đạt:

- Service di tích: 11.
- Đường dẫn local: 16.
- Adapter lưu media: 4.
- Service Staff media: 5.
- Xuất bản media: 5.
- Middleware truy cập media: 11.

Nhóm test API workflow và bảo mật Staff đã chạy riêng: 21/21 đạt.

Các test dùng mock không thay thế kiểm thử toàn bộ luồng
trên PostgreSQL và Redis thật.

## Kiểm tra thực tế trên local — 28/10/2026

- Đã tạo tài khoản DEV riêng cho admin và editor.
- Đã áp dụng migration `008_allow_relative_media_url.sql`.
- Constraint PostgreSQL chấp nhận 3 URL hợp lệ,
  từ chối 8 URL không hợp lệ trong transaction rollback.
- Editor upload Media #26 thành công, lưu đường dẫn tương đối.
- Khi còn draft: editor xem được, khách ẩn danh nhận Not Found.
- Editor gửi duyệt, admin xuất bản Media #26 thành công.
- Sau xuất bản: khách ẩn danh xem được ảnh.
- Ảnh cũ Media #10 hiển thị được trong Admin
  sau khi dùng chung hàm chuyển URL.

## Còn cần kiểm tra trước nghiệm thu

- Đối chiếu đầy đủ ảnh của 11 di tích.
- Review migration và cấu hình triển khai cùng trưởng nhóm.