# Hue Guide — Frontend tách User và Admin

Bản này được tách từ **Hue-Guide-Source.zip** theo thiết kế gốc. Các tệp `styles.css`, `theme.css` và 4 ảnh gốc trong `assets/` được giữ nguyên, bao gồm gam màu kem–nâu của User, giao diện Admin tối, màn mở đầu Đại Nội, chuyển trang bằng mây và bố cục responsive.

## 1. Tách hai khu vực

| Khu vực | Địa chỉ | Đăng nhập | Chức năng giao diện |
|---|---|---|---|
| User / Khách du lịch | `http://localhost:8000/` | Không cần | Tổng quan, di tích, bản đồ, tuyến tham quan, thuyết minh, hỏi đáp, xếp hạng, thời tiết |
| Admin / Staff | `http://localhost:8000/admin.html` | Bắt buộc có Staff Session backend | Dashboard, quản lý nội dung (mô phỏng), thống kê (mô phỏng), công việc (lưu trên thiết bị) |

`index.html#admin` tự chuyển sang `admin.html`. Khách tham quan không thể mở dashboard chỉ bằng cách đổi hash. **Bảo vệ dữ liệu quản trị thực phải luôn thực hiện tại backend** (session, RBAC, CSRF); không dựa vào việc ẩn menu trên frontend.

## 2. Chạy trên Windows

**Terminal 1 — Backend hiện có (không chỉnh lại):**

```powershell
cd C:\Users\ASUS\Software-Engineering
npm.cmd run dev
```

**Terminal 2 — Frontend (trong thư mục `Hue-Guide` đã giải nén):**

```powershell
node dev-server.js
```

Hoặc nhấp đúp `CHAY-WEB.bat` trong thư mục frontend.

Mở trình duyệt tại:

- User: http://localhost:8000/
- Admin: http://localhost:8000/admin.html

Bạn có thể dùng tài khoản Staff đã kiểm thử với backend trước đây. **Không chép mật khẩu hoặc API key vào source frontend.**

`dev-server.js` là máy chủ phát triển sử dụng Node.js lõi, không cần npm hay build riêng. Nó cung cấp các file giao diện và chuyển tiếp mọi yêu cầu `/api/v1/*` sang backend tại `127.0.0.1:3000`, giúp trình duyệt dùng cùng origin và chuyển tiếp cookie Staff, không phải chỉnh CORS trong backend. **Không triển khai công khai máy chủ dev này**. Có thể đổi cổng frontend qua biến môi trường `FRONTEND_PORT`.

> Không dùng Live Server hoặc `python -m http.server` cho phần Admin đăng nhập trong bản tách này: chúng không tự chuyển tiếp `/api/v1/*` tới backend, nên đăng nhập Admin sẽ không hoạt động. Nếu backend chưa bật, giao diện User vẫn xem được; Admin sẽ hiện thông báo lỗi kết nối.

## 3. Tệp và vai trò

- `index.html` — giao diện User, không render Admin.
- `admin.html` — giao diện Admin riêng và form đăng nhập Staff.
- `admin-auth.js` — kiểm tra `/api/v1/staff/auth/me`, đăng nhập `/login`, lấy `/csrf`, đăng xuất `/logout`; chỉ tải dashboard sau khi backend xác nhận phiên.
- `app.js` — các thành phần giao diện nguồn gốc được **dùng chung**, nhưng router giới hạn URL theo trang User hoặc Admin.
- `styles.css`, `theme.css`, `assets/` — giữ nguyên giao diện mẫu gốc.
- `split.css` — chỉ thêm style trang đăng nhập và giới hạn `[hidden]`.
- `dev-server.js` — static server + proxy API chỉ phục vụ phát triển nội bộ.
- `CHAY-WEB.bat` — khởi động server frontend trên Windows.

## 4. Đã kết nối backend và chưa kết nối

**Đã kết nối thực:** Admin đăng nhập, xác minh Staff Session, logout qua CSRF. Backend kiểm tra quyền ở mỗi API. Thiết kế và phân luồng User/Admin đã tách qua các trang riêng.

**Chưa tích hợp API dữ liệu:** Thư viện điểm đến/tuyến tham quan đang dùng dữ liệu mẫu từ `app.js`. Admin Dashboard, CRUD nội dung, báo cáo, lịch biên tập vẫn dùng mock/localStorage. Hỏi đáp User hiện vẫn dùng câu trả lời mô phỏng của source cũ, **chưa gọi Gemini/RAG backend**. Audio dùng `speechSynthesis` của trình duyệt. Weather lấy dữ liệu trực tiếp từ Open-Meteo. Bản đồ sơ đồ không dùng để chỉ đường; iframe OpenStreetMap chỉ là bản đồ xem khu vực, chưa hiển thị tọa độ di tích từ DB. Không dùng các dữ liệu minh họa như thông tin thật.

Để hoàn thành tích hợp frontend/backend, bước tiếp theo là kết nối lần lượt API `/api/v1/attractions`, `/api/v1/routes`, `/api/v1/visitor-sessions` + `/api/v1/chat/messages`, audio/location, và các Staff API. Các giao diện và asset đã được giữ lại để tích hợp mà không phải thiết kế lại.

## 5. Bảo mật và triển khai

- Không để khóa Gemini, mật khẩu DB hoặc `SESSION_SECRET` trong frontend.
- Đăng nhập Admin dựa trên session cookie `HttpOnly`; frontend không tự lưu session token trong localStorage.
- Admin chỉ hiển thị sau khi `/staff/auth/me` thành công. Truy cập trực tiếp API do backend xác thực và phân quyền độc lập.
- Khi triển khai production: xây dựng một reverse proxy HTTPS chính thức cho UI và `/api/v1`, cấu hình chính sách cookie/origin, lưu media và logging; không dùng `dev-server.js` trên Internet.

## 6. Bản gốc

Ảnh, animation, bảng màu và layout dựa trên source do người dùng cung cấp trong `Hue-Guide-Source.zip`. Tính năng và dữ liệu ghi nhãn minh họa vẫn là mô phỏng.
