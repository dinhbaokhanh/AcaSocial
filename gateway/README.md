## Cấu Trúc Thư Mục

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
|   |   |-- auth.go              # JWT Authentication + RBAC
|   |   |-- blacklist.go         # Redis Token Blacklist
|   |   |-- ratelimit.go         # IP Rate Limiter
|   |   |-- validation.go        # Request body/content-type validation
|   |   |-- auditlog.go          # Security Audit Logger
|   |   |-- cache.go             # Redis Response Cache
|   |   |-- realip.go            # Real IP extraction
|   |   |-- requestid.go         # Request ID (X-Request-ID header)
|   |   `-- middleware.go        # CORS, Logger, Recoverer, Chain helper
|   `-- proxy/
|       `-- reverse_proxy.go     # Reverse proxy với timeout và connection pool
|-- gateway.json                 # File cấu hình routes
|-- .env.example                 # Mẫu biến môi trường
|-- go.mod
`-- README.md
```

---

## Cấu Hình Route (`gateway.json`)

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

## Biến Môi Trường

Tạo file `.env` từ mẫu `.env.example`:

| Biến | Mô tả | Bắt buộc |
|---|---|---|
| `JWT_SECRET` | Secret key để verify JWT (phải khớp với backend) | ✅ |
| `REDIS_URL` | Địa chỉ Redis (mặc định `localhost:6379`) | ❌ |

> **Lưu ý:** Gateway sẽ **crash ngay khi khởi động** nếu thiếu `JWT_SECRET` hoặc không kết nối được Redis.

---

## Chuỗi Middleware (Thứ tự xử lý)

```
Request đến
    └─> RequestID          (gán X-Request-ID xuyên suốt chuỗi)
        └─> RequestValidation  (kiểm tra body & Content-Type)
            └─> AuditLogger    (ghi log bảo mật)
                └─> Recoverer  (bắt panic)
                    └─> RequestLogger  (ghi latency)
                        └─> CORS
                            └─> [Per-route]
                                └─> RateLimit
                                    └─> Strip Headers (X-User-ID, X-User-Role)
                                        └─> Cache (Redis, nếu cấu hình cacheTTLSeconds)
                                            └─> JWT Auth + RBAC (nếu authRequired)
                                                └─> Sanitize Response Headers
                                                    └─> Reverse Proxy
```

<<<<<<< HEAD
### Giải thích thiết kế
=======
>>>>>>> 789368084f57e5c8e78bdea2659a6fdf565d6269

Chuỗi middleware được tổ chức theo mẫu kiến trúc **Pipe and Filter** (Buschmann et al., *Pattern-Oriented Software Architecture*, 1996) kết hợp với **Chain of Responsibility** (GoF, *Design Patterns*, 1994): mỗi middleware là một "bộ lọc" độc lập, nhận request → xử lý → chuyển tiếp, không biết gì về các tầng còn lại.

**Nguyên tắc sắp xếp thứ tự (Fail-Fast & Defense-in-Depth):**

| Tầng | Lý do đặt ở vị trí này |
|---|---|
| **RequestID** | Ngoài cùng nhất — gán `X-Request-ID` ngay đầu để mọi log phía sau đều có thể trace theo cùng một request |
| **RequestValidation** | Từ chối sớm request không hợp lệ trước khi tốn tài nguyên xử lý (*Fail-Fast principle*) |
| **AuditLogger** | Đặt trước Recoverer để ghi nhận được **cả các request gây panic** |
| **Recoverer** | Bọc bên ngoài RequestLogger để đảm bảo latency luôn được ghi kể cả khi có lỗi |
| **CORS** | Xử lý trước business logic — trả về `OPTIONS` preflight mà không cần chạy Auth/RateLimit |
| **RateLimit** | Per-route, đặt ngoài cùng — chặn tại cổng, bảo vệ toàn bộ chuỗi phía sau khỏi bị DDoS |
| **Strip Headers** | Xóa `X-User-ID`, `X-User-Role` do client tự chèn trước khi Auth — tránh giả mạo định danh (*Header Injection Attack*) |
| **Cache** | Sau Auth để cache key gắn với user cụ thể — tránh anonymous đọc được dữ liệu đã cache của user đã đăng nhập |
| **JWT Auth + RBAC** | Đặt gần Proxy nhất — chỉ chạy sau khi đã qua Rate Limit và header đã được làm sạch |

> **Tham khảo:** OWASP API Security Top 10 (2023) khuyến nghị áp dụng **layered security** (Broken Object Level Authorization — API1, Broken Authentication — API2) đúng thứ tự như trên. Cơ chế JWT được chuẩn hóa tại [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519).

<<<<<<< HEAD
=======
---

>>>>>>> 789368084f57e5c8e78bdea2659a6fdf565d6269
---

## Chạy Dự Án

```bash
cp .env.example .env
docker run -d -p 6379:6379 redis

# Chạy Gateway
go run ./cmd/gateway
```

**Kiểm tra Gateway hoạt động:**
```bash
curl http://localhost:8080/health
# Trả về: ok
```