# Notification Service

Notification Service nhận business event từ NATS JetStream, lưu notification history vào PostgreSQL và gửi notification realtime qua SSE.

## Trách nhiệm

Domain service là nơi quyết định business event có xảy ra hay không. Notification Service chỉ xử lý delivery-oriented work:

- Consume event từ JetStream.
- Xác định recipient từ event payload.
- Tạo notification và lưu lịch sử.
- Chống duplicate bằng `inbox_events.eventId`.
- Expose REST API để đọc và đánh dấu notification.
- Expose SSE stream cho user đang online.

Push notification, email, preferences, DLQ và fan-out chưa nằm trong phiên bản hiện tại.

## Cấu hình

Copy `.env.example` thành `.env` khi chạy local:

```env
PORT=8085
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_db_password
DB_NAME=notification_db
NATS_URL=nats://localhost:4222
NATS_STREAM=ACASOCIAL_EVENTS
NATS_CONSUMER=notification-service
IDENTITY_SERVICE_URL=http://localhost:8081
INTERNAL_SERVICE_TOKEN=your_internal_service_token
```

Khi chạy bằng Docker Compose, `DB_HOST` và `NATS_URL` được override lần lượt thành `postgres` và `nats://nats:4222`.

`INTERNAL_SERVICE_TOKEN` phải giống nhau giữa Gateway, Identity và Notification.
Compose lấy giá trị chung từ `.env` ở thư mục gốc. Khi chạy local, điền cùng
giá trị vào `.env` của cả ba thành phần. Identity cần chạy để tra tên người bình luận.

## Chạy local

```bash
docker compose up postgres redis nats -d
cd services/notification-service
npm install
npm run start:dev
```

Build production:

```bash
npm run build
npm run start:prod
```

## NATS JetStream

Service tự kiểm tra stream `ACASOCIAL_EVENTS` khi khởi động. Nếu stream chưa có, service tạo stream với subject `ac.social.>`.

Consumer dùng durable name `notification-service`, nhận event at-least-once và ACK sau khi lưu thành công. Lỗi database hoặc tra danh tính được NAK để thử lại sau 5 giây. JSON/envelope sai hoặc event type không khớp subject bị TERM và ghi log, tránh thử lại vô hạn một event không hợp lệ. Event không có recipient được ACK và bỏ qua.

Claim `inbox_events` và notification được lưu trong cùng transaction; event đã
xử lý được bỏ qua trước khi gọi Identity. Compose lưu JetStream vào volume
`nats_data` để giữ event và trạng thái consumer khi tạo lại container. Dữ liệu
trong container NATS cũ chưa dùng volume không tự chuyển sang volume mới.

Với `comment.created`, event có `isAnonymous=false` được bổ sung tên từ
`GET /internal/users/:id/display` qua token nội bộ; endpoint này không có route
Gateway. Bình luận ẩn danh không tra Identity và loại `actorId`, `senderId`,
`actorName` khỏi danh tính công khai. Notification chứa tiêu đề bài viết và
tối đa 180 ký tự preview. Event cũ thiếu `isAnonymous` dùng nội dung dự phòng.

Event envelope:

```json
{
  "eventId": "evt_123",
  "eventType": "answer.accepted",
  "occurredAt": "2026-09-10T10:00:00Z",
  "producer": "discussion-service",
  "version": 1,
  "data": {
    "actorId": "user-a",
    "recipientId": "user-b",
    "questionId": "question-1",
    "answerId": "answer-1"
  }
}
```

Recipient được đọc từ `data.recipientId` hoặc `data.receiverId`. Actor được đọc từ `data.actorId` hoặc `data.senderId`.

Subject mẫu:

```text
ac.social.answer.created
ac.social.answer.accepted
ac.social.mention.created
ac.social.badge.awarded
ac.social.user.followed
ac.social.system.security_warning
```

## API

Gateway expose các route sau:

| Method  | Route                          | Mục đích                           |
| ------- | ------------------------------ | ---------------------------------- |
| `GET`   | `/api/notifications`           | Lấy notification của user hiện tại |
| `PATCH` | `/api/notifications/{id}/read` | Đánh dấu đã đọc                    |
| `GET`   | `/api/notifications/stream`    | Mở SSE stream realtime             |

Gateway xác thực JWT và forward `X-User-ID`. Không nên gọi trực tiếp service từ browser khi chạy qua hệ thống đầy đủ.

## SSE

Client mở kết nối tới:

```text
GET /api/notifications/stream
```

Khi notification mới được lưu, service gửi JSON notification qua SSE cho connection tương ứng với `recipientId`.

Frontend tải 30 notification gần nhất, nhận SSE, tự kết nối lại sau 3 giây và
tải lại lịch sử khi kết nối lại. Bấm notification đánh dấu đã đọc và mở bài
viết nếu có `discussionId`. Trạng thái đã đọc được gửi tới các tab cùng user;
thời điểm đọc đầu tiên được giữ nguyên. Có thể cấu hình frontend bằng:

```env
NEXT_PUBLIC_NOTIFICATION_STREAM_URL=http://localhost:8080/api/notifications/stream
```

Nếu không cấu hình biến trên, frontend dùng `/api/notifications/stream` tại
`NEXT_PUBLIC_API_URL`. Số chưa đọc và nút Mark all read áp dụng cho danh sách
đang tải (30 thông báo). SSE hiện dùng bộ nhớ của một instance; chạy một
notification-service cho đến khi bổ sung cơ chế broadcast giữa các instance.

## Kiểm thử

```bash
cd services/notification-service
npm test
```

Lệnh này build TypeScript rồi chạy kiểm thử nội dung, ẩn danh, lookup Identity,
event trùng, xác thực envelope, ACK/NAK/TERM và phân tách SSE theo recipient.
Các dependency bên ngoài được giả lập; lệnh không cần database hoặc NATS.

Kiểm thử tích hợp trên Docker với PostgreSQL, JetStream và HTTP/SSE thật:

```powershell
Get-Content scripts/verify-notifications-integration.cjs -Raw | docker compose exec -T notification-service node
```

Script dùng recipient ngẫu nhiên và dọn các bản ghi thử nghiệm khi kết thúc.
Các kịch bản gồm 20 lần xử lý đồng thời cùng event, che danh tính ẩn danh,
kiểm tra quyền đọc, thời điểm đọc đầu tiên khi có nhiều request đồng thời,
loại JSON lỗi, chống event/SSE trùng và broadcast trạng thái đã đọc.

Kiểm thử parser SSE phía frontend:

```bash
cd frontend
node --test src/lib/notifications/stream.test.mjs
```

Khi Docker stack và frontend đã chạy, dùng Chrome với profile riêng và
`--remote-debugging-port=9222`, sau đó chạy từ thư mục gốc:

```bash
node scripts/verify-notifications-browser.mjs
```

Script cần hai tài khoản thử nghiệm (`E2E_USER_A`, `E2E_USER_B`,
`E2E_PASSWORD`), tạo bài viết/bình luận để kiểm tra SSE, lưu trạng thái đọc,
điều hướng và kết nối lại. Sau khi có event discussion/comment, kiểm tra
redelivery trên PostgreSQL và JetStream thật bằng PowerShell:

```powershell
Get-Content scripts/verify-notification-redelivery.cjs -Raw | docker compose exec -T notification-service node
```

## Test event

Publish một JSON payload vào subject `ac.social.badge.awarded` bằng NATS CLI hoặc NATS client:

```json
{
  "eventId": "evt-demo-001",
  "eventType": "badge.awarded",
  "data": {
    "recipientId": "<user-id>",
    "actorId": "system",
    "badgeName": "Contributor"
  }
}
```

Sau đó gọi `GET /api/notifications` với cùng user. Gửi lại cùng `eventId` sẽ không tạo notification thứ hai.
