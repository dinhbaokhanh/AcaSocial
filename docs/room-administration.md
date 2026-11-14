# Quản trị room và môn học

## Sử dụng

- Đăng nhập tài khoản admin, mở **Quản lý room** (`/admin/rooms`) hoặc **Quản lý môn học** (`/admin/courses`) ở thanh điều hướng.
- Tạo môn → gắn môn vào ngành nếu cần → tạo room môn thuộc room ngành tương ứng. Môn học không tự tạo room.
- Sửa tên/mô tả giữ nguyên mã môn, slug room, loại room và binding học thuật. Khi nhận lỗi dữ liệu đã thay đổi, tải lại trước khi sửa tiếp.
- Trong bảng **Vòng đời**, nhập lý do và thời điểm ngừng hoạt động. Mặc định phải báo trước ít nhất 168 giờ. Có thể sửa/hủy lịch khi chưa tới hạn.
- Đến hạn room chỉ đọc; admin có thể lưu trữ hoặc mở lại. Hủy lịch pending trước khi chuyển trạng thái thủ công. Room con không tự đóng theo room cha.
- `/rooms` cho phép tra cứu cả room chỉ đọc/lưu trữ; `/rooms/{id}` giữ đường đọc nội dung cũ theo quyền truy cập. Không có chức năng xóa room/môn học mới.

## Triển khai

1. Backup DB và kiểm tra migrations trên staging trước.
2. Build/restart `academic-service`, `discussion-service`, `notification-service`; migrations mới tự chạy theo cấu hình hiện có. Các bảng mới: `catalog_audits` trong mỗi DB nghiệp vụ, `room_lifecycle_schedules`, `room_notification_deliveries` trong discussion DB.
3. Restart gateway để nạp các route mới, rồi build/restart frontend.
4. Kiểm tra thêm/sửa bằng admin, thử bằng tài khoản thường và thử đọc một room lưu trữ.

`PATCH /api/courses/{id}` và API sửa room yêu cầu `expectedVersion` lấy từ `metadataVersion` của bản ghi đã tải. API sửa môn chỉ nhận tên/mô tả; `code` và `status` không còn là trường được phép sửa qua endpoint môn. API status room yêu cầu admin, `expectedVersion`, `reason`; quyền cấu hình policy/thành viên vẫn tách riêng.

Biến môi trường của discussion service:

```dotenv
ROOM_LIFECYCLE_ENABLED=true
ROOM_CLOSURE_MIN_NOTICE_HOURS=168
```

Worker quét mỗi 30 giây, lấy tối đa 20 room và chuyển tối đa 100 delivery sang outbox mỗi lượt. Cảnh báo log khi lịch đóng trễ trên 2 phút. Thời hạn vẫn chặn ghi bằng giờ DB dù worker chưa chuyển trạng thái. `ROOM_LIFECYCLE_ENABLED=false` dừng worker và từ chối lịch mới/đổi lịch; không tự hủy lịch đã có và không bỏ kiểm tra deadline. Phải hủy lịch còn pending trước hạn hoặc mở lại room đã đóng nếu muốn cho phép ghi tiếp.

Banner đọc trực tiếp từ DB qua API và cập nhật mỗi 30 giây. Banner public hiển thị cho người đăng nhập; lịch private/restricted chỉ hiện cho người được phép. Notification cá nhân dành cho thành viên/người đăng bài còn quyền đọc, gửi theo outbox hiện hữu; nội dung thông báo không chứa tên/lý do của room riêng tư. API khi mở room luôn kiểm tra lại quyền.

Nếu rollback ứng dụng, giữ các bảng/cột bổ sung và audit, không chạy down migration trên dữ liệu đang dùng. Worker, lịch DB và kiểm tra deadline phải được xử lý nhất quán; tắt giao diện không hủy lịch.

## Kiểm thử

Tại thư mục gốc, sau khi cài dependency của các package:

```powershell
npm --prefix services/academic-service run build
npm --prefix services/discussion-service run build
npm --prefix services/notification-service run build
npm --prefix frontend run build

# Dùng PostgreSQL test riêng; tài khoản cần quyền CREATE SCHEMA/extension.
$env:ROOM_ADMIN_TEST_DATABASE_URL = 'postgres://USER:PASSWORD@localhost:5432/TEST_DB'
node --test services/discussion-service/test/room-administration.integration.cjs
```

Test tạo schema ngẫu nhiên và dọn schema đó trong `finally`, không dùng tên bảng trong schema ứng dụng. Bao phủ HTTP validation/phân quyền, cập nhật đồng thời, transaction rollback khi audit thất bại, tạo canonical room trùng, thay đổi/hủy lịch, banner private, deadline trước khi worker chạy, worker chạy lại/đồng thời và inbox chống notification trùng.

Đã kiểm tra bằng PostgreSQL 17 tạm riêng trên máy phát triển. Chưa thay thế nghiệm thu trình duyệt và chạy cả chuỗi gateway → NATS → SSE trong môi trường staging.

Kết quả xác minh ngày 14/11/2026: 9/9 test qua; build `academic-service`, `discussion-service`, `notification-service` và frontend thành công. Lint các file frontend thay đổi và các file backend vòng đời/migration mới đã qua. Gateway được kiểm tra hợp đồng route/RBAC trong test; chưa chạy Go test vì máy chưa có Go trong PATH.

## Giới hạn cần theo dõi

- Chống tạo canonical room trùng dùng PostgreSQL advisory transaction lock theo loại/ngữ cảnh và kiểm tra lại sau lock. Binding kế thừa của forum/event khiến không thể đặt unique đơn giản lên `major_id`/`major_course_id`; mọi đường tạo canonical mới phải dùng cùng khóa. Không tự sửa dữ liệu trùng đã tồn tại.
- Snapshot người nhận được tạo bằng một `INSERT … SELECT` trong transaction; dispatch chia batch. Với room rất lớn, cần đo độ trễ transaction và nâng cấp snapshot thành job có checkpoint nếu cần.
- Hệ thống không bảo đảm người dùng đã đọc thông báo. Lịch và banner là dữ liệu có thể truy cập lại; SSE chỉ hỗ trợ cập nhật nhanh.
- Không bổ sung xóa dữ liệu hoặc dọn media. Xóa sau N ngày cần quyết định riêng của giảng viên và kế hoạch lưu giữ/phục hồi.
