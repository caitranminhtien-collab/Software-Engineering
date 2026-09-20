# Backend thuyết minh tự động đa ngôn ngữ

Backend 3 lớp (Presentation Layer, Business Logic Layer, Data Layer) có CI/CD. Chi tiết yêu cầu xem PRD trong `docs/`.

## Gói này chứa gì

Cấu trúc thư mục, các tệp khung (mỗi tệp `.ts` có ghi chú lớp, nhiệm vụ và mã yêu cầu FR), tệp hạ tầng (Docker, GitHub Actions, `.env.example`). **Chưa chứa `package.json`, `main.ts`, `app.module.ts`**: các tệp này do Nest CLI sinh để khớp phiên bản framework hiện tại.

## Bắt đầu

1. Tạo dự án gốc bằng Nest CLI ở thư mục cha, rồi lấy các tệp `package.json`, `tsconfig*.json`, `nest-cli.json`, `src/main.ts`, `src/app.module.ts` của nó:
   ```
   npx @nestjs/cli new thuyet-minh-be
   ```
2. Chép đè nội dung gói này vào dự án vừa tạo (giữ nguyên `main.ts`, `app.module.ts`, `package.json` do CLI sinh).
3. Xóa các tệp mẫu không dùng: `src/app.controller.ts`, `src/app.service.ts`, `src/app.controller.spec.ts`, `test/app.e2e-spec.ts`.
4. Cài thư viện (nếu báo lệch phiên bản `@nestjs/*`, cài đúng phiên bản major khớp với `@nestjs/core`):
   ```
   npm i @nestjs/config @nestjs/typeorm typeorm pg @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt @nestjs/swagger class-validator class-transformer @nestjs/throttler qrcode archiver
   npm i -D @types/passport-jwt @types/bcrypt @types/qrcode @types/archiver
   ```
5. `cp .env.example .env`, rồi `docker compose up -d db`.
6. Trong `main.ts`: đặt global prefix `api/v1`, bật ValidationPipe (whitelist), Swagger tại `/docs`, gắn filter/interceptor ở `src/common/`.
7. Thêm vào `package.json` script `migration:run` (chạy migration qua `src/database/data-source.ts`); CI đang gọi script này.

## Quy tắc 3 lớp

| Lớp | Tệp | Được phép | Không được |
|---|---|---|---|
| Presentation Layer | `*.controller.ts`, `dto/`, `common/guards|filters|interceptors` | Gọi Service; kiểm tra dữ liệu vào | Chứa nghiệp vụ; truy cập DB |
| Business Logic Layer | `*.service.ts`, `*.worker.ts`, `translation-state.ts`, `providers/` | Gọi Repository và provider interface | Import đối tượng HTTP; viết SQL |
| Data Layer | `*.repository.ts`, `database/` | Truy vấn, giao dịch | Chứa quy tắc nghiệp vụ; gọi ngược lên Service |

Chỉ gọi xuống lớp liền kề. Dữ liệu qua lại giữa Presentation Layer và Business Logic Layer đi bằng DTO; không trả Entity thẳng ra API.

## Quy ước

- Unit test đặt cạnh mã: `xxx.service.spec.ts`. Integration/e2e đặt ở `test/*.e2e-spec.ts`. Các tệp khung hiện dùng `it.todo(...)` (Vitest, là bộ test Nest CLI sinh sẵn ở bản hiện tại); gỡ `todo` và viết test thật khi làm tính năng.
- Nhánh: `main` (bản chạy), `develop` (tích hợp), `feature/FR-xx-mo-ta`. Mọi thay đổi qua Pull Request, CI xanh mới được gộp.
- Commit: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`.
- Bí mật chỉ nằm ở `.env` (bị gitignore) và GitHub Secrets.

## CI/CD

- `.github/workflows/ci.yml`: lint, test, migration, e2e, build, build Docker, audit.
- `.github/workflows/cd.yml`: đẩy image lên GHCR, triển khai, health check. **Bước triển khai còn TODO**, nhóm chọn VPS hoặc PaaS rồi điền.
- Đồng bộ phiên bản Node giữa máy dev, `Dockerfile` và `ci.yml` (hiện ghi 22; đổi cho khớp với framework nếu cần).
