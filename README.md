# AcaSocial

Mạng xã hội xây dựng theo kiến trúc **Microservices**, giao tiếp qua một **API Gateway** trung tâm.

---

## Cấu trúc thư mục

```
AcaSocial/
├── gateway/
│   ├── cmd/gateway/main.go
│   ├── internal/                   # Logic nội bộ: routing, middleware, proxy, config
│   ├── gateway.json                # Khai báo toàn bộ route và backend mapping
│   ├── .env
│   └── .env.example                # Mẫu biến môi trường — copy thành .env khi setup
│
├── services/
│   ├── identity-service/           # Xác thực & quản lý người dùng (NestJS + PostgreSQL)
│   ├── community-service/
│   ├── discussion-service/
│   ├── media-service/
│   └── notification-service/       # Notification history, JetStream consumer và SSE
│
├── frontend/
├── docker-compose.yml              # Orchestrate toàn bộ stack bằng Docker
├── .env                            # Biến dùng chung cho Docker Compose (không commit)
└── .env.example                    # Mẫu biến dùng chung
```

---

## Luồng request

```
Frontend (React)
      │
      ▼  HTTP
API Gateway :8080          ← Điểm duy nhất frontend được gọi
      │
      ├── /api/auth/*   ──►  identity-service:8081
      ├── /api/users/*  ──►  identity-service:8081
      ├── /api/posts/*  ──►  community-service:8082
      ├── /api/media/*  ──►  media-service:8082
      └── /api/notifications/* ──► notification-service:8085

    Domain services publish business events vào NATS JetStream. Notification Service
    consume các subject `ac.social.>` rồi lưu notification vào PostgreSQL và đẩy
    notification realtime qua SSE.
```

> Các service **không** expose port ra ngoài trong flow production; notification-service expose `8085` cho local debugging. Chỉ Gateway mới được gọi từ frontend.
> Gateway xác thực JWT một lần, sau đó forward `X-User-ID` và `X-User-Role` vào header cho các service phía sau dùng.

---

## Yêu cầu

| Công cụ        | Phiên bản tối thiểu |
| -------------- | ------------------- |
| Go             | 1.22+               |
| Node.js        | 20+                 |
| Docker Desktop | 24+                 |
| Git            | Bất kỳ              |

---

## Cách chạy

### Chọn 1 trong 2 cách bên dưới:

---

### Cách A — Docker (khuyến nghị, chạy toàn bộ stack)

Cách này khởi động **PostgreSQL, Redis, NATS JetStream, các backend service và Gateway** trong Docker network riêng. Không cần cài Node hay Go trên máy.

**Bước 1 — Copy và điền file biến môi trường:**

```bash
# Windows (PowerShell)
.\scripts\setup.ps1

# macOS / Linux
bash scripts/setup.sh
```

Script sẽ tự tạo các file `.env` từ `.env.example`. Sau đó mở và điền các giá trị thật:

| File                                 | Cần điền                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `.env`                               | `DB_PASSWORD`, `REDIS_PASSWORD`                                             |
| `gateway/.env`                       | `JWT_SECRET`                                                                |
| `services/identity-service/.env`     | `DB_PASSWORD`, `JWT_SECRET`, `REDIS_PASSWORD`, `MAIL_PASS`, Cloudinary keys |
| `services/notification-service/.env` | `DB_PASSWORD` và thông tin NATS nếu chạy local ngoài Docker                 |

> `JWT_SECRET` phải **giống nhau** ở `gateway/.env` và `services/identity-service/.env` — đây là key dùng để ký và xác minh JWT.
> `REDIS_PASSWORD` phải **giống nhau** ở `.env` (dùng khởi tạo Redis) và `services/identity-service/.env` (dùng kết nối Redis).

**Bước 2 — Build và chạy:**

```bash
docker compose up --build
```

Notification Service sử dụng PostgreSQL để lưu lịch sử, NATS JetStream tại
`nats:4222` để nhận event và NATS monitoring tại `http://localhost:8222`.
Database `notification_db` được tạo bởi `scripts/init-db.sql` khi PostgreSQL
khởi tạo volume lần đầu.

**Bước 3 — Kiểm tra Gateway hoạt động:**

```bash
curl http://localhost:8080/health
# Kết quả mong đợi: {"redis":"ok","status":"ok"}
```

---

### Cách B — Chạy từng service riêng lẻ (local development)

Dùng cách này khi đang phát triển một service cụ thể và muốn hot-reload.

**Yêu cầu thêm:** PostgreSQL và Redis đang chạy trên máy (hoặc chạy riêng bằng Docker).

#### 1. Khởi động PostgreSQL + Redis bằng Docker (nếu chưa có):

```bash
docker compose up postgres redis -d
```

Nếu cần chạy notification-service local, khởi động thêm NATS:

```bash
docker compose up postgres redis nats -d
cd services/notification-service
cp .env.example .env
npm install
npm run start:dev
```

Khi chạy ngoài Docker, dùng `NATS_URL=nats://localhost:4222` và
`DB_HOST=localhost`; Compose sẽ override thành `nats://nats:4222` và `postgres`.

#### 2. Chạy identity-service:

```bash
cd services/identity-service
cp .env.example .env   # Lần đầu setup
# Điền các giá trị trong .env
npm install
npm run start:dev      # Hot-reload
```

#### 3. Chạy Gateway:

```bash
cd gateway
cp .env.example .env   # Lần đầu setup
# Điền các giá trị trong .env
# Đảm bảo IDENTITY_SERVICE_URL=http://localhost:8081
go run ./cmd/gateway
```

---

## Thêm service mới

Khi viết một service mới (ví dụ `community-service` chạy port `8082`):

**1. Tạo thư mục service:**

```
services/community-service/
├── src/
├── Dockerfile
├── .env
└── .env.example
```

**2. Thêm vào `docker-compose.yml`:**

```yaml
community-service:
  build:
    context: ./services/community-service
    dockerfile: Dockerfile
  env_file:
    - ./services/community-service/.env
  environment:
    DB_HOST: postgres
    REDIS_HOST: redis
  networks:
    - internal
  depends_on:
    postgres:
      condition: service_healthy
```

**3. Thêm biến URL vào `gateway/.env` và `gateway/.env.example`:**

```env
COMMUNITY_SERVICE_URL=http://localhost:8082
```

**4. Thêm vào `docker-compose.yml` phần `gateway.environment`:**

```yaml
COMMUNITY_SERVICE_URL: http://community-service:8082
```

**5. Khai báo routes trong `gateway/gateway.json`:**

```json
{
  "endpoint": "/api/posts",
  "method": "GET",
  "auth_required": true,
  "backend": [{ "host": ["${COMMUNITY_SERVICE_URL}"], "url_pattern": "/posts" }]
}
```

> Gateway tự động expand `${COMMUNITY_SERVICE_URL}` từ biến môi trường khi khởi động.

---

## Các service không cần tự xác thực JWT

Gateway đã xác thực token trước khi forward request. Các service phía sau chỉ cần đọc header:

```typescript
// NestJS — đọc user từ header do Gateway inject
@Get('posts')
getPosts(@Headers('x-user-id') userId: string) {
  // userId là ID của user đã đăng nhập, được Gateway xác minh và inject
  return this.postsService.getByUser(userId);
}
```

---

## Notification, NATS và SSE

### Flow

```text
  Discussion/Gamification/Identity/...
                │ publish business event
                ▼
          NATS JetStream
          stream: ACASOCIAL_EVENTS
          subject: ac.social.>
                │ durable consumer: notification-service
                ▼
       Notification Service :8085
          │                 │
          │                 └── SSE /api/notifications/stream
          └── PostgreSQL: notification_db
```

Domain service là nơi quyết định business event có xảy ra hay không. Ví dụ
`discussion-service` publish `answer.accepted`; notification-service chỉ consume
event, xác định recipient, tạo notification và xử lý delivery realtime.

Event envelope chuẩn:

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

Consumer ACK sau khi xử lý thành công. `eventId` được lưu trong
`inbox_events` để event gửi lại theo cơ chế at-least-once không tạo notification
trùng.

### API qua Gateway

| Method  | Route                          | Mục đích                           |
| ------- | ------------------------------ | ---------------------------------- |
| `GET`   | `/api/notifications`           | Lấy lịch sử notification của user  |
| `PATCH` | `/api/notifications/{id}/read` | Đánh dấu đã đọc                    |
| `GET`   | `/api/notifications/stream`    | Nhận notification realtime qua SSE |

Gateway xác thực JWT và forward `X-User-ID`; notification-service dùng header
này để xác định user. Frontend không cần gọi trực tiếp service nội bộ.

### Test frontend và SSE

Frontend đã có notification bell, unread count, panel, mark-as-read và demo
events cho `answer.created`, `answer.accepted`, `mention.created`,
`badge.awarded`, `user.followed` và `system.security_warning`.

Chạy frontend với demo local mà không cần backend notification. Để kết nối SSE
thật, đặt trong `frontend/.env.local`:

```env
NEXT_PUBLIC_NOTIFICATION_STREAM_URL=http://localhost:8080/api/notifications/stream
```

URL này cần có session/auth hợp lệ mà Gateway chấp nhận. Frontend vẫn dùng demo
notification nếu biến môi trường chưa được cấu hình.

### Publish event mẫu

Khi NATS đang chạy, publish JSON sau vào subject `ac.social.badge.awarded` bằng
NATS CLI hoặc một NATS client:

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

Sau đó gọi `GET /api/notifications` bằng cùng user để kiểm tra notification đã
được lưu.

Chi tiết cấu hình và API nằm tại
`services/notification-service/README.md`.
