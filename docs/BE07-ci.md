# BE07 — Rà soát CI

Phạm vi thực hiện theo yêu cầu BE07 trong phiên làm việc. Không tìm thấy bản phân
công thành viên 2 riêng trong repository để đối chiếu các đầu việc khác.

## Quyết định cấu hình

- Giữ `push` lên `main` và `pull_request` đích `main`; thêm `workflow_dispatch`
  cho cả hai workflow CI để chạy lại thủ công. Không lọc đường dẫn để tránh bỏ
  sót thay đổi ảnh hưởng build và kiểm thử.
- Giữ Node 24: phiên bản Vitest 5.0.5 đang cài yêu cầu
  `^22.12.0 || ^24.0.0 || >=26.0.0`. Không thay dependency hoặc lockfile.
- Giữ `npm ci`, cache npm theo `package-lock.json`. Frontend không cài package
  nên không cần cache npm.
- Giới hạn quyền `contents: read`; hủy run CI cũ cùng workflow/ref khi có run mới.
- Timeout job backend/MVP 10 phút, frontend 5 phút; bước Vitest 4 phút,
  regression dịch vụ thật 3 phút, frontend unit/MVP contract 2 phút.
- Giữ workflow MVP và tên job để tránh làm mất check có thể đang được branch
  protection sử dụng. Giữ nguyên workflow deploy Pages vì đây là luồng triển khai.

## Báo cáo và log khi lỗi

Vitest tạo JUnit XML và log; regression PostgreSQL/Redis, frontend unit và MVP
contract tạo log riêng. `set -euo pipefail` giữ mã lỗi kiểm thử qua pipeline `tee`.
Regression vẫn chạy sau Vitest lỗi nếu khởi tạo database thành công và run chưa
bị hủy. Không dùng `continue-on-error`.

Upload bằng `actions/upload-artifact@v4` khi job thất bại, giữ 7 ngày. Chỉ upload
các file được liệt kê cụ thể trong `test-results`, không gom workspace, `.env`,
dump database, cấu hình Docker hoặc biến môi trường. CI dùng dữ liệu test và
API key rỗng, không truyền GitHub secrets vào test. Không thêm lệnh in môi trường.

Nếu cài dependency, build hoặc khởi tạo database lỗi trước khi test chạy thì
chưa có test report; xem log step trên Actions. Nếu job bị hủy hoặc hết timeout
toàn job, bước upload có thể không chạy. Không suy diễn rằng test đã thành công
khi không có artifact.

## Kiểm tra local ngày 06/11/2026

- Node v24.22.0; sử dụng dependency đã có trong `node_modules`.
- `npm.cmd run build`: thành công.
- `npm.cmd test -- --reporter=default --reporter=junit --outputFile.junit=./node_modules/.cache/be07/vitest.xml`:
  39 file, 251 test thành công; đã tạo JUnit XML.
- `node --test tests/M28_mvp_contract.node.cjs tests/frontend/*.unit.cjs`:
  34 test thành công.
- Kiểm tra sự tồn tại 8 file frontend và `node --check` cho 6 file JavaScript
  được liệt kê trong CI: thành công.
- Đọc YAML bằng PyYAML và `git diff --check`: thành công. Đây không phải
  kiểm tra schema/expression của GitHub Actions bằng actionlint.
- Chưa chạy `npm ci` local; khả năng cài sạch từ lockfile cần xác minh trên Actions.
- Chưa chạy migration và regression PostgreSQL/Redis thật: Docker daemon local
  không hoạt động. Không ghi PASS cho phần này.
- Chưa chạy browser smoke trong `tests/frontend/visitor-*-smoke.cjs` vì cần
  Playwright ngoài dependency hiện tại; không thêm vào CI trong BE07.

## Cần xác minh trên GitHub Actions

1. PR đích main, push main và chạy thủ công kích hoạt đúng hai workflow CI.
2. `npm ci`, cache miss/hit theo lockfile, build và các test chạy trên Ubuntu/Node 24.
3. PostgreSQL/Redis healthy, sáu migration thành công và hai regression thực sự chạy.
4. Trong PR thử nghiệm riêng, gây lỗi test có kiểm soát: job phải thất bại và
   artifact tương ứng phải có report/log; kiểm tra nội dung không có secret.
   Không sửa ứng dụng hay cố ý làm hỏng test trong thay đổi BE07 này.
5. Xác minh concurrency, timeout và tên required checks trong branch protection.

Chưa có kết quả chạy workflow mới trên GitHub; kết quả local không thay thế mục này.
