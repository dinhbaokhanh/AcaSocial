-- AcaSocial curated development seed.
-- Run after all services have started once and created/migrated their schemas.
-- PowerShell: Get-Content scripts\seed.sql -Raw | docker exec -i acasocial-postgres psql -U postgres -v ON_ERROR_STOP=1
-- Every seeded account uses Password123!
-- WARNING: destructive; never run against production data.
\set ON_ERROR_STOP on

-- =============================================================================
-- Identity
-- =============================================================================
\connect db
BEGIN;
DELETE FROM refresh_tokens;
DELETE FROM user_role_audits;
DELETE FROM users;
INSERT INTO users (
 id, username, full_name, date_of_birth, email, password_hash, avatar_url,
 privacy, is_verified, role, password_changed_at, last_login_at, created_at, updated_at
) VALUES
('10000000-0000-4000-8000-000000000001','acasocial_admin','Nguyễn Minh Quản','1988-06-12','admin@acasocial.edu.vn','$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG','https://i.pravatar.cc/150?img=12','public',true,'admin',NULL,NOW()-INTERVAL '30 minutes',NOW()-INTERVAL '600 days',NOW()),
('10000000-0000-4000-8000-000000000002','mod_hoangminh','Hoàng Minh Đức','1995-02-21','moderator@acasocial.edu.vn','$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG','https://i.pravatar.cc/150?img=11','public',true,'moderator',NULL,NOW()-INTERVAL '2 hours',NOW()-INTERVAL '420 days',NOW()),
('10000000-0000-4000-8000-000000000101','ts_nguyen_an','TS. Nguyễn Hoàng An','1979-03-15','an.nguyen@acasocial.edu.vn','$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG','https://i.pravatar.cc/150?img=13','public',true,'teacher',NULL,NOW()-INTERVAL '3 hours',NOW()-INTERVAL '500 days',NOW()),
('10000000-0000-4000-8000-000000000102','pgs_tran_binh','PGS. TS. Trần Thu Bình','1976-07-20','binh.tran@acasocial.edu.vn','$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG','https://i.pravatar.cc/150?img=47','public',true,'teacher',NULL,NOW()-INTERVAL '1 day',NOW()-INTERVAL '540 days',NOW()),
('10000000-0000-4000-8000-000000000103','ths_le_cuong','ThS. Lê Việt Cường','1985-11-05','cuong.le@acasocial.edu.vn','$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG','https://i.pravatar.cc/150?img=52','public',true,'teacher',NULL,NOW()-INTERVAL '5 hours',NOW()-INTERVAL '390 days',NOW()),
('10000000-0000-4000-8000-000000000104','ts_pham_dung','TS. Phạm Thùy Dung','1981-02-28','dung.pham@acasocial.edu.vn','$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG','https://i.pravatar.cc/150?img=45','public',true,'teacher',NULL,NOW()-INTERVAL '8 hours',NOW()-INTERVAL '360 days',NOW()),
('10000000-0000-4000-8000-000000000201','trungkien_d21','Nguyễn Trung Kiên','2003-04-12','kien.nguyen@acasocial.edu.vn','$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG','https://i.pravatar.cc/150?img=3','public',true,'student',NULL,NOW()-INTERVAL '1 hour',NOW()-INTERVAL '210 days',NOW()),
('10000000-0000-4000-8000-000000000202','lananh_d22','Lê Lan Anh','2004-09-25','lananh.le@acasocial.edu.vn','$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG','https://i.pravatar.cc/150?img=44','public',true,'student',NULL,NOW()-INTERVAL '2 hours',NOW()-INTERVAL '180 days',NOW()),
('10000000-0000-4000-8000-000000000203','minhtuan_d21','Trần Minh Tuấn','2003-12-03','tuan.tran@acasocial.edu.vn','$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG','https://i.pravatar.cc/150?img=7','public',true,'student',NULL,NOW()-INTERVAL '4 hours',NOW()-INTERVAL '160 days',NOW()),
('10000000-0000-4000-8000-000000000204','thanhha_d22','Phạm Thành Hà','2004-03-17','ha.pham@acasocial.edu.vn','$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG','https://i.pravatar.cc/150?img=9','public',true,'student',NULL,NOW()-INTERVAL '1 day',NOW()-INTERVAL '145 days',NOW()),
('10000000-0000-4000-8000-000000000205','ngocmai_d23','Vũ Ngọc Mai','2005-01-14','mai.vu@acasocial.edu.vn','$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG','https://i.pravatar.cc/150?img=49','private',true,'student',NULL,NOW()-INTERVAL '3 hours',NOW()-INTERVAL '95 days',NOW()),
('10000000-0000-4000-8000-000000000206','ducmanh_d21','Ngô Đức Mạnh','2003-08-22','manh.ngo@acasocial.edu.vn','$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG','https://i.pravatar.cc/150?img=15','public',true,'student',NULL,NOW()-INTERVAL '6 hours',NOW()-INTERVAL '120 days',NOW()),
('10000000-0000-4000-8000-000000000207','huyenphuong_d22','Đặng Huyền Phương','2004-11-08','phuong.dang@acasocial.edu.vn','$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG','https://i.pravatar.cc/150?img=41','public',true,'student',NULL,NOW()-INTERVAL '7 hours',NOW()-INTERVAL '110 days',NOW()),
('10000000-0000-4000-8000-000000000208','quocbao_d23','Lê Quốc Bảo','2005-07-30','bao.le@acasocial.edu.vn','$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG','https://i.pravatar.cc/150?img=18','public',true,'student',NULL,NOW()-INTERVAL '9 hours',NOW()-INTERVAL '75 days',NOW());
COMMIT;

-- =============================================================================
-- Academic catalog: Major -> Curriculum -> Course -> Topic
-- =============================================================================
\connect academic_db
BEGIN;
DELETE FROM course_topics;
DELETE FROM topics;
DELETE FROM curriculum_courses;
DELETE FROM curricula;
DELETE FROM courses;
DELETE FROM majors;
INSERT INTO majors (id,code,name,description,status) VALUES
('20000000-0000-4000-8000-000000000001','CNTT','Công nghệ thông tin','Phát triển phần mềm, dữ liệu, AI và hạ tầng tính toán.','active'),
('20000000-0000-4000-8000-000000000002','ATTT','An toàn thông tin','Mật mã, an toàn hệ thống, mạng và quản trị rủi ro.','active');
INSERT INTO courses (id,code,name,description,status) VALUES
('21000000-0000-4000-8000-000000000001','INT2211','Cơ sở dữ liệu','Mô hình quan hệ, SQL, chuẩn hóa, giao dịch và tối ưu truy vấn.','active'),
('21000000-0000-4000-8000-000000000002','INT2204','Mạng máy tính','Kiến trúc TCP/IP, định tuyến, DNS và điều khiển tắc nghẽn.','active'),
('21000000-0000-4000-8000-000000000003','INT2210','Cấu trúc dữ liệu và giải thuật','Phân tích độ phức tạp, cấu trúc dữ liệu và thiết kế giải thuật.','active'),
('21000000-0000-4000-8000-000000000004','INT3405','Học máy','Đánh giá mô hình, học có giám sát và regularization.','active'),
('21000000-0000-4000-8000-000000000005','SEC3102','An toàn ứng dụng Web','Threat modeling, xác thực, quản lý phiên và OWASP Top 10.','active'),
('21000000-0000-4000-8000-000000000006','INT2203','Lập trình hướng đối tượng','Trừu tượng hóa, SOLID và kiểm thử thiết kế.','active');
INSERT INTO curricula (id,major_id,version,effective_year,status) VALUES
('22000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','2024',2024,'active'),
('22000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','2024',2024,'active');
INSERT INTO curriculum_courses (id,curriculum_id,course_id,course_type,recommended_semester,display_order) VALUES
('23000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','required',4,1),
('23000000-0000-4000-8000-000000000002','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000002','required',4,2),
('23000000-0000-4000-8000-000000000003','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000003','required',3,3),
('23000000-0000-4000-8000-000000000004','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000004','elective',7,4),
('23000000-0000-4000-8000-000000000005','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000006','required',3,5),
('23000000-0000-4000-8000-000000000006','22000000-0000-4000-8000-000000000002','21000000-0000-4000-8000-000000000002','required',3,1),
('23000000-0000-4000-8000-000000000007','22000000-0000-4000-8000-000000000002','21000000-0000-4000-8000-000000000005','required',5,2);
INSERT INTO topics (id,code,name,description,parent_topic_id,taxonomy_version,status) VALUES
('24000000-0000-4000-8000-000000000001','DB_TRANSACTION','Giao dịch và đồng thời','ACID, MVCC và isolation level.',NULL,1,'active'),
('24000000-0000-4000-8000-000000000002','DB_INDEX','Chỉ mục và tối ưu truy vấn','B-tree, composite index và execution plan.',NULL,1,'active'),
('24000000-0000-4000-8000-000000000003','TCP','TCP và điều khiển tắc nghẽn','Reliability, flow control và congestion control.',NULL,1,'active'),
('24000000-0000-4000-8000-000000000004','GRAPH_ALGORITHM','Giải thuật đồ thị','Shortest path và graph traversal.',NULL,1,'active'),
('24000000-0000-4000-8000-000000000005','ML_EVALUATION','Đánh giá mô hình','Data split, calibration và metric.',NULL,1,'active'),
('24000000-0000-4000-8000-000000000006','AUTH_SECURITY','Xác thực và quản lý phiên','Password hashing, cookie và CSRF.',NULL,1,'active'),
('24000000-0000-4000-8000-000000000007','SOLID','Nguyên lý SOLID','Thiết kế dễ thay đổi và kiểm thử.',NULL,1,'active');
INSERT INTO course_topics (course_id,topic_id,relevance_weight) VALUES
('21000000-0000-4000-8000-000000000001','24000000-0000-4000-8000-000000000001',1),
('21000000-0000-4000-8000-000000000001','24000000-0000-4000-8000-000000000002',1),
('21000000-0000-4000-8000-000000000002','24000000-0000-4000-8000-000000000003',1),
('21000000-0000-4000-8000-000000000003','24000000-0000-4000-8000-000000000004',1),
('21000000-0000-4000-8000-000000000004','24000000-0000-4000-8000-000000000005',1),
('21000000-0000-4000-8000-000000000005','24000000-0000-4000-8000-000000000006',1),
('21000000-0000-4000-8000-000000000006','24000000-0000-4000-8000-000000000007',1);

COMMIT;

-- =============================================================================
-- Discussion community
-- =============================================================================
\connect discussion_db
BEGIN;
DELETE FROM moderation_audit_logs;
DELETE FROM content_reports;
DELETE FROM moderation_cases;
DELETE FROM moderation_reviews;
DELETE FROM ai_inference_runs;
DELETE FROM answer_acceptances;
DELETE FROM answer_revisions;
DELETE FROM answers;
DELETE FROM discussion_tag_assignments;
DELETE FROM discussion_revisions;
DELETE FROM votes;
DELETE FROM comments;
DELETE FROM discussion_tags;
DELETE FROM discussion_media;
DELETE FROM discussions;
DELETE FROM room_rules;
DELETE FROM room_memberships;
DELETE FROM room_academic_bindings;
DELETE FROM rooms;
DELETE FROM tags;
DELETE FROM discussion_outbox;

INSERT INTO rooms (id,slug,name,description,room_type,parent_room_id,visibility,membership_policy,posting_policy,status,created_by,start_at,end_at,rules_version) VALUES
('30000000-0000-4000-8000-000000000001','general','General','Kỹ năng học tập, nghiên cứu và thông tin chung.','forum',NULL,'public','open','anyone','active','10000000-0000-4000-8000-000000000001',NULL,NULL,2),
('30000000-0000-4000-8000-000000000002','off-topic','Ngoài lề','Không gian trò chuyện cộng đồng.','forum',NULL,'public','open','anyone','active','10000000-0000-4000-8000-000000000001',NULL,NULL,2),
('30000000-0000-4000-8000-000000000010','cong-nghe-thong-tin','Công nghệ thông tin','Room chính thức của chuyên ngành CNTT.','major',NULL,'public','open','members','active','10000000-0000-4000-8000-000000000001',NULL,NULL,2),
('30000000-0000-4000-8000-000000000011','an-toan-thong-tin','An toàn thông tin','Room chính thức của chuyên ngành ATTT.','major',NULL,'public','open','members','active','10000000-0000-4000-8000-000000000001',NULL,NULL,2);
INSERT INTO rooms (id,slug,name,description,room_type,parent_room_id,visibility,membership_policy,posting_policy,status,created_by,start_at,end_at,rules_version) VALUES
('30000000-0000-4000-8000-000000000101','co-so-du-lieu','Cơ sở dữ liệu','SQL, mô hình dữ liệu, transaction và tối ưu truy vấn.','course','30000000-0000-4000-8000-000000000010','public','open','members','active','10000000-0000-4000-8000-000000000001',NULL,NULL,2),
('30000000-0000-4000-8000-000000000102','mang-may-tinh','Mạng máy tính','TCP/IP, DNS, routing và vận hành mạng.','course','30000000-0000-4000-8000-000000000010','public','open','members','active','10000000-0000-4000-8000-000000000001',NULL,NULL,2),
('30000000-0000-4000-8000-000000000103','cau-truc-du-lieu-giai-thuat','Cấu trúc dữ liệu và giải thuật','Phân tích độ phức tạp và thiết kế giải thuật.','course','30000000-0000-4000-8000-000000000010','public','open','members','active','10000000-0000-4000-8000-000000000001',NULL,NULL,2),
('30000000-0000-4000-8000-000000000104','hoc-may','Học máy','Dữ liệu, huấn luyện và đánh giá mô hình.','course','30000000-0000-4000-8000-000000000010','public','open','members','active','10000000-0000-4000-8000-000000000001',NULL,NULL,2),
('30000000-0000-4000-8000-000000000105','an-toan-ung-dung-web','An toàn ứng dụng Web','Xác thực, quản lý phiên và lỗ hổng Web.','course','30000000-0000-4000-8000-000000000011','public','open','members','active','10000000-0000-4000-8000-000000000001',NULL,NULL,2),
('30000000-0000-4000-8000-000000000106','lap-trinh-huong-doi-tuong','Lập trình hướng đối tượng','SOLID và chất lượng thiết kế phần mềm.','course','30000000-0000-4000-8000-000000000010','public','open','members','active','10000000-0000-4000-8000-000000000001',NULL,NULL,2),
('30000000-0000-4000-8000-000000000201','seminar-nghien-cuu-2026','Seminar phương pháp nghiên cứu 2026','Tài liệu và câu hỏi cho chuỗi seminar.','event',NULL,'public','open','members','active','10000000-0000-4000-8000-000000000101',NOW()-INTERVAL '15 days',NOW()+INTERVAL '75 days',2);
INSERT INTO room_academic_bindings (room_id,major_id,curriculum_id,course_id,curriculum_course_id) VALUES
('30000000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000001',NULL,NULL,NULL),
('30000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000002',NULL,NULL,NULL),
('30000000-0000-4000-8000-000000000101','20000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001'),
('30000000-0000-4000-8000-000000000102','20000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000002','23000000-0000-4000-8000-000000000002'),
('30000000-0000-4000-8000-000000000103','20000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000003','23000000-0000-4000-8000-000000000003'),
('30000000-0000-4000-8000-000000000104','20000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000004','23000000-0000-4000-8000-000000000004'),
('30000000-0000-4000-8000-000000000105','20000000-0000-4000-8000-000000000002','22000000-0000-4000-8000-000000000002','21000000-0000-4000-8000-000000000005','23000000-0000-4000-8000-000000000007'),
('30000000-0000-4000-8000-000000000106','20000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000006','23000000-0000-4000-8000-000000000005');
INSERT INTO room_rules (room_id,rule_code,title,description,severity,version,active)
SELECT id,'CIVILITY','Tranh luận vào vấn đề','Không công kích cá nhân; phản biện cần luận điểm và bằng chứng.','high',1,true FROM rooms;
INSERT INTO room_rules (room_id,rule_code,title,description,severity,version,active)
SELECT id,'SCOPE','Đăng đúng phạm vi room','Nội dung và tag phải phù hợp chuyên ngành hoặc môn học.','medium',1,true FROM rooms WHERE room_type IN ('major','course');
INSERT INTO room_memberships (room_id,user_id,role,status,assigned_by)
SELECT id,'10000000-0000-4000-8000-000000000001','owner','active','10000000-0000-4000-8000-000000000001' FROM rooms;
INSERT INTO room_memberships (room_id,user_id,role,status,assigned_by)
SELECT id,'10000000-0000-4000-8000-000000000002','moderator','active','10000000-0000-4000-8000-000000000001' FROM rooms;
INSERT INTO room_memberships (room_id,user_id,role,status,assigned_by)
SELECT r.id,u.id::uuid,'member','active','10000000-0000-4000-8000-000000000001'
FROM rooms r CROSS JOIN (VALUES
 ('10000000-0000-4000-8000-000000000201'),('10000000-0000-4000-8000-000000000202'),
 ('10000000-0000-4000-8000-000000000203'),('10000000-0000-4000-8000-000000000204'),
 ('10000000-0000-4000-8000-000000000205'),('10000000-0000-4000-8000-000000000206'),
 ('10000000-0000-4000-8000-000000000207'),('10000000-0000-4000-8000-000000000208')
) u(id) ON CONFLICT (room_id,user_id) DO NOTHING;
INSERT INTO room_memberships (room_id,user_id,role,status,assigned_by) VALUES
('30000000-0000-4000-8000-000000000101','10000000-0000-4000-8000-000000000101','contributor','active','10000000-0000-4000-8000-000000000001'),
('30000000-0000-4000-8000-000000000102','10000000-0000-4000-8000-000000000102','contributor','active','10000000-0000-4000-8000-000000000001'),
('30000000-0000-4000-8000-000000000103','10000000-0000-4000-8000-000000000103','contributor','active','10000000-0000-4000-8000-000000000001'),
('30000000-0000-4000-8000-000000000104','10000000-0000-4000-8000-000000000103','contributor','active','10000000-0000-4000-8000-000000000001'),
('30000000-0000-4000-8000-000000000105','10000000-0000-4000-8000-000000000104','contributor','active','10000000-0000-4000-8000-000000000001'),
('30000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000101','contributor','active','10000000-0000-4000-8000-000000000001'),
('30000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000104','contributor','active','10000000-0000-4000-8000-000000000001'),
('30000000-0000-4000-8000-000000000201','10000000-0000-4000-8000-000000000101','owner','active','10000000-0000-4000-8000-000000000001');

INSERT INTO tags (id,name,slug,description,usage_count) VALUES
('40000000-0000-4000-8000-000000000001','Giao dịch cơ sở dữ liệu','giao-dich-co-so-du-lieu','ACID, MVCC và isolation level.',0),
('40000000-0000-4000-8000-000000000002','SQL và chỉ mục','sql-va-chi-muc','SQL, execution plan và index.',0),
('40000000-0000-4000-8000-000000000003','TCP/IP','tcp-ip','Giao thức và điều khiển tắc nghẽn.',0),
('40000000-0000-4000-8000-000000000004','Giải thuật đồ thị','giai-thuat-do-thi','Shortest path và graph traversal.',0),
('40000000-0000-4000-8000-000000000005','Đánh giá mô hình','danh-gia-mo-hinh','Cross-validation, metric và leakage.',0),
('40000000-0000-4000-8000-000000000006','Web Security','web-security','Bảo vệ ứng dụng Web.',0),
('40000000-0000-4000-8000-000000000007','SOLID','solid','Nguyên lý thiết kế hướng đối tượng.',0),
('40000000-0000-4000-8000-000000000008','Phương pháp nghiên cứu','phuong-phap-nghien-cuu','Thiết kế thực nghiệm và tái lập.',0),
('40000000-0000-4000-8000-000000000009','Kỹ năng học tập','ky-nang-hoc-tap','Ghi nhớ và tự học.',0),
('40000000-0000-4000-8000-000000000010','Cộng đồng','cong-dong','Trao đổi chung trong cộng đồng.',0),
('40000000-0000-4000-8000-000000000011','Nghề nghiệp CNTT','nghe-nghiep-cntt','Định hướng học tập và nghề nghiệp.',0);

INSERT INTO discussions (id,room_id,major_id,curriculum_id,course_id,curriculum_course_id,title,content,post_type,status,author_id,is_anonymous,upvote_count,downvote_count,comment_count,answer_count,view_count,accepted_comment_id,accepted_answer_id,content_version,created_at,updated_at) VALUES
('50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000101','20000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001','MVCC ngăn dirty read nhưng vì sao vẫn có write skew?',E'Trong PostgreSQL, hai transaction có thể cùng đọc một invariant rồi cập nhật hai hàng khác nhau. Đó có phải write skew không? Vì sao khóa từng hàng chưa đủ, và khi nào nên dùng `SERIALIZABLE` thay cho `REPEATABLE READ`?','question','solved','10000000-0000-4000-8000-000000000201',false,0,0,0,2,286,NULL,'60000000-0000-4000-8000-000000000001',1,NOW()-INTERVAL '28 days',NOW()-INTERVAL '27 days'),
('50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000101','20000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001','Thứ tự cột trong composite index ảnh hưởng truy vấn thế nào?',E'Bảng `orders(customer_id, status, created_at)` có index `(customer_id, status, created_at)`. Truy vấn bỏ qua `status` có tận dụng tốt `created_at` không? Em muốn hiểu leftmost prefix và khi nào cần index `(customer_id, created_at)` riêng.','question','open','10000000-0000-4000-8000-000000000205',false,0,0,0,1,174,NULL,NULL,1,NOW()-INTERVAL '18 days',NOW()-INTERVAL '18 days'),
('50000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000102','20000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000002','23000000-0000-4000-8000-000000000002','Vì sao TCP cần congestion control ngoài flow control?',E'Flow control dùng receive window để bảo vệ máy nhận. Vậy congestion window giải quyết vấn đề gì? Em muốn phân biệt `rwnd`, `cwnd`, slow start và congestion avoidance bằng một ví dụ cụ thể.','question','solved','10000000-0000-4000-8000-000000000202',false,0,0,0,1,241,NULL,'60000000-0000-4000-8000-000000000003',1,NOW()-INTERVAL '24 days',NOW()-INTERVAL '23 days'),
('50000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000103','20000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000003','23000000-0000-4000-8000-000000000003','Tại sao Dijkstra không đúng khi đồ thị có cạnh âm?',E'Em biết Dijkstra chốt đỉnh có khoảng cách nhỏ nhất hiện tại. Có thể đưa ra phản ví dụ nhỏ nhất và giải thích khi nào nên chuyển sang Bellman–Ford không?','question','solved','10000000-0000-4000-8000-000000000203',false,0,0,0,1,318,NULL,'60000000-0000-4000-8000-000000000004',1,NOW()-INTERVAL '21 days',NOW()-INTERVAL '20 days'),
('50000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000104','20000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000004','23000000-0000-4000-8000-000000000004','Data leakage xảy ra trước hay sau khi chia train-validation?',E'Nếu chuẩn hóa feature bằng mean và variance của toàn bộ dataset rồi mới chia, preprocessing đã dùng thông tin validation. Đây có phải leakage không? Pipeline đúng có phải fit scaler trên train rồi transform validation không?','question','solved','10000000-0000-4000-8000-000000000204',false,0,0,0,1,356,NULL,'60000000-0000-4000-8000-000000000005',1,NOW()-INTERVAL '16 days',NOW()-INTERVAL '15 days'),
('50000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000105','20000000-0000-4000-8000-000000000002','22000000-0000-4000-8000-000000000002','21000000-0000-4000-8000-000000000005','23000000-0000-4000-8000-000000000007','Vì sao Argon2id phù hợp lưu mật khẩu hơn SHA-256?',E'Cả hai đều là hàm một chiều, nhưng password hashing cần salt, memory cost và khả năng điều chỉnh thời gian. Nên lưu những tham số nào cùng hash để sau này nâng cost?','question','solved','10000000-0000-4000-8000-000000000206',false,0,0,0,1,302,NULL,'60000000-0000-4000-8000-000000000006',1,NOW()-INTERVAL '19 days',NOW()-INTERVAL '18 days'),
('50000000-0000-4000-8000-000000000007','30000000-0000-4000-8000-000000000106','20000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000006','23000000-0000-4000-8000-000000000005','Liskov Substitution bị vi phạm trong ví dụ Rectangle–Square ra sao?',E'Nếu Square override setter để luôn giữ hai cạnh bằng nhau, client đặt width rồi height sẽ nhận diện tích khác contract Rectangle. Có phải subtype đã đưa ra invariant mạnh hơn? Nên dùng interface bất biến hay hai type độc lập?','question','open','10000000-0000-4000-8000-000000000207',false,0,0,0,1,148,NULL,NULL,1,NOW()-INTERVAL '7 days',NOW()-INTERVAL '7 days'),
('50000000-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000105','20000000-0000-4000-8000-000000000002','22000000-0000-4000-8000-000000000002','21000000-0000-4000-8000-000000000005','23000000-0000-4000-8000-000000000007','CORS không phải cơ chế phòng chống CSRF',E'CORS quyết định JavaScript ở origin nào được đọc response; CSRF lợi dụng trình duyệt tự gắn credential. Phòng vệ nên kết hợp SameSite cookie, CSRF token, kiểm tra Origin và không thay đổi trạng thái bằng GET.','discussion','open','10000000-0000-4000-8000-000000000104',false,0,0,2,0,265,NULL,NULL,1,NOW()-INTERVAL '9 days',NOW()-INTERVAL '9 days'),
('50000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000001',NULL,NULL,NULL,'Lộ trình năm hai: học nền tảng trước khi chạy theo framework',E'Một lộ trình cân bằng gồm giải thuật, cơ sở dữ liệu, mạng, hệ điều hành, kỹ nghệ phần mềm và một ngôn ngữ học đủ sâu. Framework là nơi áp dụng nguyên lý, không thay thế nền tảng. Mỗi học kỳ nên hoàn thành một sản phẩm có test và tài liệu thiết kế.','discussion','open','10000000-0000-4000-8000-000000000101',false,0,0,2,0,412,NULL,NULL,1,NOW()-INTERVAL '13 days',NOW()-INTERVAL '13 days'),
('50000000-0000-4000-8000-000000000010','30000000-0000-4000-8000-000000000001',NULL,NULL,NULL,NULL,'Cách đọc RFC mà không bị ngợp bởi thuật ngữ',E'Đọc Abstract, Introduction và Terminology trước; sau đó vẽ message flow. MUST, SHOULD, MAY có nghĩa chuẩn theo BCP 14. Cuối cùng kiểm tra errata và RFC cập nhật hoặc thay thế tài liệu gốc.','discussion','open','10000000-0000-4000-8000-000000000102',false,0,0,2,0,366,NULL,NULL,1,NOW()-INTERVAL '6 days',NOW()-INTERVAL '6 days'),
('50000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000002',NULL,NULL,NULL,NULL,'Góc làm việc yên tĩnh: bàn phím cơ có thực sự cần thiết?',E'Bàn phím cơ không tự làm tăng năng suất. Hãy ưu tiên tư thế cổ tay trung tính, lực nhấn phù hợp và tiếng ồn không ảnh hưởng người xung quanh. Ở thư viện, switch silent hoặc bàn phím màng tốt thường phù hợp hơn.','discussion','open','10000000-0000-4000-8000-000000000208',false,0,0,1,0,121,NULL,NULL,1,NOW()-INTERVAL '3 days',NOW()-INTERVAL '3 days'),
('50000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000201',NULL,NULL,NULL,NULL,'Checklist để một thí nghiệm có thể tái lập',E'Mỗi nhóm cần ghi câu hỏi nghiên cứu, dataset và giấy phép, random seed, phiên bản code/dependency, phần cứng, metric kèm uncertainty, preprocessing và quyết định loại dữ liệu. Kết quả âm cũng cần được ghi nhận nếu phương pháp hợp lệ.','discussion','open','10000000-0000-4000-8000-000000000101',false,0,0,1,0,276,NULL,NULL,1,NOW()-INTERVAL '2 days',NOW()-INTERVAL '2 days'),
('50000000-0000-4000-8000-000000000013','30000000-0000-4000-8000-000000000001',NULL,NULL,NULL,NULL,'Chọn đúng room giúp câu hỏi nhận phản hồi tốt hơn',E'Bài về một môn cụ thể nên vào room môn học để nhận đúng chủ đề, người tham gia và nội quy phù hợp. Bài định hướng ngành vào room chuyên ngành; kỹ năng học tập chung vào General; nội dung trò chuyện vào Ngoài lề. Tag mô tả chủ đề bên trong room, không thay thế cho việc chọn room.','discussion','open','10000000-0000-4000-8000-000000000001',false,0,0,0,0,183,NULL,NULL,1,NOW()-INTERVAL '4 days',NOW()-INTERVAL '4 days'),
('50000000-0000-4000-8000-000000000014','30000000-0000-4000-8000-000000000001',NULL,NULL,NULL,NULL,'Phản biện học thuật nên chỉ ra mệnh đề, bằng chứng và giới hạn',E'Khi không đồng ý, hãy trích đúng mệnh đề cần phản biện, nêu bằng chứng hoặc phản ví dụ có thể kiểm tra, rồi phân biệt giữa dữ kiện, suy luận và quan điểm. Nếu nguồn có giới hạn về mẫu hoặc bối cảnh, hãy nói rõ giới hạn thay vì quy kết động cơ cho người viết.','discussion','open','10000000-0000-4000-8000-000000000002',false,0,0,0,0,214,NULL,NULL,1,NOW()-INTERVAL '3 days',NOW()-INTERVAL '3 days');

INSERT INTO discussion_revisions (discussion_id,content_version,title,content,revision_type,edited_by,created_at)
SELECT id,content_version,title,content,'semantic',author_id,created_at FROM discussions;
INSERT INTO discussion_tags (discussion_id,tag_id) VALUES
('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001'),
('50000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002'),
('50000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000003'),
('50000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000004'),
('50000000-0000-4000-8000-000000000005','40000000-0000-4000-8000-000000000005'),
('50000000-0000-4000-8000-000000000006','40000000-0000-4000-8000-000000000006'),
('50000000-0000-4000-8000-000000000007','40000000-0000-4000-8000-000000000007'),
('50000000-0000-4000-8000-000000000008','40000000-0000-4000-8000-000000000006'),
('50000000-0000-4000-8000-000000000009','40000000-0000-4000-8000-000000000011'),
('50000000-0000-4000-8000-000000000010','40000000-0000-4000-8000-000000000008'),
('50000000-0000-4000-8000-000000000011','40000000-0000-4000-8000-000000000010'),
('50000000-0000-4000-8000-000000000012','40000000-0000-4000-8000-000000000008'),
('50000000-0000-4000-8000-000000000013','40000000-0000-4000-8000-000000000010'),
('50000000-0000-4000-8000-000000000014','40000000-0000-4000-8000-000000000008');


INSERT INTO answers (id,discussion_id,author_id,content,is_anonymous,content_version,upvote_count,downvote_count,created_at,updated_at) VALUES
('60000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000101',E'Đây là **write skew**: mỗi transaction cập nhật một hàng khác nhau nên khóa hàng không xung đột, nhưng cùng dựa trên snapshot cũ và làm hỏng invariant nhiều hàng. PostgreSQL `REPEATABLE READ` là snapshot isolation; `SERIALIZABLE` dùng SSI để phát hiện cấu trúc nguy hiểm và hủy một transaction. Ứng dụng phải retry toàn bộ transaction. Nếu invariant có thể biểu diễn bằng constraint hoặc một hàng khóa chung thì đó cũng là giải pháp rõ ràng.',false,1,18,0,NOW()-INTERVAL '27 days',NOW()-INTERVAL '27 days'),
('60000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000203','Có thể khóa một hàng đại diện cho invariant tổng thể trước khi cập nhật. Cách này buộc transaction tuần tự hóa tại điểm khóa nhưng có thể thành bottleneck.',false,1,7,0,NOW()-INTERVAL '26 days',NOW()-INTERVAL '26 days'),
('60000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000102',E'`rwnd` phản ánh bộ đệm receiver, còn `cwnd` là ước lượng của sender về năng lực mạng. Dữ liệu đang bay bị giới hạn bởi `min(rwnd, cwnd)`. Slow start tăng nhanh để dò đường truyền; congestion avoidance tăng thận trọng hơn. Receiver khỏe không có nghĩa các router trung gian còn đủ hàng đợi.',false,1,21,0,NOW()-INTERVAL '23 days',NOW()-INTERVAL '23 days'),
('60000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000103',E'Phản ví dụ: `s→a=2`, `s→b=5`, `b→a=-4`. Dijkstra chốt a ở 2, nhưng đường qua b có tổng 1. Greedy chỉ đúng khi mọi cạnh không âm. Bellman–Ford chấp nhận cạnh âm và phát hiện chu trình âm reachable từ nguồn, đổi lại thời gian O(VE).',false,1,25,0,NOW()-INTERVAL '20 days',NOW()-INTERVAL '20 days'),
('60000000-0000-4000-8000-000000000005','50000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000103','Đó là leakage vì tham số preprocessing đã được ước lượng từ validation. Chia trước; fit scaler, imputer và feature selector chỉ trên train; rồi transform validation/test. Trong cross-validation, preprocessing phải nằm trong pipeline để fit lại trong từng fold.',false,1,29,0,NOW()-INTERVAL '15 days',NOW()-INTERVAL '15 days'),
('60000000-0000-4000-8000-000000000006','50000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000104','SHA-256 rất nhanh nên attacker thử được lượng lớn mật khẩu. Argon2id có salt, chi phí bộ nhớ, số vòng và mức song song có thể cấu hình. Chuỗi hash chuẩn lưu version, memory, time, parallelism, salt và output; khi đăng nhập thành công có thể rehash bằng policy mới.',false,1,23,0,NOW()-INTERVAL '18 days',NOW()-INTERVAL '18 days'),
('60000000-0000-4000-8000-000000000007','50000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000101','Subtype Square đặt invariant mạnh hơn trong khi API Rectangle cho phép thay width và height độc lập. Nên dùng mô hình bất biến với interface chỉ đọc như `Shape.area()`, hoặc hai type ngang hàng nếu nghiệp vụ cần thay đổi cạnh độc lập.',false,1,12,0,NOW()-INTERVAL '6 days',NOW()-INTERVAL '6 days');
INSERT INTO answer_revisions (answer_id,content_version,content,revision_type,edited_by,created_at)
SELECT id,content_version,content,'semantic',author_id,created_at FROM answers;
INSERT INTO answer_acceptances (discussion_id,answer_id,question_version,answer_version,accepted_by,accepted_at) VALUES
('50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',1,1,'10000000-0000-4000-8000-000000000201',NOW()-INTERVAL '26 days'),
('50000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000003',1,1,'10000000-0000-4000-8000-000000000202',NOW()-INTERVAL '22 days'),
('50000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000004',1,1,'10000000-0000-4000-8000-000000000203',NOW()-INTERVAL '19 days'),
('50000000-0000-4000-8000-000000000005','60000000-0000-4000-8000-000000000005',1,1,'10000000-0000-4000-8000-000000000204',NOW()-INTERVAL '14 days'),
('50000000-0000-4000-8000-000000000006','60000000-0000-4000-8000-000000000006',1,1,'10000000-0000-4000-8000-000000000206',NOW()-INTERVAL '17 days');


INSERT INTO comments (id,discussion_id,author_id,content,parent_comment_id,is_anonymous,upvote_count,downvote_count,created_at,updated_at) VALUES
('70000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000205','SameSite=Lax có đủ cho mọi endpoint thay đổi trạng thái không ạ?',NULL,false,0,0,NOW()-INTERVAL '8 days',NOW()-INTERVAL '8 days'),
('70000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000104','Không nên dùng một lớp duy nhất. Kiểm tra Origin và CSRF token vẫn hữu ích, nhất là khi có flow cross-site hợp lệ.','70000000-0000-4000-8000-000000000001',false,0,0,NOW()-INTERVAL '8 days',NOW()-INTERVAL '8 days'),
('70000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000203','Viết test cho project nhỏ giúp em hiểu dependency và interface nhanh hơn chỉ đọc pattern.',NULL,false,0,0,NOW()-INTERVAL '12 days',NOW()-INTERVAL '12 days'),
('70000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000101','Đúng. Một project tốt buộc người học quan sát và giải thích hành vi hệ thống, không chỉ hoàn thiện màn hình.','70000000-0000-4000-8000-000000000003',false,0,0,NOW()-INTERVAL '11 days',NOW()-INTERVAL '11 days'),
('70000000-0000-4000-8000-000000000005','50000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000201','Vẽ message flow trước giúp em không lạc vào implementation quá sớm.',NULL,false,0,0,NOW()-INTERVAL '5 days',NOW()-INTERVAL '5 days'),
('70000000-0000-4000-8000-000000000006','50000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000102','Nhớ kiểm tra mục Updates/Obsoletes để không đọc đặc tả đã bị thay thế.','70000000-0000-4000-8000-000000000005',false,0,0,NOW()-INTERVAL '5 days',NOW()-INTERVAL '5 days'),
('70000000-0000-4000-8000-000000000007','50000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000205','Em ưu tiên chỉnh chiều cao bàn và màn hình trước khi đổi bàn phím.',NULL,false,0,0,NOW()-INTERVAL '2 days',NOW()-INTERVAL '2 days'),
('70000000-0000-4000-8000-000000000008','50000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000204','Nhóm em sẽ bổ sung data dictionary và script dựng environment từ đầu.',NULL,false,0,0,NOW()-INTERVAL '1 day',NOW()-INTERVAL '1 day');

INSERT INTO votes (user_id,target_type,target_id,vote_type,created_at) VALUES
('10000000-0000-4000-8000-000000000202','discussion','50000000-0000-4000-8000-000000000001','upvote',NOW()-INTERVAL '27 days'),
('10000000-0000-4000-8000-000000000203','discussion','50000000-0000-4000-8000-000000000001','upvote',NOW()-INTERVAL '26 days'),
('10000000-0000-4000-8000-000000000204','discussion','50000000-0000-4000-8000-000000000003','upvote',NOW()-INTERVAL '22 days'),
('10000000-0000-4000-8000-000000000207','discussion','50000000-0000-4000-8000-000000000004','upvote',NOW()-INTERVAL '18 days'),
('10000000-0000-4000-8000-000000000206','discussion','50000000-0000-4000-8000-000000000005','upvote',NOW()-INTERVAL '13 days'),
('10000000-0000-4000-8000-000000000208','discussion','50000000-0000-4000-8000-000000000006','upvote',NOW()-INTERVAL '16 days'),
('10000000-0000-4000-8000-000000000203','discussion','50000000-0000-4000-8000-000000000009','upvote',NOW()-INTERVAL '12 days'),
('10000000-0000-4000-8000-000000000205','discussion','50000000-0000-4000-8000-000000000010','upvote',NOW()-INTERVAL '5 days'),
('10000000-0000-4000-8000-000000000207','discussion','50000000-0000-4000-8000-000000000012','upvote',NOW()-INTERVAL '1 day'),
('10000000-0000-4000-8000-000000000201','comment','70000000-0000-4000-8000-000000000001','upvote',NOW()-INTERVAL '7 days'),
('10000000-0000-4000-8000-000000000202','comment','70000000-0000-4000-8000-000000000003','upvote',NOW()-INTERVAL '11 days'),
('10000000-0000-4000-8000-000000000202','answer','60000000-0000-4000-8000-000000000001','upvote',NOW()-INTERVAL '26 days'),
('10000000-0000-4000-8000-000000000203','answer','60000000-0000-4000-8000-000000000001','upvote',NOW()-INTERVAL '25 days'),
('10000000-0000-4000-8000-000000000204','answer','60000000-0000-4000-8000-000000000003','upvote',NOW()-INTERVAL '21 days'),
('10000000-0000-4000-8000-000000000207','answer','60000000-0000-4000-8000-000000000004','upvote',NOW()-INTERVAL '18 days'),
('10000000-0000-4000-8000-000000000206','answer','60000000-0000-4000-8000-000000000005','upvote',NOW()-INTERVAL '13 days'),
('10000000-0000-4000-8000-000000000208','answer','60000000-0000-4000-8000-000000000006','upvote',NOW()-INTERVAL '16 days'),
('10000000-0000-4000-8000-000000000205','answer','60000000-0000-4000-8000-000000000007','upvote',NOW()-INTERVAL '5 days');




UPDATE discussions d SET
 comment_count=(SELECT COUNT(*) FROM comments c WHERE c.discussion_id=d.id AND c.deleted_at IS NULL),
 answer_count=(SELECT COUNT(*) FROM answers a WHERE a.discussion_id=d.id AND a.deleted_at IS NULL),
 upvote_count=(SELECT COUNT(*) FROM votes v WHERE v.target_type='discussion' AND v.target_id=d.id AND v.vote_type='upvote'),
 downvote_count=(SELECT COUNT(*) FROM votes v WHERE v.target_type='discussion' AND v.target_id=d.id AND v.vote_type='downvote');
UPDATE comments c SET
 upvote_count=(SELECT COUNT(*) FROM votes v WHERE v.target_type='comment' AND v.target_id=c.id AND v.vote_type='upvote'),
 downvote_count=(SELECT COUNT(*) FROM votes v WHERE v.target_type='comment' AND v.target_id=c.id AND v.vote_type='downvote');
UPDATE answers a SET
 upvote_count=(SELECT COUNT(*) FROM votes v WHERE v.target_type='answer' AND v.target_id=a.id AND v.vote_type='upvote'),
 downvote_count=(SELECT COUNT(*) FROM votes v WHERE v.target_type='answer' AND v.target_id=a.id AND v.vote_type='downvote');
UPDATE tags t SET usage_count=(SELECT COUNT(*) FROM discussion_tags dt WHERE dt.tag_id=t.id);

-- Fail atomically if a future edit makes the curated dataset inconsistent.
DO $seed_checks$
BEGIN
 IF EXISTS (SELECT 1 FROM discussions WHERE room_id IS NULL) THEN
  RAISE EXCEPTION 'seed invariant failed: every post must belong to a room';
 END IF;
 IF EXISTS (
  SELECT 1 FROM discussions d
  WHERE NOT EXISTS (SELECT 1 FROM discussion_tags dt WHERE dt.discussion_id=d.id)
 ) THEN
  RAISE EXCEPTION 'seed invariant failed: every post must have at least one relevant tag';
 END IF;
 IF EXISTS (
  SELECT 1 FROM discussions d
  LEFT JOIN room_academic_bindings b ON b.room_id=d.room_id
  WHERE d.course_id IS NOT NULL AND (
   b.course_id IS DISTINCT FROM d.course_id OR
   b.curriculum_course_id IS DISTINCT FROM d.curriculum_course_id
  )
 ) THEN
  RAISE EXCEPTION 'seed invariant failed: post academic context does not match its course room';
 END IF;
 IF EXISTS (
  SELECT 1 FROM discussions d
  WHERE d.status='solved' AND d.accepted_answer_id IS NULL
 ) THEN
  RAISE EXCEPTION 'seed invariant failed: solved question has no accepted answer';
 END IF;
 IF EXISTS (
  SELECT 1 FROM discussions d JOIN answers a ON a.id=d.accepted_answer_id
  WHERE a.discussion_id<>d.id
 ) THEN
  RAISE EXCEPTION 'seed invariant failed: accepted answer belongs to another question';
 END IF;
END
$seed_checks$;
COMMIT;

-- =============================================================================
-- Notifications tied to curated content
-- =============================================================================
\connect notification_db
BEGIN;
DELETE FROM inbox_events;
DELETE FROM notifications;
INSERT INTO notifications (id,"recipientId","actorId",type,title,body,data,priority,"readAt","createdAt") VALUES
('90000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000201','10000000-0000-4000-8000-000000000101','answer.created','Có câu trả lời mới','TS. Nguyễn Hoàng An đã trả lời câu hỏi về MVCC.','{"discussionId":"50000000-0000-4000-8000-000000000001"}','normal',NOW()-INTERVAL '26 days',NOW()-INTERVAL '27 days'),
('90000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000101','10000000-0000-4000-8000-000000000201','answer.accepted','Câu trả lời được chấp nhận','Câu trả lời về write skew đã được chấp nhận.','{"answerId":"60000000-0000-4000-8000-000000000001"}','normal',NULL,NOW()-INTERVAL '26 days'),
('90000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002',NULL,'moderation.review_required','Nội dung cần xem xét','AI đề nghị xem bài về CORS và CSRF.','{"discussionId":"50000000-0000-4000-8000-000000000008"}','high',NOW()-INTERVAL '8 days 23 hours',NOW()-INTERVAL '9 days');
COMMIT;

SELECT 'Curated seed complete: 14 users, 2 majors, 6 courses, 11 rooms, 14 posts, 7 answers, 8 comments.' AS status;
