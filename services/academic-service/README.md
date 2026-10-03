# Academic Service

Quản lý cấu trúc học thuật `Chuyên ngành → Chương trình đào tạo → Môn học`, taxonomy chủ đề. Academic DB gồm 6 bảng: `majors`, `courses`, `curricula`, `curriculum_courses`, `topics`, `course_topics`.

Vai trò `teacher` nhận diện giảng viên, không cấp quyền xác thực học thuật. Quyền quản lý nội dung thuộc admin/moderator hoặc owner/moderator của phòng trong discussion-service.

Service chạy ở cổng `8086`, dùng database `academic_db` và tự chạy migration khi khởi động.

```sh
npm ci
npm run build
npm run start:dev
```

Xem thiết kế nghiệp vụ, ERD và sequence diagram tại [`../../docs/academic-foundation.md`](../../docs/academic-foundation.md).
