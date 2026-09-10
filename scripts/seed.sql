-- =============================================================================
-- AcaSocial — Seed Data
-- Chạy sau khi các service đã khởi động và tạo schema (synchronize: true)
-- Usage (PowerShell): Get-Content scripts/seed.sql -Raw | docker exec -i acasocial-postgres psql -U postgres -v ON_ERROR_STOP=1
-- Usage (bash): docker exec -i acasocial-postgres psql -U postgres -v ON_ERROR_STOP=1 < scripts/seed.sql
-- WARNING: this script deletes existing seedable data before inserting fresh data.
-- =============================================================================

-- =============================================================================
-- IDENTITY DB
-- =============================================================================
\c db

-- Xóa data cũ (giữ thứ tự để tránh FK violation)
DELETE FROM refresh_tokens;
DELETE FROM users;

-- Password hash tương ứng với "Password123!" cho tất cả user (bcrypt, cost 10)
-- Để đăng nhập test: dùng email + "Password123!"

INSERT INTO users (id, username, full_name, date_of_birth, email, password_hash, avatar_url, privacy, is_verified, role, password_changed_at, last_login_at, created_at, updated_at) VALUES

-- ===== Giảng viên =====
('11111111-0000-0000-0000-000000000001', 'nguyenvanan',   'TS. Nguyễn Văn An',       '1978-03-15', 'an.nguyen@ptit.edu.vn',       '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=11', 'public',  true, 'teacher',   NULL, NOW() - INTERVAL '2 hours',  NOW() - INTERVAL '400 days', NOW()),
('11111111-0000-0000-0000-000000000002', 'tranthib',      'PGS. Trần Thị Bình',      '1975-07-20', 'binh.tran@ptit.edu.vn',       '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=47', 'public',  true, 'teacher',   NULL, NOW() - INTERVAL '1 day',   NOW() - INTERVAL '380 days', NOW()),
('11111111-0000-0000-0000-000000000003', 'levanc',        'ThS. Lê Văn Cường',       '1985-11-05', 'cuong.le@ptit.edu.vn',        '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=52', 'public',  true, 'teacher',   NULL, NOW() - INTERVAL '3 days',  NOW() - INTERVAL '350 days', NOW()),
('11111111-0000-0000-0000-000000000004', 'phamthid',      'TS. Phạm Thị Dung',       '1980-02-28', 'dung.pham@ptit.edu.vn',       '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=45', 'public',  true, 'teacher',   NULL, NOW() - INTERVAL '5 days',  NOW() - INTERVAL '320 days', NOW()),

-- ===== Moderator =====
('11111111-0000-0000-0000-000000000005', 'hoangmine',     'Hoàng Minh Em',           '1999-06-10', 'em.hoang@ptit.edu.vn',        '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=33', 'public',  true, 'moderator', NULL, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '300 days', NOW()),

-- ===== Sinh viên =====
('22222222-0000-0000-0000-000000000001', 'trungkien99',   'Nguyễn Trung Kiên',       '2001-04-12', 'kien.nguyen.d21@ptit.edu.vn', '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=3',  'public',  true, 'student',   NULL, NOW() - INTERVAL '1 hour',  NOW() - INTERVAL '200 days', NOW()),
('22222222-0000-0000-0000-000000000002', 'lananh2k2',     'Lê Lan Anh',              '2002-09-25', 'anh.le.d22@ptit.edu.vn',      '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=44', 'public',  true, 'student',   NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '180 days', NOW()),
('22222222-0000-0000-0000-000000000003', 'minhtuan_ptit', 'Trần Minh Tuấn',          '2001-12-03', 'tuan.tran.d21@ptit.edu.vn',   '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=7',  'public',  true, 'student',   NULL, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '160 days', NOW()),
('22222222-0000-0000-0000-000000000004', 'thanhha_sv',    'Phạm Thành Hà',           '2002-03-17', 'ha.pham.d22@ptit.edu.vn',     '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=9',  'public',  true, 'student',   NULL, NOW() - INTERVAL '1 day',  NOW() - INTERVAL '140 days', NOW()),
('22222222-0000-0000-0000-000000000005', 'quocbao_d22',   'Lê Quốc Bảo',            '2002-07-30', 'bao.le.d22@ptit.edu.vn',      '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=12', 'public',  true, 'student',   NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '120 days', NOW()),
('22222222-0000-0000-0000-000000000006', 'ngocmai_ptit',  'Vũ Ngọc Mai',             '2003-01-14', 'mai.vu.d23@ptit.edu.vn',      '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=49', 'public',  true, 'student',   NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '90 days',  NOW()),
('22222222-0000-0000-0000-000000000007', 'ducmanh_it',    'Ngô Đức Mạnh',            '2001-08-22', 'manh.ngo.d21@ptit.edu.vn',    '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=15', 'public',  true, 'student',   NULL, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '80 days',  NOW()),
('22222222-0000-0000-0000-000000000008', 'huyenphuong22', 'Đặng Huyền Phương',       '2002-11-08', 'phuong.dang.d22@ptit.edu.vn', '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=41', 'public',  true, 'student',   NULL, NOW() - INTERVAL '1 day',  NOW() - INTERVAL '70 days',  NOW()),
('22222222-0000-0000-0000-000000000009', 'bachlong_sv',   'Trương Bách Long',        '2001-05-19', 'long.truong.d21@ptit.edu.vn', '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=18', 'public',  true, 'student',   NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '60 days',  NOW()),
('22222222-0000-0000-0000-000000000010', 'thuylinh_d23',  'Nguyễn Thuỳ Linh',       '2003-04-06', 'linh.nguyen.d23@ptit.edu.vn', '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=39', 'public',  true, 'student',   NULL, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '45 days',  NOW()),
('22222222-0000-0000-0000-000000000011', 'conghau_ptit',  'Đinh Công Hậu',           '2002-02-14', 'hau.dinh.d22@ptit.edu.vn',   '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=22', 'public',  true, 'student',   NULL, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '30 days',  NOW()),
('22222222-0000-0000-0000-000000000012', 'yennhi_sv',     'Trần Yến Nhi',            '2003-09-01', 'nhi.tran.d23@ptit.edu.vn',   '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=46', 'public',  true, 'student',   NULL, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '20 days',  NOW()),
('22222222-0000-0000-0000-000000000013', 'khanhtoan_d21', 'Bùi Khánh Toàn',          '2001-10-27', 'toan.bui.d21@ptit.edu.vn',   '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=25', 'public',  true, 'student',   NULL, NOW() - INTERVAL '1 hour',  NOW() - INTERVAL '15 days',  NOW()),
('22222222-0000-0000-0000-000000000014', 'thuydung_it',   'Cao Thuỳ Dung',           '2002-06-23', 'dung.cao.d22@ptit.edu.vn',   '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=43', 'public',  true, 'student',   NULL, NOW() - INTERVAL '7 hours', NOW() - INTERVAL '10 days',  NOW()),
('22222222-0000-0000-0000-000000000015', 'vinhphuc_sv',   'Nguyễn Vĩnh Phúc',       '2003-12-11', 'phuc.nguyen.d23@ptit.edu.vn','$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=27', 'public',  true, 'student',   NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '5 days',   NOW());


-- =============================================================================
-- DISCUSSION DB
-- =============================================================================
\c discussion_db

-- Xóa data cũ
DELETE FROM votes;
DELETE FROM discussion_tags;
DELETE FROM comments;
DELETE FROM discussion_media;
DELETE FROM discussions;
DELETE FROM tags;

-- =============================================================================
-- TAGS
-- =============================================================================
INSERT INTO tags (id, name, slug, description, usage_count, created_at) VALUES
('aaaaaaaa-0000-0000-0000-000000000001', 'Lập trình hướng đối tượng', 'lap-trinh-huong-doi-tuong', 'OOP — Encapsulation, Inheritance, Polymorphism, Abstraction', 12, NOW()),
('aaaaaaaa-0000-0000-0000-000000000002', 'Cơ sở dữ liệu',             'co-so-du-lieu',             'Database design, SQL, normalization, indexing', 15, NOW()),
('aaaaaaaa-0000-0000-0000-000000000003', 'Mạng máy tính',             'mang-may-tinh',             'TCP/IP, DNS, HTTP, routing protocols', 8, NOW()),
('aaaaaaaa-0000-0000-0000-000000000004', 'Cấu trúc dữ liệu & giải thuật', 'cau-truc-du-lieu-giai-thuat', 'Array, LinkedList, Tree, Graph, Sorting, Searching', 18, NOW()),
('aaaaaaaa-0000-0000-0000-000000000005', 'Hệ điều hành',              'he-dieu-hanh',              'Process, Thread, Memory management, File system', 9, NOW()),
('aaaaaaaa-0000-0000-0000-000000000006', 'Web Development',           'web-development',           'HTML, CSS, JavaScript, framework front-end và back-end', 14, NOW()),
('aaaaaaaa-0000-0000-0000-000000000007', 'Machine Learning',          'machine-learning',          'Supervised, Unsupervised, Neural Networks, Python', 11, NOW()),
('aaaaaaaa-0000-0000-0000-000000000008', 'An toàn thông tin',         'an-toan-thong-tin',         'Cryptography, Network security, Penetration testing', 7, NOW()),
('aaaaaaaa-0000-0000-0000-000000000009', 'Toán rời rạc',              'toan-roi-rac',              'Logic, Set theory, Graph theory, Combinatorics', 10, NOW()),
('aaaaaaaa-0000-0000-0000-000000000010', 'Java',                      'java',                      'Java SE, Spring Boot, JVM, Collections framework', 13, NOW()),
('aaaaaaaa-0000-0000-0000-000000000011', 'Python',                    'python',                    'Python 3, NumPy, Pandas, Flask, Django', 16, NOW()),
('aaaaaaaa-0000-0000-0000-000000000012', 'Nhập môn lập trình',        'nhap-mon-lap-trinh',        'C/C++, thuật toán cơ bản, tư duy lập trình', 20, NOW()),
('aaaaaaaa-0000-0000-0000-000000000013', 'DevOps & Cloud',            'devops-cloud',              'Docker, Kubernetes, CI/CD, AWS, Azure', 6, NOW()),
('aaaaaaaa-0000-0000-0000-000000000014', 'Xác suất thống kê',         'xac-suat-thong-ke',         'Phân phối xác suất, kiểm định giả thuyết, hồi quy', 5, NOW()),
('aaaaaaaa-0000-0000-0000-000000000015', 'Đồ án & Luận văn',          'do-an-luan-van',            'Hướng dẫn làm đồ án tốt nghiệp, luận văn', 9, NOW());


-- =============================================================================
-- DISCUSSIONS
-- =============================================================================
INSERT INTO discussions (id, title, content, post_type, status, author_id, is_anonymous, upvote_count, downvote_count, comment_count, view_count, accepted_comment_id, created_at, updated_at) VALUES

-- ===== Câu hỏi về CSDL =====
('bbbbbbbb-0000-0000-0000-000000000001',
 'Sự khác nhau giữa INNER JOIN và LEFT JOIN trong SQL là gì?',
 E'Mình đang học môn Cơ sở dữ liệu và bị confuse về 2 loại JOIN này.\n\nMình hiểu:\n- **INNER JOIN**: chỉ lấy các bản ghi khớp ở **cả hai bảng**\n- **LEFT JOIN**: lấy tất cả bản ghi bảng trái + bản ghi khớp bên phải (nếu không có thì NULL)\n\nNhưng trong thực tế khi nào nên dùng cái nào? Ví dụ mình có bảng `students` và `grades`, một số sinh viên chưa có điểm thì phải dùng JOIN nào?\n\nCảm ơn mọi người!',
 'question', 'solved',
 '22222222-0000-0000-0000-000000000001', false, 24, 1, 5, 312,
 'cccccccc-0000-0000-0000-000000000001',
 NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days'),

-- ===== Câu hỏi về OOP =====
('bbbbbbbb-0000-0000-0000-000000000002',
 'Interface vs Abstract Class trong Java — khi nào dùng cái nào?',
 E'Mình đang làm bài tập OOP và thầy hỏi tại sao chọn interface thay vì abstract class. Mình không trả lời được.\n\nMình biết:\n- **Interface**: tất cả method đều abstract (trước Java 8), class có thể implement nhiều interface\n- **Abstract class**: có thể có method concrete, chỉ extend được 1 class\n\nNhưng nguyên tắc chọn lựa thực sự là gì? Có rule of thumb nào không ạ?\n\n```java\n// Ví dụ của mình:\npublic interface Flyable {\n    void fly();\n}\n\npublic abstract class Animal {\n    abstract void makeSound();\n    void breathe() { System.out.println("breathing..."); }\n}\n```',
 'question', 'solved',
 '22222222-0000-0000-0000-000000000002', false, 31, 2, 6, 445,
 'cccccccc-0000-0000-0000-000000000006',
 NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days'),

-- ===== Thảo luận Web Dev =====
('bbbbbbbb-0000-0000-0000-000000000003',
 'Next.js 15 vs React SPA — nên chọn gì cho dự án học thuật?',
 E'Mọi người ơi, nhóm mình đang chuẩn bị làm đồ án tốt nghiệp về một hệ thống quản lý nghiên cứu khoa học. Đang phân vân giữa 2 hướng:\n\n**Option 1: Next.js 15 (App Router)**\n- SSR/SSG tốt cho SEO\n- Full-stack trong một project\n- Learning curve cao hơn\n\n**Option 2: React SPA + Express API**\n- Cấu trúc rõ ràng, separation of concerns\n- Quen thuộc hơn\n- Deploy phức tạp hơn\n\nDự án có ~5 người, deadline 4 tháng. Ai có kinh nghiệm làm đồ án tốt nghiệp với Next.js không chia sẻ với mình?',
 'discussion', 'open',
 '22222222-0000-0000-0000-000000000004', false, 18, 3, 7, 267,
 NULL,
 NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),

-- ===== Câu hỏi về giải thuật =====
('bbbbbbbb-0000-0000-0000-000000000004',
 'Tại sao Quicksort có O(n²) worst case nhưng vẫn nhanh hơn Merge Sort trên thực tế?',
 E'Đây là điều mình luôn thắc mắc khi học môn Cấu trúc dữ liệu & Giải thuật.\n\nVề mặt lý thuyết:\n- Quicksort: O(n log n) average, **O(n²) worst case**\n- Merge Sort: **O(n log n) guaranteed**\n\nVậy tại sao trong benchmark thực tế, Quicksort thường nhanh hơn Merge Sort?\n\nMình đoán liên quan đến cache locality nhưng không giải thích được rõ. Thầy/cô hoặc anh/chị nào giải thích giúp mình với ạ!',
 'question', 'solved',
 '22222222-0000-0000-0000-000000000007', false, 42, 0, 5, 589,
 'cccccccc-0000-0000-0000-000000000012',
 NOW() - INTERVAL '18 days', NOW() - INTERVAL '17 days'),

-- ===== Câu hỏi về Mạng máy tính =====
('bbbbbbbb-0000-0000-0000-000000000005',
 'Giải thích 3-way handshake trong TCP cho người mới học?',
 E'Mình đang ôn thi môn Mạng máy tính. Phần 3-way handshake mình đọc sách thấy mô tả là:\n\n1. Client gửi **SYN** (synchronize)\n2. Server trả **SYN-ACK**\n3. Client gửi **ACK**\n\nNhưng mình không hiểu **tại sao** cần 3 bước mà không phải 2 bước? Có thể dùng 2-way handshake không?\n\nVà sequence number sinh ra ở đây để làm gì?\n\nCảm ơn mọi người trước nha!',
 'question', 'open',
 '22222222-0000-0000-0000-000000000010', false, 15, 1, 4, 198,
 NULL,
 NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),

-- ===== Thảo luận về AI/ML =====
('bbbbbbbb-0000-0000-0000-000000000006',
 'Kinh nghiệm học Machine Learning từ đầu — lộ trình nào hiệu quả nhất?',
 E'Xin chào cả nhà! Mình là sinh viên năm 3, muốn bắt đầu học ML/AI nghiêm túc.\n\nHiện tại mình đã có:\n- Python cơ bản\n- Đại số tuyến tính (biết matrix operations)\n- Xác suất thống kê cơ bản\n\n**Mình đang cân nhắc 2 lộ trình:**\n\n**Lộ trình A: Theory-first**\n1. Andrew Ng ML Course (Coursera)\n2. Deep Learning Specialization\n3. Sau đó làm project\n\n**Lộ trình B: Project-first**\n1. Fast.ai practical course\n2. Làm project ngay\n3. Bổ sung theory theo nhu cầu\n\nAi đã học qua cả hai hướng thì cho mình biết pros/cons với?\n\n*P/S: Mục tiêu của mình là research ML cho luận văn tốt nghiệp.*',
 'discussion', 'open',
 '22222222-0000-0000-0000-000000000003', false, 27, 2, 8, 401,
 NULL,
 NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),

-- ===== Câu hỏi về Hệ điều hành =====
('bbbbbbbb-0000-0000-0000-000000000007',
 'Deadlock là gì? Điều kiện cần và đủ để xảy ra deadlock?',
 E'Đang ôn thi Hệ điều hành, phần deadlock. Mình đọc được 4 điều kiện Coffman:\n\n1. **Mutual Exclusion**: resource chỉ dùng được bởi 1 process tại một thời điểm\n2. **Hold and Wait**: process đang giữ resource này mà chờ resource khác\n3. **No Preemption**: không thể ép buộc lấy lại resource từ process\n4. **Circular Wait**: tồn tại vòng tròn chờ đợi giữa các process\n\n**Câu hỏi của mình:**\n- 4 điều kiện này là cần hay đủ để xảy ra deadlock?\n- Nếu chỉ cần phá vỡ 1 trong 4, phá điều kiện nào dễ nhất trong thực tế?\n- Ví dụ thực tế về deadlock trong database?',
 'question', 'solved',
 '22222222-0000-0000-0000-000000000009', false, 19, 0, 4, 287,
 'cccccccc-0000-0000-0000-000000000018',
 NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days'),

-- ===== Câu hỏi về Nhập môn lập trình =====
('bbbbbbbb-0000-0000-0000-000000000008',
 'Con trỏ trong C — mình bị lẫn lộn giữa *ptr và &variable',
 E'Xin chào mọi người, mình là sinh viên năm 1 đang học C. Phần con trỏ làm mình khá confused.\n\nMình không hiểu tại sao code này lại hoạt động:\n\n```c\nint x = 10;\nint *ptr = &x;  // ptr lưu địa chỉ của x\nprintf("%d", *ptr);  // in ra 10\n*ptr = 20;  // thay đổi giá trị x\nprintf("%d", x);  // in ra 20\n```\n\nCụ thể mình thắc mắc:\n1. `&x` là địa chỉ của x, `*ptr` là giá trị tại địa chỉ ptr trỏ đến — mình hiểu đúng không?\n2. Khi nào dùng `ptr` vs `*ptr` vs `&ptr`?\n3. Tại sao cần con trỏ khi đã có biến bình thường?\n\nCảm ơn mọi người nhiều lắm ạ 🙏',
 'question', 'solved',
 '22222222-0000-0000-0000-000000000006', false, 35, 1, 6, 502,
 'cccccccc-0000-0000-0000-000000000022',
 NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),

-- ===== Thảo luận về An toàn thông tin =====
('bbbbbbbb-0000-0000-0000-000000000009',
 'SQL Injection vẫn còn phổ biến năm 2025? Cách phòng chống hiệu quả?',
 E'Mình vừa đọc một báo cáo bảo mật nói SQL Injection vẫn nằm trong top 10 lỗ hổng phổ biến nhất (OWASP Top 10).\n\nMình nghĩ với các ORM hiện đại thì SQLi đã "die" rồi, nhưng hóa ra không phải.\n\n**Theo mọi người:**\n1. Tại sao SQLi vẫn còn phổ biến dù đã biết từ lâu?\n2. Parameterized query có đủ để phòng chống không?\n3. Có trường hợp nào parameterized query vẫn bị bypass không?\n\n**Đây là ví dụ vulnerable code mình gặp trong dự án cũ:**\n```python\n# Vulnerable!\nquery = f"SELECT * FROM users WHERE username = \'{username}\'"\n\n# Secure\ncursor.execute("SELECT * FROM users WHERE username = %s", (username,))\n```\n\nAi có kinh nghiệm pentesting không, chia sẻ góc nhìn thực tế với!',
 'discussion', 'open',
 '22222222-0000-0000-0000-000000000013', false, 22, 1, 5, 334,
 NULL,
 NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),

-- ===== Câu hỏi về Python =====
('bbbbbbbb-0000-0000-0000-000000000010',
 'Python list comprehension vs for loop — khi nào dùng cái nào?',
 E'Mình hay thấy code Python dùng list comprehension nhưng không biết khi nào nên dùng.\n\nVí dụ:\n```python\n# For loop\nsquares = []\nfor x in range(10):\n    squares.append(x**2)\n\n# List comprehension\nsquares = [x**2 for x in range(10)]\n\n# Nested (có vẻ khó đọc hơn?)\nmatrix = [[i*j for j in range(3)] for i in range(3)]\n```\n\n**Câu hỏi:**\n1. List comprehension có nhanh hơn for loop không?\n2. Nested list comprehension — có nên dùng không hay quá khó đọc?\n3. Có rule nào về khi nào nên ưu tiên readability vs performance không?\n\nMình đang học Python cho môn Machine Learning nên muốn code "Pythonic" hơn.',
 'question', 'open',
 '22222222-0000-0000-0000-000000000012', false, 13, 0, 3, 175,
 NULL,
 NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

-- ===== Thảo luận về CSDL nâng cao =====
('bbbbbbbb-0000-0000-0000-000000000011',
 'NoSQL vs SQL — Khi nào nên chọn MongoDB thay vì PostgreSQL?',
 E'Nhóm mình đang thiết kế database cho đồ án và đang tranh luận về NoSQL vs SQL.\n\n**Một bạn trong nhóm đề xuất dùng MongoDB** vì:\n- Schema flexible\n- Horizontal scaling dễ hơn\n- JSON native\n\n**Mình muốn dùng PostgreSQL** vì:\n- ACID transactions\n- Complex queries với JOIN\n- Đã học ở trường nên quen hơn\n\nDự án là hệ thống quản lý điểm và học phần cho sinh viên — dữ liệu có quan hệ chặt chẽ.\n\nMọi người có kinh nghiệm thực tế với cả hai, cho mình lời khuyên với?',
 'discussion', 'open',
 '22222222-0000-0000-0000-000000000005', false, 16, 2, 6, 253,
 NULL,
 NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),

-- ===== Câu hỏi về Java/Spring =====
('bbbbbbbb-0000-0000-0000-000000000012',
 'Spring Boot @Transactional — tại sao rollback không hoạt động?',
 E'Mình đang làm project Spring Boot và gặp vấn đề với @Transactional.\n\n```java\n@Service\npublic class OrderService {\n    @Transactional\n    public void createOrder(OrderDto dto) {\n        orderRepo.save(order);  // step 1\n        inventoryService.deductStock(dto);  // step 2 — throws exception\n        // Mình expect: nếu step 2 fail, step 1 bị rollback\n        // Thực tế: step 1 vẫn được commit ???\n    }\n}\n```\n\nMình đã debug và thấy `inventoryService.deductStock()` throw `RuntimeException` nhưng order vẫn bị save.\n\n**Ai biết tại sao không?** Mình đã kiểm tra:\n- `@EnableTransactionManagement` đã có trong config\n- `@Transactional` annotation đặt đúng chỗ\n- Exception là RuntimeException (không phải checked)',
 'question', 'open',
 '22222222-0000-0000-0000-000000000011', false, 8, 0, 4, 142,
 NULL,
 NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

-- ===== Thảo luận về Đồ án =====
('bbbbbbbb-0000-0000-0000-000000000013',
 'Kinh nghiệm chọn đề tài đồ án tốt nghiệp — tránh những sai lầm mình đã mắc',
 E'Chào mọi người! Mình vừa bảo vệ đồ án xong, điểm A. Muốn chia sẻ kinh nghiệm để các em năm dưới tránh vết xe đổ.\n\n**Những sai lầm phổ biến khi chọn đề tài:**\n\n**1. Chọn đề tài quá rộng**\n"Xây dựng hệ thống AI cho giáo dục" → không thể hoàn thành trong 1 semester\n\n**2. Chọn đề tài không có novelty**\nLàm lại những thứ đã có sẵn (CRUD app) → giám khảo sẽ hỏi khó\n\n**3. Không xác định scope sớm**\nMình mất 2 tháng đầu không biết mình đang làm gì\n\n**Tips thực tế:**\n- Đọc 5-10 paper liên quan trước khi chốt đề tài\n- Nói chuyện với thầy hướng dẫn ít nhất 1 lần/tuần\n- Demo được MVP sau tháng đầu tiên\n- Viết báo cáo song song với code, đừng để cuối\n\nMọi người có câu hỏi gì thì hỏi mình nha!',
 'discussion', 'open',
 '22222222-0000-0000-0000-000000000014', false, 56, 0, 7, 712,
 NULL,
 NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

-- ===== Câu hỏi về DevOps =====
('bbbbbbbb-0000-0000-0000-000000000014',
 'Docker container bị lỗi "Cannot connect to the Docker daemon" khi chạy trong CI/CD',
 E'Mình đang setup GitHub Actions để build và push Docker image. Pipeline bị lỗi ở bước `docker build`:\n\n```\nERROR: Cannot connect to the Docker daemon at unix:///var/run/docker.sock.\nIs the docker daemon running?\n```\n\nYAML config của mình:\n```yaml\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - name: Build image\n        run: docker build -t myapp .\n```\n\nMình không hiểu tại sao lại lỗi vì trên máy local chạy bình thường. Ai có kinh nghiệm với GitHub Actions Docker chỉ mình với?',
 'question', 'open',
 '22222222-0000-0000-0000-000000000008', false, 7, 0, 3, 98,
 NULL,
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

-- ===== Thảo luận về Toán rời rạc =====
('bbbbbbbb-0000-0000-0000-000000000015',
 'Ứng dụng thực tế của Toán rời rạc trong lập trình — mọi người thấy môn này có cần thiết không?',
 E'Mình đang học môn Toán rời rạc và thật sự không thấy nó liên quan gì đến lập trình.\n\nMôn học bao gồm: logic mệnh đề, lý thuyết tập hợp, quan hệ, đồ thị, tổ hợp...\n\n**Mình đọc được một số ứng dụng nhưng vẫn mơ hồ:**\n- Graph theory → algorithm pathfinding (Dijkstra, BFS, DFS)\n- Logic → boolean algebra trong chip design\n- Combinatorics → complexity analysis\n\nNhưng trong công việc thực tế hàng ngày của một developer, mình có dùng Toán rời rạc không? Hay chỉ cần biết cơ bản?\n\nAnh/chị nào đã đi làm cho mình biết với!',
 'discussion', 'open',
 '22222222-0000-0000-0000-000000000015', false, 14, 3, 5, 221,
 NULL,
 NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

-- ===== Câu hỏi về ML =====
('bbbbbbbb-0000-0000-0000-000000000016',
 'Overfitting trong Neural Network — cách detect và xử lý như thế nào?',
 E'Mình đang train một CNN để classify ảnh X-quang cho đồ án. Mô hình đang bị overfitting khá nặng:\n\n- Training accuracy: **98.5%**\n- Validation accuracy: **72.3%**\n- Training loss: 0.05\n- Validation loss: 0.89\n\nGap quá lớn. Mình đã thử:\n- Giảm model complexity (bớt layers)\n- Tăng dropout từ 0.2 lên 0.5\n- Data augmentation (flip, rotate, zoom)\n\nNhưng validation accuracy vẫn chỉ lên được 76-77%.\n\n**Dataset của mình:** 1200 ảnh train, 300 validation (có thể đây là vấn đề?)\n\nAi có kinh nghiệm xử lý overfitting với dataset nhỏ trong medical imaging thì chia sẻ với mình!',
 'question', 'open',
 '22222222-0000-0000-0000-000000000003', false, 11, 0, 4, 163,
 NULL,
 NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

-- ===== Thông báo từ giảng viên =====
('bbbbbbbb-0000-0000-0000-000000000017',
 '[Thông báo] Lịch thi giữa kỳ môn Cơ sở dữ liệu — HK1 2025-2026',
 E'**Thông báo chính thức từ Bộ môn Hệ thống thông tin**\n\nLịch thi giữa kỳ môn **Cơ sở dữ liệu (INT2204)** học kỳ 1 năm học 2025-2026:\n\n| Lớp | Ngày thi | Giờ | Phòng |\n|-----|----------|-----|-------|\n| INT2204 1 | 15/10/2025 | 7:30 | B1-101 |\n| INT2204 2 | 15/10/2025 | 9:30 | B1-103 |\n| INT2204 3 | 16/10/2025 | 7:30 | B2-201 |\n\n**Hình thức thi:** Viết tay, đề mở (được mang tài liệu không quá 5 trang A4 tự viết tay)\n\n**Nội dung:**\n- Mô hình ER\n- Mô hình quan hệ\n- SQL cơ bản (SELECT, JOIN, GROUP BY)\n- Chuẩn hóa (1NF, 2NF, 3NF)\n\nSinh viên cần mang theo thẻ sinh viên. Đến muộn quá 15 phút không được vào thi.\n\n*Chúc các em ôn tập tốt!*',
 'discussion', 'open',
 '11111111-0000-0000-0000-000000000002', false, 8, 0, 3, 534,
 NULL,
 NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),

-- ===== Câu hỏi ẩn danh =====
('bbbbbbbb-0000-0000-0000-000000000018',
 'Thật sự cần học thuộc lòng công thức toán để qua môn XSTK không?',
 E'Mình cảm thấy môn Xác suất thống kê rất khó vì có quá nhiều công thức cần nhớ.\n\nĐặc biệt là phần:\n- Các phân phối xác suất (chuẩn, Poisson, nhị thức, mũ...)\n- Công thức kiểm định (t-test, chi-square, ANOVA)\n- Khoảng tin cậy\n\nMình hỏi thật là trong bài thi có được tra cứu công thức không, hay phải nhớ hết?\n\nVà quan trọng hơn — **học môn này để làm gì** khi mình học ngành CNTT? Mình thấy bạn bè học ngành khác cũng học y hệt...\n\n*(Mình hỏi ẩn danh vì sợ bị judge 😅)*',
 'question', 'open',
 '22222222-0000-0000-0000-000000000006', true, 28, 4, 5, 389,
 NULL,
 NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),

-- ===== Thêm bài mới =====
('bbbbbbbb-0000-0000-0000-000000000019',
 'Tài nguyên học Git/GitHub cho người mới — tổng hợp',
 E'Mình tổng hợp các tài nguyên học Git mình thấy hữu ích nhất, chia sẻ cho mọi người:\n\n**Tài liệu chính thức:**\n- [Pro Git book](https://git-scm.com/book/en/v2) — miễn phí, rất chi tiết\n- [GitHub Docs](https://docs.github.com) — best practices, CI/CD\n\n**Interactive learning:**\n- [Learn Git Branching](https://learngitbranching.js.org/) — visualize branches trực quan nhất\n- [Oh My Git!](https://ohmygit.org/) — game học Git\n\n**Workflow thực tế cho sinh viên:**\n```bash\n# Luôn luôn tạo branch mới trước khi làm feature\ngit checkout -b feature/ten-tinh-nang\n\n# Commit thường xuyên với message rõ ràng\ngit commit -m "feat: thêm chức năng đăng nhập"\n\n# Đừng bao giờ force push lên main\ngit push origin feature/ten-tinh-nang\n```\n\n**Mọi người có tài nguyên nào hay khác không?** Comment bên dưới nha!',
 'discussion', 'open',
 '22222222-0000-0000-0000-000000000007', false, 33, 0, 4, 448,
 NULL,
 NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

('bbbbbbbb-0000-0000-0000-000000000020',
 'Hiểu đúng về Big O Notation — tại sao O(2n) = O(n)?',
 E'Mình đang học phân tích thuật toán và bị confuse về Big O.\n\nThầy nói O(2n) = O(n) và O(n² + n) = O(n²) nhưng mình không hiểu tại sao.\n\nNếu một thuật toán chạy 2n bước và thuật toán khác chạy n bước, rõ ràng cái đầu chậm hơn 2 lần — tại sao lại cùng là O(n)?\n\n**Mình hiểu được:**\n- O(1) < O(log n) < O(n) < O(n log n) < O(n²)\n\n**Mình chưa hiểu:**\n- Tại sao bỏ constant factor?\n- Khi nào constant factor lại quan trọng trong thực tế?\n- O(n) và O(2n) khác nhau ở đâu khi n rất lớn?\n\nNhờ mọi người giải thích giúp, càng đơn giản càng tốt!',
 'question', 'open',
 '22222222-0000-0000-0000-000000000015', false, 9, 0, 2, 131,
 NULL,
 NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours');


-- =============================================================================
-- DISCUSSION_TAGS (mapping)
-- =============================================================================
INSERT INTO discussion_tags (discussion_id, tag_id) VALUES
('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002'),
('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001'),
('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000010'),
('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000006'),
('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000015'),
('bbbbbbbb-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000004'),
('bbbbbbbb-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000003'),
('bbbbbbbb-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000007'),
('bbbbbbbb-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000011'),
('bbbbbbbb-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000005'),
('bbbbbbbb-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000012'),
('bbbbbbbb-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000008'),
('bbbbbbbb-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000002'),
('bbbbbbbb-0000-0000-0000-000000000010', 'aaaaaaaa-0000-0000-0000-000000000011'),
('bbbbbbbb-0000-0000-0000-000000000011', 'aaaaaaaa-0000-0000-0000-000000000002'),
('bbbbbbbb-0000-0000-0000-000000000012', 'aaaaaaaa-0000-0000-0000-000000000010'),
('bbbbbbbb-0000-0000-0000-000000000013', 'aaaaaaaa-0000-0000-0000-000000000015'),
('bbbbbbbb-0000-0000-0000-000000000014', 'aaaaaaaa-0000-0000-0000-000000000013'),
('bbbbbbbb-0000-0000-0000-000000000015', 'aaaaaaaa-0000-0000-0000-000000000009'),
('bbbbbbbb-0000-0000-0000-000000000016', 'aaaaaaaa-0000-0000-0000-000000000007'),
('bbbbbbbb-0000-0000-0000-000000000017', 'aaaaaaaa-0000-0000-0000-000000000002'),
('bbbbbbbb-0000-0000-0000-000000000018', 'aaaaaaaa-0000-0000-0000-000000000014'),
('bbbbbbbb-0000-0000-0000-000000000019', 'aaaaaaaa-0000-0000-0000-000000000006'),
('bbbbbbbb-0000-0000-0000-000000000020', 'aaaaaaaa-0000-0000-0000-000000000004');


-- =============================================================================
-- COMMENTS
-- =============================================================================
INSERT INTO comments (id, discussion_id, author_id, content, parent_comment_id, is_anonymous, upvote_count, downvote_count, created_at, updated_at) VALUES

-- ===== Bài 1: INNER JOIN vs LEFT JOIN =====
('cccccccc-0000-0000-0000-000000000001',
 'bbbbbbbb-0000-0000-0000-000000000001',
 '11111111-0000-0000-0000-000000000002',
 E'Bạn hiểu đúng rồi! Để rõ hơn:\n\n**INNER JOIN** — chỉ giữ lại hàng có match ở CẢ HAI bảng:\n```sql\nSELECT s.name, g.score\nFROM students s\nINNER JOIN grades g ON s.id = g.student_id;\n-- Kết quả: chỉ sinh viên ĐÃ có điểm\n```\n\n**LEFT JOIN** — giữ TẤT CẢ hàng bảng trái, bảng phải NULL nếu không match:\n```sql\nSELECT s.name, g.score\nFROM students s\nLEFT JOIN grades g ON s.id = g.student_id;\n-- Kết quả: TẤT CẢ sinh viên, score = NULL nếu chưa có điểm\n```\n\n**Với bài toán của bạn** (muốn thấy cả sinh viên chưa có điểm): **dùng LEFT JOIN**.\n\nRule of thumb: nếu bạn hỏi "tôi muốn tất cả bản ghi của bảng X, dù có hay không có data liên quan" → LEFT JOIN.',
 NULL, false, 18, 0, NOW() - INTERVAL '29 days 20 hours', NOW() - INTERVAL '29 days 20 hours'),

('cccccccc-0000-0000-0000-000000000002',
 'bbbbbbbb-0000-0000-0000-000000000001',
 '22222222-0000-0000-0000-000000000007',
 E'Thêm một tip thực tế: khi dùng LEFT JOIN mà muốn lọc ra **chỉ những bản ghi KHÔNG có match**, dùng `WHERE bảng_phải.id IS NULL`:\n\n```sql\n-- Tìm sinh viên CHƯA có điểm nào\nSELECT s.name\nFROM students s\nLEFT JOIN grades g ON s.id = g.student_id\nWHERE g.student_id IS NULL;\n```\n\nĐây gọi là "Anti-join", rất hữu ích khi làm báo cáo!',
 'cccccccc-0000-0000-0000-000000000001', false, 12, 0, NOW() - INTERVAL '29 days 18 hours', NOW() - INTERVAL '29 days 18 hours'),

('cccccccc-0000-0000-0000-000000000003',
 'bbbbbbbb-0000-0000-0000-000000000001',
 '22222222-0000-0000-0000-000000000001',
 E'Cảm ơn cô và anh nhiều lắm! Mình đã hiểu rồi. Anti-join là kỹ thuật mình chưa biết, cảm ơn anh @minhtuan_ptit nha!',
 'cccccccc-0000-0000-0000-000000000001', false, 3, 0, NOW() - INTERVAL '29 days 10 hours', NOW() - INTERVAL '29 days 10 hours'),

('cccccccc-0000-0000-0000-000000000004',
 'bbbbbbbb-0000-0000-0000-000000000001',
 '11111111-0000-0000-0000-000000000001',
 E'Bổ sung thêm: performance-wise, **INNER JOIN thường nhanh hơn LEFT JOIN** vì optimizer có thể loại bỏ nhiều hàng sớm hơn. Trong bài kiểm tra, nếu đề không yêu cầu rõ "tất cả bản ghi", hãy dùng INNER JOIN để tối ưu.',
 NULL, false, 8, 0, NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days'),

('cccccccc-0000-0000-0000-000000000005',
 'bbbbbbbb-0000-0000-0000-000000000001',
 '22222222-0000-0000-0000-000000000004',
 E'Ngoài ra còn có RIGHT JOIN (ngược của LEFT JOIN) và FULL OUTER JOIN (lấy tất cả từ cả hai bảng). Nhưng trong thực tế mình ít thấy dùng RIGHT JOIN — người ta thường đổi thứ tự bảng và dùng LEFT JOIN cho dễ đọc hơn.',
 NULL, false, 6, 0, NOW() - INTERVAL '27 days', NOW() - INTERVAL '27 days'),

-- ===== Bài 2: Interface vs Abstract Class =====
('cccccccc-0000-0000-0000-000000000006',
 'bbbbbbbb-0000-0000-0000-000000000002',
 '11111111-0000-0000-0000-000000000001',
 E'Câu hỏi rất hay! Đây là rule mình dạy sinh viên:\n\n**Dùng Interface khi:**\n- Muốn định nghĩa một "khả năng" (capability/behavior): `Flyable`, `Serializable`, `Comparable`\n- Một class cần implement nhiều "khả năng" khác nhau\n- Không có shared state giữa các implementor\n\n**Dùng Abstract Class khi:**\n- Có "is-a" relationship: `Dog is-a Animal`\n- Muốn share code (method implementations) giữa subclasses\n- Có template method pattern — định nghĩa skeleton của algorithm\n\n**Java 8+ lưu ý:** Interface có thể có `default` method, nên ranh giới mờ hơn. Nhưng nguyên tắc trên vẫn đúng về mặt design.',
 NULL, false, 22, 0, NOW() - INTERVAL '24 days 22 hours', NOW() - INTERVAL '24 days 22 hours'),

('cccccccc-0000-0000-0000-000000000007',
 'bbbbbbbb-0000-0000-0000-000000000002',
 '22222222-0000-0000-0000-000000000013',
 E'Thêm góc nhìn về SOLID: Interface liên quan đến **Interface Segregation Principle** (I trong SOLID) và **Dependency Inversion Principle** (D).\n\nNếu bạn code theo DIP, bạn sẽ luôn depend on abstractions (interfaces), không depend on concrete classes. Điều này giúp unit test dễ hơn nhiều vì bạn có thể mock interface.',
 'cccccccc-0000-0000-0000-000000000006', false, 9, 0, NOW() - INTERVAL '24 days 20 hours', NOW() - INTERVAL '24 days 20 hours'),

('cccccccc-0000-0000-0000-000000000008',
 'bbbbbbbb-0000-0000-0000-000000000002',
 '22222222-0000-0000-0000-000000000002',
 E'Cảm ơn thầy và anh Khánh Toàn! Giờ mình hiểu rồi. Câu trả lời của thầy là câu mình sẽ trả lời thầy trong lớp 😄\n\nMình mark câu trả lời của thầy là accepted nhé!',
 'cccccccc-0000-0000-0000-000000000006', false, 5, 0, NOW() - INTERVAL '24 days 18 hours', NOW() - INTERVAL '24 days 18 hours'),

('cccccccc-0000-0000-0000-000000000009',
 'bbbbbbbb-0000-0000-0000-000000000002',
 '22222222-0000-0000-0000-000000000009',
 E'Một ví dụ thực tế dễ nhớ:\n- `List`, `Map`, `Set` → Interface (chỉ định nghĩa behavior)\n- `AbstractList`, `AbstractMap` → Abstract class (shared implementation)\n- `ArrayList`, `HashMap` → Concrete class\n\nJava Collections Framework là ví dụ kinh điển về cách phối hợp cả hai!',
 NULL, false, 11, 0, NOW() - INTERVAL '24 days 15 hours', NOW() - INTERVAL '24 days 15 hours'),

('cccccccc-0000-0000-0000-000000000010',
 'bbbbbbbb-0000-0000-0000-000000000002',
 '22222222-0000-0000-0000-000000000005',
 E'@ngocmai_ptit Ví dụ của bạn rất hay! Mình sẽ nhớ cái này. Collections Framework thật sự là textbook example cho OOP design.',
 'cccccccc-0000-0000-0000-000000000009', false, 4, 0, NOW() - INTERVAL '24 days 12 hours', NOW() - INTERVAL '24 days 12 hours'),

-- ===== Bài 3: Next.js vs React SPA =====
('cccccccc-0000-0000-0000-000000000011',
 'bbbbbbbb-0000-0000-0000-000000000003',
 '22222222-0000-0000-0000-000000000011',
 E'Mình vừa làm đồ án với Next.js 14 App Router, chia sẻ kinh nghiệm thực tế:\n\n**Pros của Next.js:**\n- File-based routing tiện lợi\n- Server Components giảm bundle size đáng kể\n- Vercel deploy 1 click, free tier đủ dùng\n\n**Cons thực tế:**\n- Debugging khó hơn (boundary server/client component confusing)\n- Mình mất 1 tuần đầu chỉ để hiểu App Router\n- Team 5 người cần sync về conventions, không thì loạn\n\n**Kết luận của mình:** Nếu team có ít nhất 1-2 người đã biết Next.js, **go for it**. Nếu tất cả đều mới, bắt đầu với React SPA an toàn hơn để tránh mất time vào framework issues.',
 NULL, false, 14, 1, NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days'),

-- ===== Bài 4: Quicksort vs Merge Sort =====
('cccccccc-0000-0000-0000-000000000012',
 'bbbbbbbb-0000-0000-0000-000000000004',
 '11111111-0000-0000-0000-000000000001',
 E'Câu hỏi tuyệt vời, đây là topic mình rất thích!\n\n**Lý do Quicksort nhanh hơn trong thực tế:**\n\n**1. Cache Locality (quan trọng nhất)**\nQuicksort làm việc in-place → truy cập các phần tử liền kề trong memory → CPU cache hit rate cao. Merge Sort cần allocate memory phụ, nhiều cache miss hơn.\n\n**2. Constant Factor thực tế**\nCả hai đều O(n log n) average, nhưng constant factor của Quicksort nhỏ hơn. "Big O hides constants" — trong thực tế O(n log n) với c=1 nhanh hơn O(n log n) với c=3.\n\n**3. Average case quan trọng hơn worst case**\nVới random data, Quicksort gần như không bao giờ hit O(n²). Modern implementations dùng 3-way partition và median-of-3 pivot để tránh worst case.\n\n**Khi nào nên dùng Merge Sort:**\n- Cần stable sort\n- Dữ liệu quá lớn không fit vào RAM (external sorting)\n- Linked list (merge sort natural, quicksort khó)',
 NULL, false, 35, 0, NOW() - INTERVAL '17 days 22 hours', NOW() - INTERVAL '17 days 22 hours'),

('cccccccc-0000-0000-0000-000000000013',
 'bbbbbbbb-0000-0000-0000-000000000004',
 '22222222-0000-0000-0000-000000000003',
 E'Thêm: Python `sort()` dùng **Timsort** — hybrid của Merge Sort và Insertion Sort. Java `Arrays.sort()` với primitive dùng Dual-Pivot Quicksort, với Object dùng Timsort (cần stable sort vì object có thể equal).\n\nTức là cả hai đều "win" ở một số trường hợp, nên các standard library dùng hybrid approach!',
 'cccccccc-0000-0000-0000-000000000012', false, 16, 0, NOW() - INTERVAL '17 days 20 hours', NOW() - INTERVAL '17 days 20 hours'),

('cccccccc-0000-0000-0000-000000000014',
 'bbbbbbbb-0000-0000-0000-000000000004',
 '22222222-0000-0000-0000-000000000007',
 E'Cảm ơn thầy An và anh Minh Tuấn! Câu trả lời của thầy giải thích rất chi tiết. Phần cache locality mình chưa nghĩ đến bao giờ, rất interesting!\n\nMình sẽ tìm hiểu thêm về memory hierarchy sau bài này.',
 NULL, false, 4, 0, NOW() - INTERVAL '17 days 15 hours', NOW() - INTERVAL '17 days 15 hours'),

-- ===== Bài 5: TCP 3-way handshake =====
('cccccccc-0000-0000-0000-000000000015',
 'bbbbbbbb-0000-0000-0000-000000000005',
 '11111111-0000-0000-0000-000000000003',
 E'Câu hỏi hay về networking!\n\n**Tại sao cần 3 bước, không phải 2:**\n\nMục đích của handshake là cả hai bên **đều xác nhận** được khả năng gửi VÀ nhận của nhau:\n\n```\nClient → SYN       → Server   (Client: "Tôi muốn kết nối, seq=x")\nClient ← SYN-ACK  ← Server   (Server: "OK, tôi nhận được, seq=y, ack=x+1")\nClient → ACK       → Server   (Client: "Tôi nhận được phản hồi của bạn, ack=y+1")\n```\n\nNếu chỉ 2 bước (SYN + SYN-ACK): **Client biết Server đang hoạt động, nhưng Server chưa biết Client có nhận được SYN-ACK không!**\n\n**Sequence numbers dùng để:**\n- Sắp xếp lại packets đến sai thứ tự\n- Phát hiện packets bị mất (để retransmit)\n- Chống replay attack cơ bản',
 NULL, false, 12, 0, NOW() - INTERVAL '14 days 22 hours', NOW() - INTERVAL '14 days 22 hours'),

('cccccccc-0000-0000-0000-000000000016',
 'bbbbbbbb-0000-0000-0000-000000000005',
 '22222222-0000-0000-0000-000000000008',
 E'Bổ sung: lý do 2-way handshake không đủ còn liên quan đến **half-open connection problem**.\n\nNếu SYN đầu tiên bị delay (network congestion), client có thể timeout và gửi SYN mới. SYN cũ đến được server, server gửi SYN-ACK. Client đã không còn nhớ connection này → server allocate resources cho một connection ma mà không ai dùng.\n\n3-way handshake giải quyết điều này vì server chỉ fully establish connection sau khi nhận ACK cuối.',
 'cccccccc-0000-0000-0000-000000000015', false, 8, 0, NOW() - INTERVAL '14 days 20 hours', NOW() - INTERVAL '14 days 20 hours'),

-- ===== Bài 6: ML Learning Path =====
('cccccccc-0000-0000-0000-000000000017',
 'bbbbbbbb-0000-0000-0000-000000000006',
 '11111111-0000-0000-0000-000000000004',
 E'Với background của bạn (Python + Linear Algebra + Probability), mình khuyên **Lộ trình A nhưng có điều chỉnh**:\n\n1. **Andrew Ng ML Course** — vẫn là tốt nhất để build intuition\n2. **Làm project nhỏ ngay sau mỗi module** — không đợi học xong mới làm\n3. **Fast.ai** sau khi có foundation — để học "modern" deep learning approach\n\n**Với mục tiêu research cho luận văn**, bạn cần biết đọc paper. Recommend:\n- [Papers With Code](https://paperswithcode.com/) — tìm paper có code\n- Bắt đầu với survey papers thay vì papers gốc\n- Implement lại một paper đơn giản là cách học hiệu quả nhất\n\nTránh "tutorial hell" — học xong tutorial này sang tutorial khác mà không làm gì. **Chọn 1 project và làm đến cùng.**',
 NULL, false, 19, 0, NOW() - INTERVAL '13 days 22 hours', NOW() - INTERVAL '13 days 22 hours'),

-- ===== Bài 7: Deadlock =====
('cccccccc-0000-0000-0000-000000000018',
 'bbbbbbbb-0000-0000-0000-000000000007',
 '11111111-0000-0000-0000-000000000001',
 E'**4 điều kiện Coffman là điều kiện CẦN VÀ ĐỦ** cho deadlock. Thiếu bất kỳ 1 điều kiện nào → deadlock không thể xảy ra.\n\n**Phá điều kiện nào dễ nhất trong thực tế:**\n\n| Điều kiện | Cách phá | Khả thi? |\n|-----------|----------|----------|\n| Mutual Exclusion | Dùng read-only resources | Khó — nhiều resource cần exclusive |\n| Hold and Wait | Request tất cả resources trước | Khó — waste resources |\n| No Preemption | Cho phép OS lấy lại resource | Khó với một số resource |\n| **Circular Wait** | **Đánh số thứ tự resource, luôn request theo thứ tự** | **Dễ nhất!** |\n\n**Ví dụ deadlock trong database:**\n```sql\n-- Transaction 1            -- Transaction 2\nLOCK TABLE orders;          LOCK TABLE inventory;\n-- chờ inventory...         -- chờ orders...\nLOCK TABLE inventory;       LOCK TABLE orders;\n-- DEADLOCK!\n```\nDatabase engine (PostgreSQL, MySQL) auto-detect và rollback một trong hai transaction.',
 NULL, false, 15, 0, NOW() - INTERVAL '11 days 22 hours', NOW() - INTERVAL '11 days 22 hours'),

-- ===== Bài 8: Con trỏ trong C =====
('cccccccc-0000-0000-0000-000000000019',
 'bbbbbbbb-0000-0000-0000-000000000008',
 '11111111-0000-0000-0000-000000000003',
 E'Con trỏ là phần khó nhất của C, đừng lo nếu confuse lúc đầu!\n\n**Cách nhớ đơn giản:**\n- `&x` → "địa chỉ của x" (ampersand = address)\n- `*ptr` → "giá trị TẠI địa chỉ mà ptr trỏ đến" (dereference)\n- `ptr` → bản thân địa chỉ đang được lưu trong ptr\n\n**Bạn hiểu đúng rồi!** Tóm lại:\n```c\nint x = 10;\nint *ptr = &x;  // ptr = địa chỉ 0x1234 (ví dụ)\n\n// ptr   → 0x1234 (địa chỉ)\n// *ptr  → 10 (giá trị tại 0x1234)\n// &ptr  → 0x5678 (địa chỉ của biến ptr, ít dùng)\n```\n\n**Tại sao cần con trỏ:**\n1. **Pass by reference** — thay đổi biến trong function\n2. **Dynamic memory** — `malloc`/`free`\n3. **Array & String** — array thực ra là pointer\n4. **Data structures** — Linked List, Tree cần pointer',
 NULL, false, 28, 0, NOW() - INTERVAL '9 days 22 hours', NOW() - INTERVAL '9 days 22 hours'),

('cccccccc-0000-0000-0000-000000000020',
 'bbbbbbbb-0000-0000-0000-000000000008',
 '22222222-0000-0000-0000-000000000009',
 E'Một cách visualize dễ hiểu:\n\nHãy tưởng tượng memory là dãy các ô nhớ được đánh số (địa chỉ):\n```\nĐịa chỉ:  1000  1001  1002  1003\nGiá trị:  [ 10 ] [  ? ] [1000] [  ? ]\n           ^x            ^ptr\n```\n- `x` ở địa chỉ 1000, giá trị = 10\n- `ptr` ở địa chỉ 1002, giá trị = 1000 (lưu địa chỉ của x)\n- `*ptr` = giá trị tại địa chỉ 1000 = 10\n\nNhìn vào hình này mà hiểu pointer là "ô nhớ lưu địa chỉ của ô nhớ khác"!',
 NULL, false, 17, 0, NOW() - INTERVAL '9 days 20 hours', NOW() - INTERVAL '9 days 20 hours'),

('cccccccc-0000-0000-0000-000000000021',
 'bbbbbbbb-0000-0000-0000-000000000008',
 '22222222-0000-0000-0000-000000000006',
 E'Ôi cảm ơn thầy Cường và anh Bách Long nhiều lắm ạ!\n\nCách visualize của anh giúp mình "à há" luôn 💡 Hóa ra mình chỉ cần nhớ pointer là "ô nhớ lưu địa chỉ của ô nhớ khác"!\n\nMình sẽ ôn thêm phần dynamic memory allocation với `malloc` tiếp.',
 NULL, false, 6, 0, NOW() - INTERVAL '9 days 15 hours', NOW() - INTERVAL '9 days 15 hours'),

('cccccccc-0000-0000-0000-000000000022',
 'bbbbbbbb-0000-0000-0000-000000000008',
 '11111111-0000-0000-0000-000000000002',
 E'Bổ sung cho phần `malloc`:\n\n```c\n// Cấp phát memory động cho mảng 10 phần tử\nint *arr = (int*)malloc(10 * sizeof(int));\nif (arr == NULL) {\n    // Luôn check NULL!\n    return -1;\n}\n\n// Dùng như mảng bình thường\narr[0] = 1;\narr[9] = 10;\n\n// QUAN TRỌNG: luôn free khi xong\nfree(arr);\narr = NULL;  // tránh dangling pointer\n```\n\nLỗi quên `free()` gây **memory leak** — rất hay gặp ở sinh viên mới học C!',
 NULL, false, 13, 0, NOW() - INTERVAL '9 days 10 hours', NOW() - INTERVAL '9 days 10 hours'),

-- ===== Bài 13: Kinh nghiệm đồ án =====
('cccccccc-0000-0000-0000-000000000023',
 'bbbbbbbb-0000-0000-0000-000000000013',
 '22222222-0000-0000-0000-000000000003',
 E'Bài viết rất bổ ích! Mình đang năm 3 và đang chuẩn bị chọn đề tài.\n\nChị có thể nói thêm về phần "đọc paper trước khi chốt đề tài" không? Mình chưa biết tìm paper ở đâu và đọc như thế nào. Google Scholar là đủ không?',
 NULL, false, 5, 0, NOW() - INTERVAL '3 days 20 hours', NOW() - INTERVAL '3 days 20 hours'),

('cccccccc-0000-0000-0000-000000000024',
 'bbbbbbbb-0000-0000-0000-000000000013',
 '22222222-0000-0000-0000-000000000014',
 E'@minhtuan_ptit Google Scholar là điểm khởi đầu tốt! Ngoài ra còn có:\n\n- **Semantic Scholar** — AI-powered, tìm related papers tốt hơn\n- **arXiv** — preprints, free, cập nhật nhanh nhất\n- **IEEE Xplore**, **ACM Digital Library** — cần tài khoản (trường mình có mua)\n- **ResearchGate** — nhiều paper free download\n\n**Cách đọc paper hiệu quả (mình học được):**\n1. Đọc Abstract + Conclusion trước (2 phút) → xem có relevant không\n2. Nhìn qua Figures và Tables\n3. Đọc Introduction để hiểu problem\n4. Chỉ đọc kỹ Methodology nếu cần implement\n\nĐừng đọc từ đầu đến cuối — rất tốn thời gian!',
 'cccccccc-0000-0000-0000-000000000023', false, 9, 0, NOW() - INTERVAL '3 days 18 hours', NOW() - INTERVAL '3 days 18 hours'),

('cccccccc-0000-0000-0000-000000000025',
 'bbbbbbbb-0000-0000-0000-000000000013',
 '22222222-0000-0000-0000-000000000001',
 E'Cảm ơn chị Thuỳ Dung chia sẻ! Mình cũng sắp làm đồ án và cũng đang sợ phần chọn đề tài nhất.\n\nHỏi thêm: team 5 người thì nên dùng git workflow như thế nào? Nhóm mình thường xuyên conflict code.',
 NULL, false, 4, 0, NOW() - INTERVAL '3 days 15 hours', NOW() - INTERVAL '3 days 15 hours'),

('cccccccc-0000-0000-0000-000000000026',
 'bbbbbbbb-0000-0000-0000-000000000013',
 '22222222-0000-0000-0000-000000000014',
 E'@trungkien99 Git flow cho team sinh viên mình recommend:\n\n```\nmain (production)\n  └── develop (staging)\n        ├── feature/login (mỗi người 1 branch)\n        ├── feature/dashboard\n        └── feature/report\n```\n\n**Rules:**\n1. Không bao giờ commit thẳng vào `main` hoặc `develop`\n2. Pull Request để merge vào `develop`, cần 1 người review\n3. Daily: `git pull --rebase origin develop` để sync\n4. Conflict thì pair với người kia để resolve cùng nhau\n\nDùng GitHub Project hoặc Trello để track ai đang làm gì, tránh đụng nhau.',
 'cccccccc-0000-0000-0000-000000000025', false, 11, 0, NOW() - INTERVAL '3 days 10 hours', NOW() - INTERVAL '3 days 10 hours'),

-- ===== Bài 17: Thông báo thi CSDL =====
('cccccccc-0000-0000-0000-000000000027',
 'bbbbbbbb-0000-0000-0000-000000000017',
 '22222222-0000-0000-0000-000000000002',
 E'Cô ơi, cho em hỏi phần chuẩn hóa có ra đến BCNF không ạ, hay chỉ đến 3NF thôi?',
 NULL, false, 3, 0, NOW() - INTERVAL '9 days 20 hours', NOW() - INTERVAL '9 days 20 hours'),

('cccccccc-0000-0000-0000-000000000028',
 'bbbbbbbb-0000-0000-0000-000000000017',
 '11111111-0000-0000-0000-000000000002',
 E'@lananh2k2 Chỉ đến 3NF thôi em nhé. BCNF nâng cao hơn sẽ có trong phần thi cuối kỳ. Các em tập trung vào việc nhận biết và convert về 1NF, 2NF, 3NF là đủ cho giữa kỳ.',
 'cccccccc-0000-0000-0000-000000000027', false, 7, 0, NOW() - INTERVAL '9 days 18 hours', NOW() - INTERVAL '9 days 18 hours'),

('cccccccc-0000-0000-0000-000000000029',
 'bbbbbbbb-0000-0000-0000-000000000017',
 '22222222-0000-0000-0000-000000000010',
 E'Cô cho em hỏi tài liệu được mang vào thi có được đánh máy in ra không, hay phải tự viết tay ạ?',
 NULL, false, 2, 0, NOW() - INTERVAL '9 days 15 hours', NOW() - INTERVAL '9 days 15 hours'),

('cccccccc-0000-0000-0000-000000000030',
 'bbbbbbbb-0000-0000-0000-000000000017',
 '11111111-0000-0000-0000-000000000002',
 E'@thuylinh_d23 Phải **tự viết tay** em nhé, không được in. Mục đích là để các em nắm công thức chứ không phải tra cứu. 5 trang A4 viết tay là đủ nếu em viết cô đọng.',
 'cccccccc-0000-0000-0000-000000000029', false, 5, 0, NOW() - INTERVAL '9 days 12 hours', NOW() - INTERVAL '9 days 12 hours'),

-- ===== Bài 19: Git resources =====
('cccccccc-0000-0000-0000-000000000031',
 'bbbbbbbb-0000-0000-0000-000000000019',
 '22222222-0000-0000-0000-000000000012',
 E'Thêm một resource nữa: **Atlassian Git Tutorials** (https://www.atlassian.com/git/tutorials) — giải thích rất rõ về branching strategies và workflows. Mình học được cách dùng `git rebase` từ đây.',
 NULL, false, 6, 0, NOW() - INTERVAL '22 hours', NOW() - INTERVAL '22 hours'),

('cccccccc-0000-0000-0000-000000000032',
 'bbbbbbbb-0000-0000-0000-000000000019',
 '22222222-0000-0000-0000-000000000004',
 E'`git commit --amend` và `git rebase -i` là 2 lệnh mình ước biết sớm hơn. Giúp giữ history sạch đẹp trước khi merge PR!\n\nNhưng cần nhớ: **chỉ amend/rebase commit chưa push lên remote**, không thì đồng đội sẽ ghét bạn 😄',
 NULL, false, 8, 0, NOW() - INTERVAL '20 hours', NOW() - INTERVAL '20 hours');


-- =============================================================================
-- VOTES  (columns: id, user_id, target_type, target_id, vote_type, created_at)
-- =============================================================================
INSERT INTO votes (id, user_id, target_type, target_id, vote_type, created_at) VALUES
-- Bài 1 upvotes
(gen_random_uuid(), '22222222-0000-0000-0000-000000000002', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000001', 'upvote', NOW() - INTERVAL '29 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000003', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000001', 'upvote', NOW() - INTERVAL '29 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000004', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000001', 'upvote', NOW() - INTERVAL '28 days'),
(gen_random_uuid(), '11111111-0000-0000-0000-000000000003', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000001', 'upvote', NOW() - INTERVAL '28 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000007', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000001', 'upvote', NOW() - INTERVAL '27 days'),

-- Bài 2 upvotes
(gen_random_uuid(), '22222222-0000-0000-0000-000000000001', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000002', 'upvote', NOW() - INTERVAL '24 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000003', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000002', 'upvote', NOW() - INTERVAL '24 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000005', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000002', 'upvote', NOW() - INTERVAL '23 days'),

-- Bài 4 upvotes
(gen_random_uuid(), '22222222-0000-0000-0000-000000000001', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000004', 'upvote', NOW() - INTERVAL '17 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000002', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000004', 'upvote', NOW() - INTERVAL '17 days'),
(gen_random_uuid(), '11111111-0000-0000-0000-000000000002', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000004', 'upvote', NOW() - INTERVAL '17 days'),

-- Bài 8 upvotes
(gen_random_uuid(), '22222222-0000-0000-0000-000000000001', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000008', 'upvote', NOW() - INTERVAL '9 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000002', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000008', 'upvote', NOW() - INTERVAL '9 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000003', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000008', 'upvote', NOW() - INTERVAL '9 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000004', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000008', 'upvote', NOW() - INTERVAL '8 days'),

-- Bài 13 upvotes (bài chia sẻ kinh nghiệm đồ án — nhiều vote nhất)
(gen_random_uuid(), '22222222-0000-0000-0000-000000000001', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000013', 'upvote', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000002', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000013', 'upvote', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000003', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000013', 'upvote', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000005', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000013', 'upvote', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), '11111111-0000-0000-0000-000000000001', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000013', 'upvote', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), '11111111-0000-0000-0000-000000000003', 'discussion', 'bbbbbbbb-0000-0000-0000-000000000013', 'upvote', NOW() - INTERVAL '2 days'),

-- Votes cho comments
(gen_random_uuid(), '22222222-0000-0000-0000-000000000003', 'comment', 'cccccccc-0000-0000-0000-000000000001', 'upvote', NOW() - INTERVAL '29 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000004', 'comment', 'cccccccc-0000-0000-0000-000000000001', 'upvote', NOW() - INTERVAL '29 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000005', 'comment', 'cccccccc-0000-0000-0000-000000000001', 'upvote', NOW() - INTERVAL '28 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000001', 'comment', 'cccccccc-0000-0000-0000-000000000012', 'upvote', NOW() - INTERVAL '17 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000002', 'comment', 'cccccccc-0000-0000-0000-000000000012', 'upvote', NOW() - INTERVAL '17 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000001', 'comment', 'cccccccc-0000-0000-0000-000000000019', 'upvote', NOW() - INTERVAL '9 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000002', 'comment', 'cccccccc-0000-0000-0000-000000000019', 'upvote', NOW() - INTERVAL '9 days'),
(gen_random_uuid(), '22222222-0000-0000-0000-000000000003', 'comment', 'cccccccc-0000-0000-0000-000000000019', 'upvote', NOW() - INTERVAL '9 days');


-- =============================================================================
-- LARGE DETERMINISTIC DATASET
-- =============================================================================
-- 100 extra users. All accounts use: Password123!
-- IDs are derived from stable hashes so this section is reproducible.
\c db

INSERT INTO users (
	id, username, full_name, date_of_birth, email, password_hash, avatar_url,
	privacy, is_verified, role, password_changed_at, last_login_at, created_at, updated_at
)
SELECT
	md5('generated-user-' || series)::uuid,
	'demo_user_' || series,
	'Sinh viên Demo ' || series,
	DATE '1998-01-01' + (series * 37),
	'demo.user.' || series || '@ptit.edu.vn',
	'$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG',
	'https://i.pravatar.cc/150?img=' || ((series % 70) + 1),
	(CASE WHEN series % 10 = 0 THEN 'private' ELSE 'public' END)::users_privacy_enum,
	true,
	(CASE WHEN series % 25 = 0 THEN 'teacher' ELSE 'student' END)::users_role_enum,
	NULL,
	NOW() - ((series % 30) || ' days')::interval,
	NOW() - ((series % 180) || ' days')::interval,
	NOW() - ((series % 180) || ' days')::interval
FROM generate_series(16, 115) AS generated(series);

\c discussion_db

-- 100 extra discussions across the existing academic tags.
INSERT INTO discussions (
	id, title, content, post_type, status, author_id, is_anonymous,
	upvote_count, downvote_count, comment_count, view_count, accepted_comment_id,
	created_at, updated_at
)
SELECT
	md5('generated-discussion-' || series)::uuid,
	CASE series % 5
		WHEN 0 THEN 'Kinh nghiệm triển khai ' || series || ' trong dự án thực tế?'
		WHEN 1 THEN 'Giải thích khái niệm ' || series || ' cho người mới bắt đầu'
		WHEN 2 THEN 'Best practice cho đồ án CNTT số ' || series
		WHEN 3 THEN 'Tài liệu nào phù hợp để học chủ đề ' || series || '?'
		ELSE 'Thảo luận: xu hướng công nghệ học thuật năm nay ' || series
	END,
	'Đây là dữ liệu demo được tạo tự động để kiểm thử danh sách bài viết, phân trang, tìm kiếm, bình chọn và notification. Bài viết số ' || series || ' thuộc bộ dữ liệu mẫu AcaSocial.',
	(CASE WHEN series % 3 = 0 THEN 'discussion' ELSE 'question' END)::discussions_post_type_enum,
	(CASE WHEN series % 4 = 0 THEN 'solved' ELSE 'open' END)::discussions_status_enum,
	md5('generated-user-' || (16 + ((series - 1) % 100)))::uuid,
	series % 17 = 0,
	(series * 7) % 80,
	series % 5,
	5,
	50 + (series * 13),
	NULL,
	NOW() - ((series % 100) || ' days')::interval,
	NOW() - ((series % 90) || ' days')::interval
FROM generate_series(1, 100) AS generated(series);

INSERT INTO discussion_tags (discussion_id, tag_id)
SELECT
	md5('generated-discussion-' || series)::uuid,
	('aaaaaaaa-0000-0000-0000-' || lpad((((series - 1) % 15) + 1)::text, 12, '0'))::uuid
FROM generate_series(1, 100) AS generated(series);

INSERT INTO discussion_tags (discussion_id, tag_id)
SELECT
	md5('generated-discussion-' || series)::uuid,
	('aaaaaaaa-0000-0000-0000-' || lpad(((series % 15) + 1)::text, 12, '0'))::uuid
FROM generate_series(1, 100) AS generated(series);

-- 500 comments: five comments per generated discussion.
INSERT INTO comments (
	id, discussion_id, author_id, content, parent_comment_id, is_anonymous,
	upvote_count, downvote_count, created_at, updated_at
)
SELECT
	md5('generated-comment-' || series)::uuid,
	md5('generated-discussion-' || (((series - 1) / 5) + 1))::uuid,
	md5('generated-user-' || (16 + ((series - 1) % 100)))::uuid,
	'Bình luận demo số ' || series || ': mình đồng ý với hướng tiếp cận này. Có thể bổ sung thêm ví dụ và benchmark để bài viết dễ áp dụng hơn.',
	NULL,
	series % 23 = 0,
	series % 12,
	series % 3,
	NOW() - ((series % 80) || ' days')::interval,
	NOW() - ((series % 70) || ' days')::interval
FROM generate_series(1, 500) AS generated(series);

-- Add one reply to each of the first 100 generated discussions.
INSERT INTO comments (
	id, discussion_id, author_id, content, parent_comment_id, is_anonymous,
	upvote_count, downvote_count, created_at, updated_at
)
SELECT
	md5('generated-reply-' || series)::uuid,
	md5('generated-discussion-' || series)::uuid,
	md5('generated-user-' || (16 + ((series + 37) % 100)))::uuid,
	'Reply demo cho thảo luận ' || series || '. Cảm ơn bạn đã chia sẻ, mình đã thử cách này và kết quả khá ổn.',
	md5('generated-comment-' || (((series - 1) * 5) + 1))::uuid,
	false,
	series % 8,
	0,
	NOW() - ((series % 60) || ' days')::interval,
	NOW() - ((series % 50) || ' days')::interval
FROM generate_series(1, 100) AS generated(series);

-- 1,000 discussion votes with a unique (user, target) pair.
INSERT INTO votes (id, user_id, target_type, target_id, vote_type, created_at)
SELECT
	md5('generated-discussion-vote-' || series)::uuid,
	md5('generated-user-' || (16 + ((series - 1) % 100)))::uuid,
	'discussion',
	md5('generated-discussion-' || (1 + ((series - 1) / 10)))::uuid,
	(CASE WHEN series % 11 = 0 THEN 'downvote' ELSE 'upvote' END)::votes_vote_type_enum,
	NOW() - ((series % 90) || ' days')::interval
FROM generate_series(1, 1000) AS generated(series);

-- 500 comment votes with a unique target comment.
INSERT INTO votes (id, user_id, target_type, target_id, vote_type, created_at)
SELECT
	md5('generated-comment-vote-' || series)::uuid,
	md5('generated-user-' || (16 + ((series - 1) % 100)))::uuid,
	'comment',
	md5('generated-comment-' || series)::uuid,
	(CASE WHEN series % 13 = 0 THEN 'downvote' ELSE 'upvote' END)::votes_vote_type_enum,
	NOW() - ((series % 75) || ' days')::interval
FROM generate_series(1, 500) AS generated(series);

UPDATE discussions
SET comment_count = (
	SELECT COUNT(*) FROM comments WHERE comments.discussion_id = discussions.id
),
upvote_count = (
	SELECT COUNT(*) FROM votes
	WHERE votes.target_id = discussions.id
		AND votes.target_type = 'discussion'
		AND votes.vote_type = 'upvote'
),
downvote_count = (
	SELECT COUNT(*) FROM votes
	WHERE votes.target_id = discussions.id
		AND votes.target_type = 'discussion'
		AND votes.vote_type = 'downvote'
)
WHERE id IN (SELECT md5('generated-discussion-' || series)::uuid FROM generate_series(1, 100) AS generated(series));

\c notification_db

DELETE FROM inbox_events;
DELETE FROM notifications;

-- 300 persisted notifications for the existing demo users.
INSERT INTO notifications (
	id, "recipientId", "actorId", type, title, body, data, priority, "readAt", "createdAt"
)
SELECT
	md5('generated-notification-' || series)::uuid,
	CASE ((series - 1) % 15) + 1
		WHEN 1 THEN '22222222-0000-0000-0000-000000000001'
		WHEN 2 THEN '22222222-0000-0000-0000-000000000002'
		WHEN 3 THEN '22222222-0000-0000-0000-000000000003'
		WHEN 4 THEN '22222222-0000-0000-0000-000000000004'
		WHEN 5 THEN '22222222-0000-0000-0000-000000000005'
		WHEN 6 THEN '22222222-0000-0000-0000-000000000006'
		WHEN 7 THEN '22222222-0000-0000-0000-000000000007'
		WHEN 8 THEN '22222222-0000-0000-0000-000000000008'
		WHEN 9 THEN '22222222-0000-0000-0000-000000000009'
		WHEN 10 THEN '22222222-0000-0000-0000-000000000010'
		WHEN 11 THEN '22222222-0000-0000-0000-000000000011'
		WHEN 12 THEN '22222222-0000-0000-0000-000000000012'
		WHEN 13 THEN '22222222-0000-0000-0000-000000000013'
		WHEN 14 THEN '22222222-0000-0000-0000-000000000014'
		ELSE '22222222-0000-0000-0000-000000000015'
	END::uuid,
	md5('generated-user-' || (16 + ((series - 1) % 100)))::uuid,
	CASE series % 6
		WHEN 0 THEN 'answer.created'
		WHEN 1 THEN 'answer.accepted'
		WHEN 2 THEN 'mention.created'
		WHEN 3 THEN 'badge.awarded'
		WHEN 4 THEN 'user.followed'
		ELSE 'system.security_warning'
	END,
	CASE series % 6
		WHEN 0 THEN 'Có câu trả lời mới'
		WHEN 1 THEN 'Câu trả lời của bạn đã được chấp nhận'
		WHEN 2 THEN 'Bạn được nhắc đến'
		WHEN 3 THEN 'Bạn nhận được badge mới'
		WHEN 4 THEN 'Bạn có người theo dõi mới'
		ELSE 'Cảnh báo bảo mật'
	END,
	'Thông báo demo số ' || series || ' được tạo từ seed data.',
	jsonb_build_object('demo', true, 'sequence', series),
	CASE WHEN series % 6 = 5 THEN 'high' ELSE 'normal' END,
	CASE WHEN series % 4 = 0 THEN NOW() - ((series % 20) || ' days')::interval ELSE NULL END,
	NOW() - ((series % 45) || ' days')::interval
FROM generate_series(1, 300) AS generated(series);

INSERT INTO inbox_events ("eventId", "processedAt")
SELECT 'seed-notification-event-' || series, NOW() - ((series % 45) || ' days')::interval
FROM generate_series(1, 300) AS generated(series);

-- Hoàn tất seed
SELECT 'Seed completed: 120 users, 120 discussions, 600 comments, 1,500 votes, 300 notifications' AS status;
