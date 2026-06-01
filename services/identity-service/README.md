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

## Luồng hoạt động chính

### Đăng ký

1. Client gửi `POST /auth/register` với họ tên, ngày sinh, email, password.
2. Service kiểm tra email chưa tồn tại, hash password, lưu user với `isVerified = false`.
3. Sinh OTP 6 số, lưu vào Redis với TTL 5 phút, gửi về email.
4. Client gửi `POST /auth/verify-otp` với email và OTP.
5. Service xác thực OTP, cập nhật `isVerified = true`.
6. Client chuyển về màn hình đăng nhập.

### Đăng nhập

1. Client gửi `POST /auth/login` với email và password.
2. Service kiểm tra email tồn tại, tài khoản đã xác thực, so sánh password với bcrypt.
3. Sinh access token (JWT, 15 phút) và refresh token (UUID ngẫu nhiên, 7 ngày).
4. Refresh token được hash bằng SHA256 rồi lưu vào bảng `refresh_tokens`.
5. Trả về cả hai token cho client.

### Refresh token

1. Client gửi `POST /auth/refresh` với refresh token hiện tại.
2. Service hash token bằng SHA256, tìm trong DB, kiểm tra chưa bị revoke và chưa hết hạn.
3. Revoke token cũ, sinh cặp token mới và trả về.

### Đăng xuất

1. Client gửi `POST /auth/logout` với access token trong header.
2. Service revoke toàn bộ refresh token của user trong DB.
3. Đẩy `jti` (JWT ID) của access token vào Redis blacklist với TTL bằng thời gian còn lại của token.
4. Mọi request tiếp theo dùng access token đó sẽ bị từ chối tại `JwtStrategy`.

### Quên mật khẩu

1. Client gửi `POST /auth/forgot-password` với email.
2. Service kiểm tra email tồn tại, gửi OTP về email với TTL 10 phút.
3. Client gửi `POST /auth/reset-password` với email, OTP và mật khẩu mới.
4. Service xác thực OTP, hash mật khẩu mới, revoke toàn bộ refresh token.

### Đổi mật khẩu (đã đăng nhập)

1. Client gửi `PATCH /users/me/change-password` với mật khẩu hiện tại, mật khẩu mới, xác nhận mật khẩu mới.
2. Service kiểm tra mật khẩu hiện tại đúng, hai trường mật khẩu mới khớp nhau.
3. Lưu mật khẩu mới, revoke toàn bộ refresh token, blacklist access token hiện tại.
4. User bị đăng xuất khỏi tất cả thiết bị.

---

## Thiết kế bảo mật

**Password** được hash bằng bcrypt với cost factor 10 trước khi lưu vào DB. Không bao giờ lưu plain text.

**Refresh token** là UUID ngẫu nhiên. Khi lưu vào DB, token được hash bằng SHA256. Khi client gửi lên, service hash lại rồi tìm trong DB — nếu DB bị lộ, attacker không có token gốc.

Lý do dùng SHA256 thay bcrypt cho refresh token: bcrypt dùng salt ngẫu nhiên nên cùng một input cho ra output khác nhau mỗi lần, không thể dùng để tìm kiếm trong DB. SHA256 là deterministic nên tìm được. Refresh token là UUID ngẫu nhiên đủ entropy nên không cần bcrypt.

**Access token** là JWT stateless. Khi đăng xuất hoặc đổi mật khẩu, token được blacklist trong Redis bằng `jti` (một UUID duy nhất được nhúng vào payload khi tạo token). TTL của key Redis bằng thời gian còn lại của token để tự dọn dẹp.

**OTP** được lưu trong Redis với TTL, tự xóa sau khi hết hạn. Sau khi dùng một lần, OTP bị xóa ngay lập tức để không dùng lại được.

---

## Lưu ý khi phát triển

`synchronize: true` trong cấu hình TypeORM chỉ dùng trong môi trường development. Khi chuyển sang production cần tắt và dùng migration thay thế.
