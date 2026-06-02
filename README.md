# AcaSocial — Monorepo

Mạng xã hội xây dựng theo kiến trúc **Microservices**, giao tiếp qua một **API Gateway** trung tâm.

---

## Cấu trúc thư mục

```
AcaSocial/
├── gateway/                        # API Gateway (Go) — cổng duy nhất từ frontend vào hệ thống
│   ├── cmd/gateway/main.go         # Entry point
│   ├── internal/                   # Logic nội bộ: routing, middleware, proxy, config
│   ├── gateway.json                # Khai báo toàn bộ route và backend mapping
│   ├── .env                        # Biến môi trường local (không commit)
│   └── .env.example                # Mẫu biến môi trường — copy thành .env khi setup
│
├── services/
│   ├── identity-service/           # Xác thực & quản lý người dùng (NestJS + PostgreSQL)
│   │   ├── src/
│   │   ├── .env                    # Biến môi trường local (không commit)
│   │   └── .env.example            # Mẫu biến môi trường
│   ├── community-service/          # (Đang phát triển)
│   ├── discussion-service/         # (Đang phát triển)
│   └── media-service/              # (Đang phát triển)
│
├── frontend/                       # (Đang phát triển)
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
      ├── /api/posts/*  ──►  community-service:8082   (sắp có)
      └── /api/media/*  ──►  media-service:8083        (sắp có)
```

> Các service **không** expose port ra ngoài. Chỉ Gateway mới được gọi từ frontend.  
> Gateway xác thực JWT một lần, sau đó forward `X-User-ID` và `X-User-Role` vào header cho các service phía sau dùng.

---

## Yêu cầu

| Công cụ | Phiên bản tối thiểu |
|---|---|
| Go | 1.22+ |
| Node.js | 20+ |
| Docker Desktop | 24+ |
| Git | Bất kỳ |

---

## Cách chạy

### Chọn 1 trong 2 cách bên dưới:

---

### Cách A — Docker (khuyến nghị, chạy toàn bộ stack)

Cách này khởi động **PostgreSQL, Redis, identity-service và Gateway** cùng lúc trong Docker network riêng. Không cần cài Node hay Go trên máy.

**Bước 1 — Copy và điền file biến môi trường:**

```bash
# Windows (PowerShell)
.\scripts\setup.ps1

# macOS / Linux
bash scripts/setup.sh
```

Script sẽ tự tạo các file `.env` từ `.env.example`. Sau đó mở và điền các giá trị thật:

| File | Cần điền |
|---|---|
| `.env` | `DB_PASSWORD`, `REDIS_PASSWORD` |
| `gateway/.env` | `JWT_SECRET` |
| `services/identity-service/.env` | `DB_PASSWORD`, `JWT_SECRET`, `REDIS_PASSWORD`, `MAIL_PASS`, Cloudinary keys |

> ⚠️ `JWT_SECRET` phải **giống nhau** ở `gateway/.env` và `services/identity-service/.env` — đây là key dùng để ký và xác minh JWT.  
> ⚠️ `REDIS_PASSWORD` phải **giống nhau** ở `.env` (dùng khởi tạo Redis) và `services/identity-service/.env` (dùng kết nối Redis).

**Bước 2 — Build và chạy:**

```bash
docker compose up --build
```

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

## Kiến trúc bảo mật

- JWT được ký bởi `identity-service`, xác minh bởi `gateway` — các service khác không cần biết JWT secret
- Gateway xóa `X-User-ID` và `X-User-Role` do client tự gửi lên trước khi xác thực, tránh giả mạo danh tính
- Các service nội bộ không bind port ra ngoài Docker network — chỉ Gateway ở port `8080` được expose
- Token bị revoke (logout) được lưu vào Redis blacklist, Gateway kiểm tra trước mỗi request
