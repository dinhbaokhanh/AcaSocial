# Academic Service

Quản lý cấu trúc học thuật `Chuyên ngành ↔ Môn học` (n-n qua `major_courses`), taxonomy chủ đề. Bảng chính: `majors`, `courses`, `major_courses`, `topics`, `course_topics`.

Vai trò `teacher` nhận diện giảng viên, không cấp quyền xác thực học thuật. Quyền quản lý nội dung thuộc admin/moderator hoặc owner/moderator của phòng trong discussion-service.

Service chạy ở cổng `8086`, dùng database `academic_db` và tự chạy migration khi khởi động.

```sh
npm ci
npm run build
npm run start:dev
```

Xem thiết kế nghiệp vụ, ERD và sequence diagram tại [`../../docs/academic-foundation.md`](../../docs/academic-foundation.md).
