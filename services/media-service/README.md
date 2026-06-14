# Media Service

Service quản lý và lưu trữ file (hình ảnh, tài liệu, code) cho toàn bộ hệ thống AcaSocial.

## Kiến trúc xử lý Media

Hệ thống sử dụng **Dumb Storage Pattern** cho `media-service` để tránh cross-service joins và giữ cho các service decoupling hoàn toàn.

### Chú ý:
1. `media-service` không biết ảnh nào là avatar của ai, hay ảnh nào thuộc bài viết nào.
2. **Nhiệm vụ:**
   - Nhận file stream, validate (kích thước, định dạng).
   - Upload thẳng lên Cloudinary
   - Lưu metadata (Cloudinary public_id, sizeBytes, format, uploader) vào PostgreSQL (`media_db`).
   - Trả về thông tin file gồm `id` (UUID nội bộ) và `secureUrl` (link Cloudinary).
3. **Phân quyền trách nhiệm:** Các Service sở hữu (ví dụ `identity-service` hoặc `community-service`) chịu trách nhiệm gọi API upload, lấy `secureUrl` hoặc `mediaId` và lưu vào database của chính nó để tham chiếu (như lưu vào cột `avatar_url` của bảng `users`).

---

## Ví dụ 1: Luồng Upload và Cập nhật Avatar

Để cập nhật Avatar, luồng từ phía Client sẽ gọi 2 API liên tiếp (bắt cầu qua Gateway):

```text
┌─────────────┐     1. POST /api/media/upload        ┌───────────────┐
│             │  ──────────────────────────────────> │               │
│             │  <────────────────────────────────── │ media-service │
│   Client    │     { id: "uuid-abc", secureUrl:     │               │
│ (React/Web) │       "https://res.cloudinary..." }  └───────────────┘
│             │
│             │     2. PATCH /api/users/me/avatar    ┌──────────────────┐
│             │  ──────────────────────────────────> │                  │
│             │     Body: { avatarUrl: "https:..." } │ identity-service │
│             │  <────────────────────────────────── │                  │
└─────────────┘     { message: "Thành công" }        └──────────────────┘
```

### Ví dụ 2: Luồng tạo Bài viết (Post) có nhiều ảnh

Khác với Avatar (1 ảnh), một bài viết thường có nhiều ảnh. Client sẽ upload từng ảnh lên `media-service`, gom kết quả lại (các URL/ID) rồi mới gọi `community-service` để lưu vào bài viết.

```text
┌─────────────┐   1. Upload n ảnh (POST /api/media/upload x n lần)
│             │  ──────────────────────────────────> 
│   Client    │  <────────────────────────────────── [ { id: "id-1", url: "img1.jpg" }, ... ]
│ (React/Web) │ 
│             │   2. Tạo bài viết (POST /api/posts)  ┌───────────────────┐
│             │  ──────────────────────────────────> │                   │
│             │  Body: {                             │ community-service │
│             │    "content": "AcaSocial tuyệt!",    │                   │
│             │    "mediaIds": ["id-1", "id-2"]      │                   │
│             │  }                                   └───────────────────┘
└─────────────┘     { message: "Tạo thành công" }
```

> **Cách lưu trữ ở `community-service`:** Bảng `posts` có thể lưu trực tiếp một mảng các URL/Media ID dưới dạng cột `jsonb` hoặc mảng `text[]`. Nếu nghiệp vụ cần truy vấn phức tạp (VD: đếm số ảnh), có thể thiết kế một bảng phụ `post_media (post_id, media_id, url)`.

---

## Quản lý rác (Orphan Cleanup)

> **Future Work / Note cho Vấn đáp:** 
> 
> Hiện tại, khi user đổi avatar mới hoặc xóa một bài viết, các file cũ trên Cloudinary sẽ trở thành file "mồ côi" (orphan) do không còn service nào tham chiếu tới, gây lãng phí dung lượng lưu trữ.
> 
> Giải pháp chuẩn cho môi trường Production (nằm ngoài scope hiện tại để giảm độ phức tạp):
> 1. **Chủ động:** `identity-service` gọi `DELETE /api/media/:oldId` trước khi update avatar mới.
> 2. **Thụ động (Khuyên dùng):** Cấu hình một Cron Job định kỳ (VD: mỗi đêm) chạy quét đối chiếu xem có những `mediaId` nào trong `media_assets` không được reference ở bảng `users` hay `posts` trong N ngày qua thì tiến hành xóa cả ở Database và Cloudinary.

---

## API Endpoints

(Các endpoint này được expose qua Gateway tại `/api/media/...`)

### 1. Upload File
- **Method:** `POST /upload`
- **Auth:** Bắt buộc (Có JWT)
- **Body (multipart/form-data):**
  - `file`: File cần upload (Max 10MB)
  - `category`: `image` | `document` | `code`
- **Response:** `{ id, secureUrl, format, mimeType, sizeBytes, createdAt }`

### 2. Lấy thông tin File
- **Method:** `GET /:id`
- **Auth:** Public
- **Response:** Metadata của file (không trả về file gốc, frontend dùng trực tiếp `secureUrl`).

### 3. Xóa File
- **Method:** `DELETE /:id`
- **Auth:** Bắt buộc (Chỉ người upload hoặc Admin mới có quyền xóa)
- **Hành động:** Soft delete trong DB và gọi Cloudinary API để xóa file vật lý.
