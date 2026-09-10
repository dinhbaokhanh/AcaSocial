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
('b81593b3-a35d-4abc-9db9-8b404d452e9d', 'nguyenvanan',   'TS. Nguyễn Văn An',       '1978-03-15', 'an.nguyen@ptit.edu.vn',       '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=11', 'public',  true, 'teacher',   NULL, NOW() - INTERVAL '2 hours',  NOW() - INTERVAL '400 days', NOW()),
('0c8217f9-1a5a-4d3b-9ce6-9080c32e4480', 'tranthib',      'PGS. Trần Thị Bình',      '1975-07-20', 'binh.tran@ptit.edu.vn',       '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=47', 'public',  true, 'teacher',   NULL, NOW() - INTERVAL '1 day',   NOW() - INTERVAL '380 days', NOW()),
('d47ab9b2-ed65-49a3-95c3-0772b6967da0', 'levanc',        'ThS. Lê Văn Cường',       '1985-11-05', 'cuong.le@ptit.edu.vn',        '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=52', 'public',  true, 'teacher',   NULL, NOW() - INTERVAL '3 days',  NOW() - INTERVAL '350 days', NOW()),
('becf68dd-5eb4-426b-8e0c-2d568d17ed34', 'phamthid',      'TS. Phạm Thị Dung',       '1980-02-28', 'dung.pham@ptit.edu.vn',       '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=45', 'public',  true, 'teacher',   NULL, NOW() - INTERVAL '5 days',  NOW() - INTERVAL '320 days', NOW()),

-- ===== Moderator =====
('7d307019-5991-4b33-9f29-1bd12c8acfc3', 'hoangmine',     'Hoàng Minh Em',           '1999-06-10', 'em.hoang@ptit.edu.vn',        '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=33', 'public',  true, 'moderator', NULL, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '300 days', NOW()),

-- ===== Sinh viên =====
('1b8f2e5c-f101-4cf7-befb-a0f2a810dda9', 'trungkien99',   'Nguyễn Trung Kiên',       '2001-04-12', 'kien.nguyen.d21@ptit.edu.vn', '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=3',  'public',  true, 'student',   NULL, NOW() - INTERVAL '1 hour',  NOW() - INTERVAL '200 days', NOW()),
('e51bf857-afd4-4df6-8a0e-b94160b29110', 'lananh2k2',     'Lê Lan Anh',              '2002-09-25', 'anh.le.d22@ptit.edu.vn',      '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=44', 'public',  true, 'student',   NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '180 days', NOW()),
('23b638ab-7200-44ec-a2b3-72dfb13bb692', 'minhtuan_ptit', 'Trần Minh Tuấn',          '2001-12-03', 'tuan.tran.d21@ptit.edu.vn',   '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=7',  'public',  true, 'student',   NULL, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '160 days', NOW()),
('c70d8cdb-cae3-4d15-abeb-54646e1f7e42', 'thanhha_sv',    'Phạm Thành Hà',           '2002-03-17', 'ha.pham.d22@ptit.edu.vn',     '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=9',  'public',  true, 'student',   NULL, NOW() - INTERVAL '1 day',  NOW() - INTERVAL '140 days', NOW()),
('fa9d8b99-b653-41f1-b502-d2969c71587f', 'quocbao_d22',   'Lê Quốc Bảo',            '2002-07-30', 'bao.le.d22@ptit.edu.vn',      '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=12', 'public',  true, 'student',   NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '120 days', NOW()),
('d8c28a4b-ee6c-4b61-84ab-61fa3eb14cf3', 'ngocmai_ptit',  'Vũ Ngọc Mai',             '2003-01-14', 'mai.vu.d23@ptit.edu.vn',      '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=49', 'public',  true, 'student',   NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '90 days',  NOW()),
('fc9f94b5-e106-41b9-be15-9c14fe5bed55', 'ducmanh_it',    'Ngô Đức Mạnh',            '2001-08-22', 'manh.ngo.d21@ptit.edu.vn',    '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=15', 'public',  true, 'student',   NULL, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '80 days',  NOW()),
('5597f5a2-6471-4718-bcfa-bebabbff3782', 'huyenphuong22', 'Đặng Huyền Phương',       '2002-11-08', 'phuong.dang.d22@ptit.edu.vn', '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=41', 'public',  true, 'student',   NULL, NOW() - INTERVAL '1 day',  NOW() - INTERVAL '70 days',  NOW()),
('4f6fe8db-040c-475a-a78a-d0e803cbff66', 'bachlong_sv',   'Trương Bách Long',        '2001-05-19', 'long.truong.d21@ptit.edu.vn', '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=18', 'public',  true, 'student',   NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '60 days',  NOW()),
('0149fc6b-6724-4f4d-a067-32ab2348bd30', 'thuylinh_d23',  'Nguyễn Thuỳ Linh',       '2003-04-06', 'linh.nguyen.d23@ptit.edu.vn', '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=39', 'public',  true, 'student',   NULL, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '45 days',  NOW()),
('eb012d82-75a0-4318-aa37-7d9c5560c60e', 'conghau_ptit',  'Đinh Công Hậu',           '2002-02-14', 'hau.dinh.d22@ptit.edu.vn',   '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=22', 'public',  true, 'student',   NULL, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '30 days',  NOW()),
('a0b19fa4-9ab9-467f-8e14-e335edbd2ad5', 'yennhi_sv',     'Trần Yến Nhi',            '2003-09-01', 'nhi.tran.d23@ptit.edu.vn',   '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=46', 'public',  true, 'student',   NULL, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '20 days',  NOW()),
('ab37b700-f0ad-4989-80b3-e6eef6e5cc62', 'khanhtoan_d21', 'Bùi Khánh Toàn',          '2001-10-27', 'toan.bui.d21@ptit.edu.vn',   '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=25', 'public',  true, 'student',   NULL, NOW() - INTERVAL '1 hour',  NOW() - INTERVAL '15 days',  NOW()),
('b83fa8a8-4457-4ee6-91b1-3b0a6e85be6a', 'thuydung_it',   'Cao Thuỳ Dung',           '2002-06-23', 'dung.cao.d22@ptit.edu.vn',   '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=43', 'public',  true, 'student',   NULL, NOW() - INTERVAL '7 hours', NOW() - INTERVAL '10 days',  NOW()),
('333e8936-96ae-420d-9399-645fe6dd3931', 'vinhphuc_sv',   'Nguyễn Vĩnh Phúc',       '2003-12-11', 'phuc.nguyen.d23@ptit.edu.vn','$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG', 'https://i.pravatar.cc/150?img=27', 'public',  true, 'student',   NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '5 days',   NOW());


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
('392e9bb0-f781-46ca-a404-60e740ae51b2', 'Lập trình hướng đối tượng', 'lap-trinh-huong-doi-tuong', 'OOP — Encapsulation, Inheritance, Polymorphism, Abstraction', 12, NOW()),
('451be084-5506-411d-85d6-8b48d129510a', 'Cơ sở dữ liệu',             'co-so-du-lieu',             'Database design, SQL, normalization, indexing', 15, NOW()),
('cc66dd45-3963-45cc-80c9-b51c9a5a6174', 'Mạng máy tính',             'mang-may-tinh',             'TCP/IP, DNS, HTTP, routing protocols', 8, NOW()),
('d76f8b1e-9c23-41ee-b764-cb3059784148', 'Cấu trúc dữ liệu & giải thuật', 'cau-truc-du-lieu-giai-thuat', 'Array, LinkedList, Tree, Graph, Sorting, Searching', 18, NOW()),
('4b41b4ce-13ac-4c42-a91b-e004dd2053e3', 'Hệ điều hành',              'he-dieu-hanh',              'Process, Thread, Memory management, File system', 9, NOW()),
('b482ea59-9138-49bf-bf28-7e71046d1607', 'Web Development',           'web-development',           'HTML, CSS, JavaScript, framework front-end và back-end', 14, NOW()),
('1aef325a-be58-4e39-a7af-316970ad4ee1', 'Machine Learning',          'machine-learning',          'Supervised, Unsupervised, Neural Networks, Python', 11, NOW()),
('799b02fe-012d-4ece-8c21-03c4e241ef79', 'An toàn thông tin',         'an-toan-thong-tin',         'Cryptography, Network security, Penetration testing', 7, NOW()),
('558c7100-2dbf-47fc-be72-26a74902f8e4', 'Toán rời rạc',              'toan-roi-rac',              'Logic, Set theory, Graph theory, Combinatorics', 10, NOW()),
('1210fc91-6a34-4f1b-b7b7-1fffd69496ca', 'Java',                      'java',                      'Java SE, Spring Boot, JVM, Collections framework', 13, NOW()),
('11d21406-c3df-486d-8df1-59eb50dda7e1', 'Python',                    'python',                    'Python 3, NumPy, Pandas, Flask, Django', 16, NOW()),
('b661df23-ed9c-4391-8bfe-4f3b45625b67', 'Nhập môn lập trình',        'nhap-mon-lap-trinh',        'C/C++, thuật toán cơ bản, tư duy lập trình', 20, NOW()),
('f549ebc8-c9a9-4c36-ba76-66386dd3c956', 'DevOps & Cloud',            'devops-cloud',              'Docker, Kubernetes, CI/CD, AWS, Azure', 6, NOW()),
('bf0ef47e-ee50-4862-b538-ea9a0039b6e1', 'Xác suất thống kê',         'xac-suat-thong-ke',         'Phân phối xác suất, kiểm định giả thuyết, hồi quy', 5, NOW()),
('4fc22052-86e9-470b-8316-4066b5706cc9', 'Đồ án & Luận văn',          'do-an-luan-van',            'Hướng dẫn làm đồ án tốt nghiệp, luận văn', 9, NOW());


-- =============================================================================
-- DISCUSSIONS
-- =============================================================================
INSERT INTO discussions (id, title, content, post_type, status, author_id, is_anonymous, upvote_count, downvote_count, comment_count, view_count, accepted_comment_id, created_at, updated_at) VALUES

-- ===== Câu hỏi về CSDL =====
('876f3393-39b4-491b-8ebf-42ea49ba4c0f',
 'Sự khác nhau giữa INNER JOIN và LEFT JOIN trong SQL là gì?',
 E'Mình đang học môn Cơ sở dữ liệu và bị confuse về 2 loại JOIN này.\n\nMình hiểu:\n- **INNER JOIN**: chỉ lấy các bản ghi khớp ở **cả hai bảng**\n- **LEFT JOIN**: lấy tất cả bản ghi bảng trái + bản ghi khớp bên phải (nếu không có thì NULL)\n\nNhưng trong thực tế khi nào nên dùng cái nào? Ví dụ mình có bảng `students` và `grades`, một số sinh viên chưa có điểm thì phải dùng JOIN nào?\n\nCảm ơn mọi người!',
 'question', 'solved',
 '1b8f2e5c-f101-4cf7-befb-a0f2a810dda9', false, 24, 1, 5, 312,
 '1bafddab-8e75-4540-ad25-6c793535190c',
 NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days'),

-- ===== Câu hỏi về OOP =====
('45ef22b1-4227-4fc5-a821-2816db372197',
 'Interface vs Abstract Class trong Java — khi nào dùng cái nào?',
 E'Mình đang làm bài tập OOP và thầy hỏi tại sao chọn interface thay vì abstract class. Mình không trả lời được.\n\nMình biết:\n- **Interface**: tất cả method đều abstract (trước Java 8), class có thể implement nhiều interface\n- **Abstract class**: có thể có method concrete, chỉ extend được 1 class\n\nNhưng nguyên tắc chọn lựa thực sự là gì? Có rule of thumb nào không ạ?\n\n```java\n// Ví dụ của mình:\npublic interface Flyable {\n    void fly();\n}\n\npublic abstract class Animal {\n    abstract void makeSound();\n    void breathe() { System.out.println("breathing..."); }\n}\n```',
 'question', 'solved',
 'e51bf857-afd4-4df6-8a0e-b94160b29110', false, 31, 2, 6, 445,
 '14f8c3e7-3456-408b-9d61-efb0e39d0718',
 NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days'),

-- ===== Thảo luận Web Dev =====
('a1916d75-8d10-414a-9421-f465c0ce248e',
 'Next.js 15 vs React SPA — nên chọn gì cho dự án học thuật?',
 E'Mọi người ơi, nhóm mình đang chuẩn bị làm đồ án tốt nghiệp về một hệ thống quản lý nghiên cứu khoa học. Đang phân vân giữa 2 hướng:\n\n**Option 1: Next.js 15 (App Router)**\n- SSR/SSG tốt cho SEO\n- Full-stack trong một project\n- Learning curve cao hơn\n\n**Option 2: React SPA + Express API**\n- Cấu trúc rõ ràng, separation of concerns\n- Quen thuộc hơn\n- Deploy phức tạp hơn\n\nDự án có ~5 người, deadline 4 tháng. Ai có kinh nghiệm làm đồ án tốt nghiệp với Next.js không chia sẻ với mình?',
 'discussion', 'open',
 'c70d8cdb-cae3-4d15-abeb-54646e1f7e42', false, 18, 3, 7, 267,
 NULL,
 NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),

-- ===== Câu hỏi về giải thuật =====
('15d051c3-6395-48a9-9afe-5282cb8c1479',
 'Tại sao Quicksort có O(n²) worst case nhưng vẫn nhanh hơn Merge Sort trên thực tế?',
 E'Đây là điều mình luôn thắc mắc khi học môn Cấu trúc dữ liệu & Giải thuật.\n\nVề mặt lý thuyết:\n- Quicksort: O(n log n) average, **O(n²) worst case**\n- Merge Sort: **O(n log n) guaranteed**\n\nVậy tại sao trong benchmark thực tế, Quicksort thường nhanh hơn Merge Sort?\n\nMình đoán liên quan đến cache locality nhưng không giải thích được rõ. Thầy/cô hoặc anh/chị nào giải thích giúp mình với ạ!',
 'question', 'solved',
 'fc9f94b5-e106-41b9-be15-9c14fe5bed55', false, 42, 0, 5, 589,
 'bbbc3230-a3b3-4670-b27b-cfdfbdd207a8',
 NOW() - INTERVAL '18 days', NOW() - INTERVAL '17 days'),

-- ===== Câu hỏi về Mạng máy tính =====
('dcceb973-f799-4a3b-8853-8378d20639af',
 'Giải thích 3-way handshake trong TCP cho người mới học?',
 E'Mình đang ôn thi môn Mạng máy tính. Phần 3-way handshake mình đọc sách thấy mô tả là:\n\n1. Client gửi **SYN** (synchronize)\n2. Server trả **SYN-ACK**\n3. Client gửi **ACK**\n\nNhưng mình không hiểu **tại sao** cần 3 bước mà không phải 2 bước? Có thể dùng 2-way handshake không?\n\nVà sequence number sinh ra ở đây để làm gì?\n\nCảm ơn mọi người trước nha!',
 'question', 'open',
 '0149fc6b-6724-4f4d-a067-32ab2348bd30', false, 15, 1, 4, 198,
 NULL,
 NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),

-- ===== Thảo luận về AI/ML =====
('7818612d-b5cc-459e-8de4-d3ad1df28bb7',
 'Kinh nghiệm học Machine Learning từ đầu — lộ trình nào hiệu quả nhất?',
 E'Xin chào cả nhà! Mình là sinh viên năm 3, muốn bắt đầu học ML/AI nghiêm túc.\n\nHiện tại mình đã có:\n- Python cơ bản\n- Đại số tuyến tính (biết matrix operations)\n- Xác suất thống kê cơ bản\n\n**Mình đang cân nhắc 2 lộ trình:**\n\n**Lộ trình A: Theory-first**\n1. Andrew Ng ML Course (Coursera)\n2. Deep Learning Specialization\n3. Sau đó làm project\n\n**Lộ trình B: Project-first**\n1. Fast.ai practical course\n2. Làm project ngay\n3. Bổ sung theory theo nhu cầu\n\nAi đã học qua cả hai hướng thì cho mình biết pros/cons với?\n\n*P/S: Mục tiêu của mình là research ML cho luận văn tốt nghiệp.*',
 'discussion', 'open',
 '23b638ab-7200-44ec-a2b3-72dfb13bb692', false, 27, 2, 8, 401,
 NULL,
 NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),

-- ===== Câu hỏi về Hệ điều hành =====
('4a08b461-cdf7-42b6-be2e-ec9af6b823e1',
 'Deadlock là gì? Điều kiện cần và đủ để xảy ra deadlock?',
 E'Đang ôn thi Hệ điều hành, phần deadlock. Mình đọc được 4 điều kiện Coffman:\n\n1. **Mutual Exclusion**: resource chỉ dùng được bởi 1 process tại một thời điểm\n2. **Hold and Wait**: process đang giữ resource này mà chờ resource khác\n3. **No Preemption**: không thể ép buộc lấy lại resource từ process\n4. **Circular Wait**: tồn tại vòng tròn chờ đợi giữa các process\n\n**Câu hỏi của mình:**\n- 4 điều kiện này là cần hay đủ để xảy ra deadlock?\n- Nếu chỉ cần phá vỡ 1 trong 4, phá điều kiện nào dễ nhất trong thực tế?\n- Ví dụ thực tế về deadlock trong database?',
 'question', 'solved',
 '4f6fe8db-040c-475a-a78a-d0e803cbff66', false, 19, 0, 4, 287,
 '656baf0e-41b5-432f-94b0-ff88dd755ad1',
 NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days'),

-- ===== Câu hỏi về Nhập môn lập trình =====
('dd7c0906-00e8-42b0-b0ca-96c5b05a2649',
 'Con trỏ trong C — mình bị lẫn lộn giữa *ptr và &variable',
 E'Xin chào mọi người, mình là sinh viên năm 1 đang học C. Phần con trỏ làm mình khá confused.\n\nMình không hiểu tại sao code này lại hoạt động:\n\n```c\nint x = 10;\nint *ptr = &x;  // ptr lưu địa chỉ của x\nprintf("%d", *ptr);  // in ra 10\n*ptr = 20;  // thay đổi giá trị x\nprintf("%d", x);  // in ra 20\n```\n\nCụ thể mình thắc mắc:\n1. `&x` là địa chỉ của x, `*ptr` là giá trị tại địa chỉ ptr trỏ đến — mình hiểu đúng không?\n2. Khi nào dùng `ptr` vs `*ptr` vs `&ptr`?\n3. Tại sao cần con trỏ khi đã có biến bình thường?\n\nCảm ơn mọi người nhiều lắm ạ 🙏',
 'question', 'solved',
 'd8c28a4b-ee6c-4b61-84ab-61fa3eb14cf3', false, 35, 1, 6, 502,
 '4f4e263e-4f7a-46af-a9f0-d55cdbb3d1a3',
 NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),

-- ===== Thảo luận về An toàn thông tin =====
('c0b5ceb3-261c-42d5-a285-483b2d83e410',
 'SQL Injection vẫn còn phổ biến năm 2025? Cách phòng chống hiệu quả?',
 E'Mình vừa đọc một báo cáo bảo mật nói SQL Injection vẫn nằm trong top 10 lỗ hổng phổ biến nhất (OWASP Top 10).\n\nMình nghĩ với các ORM hiện đại thì SQLi đã "die" rồi, nhưng hóa ra không phải.\n\n**Theo mọi người:**\n1. Tại sao SQLi vẫn còn phổ biến dù đã biết từ lâu?\n2. Parameterized query có đủ để phòng chống không?\n3. Có trường hợp nào parameterized query vẫn bị bypass không?\n\n**Đây là ví dụ vulnerable code mình gặp trong dự án cũ:**\n```python\n# Vulnerable!\nquery = f"SELECT * FROM users WHERE username = \'{username}\'"\n\n# Secure\ncursor.execute("SELECT * FROM users WHERE username = %s", (username,))\n```\n\nAi có kinh nghiệm pentesting không, chia sẻ góc nhìn thực tế với!',
 'discussion', 'open',
 'ab37b700-f0ad-4989-80b3-e6eef6e5cc62', false, 22, 1, 5, 334,
 NULL,
 NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),

-- ===== Câu hỏi về Python =====
('ac4e42df-31e2-4323-ae8a-f9a5bb889793',
 'Python list comprehension vs for loop — khi nào dùng cái nào?',
 E'Mình hay thấy code Python dùng list comprehension nhưng không biết khi nào nên dùng.\n\nVí dụ:\n```python\n# For loop\nsquares = []\nfor x in range(10):\n    squares.append(x**2)\n\n# List comprehension\nsquares = [x**2 for x in range(10)]\n\n# Nested (có vẻ khó đọc hơn?)\nmatrix = [[i*j for j in range(3)] for i in range(3)]\n```\n\n**Câu hỏi:**\n1. List comprehension có nhanh hơn for loop không?\n2. Nested list comprehension — có nên dùng không hay quá khó đọc?\n3. Có rule nào về khi nào nên ưu tiên readability vs performance không?\n\nMình đang học Python cho môn Machine Learning nên muốn code "Pythonic" hơn.',
 'question', 'open',
 'a0b19fa4-9ab9-467f-8e14-e335edbd2ad5', false, 13, 0, 3, 175,
 NULL,
 NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

-- ===== Thảo luận về CSDL nâng cao =====
('101820af-ba06-4a8c-a7d3-d207127ae0ed',
 'NoSQL vs SQL — Khi nào nên chọn MongoDB thay vì PostgreSQL?',
 E'Nhóm mình đang thiết kế database cho đồ án và đang tranh luận về NoSQL vs SQL.\n\n**Một bạn trong nhóm đề xuất dùng MongoDB** vì:\n- Schema flexible\n- Horizontal scaling dễ hơn\n- JSON native\n\n**Mình muốn dùng PostgreSQL** vì:\n- ACID transactions\n- Complex queries với JOIN\n- Đã học ở trường nên quen hơn\n\nDự án là hệ thống quản lý điểm và học phần cho sinh viên — dữ liệu có quan hệ chặt chẽ.\n\nMọi người có kinh nghiệm thực tế với cả hai, cho mình lời khuyên với?',
 'discussion', 'open',
 'fa9d8b99-b653-41f1-b502-d2969c71587f', false, 16, 2, 6, 253,
 NULL,
 NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),

-- ===== Câu hỏi về Java/Spring =====
('bdac9e4d-5782-4846-88c9-9750a3f56cfa',
 'Spring Boot @Transactional — tại sao rollback không hoạt động?',
 E'Mình đang làm project Spring Boot và gặp vấn đề với @Transactional.\n\n```java\n@Service\npublic class OrderService {\n    @Transactional\n    public void createOrder(OrderDto dto) {\n        orderRepo.save(order);  // step 1\n        inventoryService.deductStock(dto);  // step 2 — throws exception\n        // Mình expect: nếu step 2 fail, step 1 bị rollback\n        // Thực tế: step 1 vẫn được commit ???\n    }\n}\n```\n\nMình đã debug và thấy `inventoryService.deductStock()` throw `RuntimeException` nhưng order vẫn bị save.\n\n**Ai biết tại sao không?** Mình đã kiểm tra:\n- `@EnableTransactionManagement` đã có trong config\n- `@Transactional` annotation đặt đúng chỗ\n- Exception là RuntimeException (không phải checked)',
 'question', 'open',
 'eb012d82-75a0-4318-aa37-7d9c5560c60e', false, 8, 0, 4, 142,
 NULL,
 NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

-- ===== Thảo luận về Đồ án =====
('ed96af83-7c0d-48f4-b843-58fd2f2849f1',
 'Kinh nghiệm chọn đề tài đồ án tốt nghiệp — tránh những sai lầm mình đã mắc',
 E'Chào mọi người! Mình vừa bảo vệ đồ án xong, điểm A. Muốn chia sẻ kinh nghiệm để các em năm dưới tránh vết xe đổ.\n\n**Những sai lầm phổ biến khi chọn đề tài:**\n\n**1. Chọn đề tài quá rộng**\n"Xây dựng hệ thống AI cho giáo dục" → không thể hoàn thành trong 1 semester\n\n**2. Chọn đề tài không có novelty**\nLàm lại những thứ đã có sẵn (CRUD app) → giám khảo sẽ hỏi khó\n\n**3. Không xác định scope sớm**\nMình mất 2 tháng đầu không biết mình đang làm gì\n\n**Tips thực tế:**\n- Đọc 5-10 paper liên quan trước khi chốt đề tài\n- Nói chuyện với thầy hướng dẫn ít nhất 1 lần/tuần\n- Demo được MVP sau tháng đầu tiên\n- Viết báo cáo song song với code, đừng để cuối\n\nMọi người có câu hỏi gì thì hỏi mình nha!',
 'discussion', 'open',
 'b83fa8a8-4457-4ee6-91b1-3b0a6e85be6a', false, 56, 0, 7, 712,
 NULL,
 NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

-- ===== Câu hỏi về DevOps =====
('0e7c73ad-29a6-4bc1-b0ff-24e81bd2bf70',
 'Docker container bị lỗi "Cannot connect to the Docker daemon" khi chạy trong CI/CD',
 E'Mình đang setup GitHub Actions để build và push Docker image. Pipeline bị lỗi ở bước `docker build`:\n\n```\nERROR: Cannot connect to the Docker daemon at unix:///var/run/docker.sock.\nIs the docker daemon running?\n```\n\nYAML config của mình:\n```yaml\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - name: Build image\n        run: docker build -t myapp .\n```\n\nMình không hiểu tại sao lại lỗi vì trên máy local chạy bình thường. Ai có kinh nghiệm với GitHub Actions Docker chỉ mình với?',
 'question', 'open',
 '5597f5a2-6471-4718-bcfa-bebabbff3782', false, 7, 0, 3, 98,
 NULL,
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

-- ===== Thảo luận về Toán rời rạc =====
('4cf5b7a0-00e3-416d-b92c-d33ed2681302',
 'Ứng dụng thực tế của Toán rời rạc trong lập trình — mọi người thấy môn này có cần thiết không?',
 E'Mình đang học môn Toán rời rạc và thật sự không thấy nó liên quan gì đến lập trình.\n\nMôn học bao gồm: logic mệnh đề, lý thuyết tập hợp, quan hệ, đồ thị, tổ hợp...\n\n**Mình đọc được một số ứng dụng nhưng vẫn mơ hồ:**\n- Graph theory → algorithm pathfinding (Dijkstra, BFS, DFS)\n- Logic → boolean algebra trong chip design\n- Combinatorics → complexity analysis\n\nNhưng trong công việc thực tế hàng ngày của một developer, mình có dùng Toán rời rạc không? Hay chỉ cần biết cơ bản?\n\nAnh/chị nào đã đi làm cho mình biết với!',
 'discussion', 'open',
 '333e8936-96ae-420d-9399-645fe6dd3931', false, 14, 3, 5, 221,
 NULL,
 NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

-- ===== Câu hỏi về ML =====
('e0c94af8-c2df-453b-b58a-18102d721354',
 'Overfitting trong Neural Network — cách detect và xử lý như thế nào?',
 E'Mình đang train một CNN để classify ảnh X-quang cho đồ án. Mô hình đang bị overfitting khá nặng:\n\n- Training accuracy: **98.5%**\n- Validation accuracy: **72.3%**\n- Training loss: 0.05\n- Validation loss: 0.89\n\nGap quá lớn. Mình đã thử:\n- Giảm model complexity (bớt layers)\n- Tăng dropout từ 0.2 lên 0.5\n- Data augmentation (flip, rotate, zoom)\n\nNhưng validation accuracy vẫn chỉ lên được 76-77%.\n\n**Dataset của mình:** 1200 ảnh train, 300 validation (có thể đây là vấn đề?)\n\nAi có kinh nghiệm xử lý overfitting với dataset nhỏ trong medical imaging thì chia sẻ với mình!',
 'question', 'open',
 '23b638ab-7200-44ec-a2b3-72dfb13bb692', false, 11, 0, 4, 163,
 NULL,
 NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

-- ===== Thông báo từ giảng viên =====
('6d7efd6e-9500-484e-be0c-8e645a6f7846',
 '[Thông báo] Lịch thi giữa kỳ môn Cơ sở dữ liệu — HK1 2025-2026',
 E'**Thông báo chính thức từ Bộ môn Hệ thống thông tin**\n\nLịch thi giữa kỳ môn **Cơ sở dữ liệu (INT2204)** học kỳ 1 năm học 2025-2026:\n\n| Lớp | Ngày thi | Giờ | Phòng |\n|-----|----------|-----|-------|\n| INT2204 1 | 15/10/2025 | 7:30 | B1-101 |\n| INT2204 2 | 15/10/2025 | 9:30 | B1-103 |\n| INT2204 3 | 16/10/2025 | 7:30 | B2-201 |\n\n**Hình thức thi:** Viết tay, đề mở (được mang tài liệu không quá 5 trang A4 tự viết tay)\n\n**Nội dung:**\n- Mô hình ER\n- Mô hình quan hệ\n- SQL cơ bản (SELECT, JOIN, GROUP BY)\n- Chuẩn hóa (1NF, 2NF, 3NF)\n\nSinh viên cần mang theo thẻ sinh viên. Đến muộn quá 15 phút không được vào thi.\n\n*Chúc các em ôn tập tốt!*',
 'discussion', 'open',
 '0c8217f9-1a5a-4d3b-9ce6-9080c32e4480', false, 8, 0, 3, 534,
 NULL,
 NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),

-- ===== Câu hỏi ẩn danh =====
('8aa25819-6ff7-4e3a-8872-cd9d0538e503',
 'Thật sự cần học thuộc lòng công thức toán để qua môn XSTK không?',
 E'Mình cảm thấy môn Xác suất thống kê rất khó vì có quá nhiều công thức cần nhớ.\n\nĐặc biệt là phần:\n- Các phân phối xác suất (chuẩn, Poisson, nhị thức, mũ...)\n- Công thức kiểm định (t-test, chi-square, ANOVA)\n- Khoảng tin cậy\n\nMình hỏi thật là trong bài thi có được tra cứu công thức không, hay phải nhớ hết?\n\nVà quan trọng hơn — **học môn này để làm gì** khi mình học ngành CNTT? Mình thấy bạn bè học ngành khác cũng học y hệt...\n\n*(Mình hỏi ẩn danh vì sợ bị judge 😅)*',
 'question', 'open',
 'd8c28a4b-ee6c-4b61-84ab-61fa3eb14cf3', true, 28, 4, 5, 389,
 NULL,
 NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),

-- ===== Thêm bài mới =====
('336863e5-0487-4cc2-aa7a-8d609589db66',
 'Tài nguyên học Git/GitHub cho người mới — tổng hợp',
 E'Mình tổng hợp các tài nguyên học Git mình thấy hữu ích nhất, chia sẻ cho mọi người:\n\n**Tài liệu chính thức:**\n- [Pro Git book](https://git-scm.com/book/en/v2) — miễn phí, rất chi tiết\n- [GitHub Docs](https://docs.github.com) — best practices, CI/CD\n\n**Interactive learning:**\n- [Learn Git Branching](https://learngitbranching.js.org/) — visualize branches trực quan nhất\n- [Oh My Git!](https://ohmygit.org/) — game học Git\n\n**Workflow thực tế cho sinh viên:**\n```bash\n# Luôn luôn tạo branch mới trước khi làm feature\ngit checkout -b feature/ten-tinh-nang\n\n# Commit thường xuyên với message rõ ràng\ngit commit -m "feat: thêm chức năng đăng nhập"\n\n# Đừng bao giờ force push lên main\ngit push origin feature/ten-tinh-nang\n```\n\n**Mọi người có tài nguyên nào hay khác không?** Comment bên dưới nha!',
 'discussion', 'open',
 'fc9f94b5-e106-41b9-be15-9c14fe5bed55', false, 33, 0, 4, 448,
 NULL,
 NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

('8f7a81b5-e6a8-433d-8f6e-739cbc6a0592',
 'Hiểu đúng về Big O Notation — tại sao O(2n) = O(n)?',
 E'Mình đang học phân tích thuật toán và bị confuse về Big O.\n\nThầy nói O(2n) = O(n) và O(n² + n) = O(n²) nhưng mình không hiểu tại sao.\n\nNếu một thuật toán chạy 2n bước và thuật toán khác chạy n bước, rõ ràng cái đầu chậm hơn 2 lần — tại sao lại cùng là O(n)?\n\n**Mình hiểu được:**\n- O(1) < O(log n) < O(n) < O(n log n) < O(n²)\n\n**Mình chưa hiểu:**\n- Tại sao bỏ constant factor?\n- Khi nào constant factor lại quan trọng trong thực tế?\n- O(n) và O(2n) khác nhau ở đâu khi n rất lớn?\n\nNhờ mọi người giải thích giúp, càng đơn giản càng tốt!',
 'question', 'open',
 '333e8936-96ae-420d-9399-645fe6dd3931', false, 9, 0, 2, 131,
 NULL,
 NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours');


-- =============================================================================
-- DISCUSSION_TAGS (mapping)
-- =============================================================================
INSERT INTO discussion_tags (discussion_id, tag_id) VALUES
('876f3393-39b4-491b-8ebf-42ea49ba4c0f', '451be084-5506-411d-85d6-8b48d129510a'),
('45ef22b1-4227-4fc5-a821-2816db372197', '392e9bb0-f781-46ca-a404-60e740ae51b2'),
('45ef22b1-4227-4fc5-a821-2816db372197', '1210fc91-6a34-4f1b-b7b7-1fffd69496ca'),
('a1916d75-8d10-414a-9421-f465c0ce248e', 'b482ea59-9138-49bf-bf28-7e71046d1607'),
('a1916d75-8d10-414a-9421-f465c0ce248e', '4fc22052-86e9-470b-8316-4066b5706cc9'),
('15d051c3-6395-48a9-9afe-5282cb8c1479', 'd76f8b1e-9c23-41ee-b764-cb3059784148'),
('dcceb973-f799-4a3b-8853-8378d20639af', 'cc66dd45-3963-45cc-80c9-b51c9a5a6174'),
('7818612d-b5cc-459e-8de4-d3ad1df28bb7', '1aef325a-be58-4e39-a7af-316970ad4ee1'),
('7818612d-b5cc-459e-8de4-d3ad1df28bb7', '11d21406-c3df-486d-8df1-59eb50dda7e1'),
('4a08b461-cdf7-42b6-be2e-ec9af6b823e1', '4b41b4ce-13ac-4c42-a91b-e004dd2053e3'),
('dd7c0906-00e8-42b0-b0ca-96c5b05a2649', 'b661df23-ed9c-4391-8bfe-4f3b45625b67'),
('c0b5ceb3-261c-42d5-a285-483b2d83e410', '799b02fe-012d-4ece-8c21-03c4e241ef79'),
('c0b5ceb3-261c-42d5-a285-483b2d83e410', '451be084-5506-411d-85d6-8b48d129510a'),
('ac4e42df-31e2-4323-ae8a-f9a5bb889793', '11d21406-c3df-486d-8df1-59eb50dda7e1'),
('101820af-ba06-4a8c-a7d3-d207127ae0ed', '451be084-5506-411d-85d6-8b48d129510a'),
('bdac9e4d-5782-4846-88c9-9750a3f56cfa', '1210fc91-6a34-4f1b-b7b7-1fffd69496ca'),
('ed96af83-7c0d-48f4-b843-58fd2f2849f1', '4fc22052-86e9-470b-8316-4066b5706cc9'),
('0e7c73ad-29a6-4bc1-b0ff-24e81bd2bf70', 'f549ebc8-c9a9-4c36-ba76-66386dd3c956'),
('4cf5b7a0-00e3-416d-b92c-d33ed2681302', '558c7100-2dbf-47fc-be72-26a74902f8e4'),
('e0c94af8-c2df-453b-b58a-18102d721354', '1aef325a-be58-4e39-a7af-316970ad4ee1'),
('6d7efd6e-9500-484e-be0c-8e645a6f7846', '451be084-5506-411d-85d6-8b48d129510a'),
('8aa25819-6ff7-4e3a-8872-cd9d0538e503', 'bf0ef47e-ee50-4862-b538-ea9a0039b6e1'),
('336863e5-0487-4cc2-aa7a-8d609589db66', 'b482ea59-9138-49bf-bf28-7e71046d1607'),
('8f7a81b5-e6a8-433d-8f6e-739cbc6a0592', 'd76f8b1e-9c23-41ee-b764-cb3059784148');


-- =============================================================================
-- COMMENTS
-- =============================================================================
INSERT INTO comments (id, discussion_id, author_id, content, parent_comment_id, is_anonymous, upvote_count, downvote_count, created_at, updated_at) VALUES

-- ===== Bài 1: INNER JOIN vs LEFT JOIN =====
('1bafddab-8e75-4540-ad25-6c793535190c',
 '876f3393-39b4-491b-8ebf-42ea49ba4c0f',
 '0c8217f9-1a5a-4d3b-9ce6-9080c32e4480',
 E'Bạn hiểu đúng rồi! Để rõ hơn:\n\n**INNER JOIN** — chỉ giữ lại hàng có match ở CẢ HAI bảng:\n```sql\nSELECT s.name, g.score\nFROM students s\nINNER JOIN grades g ON s.id = g.student_id;\n-- Kết quả: chỉ sinh viên ĐÃ có điểm\n```\n\n**LEFT JOIN** — giữ TẤT CẢ hàng bảng trái, bảng phải NULL nếu không match:\n```sql\nSELECT s.name, g.score\nFROM students s\nLEFT JOIN grades g ON s.id = g.student_id;\n-- Kết quả: TẤT CẢ sinh viên, score = NULL nếu chưa có điểm\n```\n\n**Với bài toán của bạn** (muốn thấy cả sinh viên chưa có điểm): **dùng LEFT JOIN**.\n\nRule of thumb: nếu bạn hỏi "tôi muốn tất cả bản ghi của bảng X, dù có hay không có data liên quan" → LEFT JOIN.',
 NULL, false, 18, 0, NOW() - INTERVAL '29 days 20 hours', NOW() - INTERVAL '29 days 20 hours'),

('4d81c2f7-4d0a-410e-ae64-bc41dc00ede3',
 '876f3393-39b4-491b-8ebf-42ea49ba4c0f',
 'fc9f94b5-e106-41b9-be15-9c14fe5bed55',
 E'Thêm một tip thực tế: khi dùng LEFT JOIN mà muốn lọc ra **chỉ những bản ghi KHÔNG có match**, dùng `WHERE bảng_phải.id IS NULL`:\n\n```sql\n-- Tìm sinh viên CHƯA có điểm nào\nSELECT s.name\nFROM students s\nLEFT JOIN grades g ON s.id = g.student_id\nWHERE g.student_id IS NULL;\n```\n\nĐây gọi là "Anti-join", rất hữu ích khi làm báo cáo!',
 '1bafddab-8e75-4540-ad25-6c793535190c', false, 12, 0, NOW() - INTERVAL '29 days 18 hours', NOW() - INTERVAL '29 days 18 hours'),

('dde29839-971c-4e78-9b31-4970b2fb1913',
 '876f3393-39b4-491b-8ebf-42ea49ba4c0f',
 '1b8f2e5c-f101-4cf7-befb-a0f2a810dda9',
 E'Cảm ơn cô và anh nhiều lắm! Mình đã hiểu rồi. Anti-join là kỹ thuật mình chưa biết, cảm ơn anh @minhtuan_ptit nha!',
 '1bafddab-8e75-4540-ad25-6c793535190c', false, 3, 0, NOW() - INTERVAL '29 days 10 hours', NOW() - INTERVAL '29 days 10 hours'),

('aecf47dc-094d-46ca-abc9-42a57bb203ee',
 '876f3393-39b4-491b-8ebf-42ea49ba4c0f',
 'b81593b3-a35d-4abc-9db9-8b404d452e9d',
 E'Bổ sung thêm: performance-wise, **INNER JOIN thường nhanh hơn LEFT JOIN** vì optimizer có thể loại bỏ nhiều hàng sớm hơn. Trong bài kiểm tra, nếu đề không yêu cầu rõ "tất cả bản ghi", hãy dùng INNER JOIN để tối ưu.',
 NULL, false, 8, 0, NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days'),

('11c6447f-c165-4271-82f4-e00e7e5b3f97',
 '876f3393-39b4-491b-8ebf-42ea49ba4c0f',
 'c70d8cdb-cae3-4d15-abeb-54646e1f7e42',
 E'Ngoài ra còn có RIGHT JOIN (ngược của LEFT JOIN) và FULL OUTER JOIN (lấy tất cả từ cả hai bảng). Nhưng trong thực tế mình ít thấy dùng RIGHT JOIN — người ta thường đổi thứ tự bảng và dùng LEFT JOIN cho dễ đọc hơn.',
 NULL, false, 6, 0, NOW() - INTERVAL '27 days', NOW() - INTERVAL '27 days'),

-- ===== Bài 2: Interface vs Abstract Class =====
('14f8c3e7-3456-408b-9d61-efb0e39d0718',
 '45ef22b1-4227-4fc5-a821-2816db372197',
 'b81593b3-a35d-4abc-9db9-8b404d452e9d',
 E'Câu hỏi rất hay! Đây là rule mình dạy sinh viên:\n\n**Dùng Interface khi:**\n- Muốn định nghĩa một "khả năng" (capability/behavior): `Flyable`, `Serializable`, `Comparable`\n- Một class cần implement nhiều "khả năng" khác nhau\n- Không có shared state giữa các implementor\n\n**Dùng Abstract Class khi:**\n- Có "is-a" relationship: `Dog is-a Animal`\n- Muốn share code (method implementations) giữa subclasses\n- Có template method pattern — định nghĩa skeleton của algorithm\n\n**Java 8+ lưu ý:** Interface có thể có `default` method, nên ranh giới mờ hơn. Nhưng nguyên tắc trên vẫn đúng về mặt design.',
 NULL, false, 22, 0, NOW() - INTERVAL '24 days 22 hours', NOW() - INTERVAL '24 days 22 hours'),

('d7aa4e3b-c9c1-48a3-a3ba-ef180f1ef1b0',
 '45ef22b1-4227-4fc5-a821-2816db372197',
 'ab37b700-f0ad-4989-80b3-e6eef6e5cc62',
 E'Thêm góc nhìn về SOLID: Interface liên quan đến **Interface Segregation Principle** (I trong SOLID) và **Dependency Inversion Principle** (D).\n\nNếu bạn code theo DIP, bạn sẽ luôn depend on abstractions (interfaces), không depend on concrete classes. Điều này giúp unit test dễ hơn nhiều vì bạn có thể mock interface.',
 '14f8c3e7-3456-408b-9d61-efb0e39d0718', false, 9, 0, NOW() - INTERVAL '24 days 20 hours', NOW() - INTERVAL '24 days 20 hours'),

('cc8428db-7c70-47af-9cf9-caea52a3b4a3',
 '45ef22b1-4227-4fc5-a821-2816db372197',
 'e51bf857-afd4-4df6-8a0e-b94160b29110',
 E'Cảm ơn thầy và anh Khánh Toàn! Giờ mình hiểu rồi. Câu trả lời của thầy là câu mình sẽ trả lời thầy trong lớp 😄\n\nMình mark câu trả lời của thầy là accepted nhé!',
 '14f8c3e7-3456-408b-9d61-efb0e39d0718', false, 5, 0, NOW() - INTERVAL '24 days 18 hours', NOW() - INTERVAL '24 days 18 hours'),

('8fd6422f-0c2a-4b0e-b027-42fad44e0da7',
 '45ef22b1-4227-4fc5-a821-2816db372197',
 '4f6fe8db-040c-475a-a78a-d0e803cbff66',
 E'Một ví dụ thực tế dễ nhớ:\n- `List`, `Map`, `Set` → Interface (chỉ định nghĩa behavior)\n- `AbstractList`, `AbstractMap` → Abstract class (shared implementation)\n- `ArrayList`, `HashMap` → Concrete class\n\nJava Collections Framework là ví dụ kinh điển về cách phối hợp cả hai!',
 NULL, false, 11, 0, NOW() - INTERVAL '24 days 15 hours', NOW() - INTERVAL '24 days 15 hours'),

('9e6adc1b-6e9f-439a-9afc-b7e89777dece',
 '45ef22b1-4227-4fc5-a821-2816db372197',
 'fa9d8b99-b653-41f1-b502-d2969c71587f',
 E'@ngocmai_ptit Ví dụ của bạn rất hay! Mình sẽ nhớ cái này. Collections Framework thật sự là textbook example cho OOP design.',
 '8fd6422f-0c2a-4b0e-b027-42fad44e0da7', false, 4, 0, NOW() - INTERVAL '24 days 12 hours', NOW() - INTERVAL '24 days 12 hours'),

-- ===== Bài 3: Next.js vs React SPA =====
('ffbfdf24-54c4-4f0f-abb1-6b8aa3665ccc',
 'a1916d75-8d10-414a-9421-f465c0ce248e',
 'eb012d82-75a0-4318-aa37-7d9c5560c60e',
 E'Mình vừa làm đồ án với Next.js 14 App Router, chia sẻ kinh nghiệm thực tế:\n\n**Pros của Next.js:**\n- File-based routing tiện lợi\n- Server Components giảm bundle size đáng kể\n- Vercel deploy 1 click, free tier đủ dùng\n\n**Cons thực tế:**\n- Debugging khó hơn (boundary server/client component confusing)\n- Mình mất 1 tuần đầu chỉ để hiểu App Router\n- Team 5 người cần sync về conventions, không thì loạn\n\n**Kết luận của mình:** Nếu team có ít nhất 1-2 người đã biết Next.js, **go for it**. Nếu tất cả đều mới, bắt đầu với React SPA an toàn hơn để tránh mất time vào framework issues.',
 NULL, false, 14, 1, NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days'),

-- ===== Bài 4: Quicksort vs Merge Sort =====
('bbbc3230-a3b3-4670-b27b-cfdfbdd207a8',
 '15d051c3-6395-48a9-9afe-5282cb8c1479',
 'b81593b3-a35d-4abc-9db9-8b404d452e9d',
 E'Câu hỏi tuyệt vời, đây là topic mình rất thích!\n\n**Lý do Quicksort nhanh hơn trong thực tế:**\n\n**1. Cache Locality (quan trọng nhất)**\nQuicksort làm việc in-place → truy cập các phần tử liền kề trong memory → CPU cache hit rate cao. Merge Sort cần allocate memory phụ, nhiều cache miss hơn.\n\n**2. Constant Factor thực tế**\nCả hai đều O(n log n) average, nhưng constant factor của Quicksort nhỏ hơn. "Big O hides constants" — trong thực tế O(n log n) với c=1 nhanh hơn O(n log n) với c=3.\n\n**3. Average case quan trọng hơn worst case**\nVới random data, Quicksort gần như không bao giờ hit O(n²). Modern implementations dùng 3-way partition và median-of-3 pivot để tránh worst case.\n\n**Khi nào nên dùng Merge Sort:**\n- Cần stable sort\n- Dữ liệu quá lớn không fit vào RAM (external sorting)\n- Linked list (merge sort natural, quicksort khó)',
 NULL, false, 35, 0, NOW() - INTERVAL '17 days 22 hours', NOW() - INTERVAL '17 days 22 hours'),

('26563a5a-d2b8-4bde-9b88-118516c231e8',
 '15d051c3-6395-48a9-9afe-5282cb8c1479',
 '23b638ab-7200-44ec-a2b3-72dfb13bb692',
 E'Thêm: Python `sort()` dùng **Timsort** — hybrid của Merge Sort và Insertion Sort. Java `Arrays.sort()` với primitive dùng Dual-Pivot Quicksort, với Object dùng Timsort (cần stable sort vì object có thể equal).\n\nTức là cả hai đều "win" ở một số trường hợp, nên các standard library dùng hybrid approach!',
 'bbbc3230-a3b3-4670-b27b-cfdfbdd207a8', false, 16, 0, NOW() - INTERVAL '17 days 20 hours', NOW() - INTERVAL '17 days 20 hours'),

('f0c1b632-9000-46ea-820e-54fe58fc0929',
 '15d051c3-6395-48a9-9afe-5282cb8c1479',
 'fc9f94b5-e106-41b9-be15-9c14fe5bed55',
 E'Cảm ơn thầy An và anh Minh Tuấn! Câu trả lời của thầy giải thích rất chi tiết. Phần cache locality mình chưa nghĩ đến bao giờ, rất interesting!\n\nMình sẽ tìm hiểu thêm về memory hierarchy sau bài này.',
 NULL, false, 4, 0, NOW() - INTERVAL '17 days 15 hours', NOW() - INTERVAL '17 days 15 hours'),

-- ===== Bài 5: TCP 3-way handshake =====
('99c85a44-1687-4a7a-ac58-bcd5e3a8f06b',
 'dcceb973-f799-4a3b-8853-8378d20639af',
 'd47ab9b2-ed65-49a3-95c3-0772b6967da0',
 E'Câu hỏi hay về networking!\n\n**Tại sao cần 3 bước, không phải 2:**\n\nMục đích của handshake là cả hai bên **đều xác nhận** được khả năng gửi VÀ nhận của nhau:\n\n```\nClient → SYN       → Server   (Client: "Tôi muốn kết nối, seq=x")\nClient ← SYN-ACK  ← Server   (Server: "OK, tôi nhận được, seq=y, ack=x+1")\nClient → ACK       → Server   (Client: "Tôi nhận được phản hồi của bạn, ack=y+1")\n```\n\nNếu chỉ 2 bước (SYN + SYN-ACK): **Client biết Server đang hoạt động, nhưng Server chưa biết Client có nhận được SYN-ACK không!**\n\n**Sequence numbers dùng để:**\n- Sắp xếp lại packets đến sai thứ tự\n- Phát hiện packets bị mất (để retransmit)\n- Chống replay attack cơ bản',
 NULL, false, 12, 0, NOW() - INTERVAL '14 days 22 hours', NOW() - INTERVAL '14 days 22 hours'),

('66a842d4-bce0-40b6-98f3-657e59426be7',
 'dcceb973-f799-4a3b-8853-8378d20639af',
 '5597f5a2-6471-4718-bcfa-bebabbff3782',
 E'Bổ sung: lý do 2-way handshake không đủ còn liên quan đến **half-open connection problem**.\n\nNếu SYN đầu tiên bị delay (network congestion), client có thể timeout và gửi SYN mới. SYN cũ đến được server, server gửi SYN-ACK. Client đã không còn nhớ connection này → server allocate resources cho một connection ma mà không ai dùng.\n\n3-way handshake giải quyết điều này vì server chỉ fully establish connection sau khi nhận ACK cuối.',
 '99c85a44-1687-4a7a-ac58-bcd5e3a8f06b', false, 8, 0, NOW() - INTERVAL '14 days 20 hours', NOW() - INTERVAL '14 days 20 hours'),

-- ===== Bài 6: ML Learning Path =====
('03f27248-7a05-4de1-a6bc-badfa92c2f50',
 '7818612d-b5cc-459e-8de4-d3ad1df28bb7',
 'becf68dd-5eb4-426b-8e0c-2d568d17ed34',
 E'Với background của bạn (Python + Linear Algebra + Probability), mình khuyên **Lộ trình A nhưng có điều chỉnh**:\n\n1. **Andrew Ng ML Course** — vẫn là tốt nhất để build intuition\n2. **Làm project nhỏ ngay sau mỗi module** — không đợi học xong mới làm\n3. **Fast.ai** sau khi có foundation — để học "modern" deep learning approach\n\n**Với mục tiêu research cho luận văn**, bạn cần biết đọc paper. Recommend:\n- [Papers With Code](https://paperswithcode.com/) — tìm paper có code\n- Bắt đầu với survey papers thay vì papers gốc\n- Implement lại một paper đơn giản là cách học hiệu quả nhất\n\nTránh "tutorial hell" — học xong tutorial này sang tutorial khác mà không làm gì. **Chọn 1 project và làm đến cùng.**',
 NULL, false, 19, 0, NOW() - INTERVAL '13 days 22 hours', NOW() - INTERVAL '13 days 22 hours'),

-- ===== Bài 7: Deadlock =====
('656baf0e-41b5-432f-94b0-ff88dd755ad1',
 '4a08b461-cdf7-42b6-be2e-ec9af6b823e1',
 'b81593b3-a35d-4abc-9db9-8b404d452e9d',
 E'**4 điều kiện Coffman là điều kiện CẦN VÀ ĐỦ** cho deadlock. Thiếu bất kỳ 1 điều kiện nào → deadlock không thể xảy ra.\n\n**Phá điều kiện nào dễ nhất trong thực tế:**\n\n| Điều kiện | Cách phá | Khả thi? |\n|-----------|----------|----------|\n| Mutual Exclusion | Dùng read-only resources | Khó — nhiều resource cần exclusive |\n| Hold and Wait | Request tất cả resources trước | Khó — waste resources |\n| No Preemption | Cho phép OS lấy lại resource | Khó với một số resource |\n| **Circular Wait** | **Đánh số thứ tự resource, luôn request theo thứ tự** | **Dễ nhất!** |\n\n**Ví dụ deadlock trong database:**\n```sql\n-- Transaction 1            -- Transaction 2\nLOCK TABLE orders;          LOCK TABLE inventory;\n-- chờ inventory...         -- chờ orders...\nLOCK TABLE inventory;       LOCK TABLE orders;\n-- DEADLOCK!\n```\nDatabase engine (PostgreSQL, MySQL) auto-detect và rollback một trong hai transaction.',
 NULL, false, 15, 0, NOW() - INTERVAL '11 days 22 hours', NOW() - INTERVAL '11 days 22 hours'),

-- ===== Bài 8: Con trỏ trong C =====
('a3b4e8aa-825a-4652-ae51-1b5cc8684b58',
 'dd7c0906-00e8-42b0-b0ca-96c5b05a2649',
 'd47ab9b2-ed65-49a3-95c3-0772b6967da0',
 E'Con trỏ là phần khó nhất của C, đừng lo nếu confuse lúc đầu!\n\n**Cách nhớ đơn giản:**\n- `&x` → "địa chỉ của x" (ampersand = address)\n- `*ptr` → "giá trị TẠI địa chỉ mà ptr trỏ đến" (dereference)\n- `ptr` → bản thân địa chỉ đang được lưu trong ptr\n\n**Bạn hiểu đúng rồi!** Tóm lại:\n```c\nint x = 10;\nint *ptr = &x;  // ptr = địa chỉ 0x1234 (ví dụ)\n\n// ptr   → 0x1234 (địa chỉ)\n// *ptr  → 10 (giá trị tại 0x1234)\n// &ptr  → 0x5678 (địa chỉ của biến ptr, ít dùng)\n```\n\n**Tại sao cần con trỏ:**\n1. **Pass by reference** — thay đổi biến trong function\n2. **Dynamic memory** — `malloc`/`free`\n3. **Array & String** — array thực ra là pointer\n4. **Data structures** — Linked List, Tree cần pointer',
 NULL, false, 28, 0, NOW() - INTERVAL '9 days 22 hours', NOW() - INTERVAL '9 days 22 hours'),

('26b68027-80cd-4899-aff1-adae1106fd20',
 'dd7c0906-00e8-42b0-b0ca-96c5b05a2649',
 '4f6fe8db-040c-475a-a78a-d0e803cbff66',
 E'Một cách visualize dễ hiểu:\n\nHãy tưởng tượng memory là dãy các ô nhớ được đánh số (địa chỉ):\n```\nĐịa chỉ:  1000  1001  1002  1003\nGiá trị:  [ 10 ] [  ? ] [1000] [  ? ]\n           ^x            ^ptr\n```\n- `x` ở địa chỉ 1000, giá trị = 10\n- `ptr` ở địa chỉ 1002, giá trị = 1000 (lưu địa chỉ của x)\n- `*ptr` = giá trị tại địa chỉ 1000 = 10\n\nNhìn vào hình này mà hiểu pointer là "ô nhớ lưu địa chỉ của ô nhớ khác"!',
 NULL, false, 17, 0, NOW() - INTERVAL '9 days 20 hours', NOW() - INTERVAL '9 days 20 hours'),

('9ecaf87d-2e2f-4c86-a6ec-67f97c885fbb',
 'dd7c0906-00e8-42b0-b0ca-96c5b05a2649',
 'd8c28a4b-ee6c-4b61-84ab-61fa3eb14cf3',
 E'Ôi cảm ơn thầy Cường và anh Bách Long nhiều lắm ạ!\n\nCách visualize của anh giúp mình "à há" luôn 💡 Hóa ra mình chỉ cần nhớ pointer là "ô nhớ lưu địa chỉ của ô nhớ khác"!\n\nMình sẽ ôn thêm phần dynamic memory allocation với `malloc` tiếp.',
 NULL, false, 6, 0, NOW() - INTERVAL '9 days 15 hours', NOW() - INTERVAL '9 days 15 hours'),

('4f4e263e-4f7a-46af-a9f0-d55cdbb3d1a3',
 'dd7c0906-00e8-42b0-b0ca-96c5b05a2649',
 '0c8217f9-1a5a-4d3b-9ce6-9080c32e4480',
 E'Bổ sung cho phần `malloc`:\n\n```c\n// Cấp phát memory động cho mảng 10 phần tử\nint *arr = (int*)malloc(10 * sizeof(int));\nif (arr == NULL) {\n    // Luôn check NULL!\n    return -1;\n}\n\n// Dùng như mảng bình thường\narr[0] = 1;\narr[9] = 10;\n\n// QUAN TRỌNG: luôn free khi xong\nfree(arr);\narr = NULL;  // tránh dangling pointer\n```\n\nLỗi quên `free()` gây **memory leak** — rất hay gặp ở sinh viên mới học C!',
 NULL, false, 13, 0, NOW() - INTERVAL '9 days 10 hours', NOW() - INTERVAL '9 days 10 hours'),

-- ===== Bài 13: Kinh nghiệm đồ án =====
('f7bb034b-38d5-4a90-be34-e7a7fa341b4a',
 'ed96af83-7c0d-48f4-b843-58fd2f2849f1',
 '23b638ab-7200-44ec-a2b3-72dfb13bb692',
 E'Bài viết rất bổ ích! Mình đang năm 3 và đang chuẩn bị chọn đề tài.\n\nChị có thể nói thêm về phần "đọc paper trước khi chốt đề tài" không? Mình chưa biết tìm paper ở đâu và đọc như thế nào. Google Scholar là đủ không?',
 NULL, false, 5, 0, NOW() - INTERVAL '3 days 20 hours', NOW() - INTERVAL '3 days 20 hours'),

('cd8b36f6-950e-4db0-b498-c4a06af8b7d1',
 'ed96af83-7c0d-48f4-b843-58fd2f2849f1',
 'b83fa8a8-4457-4ee6-91b1-3b0a6e85be6a',
 E'@minhtuan_ptit Google Scholar là điểm khởi đầu tốt! Ngoài ra còn có:\n\n- **Semantic Scholar** — AI-powered, tìm related papers tốt hơn\n- **arXiv** — preprints, free, cập nhật nhanh nhất\n- **IEEE Xplore**, **ACM Digital Library** — cần tài khoản (trường mình có mua)\n- **ResearchGate** — nhiều paper free download\n\n**Cách đọc paper hiệu quả (mình học được):**\n1. Đọc Abstract + Conclusion trước (2 phút) → xem có relevant không\n2. Nhìn qua Figures và Tables\n3. Đọc Introduction để hiểu problem\n4. Chỉ đọc kỹ Methodology nếu cần implement\n\nĐừng đọc từ đầu đến cuối — rất tốn thời gian!',
 'f7bb034b-38d5-4a90-be34-e7a7fa341b4a', false, 9, 0, NOW() - INTERVAL '3 days 18 hours', NOW() - INTERVAL '3 days 18 hours'),

('f46dfa9f-2f0c-48b0-b4ba-c67671da3b87',
 'ed96af83-7c0d-48f4-b843-58fd2f2849f1',
 '1b8f2e5c-f101-4cf7-befb-a0f2a810dda9',
 E'Cảm ơn chị Thuỳ Dung chia sẻ! Mình cũng sắp làm đồ án và cũng đang sợ phần chọn đề tài nhất.\n\nHỏi thêm: team 5 người thì nên dùng git workflow như thế nào? Nhóm mình thường xuyên conflict code.',
 NULL, false, 4, 0, NOW() - INTERVAL '3 days 15 hours', NOW() - INTERVAL '3 days 15 hours'),

('42803bd5-d76a-4b98-bac1-57ada9fd0e81',
 'ed96af83-7c0d-48f4-b843-58fd2f2849f1',
 'b83fa8a8-4457-4ee6-91b1-3b0a6e85be6a',
 E'@trungkien99 Git flow cho team sinh viên mình recommend:\n\n```\nmain (production)\n  └── develop (staging)\n        ├── feature/login (mỗi người 1 branch)\n        ├── feature/dashboard\n        └── feature/report\n```\n\n**Rules:**\n1. Không bao giờ commit thẳng vào `main` hoặc `develop`\n2. Pull Request để merge vào `develop`, cần 1 người review\n3. Daily: `git pull --rebase origin develop` để sync\n4. Conflict thì pair với người kia để resolve cùng nhau\n\nDùng GitHub Project hoặc Trello để track ai đang làm gì, tránh đụng nhau.',
 'f46dfa9f-2f0c-48b0-b4ba-c67671da3b87', false, 11, 0, NOW() - INTERVAL '3 days 10 hours', NOW() - INTERVAL '3 days 10 hours'),

-- ===== Bài 17: Thông báo thi CSDL =====
('459429d2-024c-4173-b1ba-34093b326ca0',
 '6d7efd6e-9500-484e-be0c-8e645a6f7846',
 'e51bf857-afd4-4df6-8a0e-b94160b29110',
 E'Cô ơi, cho em hỏi phần chuẩn hóa có ra đến BCNF không ạ, hay chỉ đến 3NF thôi?',
 NULL, false, 3, 0, NOW() - INTERVAL '9 days 20 hours', NOW() - INTERVAL '9 days 20 hours'),

('e688381b-6ead-47e3-9163-aaba7b197c26',
 '6d7efd6e-9500-484e-be0c-8e645a6f7846',
 '0c8217f9-1a5a-4d3b-9ce6-9080c32e4480',
 E'@lananh2k2 Chỉ đến 3NF thôi em nhé. BCNF nâng cao hơn sẽ có trong phần thi cuối kỳ. Các em tập trung vào việc nhận biết và convert về 1NF, 2NF, 3NF là đủ cho giữa kỳ.',
 '459429d2-024c-4173-b1ba-34093b326ca0', false, 7, 0, NOW() - INTERVAL '9 days 18 hours', NOW() - INTERVAL '9 days 18 hours'),

('768dc934-2231-4d1e-b4b7-17c91ba06edc',
 '6d7efd6e-9500-484e-be0c-8e645a6f7846',
 '0149fc6b-6724-4f4d-a067-32ab2348bd30',
 E'Cô cho em hỏi tài liệu được mang vào thi có được đánh máy in ra không, hay phải tự viết tay ạ?',
 NULL, false, 2, 0, NOW() - INTERVAL '9 days 15 hours', NOW() - INTERVAL '9 days 15 hours'),

('130253aa-b211-4036-82bc-761d4aa20dbf',
 '6d7efd6e-9500-484e-be0c-8e645a6f7846',
 '0c8217f9-1a5a-4d3b-9ce6-9080c32e4480',
 E'@thuylinh_d23 Phải **tự viết tay** em nhé, không được in. Mục đích là để các em nắm công thức chứ không phải tra cứu. 5 trang A4 viết tay là đủ nếu em viết cô đọng.',
 '768dc934-2231-4d1e-b4b7-17c91ba06edc', false, 5, 0, NOW() - INTERVAL '9 days 12 hours', NOW() - INTERVAL '9 days 12 hours'),

-- ===== Bài 19: Git resources =====
('151eb8da-ee86-443e-b8de-35d296150100',
 '336863e5-0487-4cc2-aa7a-8d609589db66',
 'a0b19fa4-9ab9-467f-8e14-e335edbd2ad5',
 E'Thêm một resource nữa: **Atlassian Git Tutorials** (https://www.atlassian.com/git/tutorials) — giải thích rất rõ về branching strategies và workflows. Mình học được cách dùng `git rebase` từ đây.',
 NULL, false, 6, 0, NOW() - INTERVAL '22 hours', NOW() - INTERVAL '22 hours'),

('49fbf15f-920e-4ef8-8842-b2fd669a85ca',
 '336863e5-0487-4cc2-aa7a-8d609589db66',
 'c70d8cdb-cae3-4d15-abeb-54646e1f7e42',
 E'`git commit --amend` và `git rebase -i` là 2 lệnh mình ước biết sớm hơn. Giúp giữ history sạch đẹp trước khi merge PR!\n\nNhưng cần nhớ: **chỉ amend/rebase commit chưa push lên remote**, không thì đồng đội sẽ ghét bạn 😄',
 NULL, false, 8, 0, NOW() - INTERVAL '20 hours', NOW() - INTERVAL '20 hours');


-- =============================================================================
-- VOTES  (columns: id, user_id, target_type, target_id, vote_type, created_at)
-- =============================================================================
INSERT INTO votes (id, user_id, target_type, target_id, vote_type, created_at) VALUES
-- Bài 1 upvotes
(gen_random_uuid(), 'e51bf857-afd4-4df6-8a0e-b94160b29110', 'discussion', '876f3393-39b4-491b-8ebf-42ea49ba4c0f', 'upvote', NOW() - INTERVAL '29 days'),
(gen_random_uuid(), '23b638ab-7200-44ec-a2b3-72dfb13bb692', 'discussion', '876f3393-39b4-491b-8ebf-42ea49ba4c0f', 'upvote', NOW() - INTERVAL '29 days'),
(gen_random_uuid(), 'c70d8cdb-cae3-4d15-abeb-54646e1f7e42', 'discussion', '876f3393-39b4-491b-8ebf-42ea49ba4c0f', 'upvote', NOW() - INTERVAL '28 days'),
(gen_random_uuid(), 'd47ab9b2-ed65-49a3-95c3-0772b6967da0', 'discussion', '876f3393-39b4-491b-8ebf-42ea49ba4c0f', 'upvote', NOW() - INTERVAL '28 days'),
(gen_random_uuid(), 'fc9f94b5-e106-41b9-be15-9c14fe5bed55', 'discussion', '876f3393-39b4-491b-8ebf-42ea49ba4c0f', 'upvote', NOW() - INTERVAL '27 days'),

-- Bài 2 upvotes
(gen_random_uuid(), '1b8f2e5c-f101-4cf7-befb-a0f2a810dda9', 'discussion', '45ef22b1-4227-4fc5-a821-2816db372197', 'upvote', NOW() - INTERVAL '24 days'),
(gen_random_uuid(), '23b638ab-7200-44ec-a2b3-72dfb13bb692', 'discussion', '45ef22b1-4227-4fc5-a821-2816db372197', 'upvote', NOW() - INTERVAL '24 days'),
(gen_random_uuid(), 'fa9d8b99-b653-41f1-b502-d2969c71587f', 'discussion', '45ef22b1-4227-4fc5-a821-2816db372197', 'upvote', NOW() - INTERVAL '23 days'),

-- Bài 4 upvotes
(gen_random_uuid(), '1b8f2e5c-f101-4cf7-befb-a0f2a810dda9', 'discussion', '15d051c3-6395-48a9-9afe-5282cb8c1479', 'upvote', NOW() - INTERVAL '17 days'),
(gen_random_uuid(), 'e51bf857-afd4-4df6-8a0e-b94160b29110', 'discussion', '15d051c3-6395-48a9-9afe-5282cb8c1479', 'upvote', NOW() - INTERVAL '17 days'),
(gen_random_uuid(), '0c8217f9-1a5a-4d3b-9ce6-9080c32e4480', 'discussion', '15d051c3-6395-48a9-9afe-5282cb8c1479', 'upvote', NOW() - INTERVAL '17 days'),

-- Bài 8 upvotes
(gen_random_uuid(), '1b8f2e5c-f101-4cf7-befb-a0f2a810dda9', 'discussion', 'dd7c0906-00e8-42b0-b0ca-96c5b05a2649', 'upvote', NOW() - INTERVAL '9 days'),
(gen_random_uuid(), 'e51bf857-afd4-4df6-8a0e-b94160b29110', 'discussion', 'dd7c0906-00e8-42b0-b0ca-96c5b05a2649', 'upvote', NOW() - INTERVAL '9 days'),
(gen_random_uuid(), '23b638ab-7200-44ec-a2b3-72dfb13bb692', 'discussion', 'dd7c0906-00e8-42b0-b0ca-96c5b05a2649', 'upvote', NOW() - INTERVAL '9 days'),
(gen_random_uuid(), 'c70d8cdb-cae3-4d15-abeb-54646e1f7e42', 'discussion', 'dd7c0906-00e8-42b0-b0ca-96c5b05a2649', 'upvote', NOW() - INTERVAL '8 days'),

-- Bài 13 upvotes (bài chia sẻ kinh nghiệm đồ án — nhiều vote nhất)
(gen_random_uuid(), '1b8f2e5c-f101-4cf7-befb-a0f2a810dda9', 'discussion', 'ed96af83-7c0d-48f4-b843-58fd2f2849f1', 'upvote', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), 'e51bf857-afd4-4df6-8a0e-b94160b29110', 'discussion', 'ed96af83-7c0d-48f4-b843-58fd2f2849f1', 'upvote', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), '23b638ab-7200-44ec-a2b3-72dfb13bb692', 'discussion', 'ed96af83-7c0d-48f4-b843-58fd2f2849f1', 'upvote', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), 'fa9d8b99-b653-41f1-b502-d2969c71587f', 'discussion', 'ed96af83-7c0d-48f4-b843-58fd2f2849f1', 'upvote', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), 'b81593b3-a35d-4abc-9db9-8b404d452e9d', 'discussion', 'ed96af83-7c0d-48f4-b843-58fd2f2849f1', 'upvote', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), 'd47ab9b2-ed65-49a3-95c3-0772b6967da0', 'discussion', 'ed96af83-7c0d-48f4-b843-58fd2f2849f1', 'upvote', NOW() - INTERVAL '2 days'),

-- Votes cho comments
(gen_random_uuid(), '23b638ab-7200-44ec-a2b3-72dfb13bb692', 'comment', '1bafddab-8e75-4540-ad25-6c793535190c', 'upvote', NOW() - INTERVAL '29 days'),
(gen_random_uuid(), 'c70d8cdb-cae3-4d15-abeb-54646e1f7e42', 'comment', '1bafddab-8e75-4540-ad25-6c793535190c', 'upvote', NOW() - INTERVAL '29 days'),
(gen_random_uuid(), 'fa9d8b99-b653-41f1-b502-d2969c71587f', 'comment', '1bafddab-8e75-4540-ad25-6c793535190c', 'upvote', NOW() - INTERVAL '28 days'),
(gen_random_uuid(), '1b8f2e5c-f101-4cf7-befb-a0f2a810dda9', 'comment', 'bbbc3230-a3b3-4670-b27b-cfdfbdd207a8', 'upvote', NOW() - INTERVAL '17 days'),
(gen_random_uuid(), 'e51bf857-afd4-4df6-8a0e-b94160b29110', 'comment', 'bbbc3230-a3b3-4670-b27b-cfdfbdd207a8', 'upvote', NOW() - INTERVAL '17 days'),
(gen_random_uuid(), '1b8f2e5c-f101-4cf7-befb-a0f2a810dda9', 'comment', 'a3b4e8aa-825a-4652-ae51-1b5cc8684b58', 'upvote', NOW() - INTERVAL '9 days'),
(gen_random_uuid(), 'e51bf857-afd4-4df6-8a0e-b94160b29110', 'comment', 'a3b4e8aa-825a-4652-ae51-1b5cc8684b58', 'upvote', NOW() - INTERVAL '9 days'),
(gen_random_uuid(), '23b638ab-7200-44ec-a2b3-72dfb13bb692', 'comment', 'a3b4e8aa-825a-4652-ae51-1b5cc8684b58', 'upvote', NOW() - INTERVAL '9 days');


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
	CASE ((series - 1) % 15) + 1
WHEN 1 THEN '392e9bb0-f781-46ca-a404-60e740ae51b2'
WHEN 2 THEN '451be084-5506-411d-85d6-8b48d129510a'
WHEN 3 THEN 'cc66dd45-3963-45cc-80c9-b51c9a5a6174'
WHEN 4 THEN 'd76f8b1e-9c23-41ee-b764-cb3059784148'
WHEN 5 THEN '4b41b4ce-13ac-4c42-a91b-e004dd2053e3'
WHEN 6 THEN 'b482ea59-9138-49bf-bf28-7e71046d1607'
WHEN 7 THEN '1aef325a-be58-4e39-a7af-316970ad4ee1'
WHEN 8 THEN '799b02fe-012d-4ece-8c21-03c4e241ef79'
WHEN 9 THEN '558c7100-2dbf-47fc-be72-26a74902f8e4'
WHEN 10 THEN '1210fc91-6a34-4f1b-b7b7-1fffd69496ca'
WHEN 11 THEN '11d21406-c3df-486d-8df1-59eb50dda7e1'
WHEN 12 THEN 'b661df23-ed9c-4391-8bfe-4f3b45625b67'
WHEN 13 THEN 'f549ebc8-c9a9-4c36-ba76-66386dd3c956'
WHEN 14 THEN 'bf0ef47e-ee50-4862-b538-ea9a0039b6e1'
ELSE '4fc22052-86e9-470b-8316-4066b5706cc9'
END::uuid
FROM generate_series(1, 100) AS generated(series);

INSERT INTO discussion_tags (discussion_id, tag_id)
SELECT
	md5('generated-discussion-' || series)::uuid,
	CASE (series % 15) + 1
WHEN 1 THEN '392e9bb0-f781-46ca-a404-60e740ae51b2'
WHEN 2 THEN '451be084-5506-411d-85d6-8b48d129510a'
WHEN 3 THEN 'cc66dd45-3963-45cc-80c9-b51c9a5a6174'
WHEN 4 THEN 'd76f8b1e-9c23-41ee-b764-cb3059784148'
WHEN 5 THEN '4b41b4ce-13ac-4c42-a91b-e004dd2053e3'
WHEN 6 THEN 'b482ea59-9138-49bf-bf28-7e71046d1607'
WHEN 7 THEN '1aef325a-be58-4e39-a7af-316970ad4ee1'
WHEN 8 THEN '799b02fe-012d-4ece-8c21-03c4e241ef79'
WHEN 9 THEN '558c7100-2dbf-47fc-be72-26a74902f8e4'
WHEN 10 THEN '1210fc91-6a34-4f1b-b7b7-1fffd69496ca'
WHEN 11 THEN '11d21406-c3df-486d-8df1-59eb50dda7e1'
WHEN 12 THEN 'b661df23-ed9c-4391-8bfe-4f3b45625b67'
WHEN 13 THEN 'f549ebc8-c9a9-4c36-ba76-66386dd3c956'
WHEN 14 THEN 'bf0ef47e-ee50-4862-b538-ea9a0039b6e1'
ELSE '4fc22052-86e9-470b-8316-4066b5706cc9'
END::uuid
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
		WHEN 1 THEN '1b8f2e5c-f101-4cf7-befb-a0f2a810dda9'
		WHEN 2 THEN 'e51bf857-afd4-4df6-8a0e-b94160b29110'
		WHEN 3 THEN '23b638ab-7200-44ec-a2b3-72dfb13bb692'
		WHEN 4 THEN 'c70d8cdb-cae3-4d15-abeb-54646e1f7e42'
		WHEN 5 THEN 'fa9d8b99-b653-41f1-b502-d2969c71587f'
		WHEN 6 THEN 'd8c28a4b-ee6c-4b61-84ab-61fa3eb14cf3'
		WHEN 7 THEN 'fc9f94b5-e106-41b9-be15-9c14fe5bed55'
		WHEN 8 THEN '5597f5a2-6471-4718-bcfa-bebabbff3782'
		WHEN 9 THEN '4f6fe8db-040c-475a-a78a-d0e803cbff66'
		WHEN 10 THEN '0149fc6b-6724-4f4d-a067-32ab2348bd30'
		WHEN 11 THEN 'eb012d82-75a0-4318-aa37-7d9c5560c60e'
		WHEN 12 THEN 'a0b19fa4-9ab9-467f-8e14-e335edbd2ad5'
		WHEN 13 THEN 'ab37b700-f0ad-4989-80b3-e6eef6e5cc62'
		WHEN 14 THEN 'b83fa8a8-4457-4ee6-91b1-3b0a6e85be6a'
		ELSE '333e8936-96ae-420d-9399-645fe6dd3931'
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
