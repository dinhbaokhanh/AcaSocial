# API Gateway

Repository này chứa mã nguồn phần **API Gateway** cho hệ thống microservices của đồ án tốt nghiệp - Nền tảng diễn đàn sinh viên.
---

## 1. Mục Tiêu

API Gateway viết bằng **Go** theo triết lý **Configuration-Driven**: toàn bộ định tuyến, xác thực, và khai báo trong file `gateway.json`.

---

## 2. Tính Năng Đã Triển Khai

### Định tuyến & Proxy
- **Configuration-Driven Routing** — động route từ `gateway.json`, không cần recompile
- **Reverse Proxy** — forward request đến backend với connection pooling và **timeout 10 giây**

### Bảo mật
- **JWT Authentication** — chỉ chấp nhận HS256, validate `exp`/`iss`/`aud`/`jti`, chặn tấn công `alg:none`
- **Redis Token Blacklist** — revoke token theo `jti` với TTL tự dọn; crash khi khởi động nếu Redis không sẵn sàng
- **Header Sanitization** — xóa `X-User-ID`, `X-User-Role` do client tự gán; inject lại từ JWT claims
- **Request Validation** — giới hạn body tối đa **1MB** (413), chỉ chấp nhận `application/json`, `multipart/form-data`, `application/x-www-form-urlencoded` (415)

### Độ tin cậy & Vận hành
- **Rate Limiting** — 20 req/giây per IP, goroutine tự dọn dẹp IP cũ mỗi 5 phút
- **Graceful Shutdown** — bắt `SIGINT`/`SIGTERM`, drain request hiện tại trong 30 giây trước khi tắt
- **Security Audit Logger** — ghi mọi sự kiện từ chối (401/403/429/413/415) dạng JSON ra stdout
- **CORS** — cấu hình sẵn cho frontend cross-origin
- **Recoverer** — bắt panic, trả 500 thay vì để Gateway sập

---

## 3. Cấu Trúc Thư Mục

```text
ptit-gateway/
|-- cmd/
|   `-- gateway/
|       `-- main.go              # Khởi động, graceful shutdown
|-- internal/
|   |-- app/                     # Khởi tạo HTTP server, chuỗi middleware toàn cục
|   |-- config/                  # Đọc và parse gateway.json
|   |-- routing/                 # Xây dựng route động + áp middleware per-route
|   |-- middleware/
|   |   |-- auth.go              # JWT Authentication
|   |   |-- blacklist.go         # Redis Token Blacklist
|   |   |-- ratelimit.go         # IP Rate Limiter (+ cleanup goroutine)
|   |   |-- validation.go        # Request body/content-type validation
|   |   |-- auditlog.go          # Security Audit Logger
|   |   `-- middleware.go        # CORS, Logger, Recoverer, Chain helper
|   `-- proxy/
|       `-- reverse_proxy.go     # Reverse proxy với timeout và connection pool
|-- gateway.json                 # File cấu hình routes
|-- .env.example                 # Mẫu biến môi trường
|-- go.mod
`-- README.md
```

---

## 4. Cấu Hình Route (`gateway.json`)

```json
{
  "port": 8080,
  "jwt": {
    "issuer": "ptit-backend",
    "audience": "ptit-gateway"
  },
  "endpoints": [
    {
      "endpoint": "/api/users/login",
      "method": "POST",
      "backend": [{ "host": ["http://localhost:8081"], "url_pattern": "/api/users/login" }]
    },
    ....
  ]
}
```

---

## 5. Biến Môi Trường

Tạo file `.env` từ mẫu `.env.example`:

| Biến | Mô tả | Bắt buộc |
|---|---|---|
| `JWT_SECRET` | Secret key để verify JWT (phải khớp với backend) | ✅ |
| `REDIS_URL` | Địa chỉ Redis (mặc định `localhost:6379`) | ❌ |

> **Lưu ý:** Gateway sẽ **crash ngay khi khởi động** nếu thiếu `JWT_SECRET` hoặc không kết nối được Redis.

---

## 6. Chuỗi Middleware (Thứ tự xử lý)

```
Request đến
    └─> RequestValidation   (kiểm tra body & Content-Type)
        └─> AuditLogger     (ghi log bảo mật)
            └─> Recoverer   (bắt panic)
                └─> RequestLogger (ghi latency)
                    └─> CORS
                        └─> [Per-route]
                            └─> RateLimit → Strip Headers → JWT Auth → Reverse Proxy
```

---

## 7. Chạy Dự Án

```bash
# Sao chép cấu hình môi trường
cp .env.example .env
# Chỉnh JWT_SECRET trong .env cho khớp với Node.js backend

# Đảm bảo Redis đang chạy
docker run -d -p 6379:6379 redis

# Chạy Gateway
go run ./cmd/gateway
```

**Kiểm tra Gateway hoạt động:**
```bash
curl http://localhost:8080/health
# Trả về: ok
```

**Chạy toàn bộ unit test:**
```bash
go test ./internal/middleware/ -v
```
