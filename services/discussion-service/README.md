# Discussion Service
Service quản lý diễn đàn hỏi đáp, thảo luận, bình luận, bình chọn (vote) và gắn thẻ (tags) cho toàn bộ hệ thống AcaSocial.

---

## Công nghệ sử dụng

- **NestJS** — framework chính
- **PostgreSQL** — lưu trữ bài viết, bình luận, tag và vote (`discussion_db`)
- **TypeORM** — ORM để tương tác với PostgreSQL
- **GatewayAuthGuard** — xác thực qua Header do API Gateway truyền xuống (`X-User-ID`, `X-User-Role`)
- **Atomic Operations** — xử lý concurrency và race condition khi đếm lượt vote, comment, tag.

---

## Cấu trúc thư mục

```
src/
├── common/
│   ├── decorators/           # CurrentUser, Roles
│   ├── guards/               # GatewayAuthGuard, RolesGuard
│   ├── pagination/           # Utils phân trang
│   └── filters/              # (Tùy chọn) Global Exception Filter
├── discussions/
│   ├── dto/                  # Validate input (Create, Update, Accept Answer)
│   ├── entities/             # Discussion entity (bài viết / câu hỏi)
│   ├── discussions.controller.ts
│   ├── discussions.service.ts
│   └── discussions.module.ts
├── comments/
│   ├── dto/                  # Create, Update comment
│   ├── entities/             # Comment entity
│   ├── comments.controller.ts
│   ├── comments.service.ts
│   └── comments.module.ts
├── tags/
│   ├── dto/                  # Create, Update, Filter tag
│   ├── entities/             # Tag entity
│   ├── tags.controller.ts
│   ├── tags.service.ts       # Xử lý soft delete và dọn dẹp liên kết
│   └── tags.module.ts
├── votes/
│   ├── dto/                  # CastVote (upvote / downvote)
│   ├── entities/             # Vote entity (Polymorphic)
│   ├── enums/                # TargetType, VoteType
│   ├── votes.controller.ts
│   ├── votes.service.ts
│   └── votes.module.ts
├── app.module.ts
└── main.ts
```

---

## Biến môi trường

Tạo file `.env` ở thư mục gốc của service với các biến sau:

```env
# Server
PORT=8084

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_db_password
DB_NAME=discussion_db
```

---

## Cài đặt và chạy

```bash
npm install
npm run start:dev
```

Service chạy tại `http://localhost:8084`. Tuy nhiên, để hoạt động chính xác các tính năng xác thực, request phải đi qua API Gateway (`http://localhost:8080`).

---

## Kiến trúc & Đặc tả (Highlight)

1. **Xác thực phi tập trung (Decentralized Auth):**
   `discussion-service` không kết nối Redis hay giải mã JWT. Nó hoàn toàn tin tưởng API Gateway. Gateway xác thực JWT và tiêm 2 headers `X-User-ID` và `X-User-Role` vào request. `GatewayAuthGuard` sẽ đọc 2 headers này để gán vào `req.user`.

2. **Toàn vẹn Dữ liệu (Data Integrity):**
   Mọi truy vấn cập nhật bộ đếm (counter) như `upvote_count`, `comment_count`, `usage_count` đều dùng Atomic SQL:
   `SET usageCount = GREATEST(usage_count - 1, 0)` để tránh tình trạng số đếm bị âm khi có nhiều request đồng thời (Race Condition).

3. **Polymorphic Voting (Bình chọn đa hình):**
   Bảng `votes` lưu chung cả lượt vote của bài viết lẫn bình luận, phân biệt qua `targetType` (DISCUSSION / COMMENT) và `targetId`.

4. **Quản lý Xóa an toàn (Safe Soft Delete):**
   - Bài viết (`discussions`) và bình luận (`comments`) được **xóa mềm (Soft Delete)**.
   - Khi xóa mềm bài viết, hệ thống không tự động xóa Tag.
   - Khi xóa hẳn một Tag (Hard Delete), hệ thống sẽ chủ động ngắt các liên kết mồ côi (orphaned links) trong bảng trung gian `discussion_tags` để tránh lỗi Foreign Key Constraint từ cơ sở dữ liệu.

---

## Phân tích Thiết kế Cơ sở dữ liệu (Database Design)

Service quản lý 4 thực thể chính độc lập nhưng liên kết chặt chẽ với nhau:

1. **Bảng `discussions` (Bài viết / Câu hỏi)**
   - Lưu trữ `author_id` (UUID) tham chiếu trực tiếp đến user bên Identity Service.
   - `post_type`: Phân loại rõ ràng giữa `DISCUSSION` (Thảo luận mở) và `QUESTION` (Câu hỏi cần lời giải).
   - `status`: Quản lý trạng thái (`OPEN`, `SOLVED`, `CLOSED`).
   - Các cột đếm cache (`view_count`, `upvote_count`, `comment_count`) để tối ưu hiệu năng khi hiển thị danh sách mà không cần `COUNT()` liên tục.

2. **Bảng `comments` (Bình luận)**
   - Liên kết với `discussion_id`.
   - Hỗ trợ **Threaded Comments** 1 cấp thông qua khóa ngoại đệ quy `parent_id` (trỏ đến comment khác). 

3. **Bảng `votes` (Bình chọn Đa hình - Polymorphic)**
   - Cùng một bảng phục vụ cho cả Bài viết và Bình luận để giảm thiểu dư thừa dữ liệu.
   - Sử dụng `target_type` (`DISCUSSION` hoặc `COMMENT`) kết hợp với `target_id` để xác định đối tượng được vote.
   - Composite Unique Key: `[user_id, target_type, target_id]` đảm bảo một user chỉ được vote 1 đối tượng 1 lần.

4. **Bảng `tags` và `discussion_tags` (Nhãn dán)**
   - `tags` lưu tên và URL-friendly `slug` (ví dụ: `co-so-du-lieu`, `c-sharp`).
   - `discussion_tags` là bảng trung gian Many-to-Many liên kết bài viết với nhiều tag.

---

## Nghiệp vụ Hoạt động (Business Logic)

### 1. Nghiệp vụ Câu hỏi và Câu trả lời (Q&A)
- **Ràng buộc loại bài:** Tính năng "Chấp nhận câu trả lời" (Accepted Answer) **chỉ dành riêng** cho bài viết có `post_type = QUESTION`.
- **Phân quyền duyệt:** Chỉ duy nhất tác giả (`author_id`) của câu hỏi mới có quyền click chọn một bình luận làm câu trả lời đúng (Admin hay Moderator không được phép làm thay).
- **Tự động hóa:** Khi một câu trả lời được chọn, trạng thái của bài viết tự động chuyển từ `OPEN` sang `SOLVED`.

### 2. Nghiệp vụ Bình chọn (Voting Toggle Logic)
Service xử lý 3 kịch bản vote thông minh:
1. **Lần đầu vote:** User chọn Upvote -> Tạo bản ghi, tăng `upvote_count` của bài viết lên 1.
2. **Hủy vote (Bấm lại nút cũ):** User đang Upvote, bấm Upvote lần nữa -> Xóa bản ghi vote, giảm `upvote_count` của bài viết đi 1.
3. **Đảo chiều vote:** User đang Upvote, chuyển sang bấm Downvote -> Cập nhật bản ghi thành downvote, **giảm `upvote_count` đi 1 và tăng `downvote_count` lên 1** trong cùng một transaction.

### 3. Nghiệp vụ Quản lý Thẻ (Tags)
- **Tự động hóa Slug:** Khi Admin tạo tag "Lập trình C++", hệ thống tự động sinh ra slug thân thiện với URL: `lap-trinh-cpp`.
- **Safe Delete:** Admin không thể xóa một Tag nếu `usage_count > 0` (đang có bài viết sử dụng). Nếu cố tình xóa qua API, hệ thống sẽ chặn và trả về lỗi `400 Bad Request`. Chỉ khi tất cả bài viết dùng tag đó bị xóa, tag mới được phép xóa.

---

## Luồng Hoạt động Tiêu biểu (Operational Flow)

### Ví dụ: Luồng User tạo mới một Thảo luận
```text
┌─────────────┐     1. POST /api/discussions         ┌───────────────┐
│             │  ──────────────────────────────────> │               │
│             │  Header: Authorization: Bearer <JWT> │  API Gateway  │
│   Client    │  Body: { "title": "Hỏi đáp", ... }   │  (Port 8080)  │
│ (React/Web) │                                      └───────┬───────┘
│             │                                              │ 2. Giải mã JWT & Check CORS/Rate Limit
│             │                                              │ 3. Inject Header: X-User-ID, X-User-Role
│             │     5. Trả về thông tin Bài viết             ▼
│             │  <────────────────────────────────── ┌───────────────┐
│             │     { "id": "uuid", "title": ... }   │  Discussion   │
│             │  ──────────────────────────────────> │    Service    │
└─────────────┘                                      └───────────────┘
                                                       4. Xử lý Logic:
                                                       - Đọc X-User-ID qua GatewayAuthGuard
                                                       - Kiểm tra danh sách Tag tồn tại không
                                                       - Tăng usage_count cho các Tag được chọn
                                                       - Lưu bản ghi vào PostgreSQL
```

---

## API Endpoints

*(Tất cả endpoint dưới đây đều được expose qua Gateway)*

### 1. Thảo luận (Discussions)
| Method | Endpoint | Auth Required | Mô tả |
|--------|----------|---------------|-------|
| GET | `/api/discussions` | Public | Lấy danh sách bài viết (hỗ trợ phân trang, lọc theo loại, tag) |
| GET | `/api/discussions/:id` | Public | Xem chi tiết bài viết (kèm tags) |
| POST | `/api/discussions` | Yes | Tạo bài viết hoặc câu hỏi mới |
| PATCH | `/api/discussions/:id` | Yes | Cập nhật bài viết (Chủ bài viết hoặc Admin/Mod) |
| DELETE | `/api/discussions/:id` | Yes | Xóa mềm bài viết (Chủ bài viết hoặc Admin/Mod) |
| PATCH | `/api/discussions/:id/accept` | Yes | Chọn 1 comment làm câu trả lời đúng (Chỉ tác giả) |
| DELETE | `/api/discussions/:id/accept`| Yes | Hủy chọn câu trả lời đúng (Chỉ tác giả) |

### 2. Bình luận (Comments)
| Method | Endpoint | Auth Required | Mô tả |
|--------|----------|---------------|-------|
| GET | `/api/discussions/:id/comments` | Public | Lấy danh sách bình luận của bài viết |
| POST | `/api/discussions/:id/comments` | Yes | Thêm bình luận vào bài viết |
| PATCH | `/api/comments/:id` | Yes | Sửa bình luận (Chủ bình luận hoặc Admin/Mod) |
| DELETE | `/api/comments/:id` | Yes | Xóa mềm bình luận (Chủ bình luận hoặc Admin/Mod) |

### 3. Bình chọn (Votes)
| Method | Endpoint | Auth Required | Mô tả |
|--------|----------|---------------|-------|
| POST | `/api/discussions/:id/vote` | Yes | Upvote/Downvote bài viết |
| DELETE | `/api/discussions/:id/vote` | Yes | Hủy bỏ Vote trên bài viết |
| POST | `/api/comments/:id/vote` | Yes | Upvote/Downvote bình luận |
| DELETE | `/api/comments/:id/vote` | Yes | Hủy bỏ Vote trên bình luận |

### 4. Tags
| Method | Endpoint | Auth Required | Mô tả |
|--------|----------|---------------|-------|
| GET | `/api/tags` | Public | Lấy danh sách Tag (Sắp xếp trending) |
| GET | `/api/tags/:id` | Public | Xem chi tiết 1 Tag |
| POST | `/api/tags` | Admin/Mod | Tạo Tag mới |
| PATCH | `/api/tags/:id` | Admin/Mod | Cập nhật tên/mô tả Tag |
| DELETE | `/api/tags/:id` | Admin/Mod | Xóa Tag (Bị chặn nếu Tag đang được sử dụng) |
