# Identity Service
Service xác thực và quản lý thông tin người dùng

---

## Công nghệ sử dụng

- **NestJS** — framework chính
- **PostgreSQL** — lưu trữ thông tin người dùng và refresh token
- **Redis** — lưu OTP (có TTL tự động) và blacklist access token khi đăng xuất
- **TypeORM** — ORM để tương tác với PostgreSQL
- **Passport + JWT** — xác thực người dùng qua Bearer token
- **bcrypt** — hash password
- **nodemailer** — gửi email OTP qua Gmail SMTP
- **Cloudinary** — lưu trữ ảnh đại diện

---

## Cấu trúc thư mục

```
src/
├── auth/
│   ├── dto/                  # Validate input cho các endpoint auth
│   ├── guards/               # JwtAuthGuard — bảo vệ endpoint cần đăng nhập
│   ├── strategies/           # JwtStrategy — giải mã và xác thực JWT
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/
│   ├── dto/                  # Validate input cho các endpoint profile
│   ├── user.entity.ts        # Bảng users
│   ├── refresh-token.entity.ts # Bảng refresh_tokens
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── mail/
│   ├── mail.service.ts       # Gửi email qua nodemailer
│   └── mail.module.ts
├── otp/
│   ├── otp.service.ts        # Sinh, lưu, xác thực OTP qua Redis
│   └── otp.module.ts
├── app.module.ts
└── main.ts
```

---

## Biến môi trường

Tạo file `.env` ở thư mục gốc của service với các biến sau:

```env
# Server
PORT=8081

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=identity_db

# JWT
JWT_SECRET=your_jwt_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Gmail SMTP
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
MAIL_FROM="App Name <your_email@gmail.com>"

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Cài đặt và chạy

```bash
npm install
npm run start:dev
```

Service chạy tại `http://localhost:8081`.
---

## API Endpoints

### Xác thực (không cần đăng nhập)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /auth/register | Đăng ký tài khoản mới |
| POST | /auth/verify-otp | Xác thực OTP sau đăng ký |
| POST | /auth/resend-otp | Gửi lại OTP đăng ký |
| POST | /auth/login | Đăng nhập |
| POST | /auth/refresh | Lấy access token mới bằng refresh token |
| POST | /auth/forgot-password | Gửi OTP đặt lại mật khẩu về email |
| POST | /auth/reset-password | Đặt lại mật khẩu bằng OTP |

### Quản lý tài khoản (cần đăng nhập — Bearer token)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /auth/logout | Đăng xuất |
| GET | /users/me | Xem thông tin cá nhân |
| PATCH | /users/me/profile | Cập nhật họ tên, ngày sinh |
| PATCH | /users/me/avatar | Upload ảnh đại diện |
| PATCH | /users/me/change-password | Đổi mật khẩu |
| POST | /users/me/change-email/request | Yêu cầu đổi email (gửi OTP về email mới) |
| POST | /users/me/change-email/resend | Gửi lại OTP đổi email |
| POST | /users/me/change-email/confirm | Xác nhận đổi email bằng OTP |
| PATCH | /users/me/privacy | Cập nhật chế độ hiển thị hồ sơ |
| DELETE | /users/me | Xóa tài khoản |

---

## RBAC

Identity Service quản lý role gắn với tài khoản, không phụ thuộc context.

| Role | Mô tả |
|------|-------|
| `student` | Mặc định khi đăng ký. Tham gia nhóm, đăng bài thảo luận |
| `teacher` | Được admin cấp. Tạo nhóm học, đăng tài liệu, tạo khóa học |
| `moderator` | Kiểm duyệt nội dung toàn platform. Do admin bổ nhiệm |
| `admin` | Toàn quyền quản trị hệ thống |

Role được lưu trong bảng `users` và nhúng vào JWT payload khi đăng nhập:

```json
{
  "sub": "uuid",
  "email": "user@example.com",
  "role": "teacher",
  "jti": "uuid",
  "iat": 1234567890,
  "exp": 1234568790
}
```

Gateway đọc `role` từ JWT và forward vào header `X-User-Role` cho các service phía sau.

### Ranh giới trách nhiệm

**Identity Service / JWT `role` dùng để:**
- Xác định `teacher` có quyền tạo nhóm, tạo khóa học
- Xác định `moderator` có quyền kiểm duyệt nội dung platform
- Gateway kiểm tra `required_roles` trước khi cho phép gọi endpoint

**JWT `role` KHÔNG dùng để:**
- Phân quyền bên trong một nhóm cụ thể (owner, admin nhóm)
- Thay thế logic nghiệp vụ của từng service

**Community Service tự quản lý quyền trong nhóm** thông qua bảng riêng:
```
group_members(user_id, group_id, role)
-- role: 'owner' | 'admin' | 'member'
```

Ví dụ: một `teacher` tạo nhóm sẽ có `role = 'owner'` trong `group_members`. Khi vào nhóm của người khác, họ chỉ là `member` — JWT role không ảnh hưởng đến quyền bên trong nhóm đó.

---

## Lưu ý khi phát triển

`synchronize: true` trong cấu hình TypeORM chỉ dùng trong môi trường development. Khi chuyển sang production cần tắt và dùng migration thay thế.