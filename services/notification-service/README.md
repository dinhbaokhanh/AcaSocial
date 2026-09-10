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

Push notification, email, preferences, retry/DLQ và fan-out chưa nằm trong phiên bản hiện tại.

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
```

Khi chạy bằng Docker Compose, `DB_HOST` và `NATS_URL` được override lần lượt thành `postgres` và `nats://nats:4222`.

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

Consumer dùng durable name `notification-service`, nhận event at-least-once và ACK sau khi xử lý thành công. Nếu xử lý lỗi, message được NAK để thử lại.

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

Frontend demo hiện có notification bell, unread count, notification panel, mark-as-read và demo events. Có thể cấu hình frontend bằng:

```env
NEXT_PUBLIC_NOTIFICATION_STREAM_URL=http://localhost:8080/api/notifications/stream
```

Frontend vẫn chạy demo local nếu biến trên chưa được cấu hình.

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
