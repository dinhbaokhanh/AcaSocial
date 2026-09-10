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

### Nạp dữ liệu demo

Sau khi các service đã khởi động ít nhất một lần để TypeORM tạo schema, chạy:

```powershell
Get-Content scripts\seed.sql -Raw | docker exec -i acasocial-postgres psql -U postgres -v ON_ERROR_STOP=1
```

Trên macOS/Linux:

```bash
docker exec -i acasocial-postgres psql -U postgres -v ON_ERROR_STOP=1 < scripts/seed.sql
```

Seed tạo dữ liệu lớn cho frontend và notification demo: 120 users, 120
discussions, 632 comments, 1.529 votes và 300 notifications. Tất cả tài khoản
seed dùng mật khẩu `Password123!`; email mẫu có dạng
`kien.nguyen.d21@ptit.edu.vn` hoặc `demo.user.16@ptit.edu.vn`.

> Seed có tính destructive: script xóa dữ liệu hiện có trong các bảng seed
> trước khi insert lại dữ liệu mẫu. Không chạy trên môi trường production.

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
`discussion-service` publish `discussion.created` và `comment.created`; notification-service consume
event, xác định recipient, tạo notification và xử lý delivery realtime.

Event envelope chuẩn:

```json
{
  "eventId": "evt_123",
  "eventType": "comment.created",
  "data": {
    "actorId": "user-a",
    "recipientId": "user-b",
    "discussionId": "discussion-1",
    "commentId": "comment-1"
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

Frontend tải 30 thông báo gần nhất sau khi đăng nhập/khôi phục session, cập nhật
qua SSE và lưu trạng thái đã đọc qua API. Sao chép `frontend/.env.example` sang
`frontend/.env.local` nếu chưa có:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_NOTIFICATION_STREAM_URL=http://localhost:8080/api/notifications/stream
```

SSE dùng `fetch` với Bearer header qua Gateway. Khi mất kết nối, frontend thử
lại sau 3 giây và tải lại lịch sử; logout/đổi tài khoản hủy stream cũ.
Tạo discussion thông báo cho tác giả; comment từ người khác thông báo cho tác
giả bài viết. Comment của chính tác giả không tạo thông báo.

Hướng dẫn chạy, regression test bằng Chrome và kiểm tra NATS redelivery:
[Notification flow](docs/notification-flow.md).

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

---

## Changelog — Bugfixes & Config corrections

Phần này ghi lại các lỗi cấu hình và code đã được phát hiện và sửa trong quá trình phát triển.

### [gateway] DISCUSSION_SERVICE_URL trỏ sai port (8083 → 8084)

**Triệu chứng:** `GET /api/discussions` trả về 502 Bad Gateway.

**Nguyên nhân:** `gateway/.env` và `docker-compose.yml` khai báo `DISCUSSION_SERVICE_URL` trỏ đến port `8083`, trong khi `discussion-service` thực sự lắng nghe trên port `8084` (theo `services/discussion-service/.env` và `main.ts`).

**Fix:**
- `gateway/.env`: `DISCUSSION_SERVICE_URL=http://localhost:8084`
- `docker-compose.yml` (gateway environment): `DISCUSSION_SERVICE_URL: http://discussion-service:8084`

> Sau khi sửa file, phải restart gateway để nhận env mới: `docker compose up -d --no-deps gateway`

---

### [identity-service] MAIL_HOST sai giá trị

**Triệu chứng:** `POST /api/auth/forgot-password` trả về 502; log identity-service in `getaddrinfo ENOTFOUND khanhdbao@gmail.com`.

**Nguyên nhân:** `services/identity-service/.env` có `MAIL_HOST=khanhdbao@gmail.com` (địa chỉ email) thay vì hostname SMTP.

**Fix:** `MAIL_HOST=smtp.gmail.com`

---

### [identity-service] MAIL_USER sai giá trị

**Triệu chứng:** Gửi mail thất bại — Gmail SMTP từ chối xác thực.

**Nguyên nhân:** `MAIL_USER=AcaSocial` (tên app) thay vì địa chỉ Gmail.

**Fix:** `MAIL_USER=khanhdbao@gmail.com`

---

### [identity-service] JWT_SECRET không khớp với gateway

**Triệu chứng:** Mọi request có token đều bị 401 Unauthorized ngay sau khi đăng nhập.

**Nguyên nhân:** `services/identity-service/.env` có `JWT_SECRET=min_32_chars`, trong khi `gateway/.env` dùng `JWT_SECRET=your_jwt_secret_min_32_chars`. Token được ký bằng secret khác với secret dùng để verify.

**Fix:** `JWT_SECRET` phải giống nhau ở cả hai file — xem mục "Yêu cầu" bên trên.

---

### [media-service] DB_NAME trỏ sai database

**Triệu chứng:** `acasocial-media` log liên tục `Unable to connect to the database. Retrying`; PostgreSQL log `database "acasocial" does not exist`.

**Nguyên nhân:** `services/media-service/.env` có `DB_NAME=acasocial`, nhưng database thực tế được tạo là `media_db` (xem `scripts/init-db.sql`).

**Fix:** `DB_NAME=media_db`

---

### [gateway] Rate limit đăng ký quá thấp cho môi trường dev

**Triệu chứng:** `POST /api/auth/register` trả về 429 Too Many Requests khi test.

**Nguyên nhân:** `gateway/gateway.json` giới hạn `/api/auth/register` ở 10 req/phút.

**Fix:** Tăng lên `"max_requests_per_minute": 60` trong `gateway/gateway.json`. Rebuild gateway sau khi sửa.

---

### [frontend] reset-password gửi thừa field `confirmPassword`

**Triệu chứng:** `POST /api/auth/reset-password` trả về 400 `property confirmPassword should not exist`.

**Nguyên nhân:** `ResetPasswordDto` phía backend không khai báo `confirmPassword` (`forbidNonWhitelisted: true`), nhưng frontend gửi thêm field này trong payload.

**Fix:**
- `frontend/src/types/index.ts`: xóa `confirmPassword` khỏi `ResetPasswordRequest`
- `frontend/src/app/(auth)/forgot-password/page.tsx`: bỏ `confirmPassword: confirm` khỏi `authApi.resetPassword(...)` call

---

### [discussion-service] IsUUID('4') reject seed UUIDs

**Triệu chứng:** `POST /api/discussions` trả về 400 `each value in tagIds must be a UUID`; các thao tác liên quan đến UUID từ seed data (reply comment, accept answer, filter by authorId, update tags) đều bị 400.

**Nguyên nhân:** Seed data dùng UUID dạng `aaaaaaaa-0000-0000-0000-000000000001` (không phải UUID v4). Các DTO dùng `@IsUUID('4')` nên reject toàn bộ.

**Các DTO bị ảnh hưởng và đã sửa:**

| File | Field | Trước | Sau |
|------|-------|-------|-----|
| `create-discussion.dto.ts` | `tagIds`, `mediaIds` | `@IsUUID('4', { each: true })` | `@IsUUID('all', { each: true })` |
| `update-discussion.dto.ts` | `tagIds`, `mediaIds` | `@IsUUID('4', { each: true })` | `@IsUUID('all', { each: true })` |
| `filter-discussion.dto.ts` | `authorId` | `@IsUUID('4')` | `@IsUUID('all')` |
| `accept-answer.dto.ts` | `commentId` | `@IsUUID('4')` | `@IsUUID('all')` |
| `create-comment.dto.ts` | `parentCommentId` | `@IsUUID('4')` | `@IsUUID('all')` |

> `@IsUUID('all')` chấp nhận mọi phiên bản UUID (v1–v5) thay vì chỉ v4. Nếu sau này migrate seed sang UUID v4 thật, có thể đổi lại thành `@IsUUID('4')`.

> Rebuild discussion-service sau khi sửa: `docker compose up -d --no-deps --build discussion-service`
