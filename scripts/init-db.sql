-- Chạy tự động khi Postgres container khởi động lần đầu
-- Tạo media_db nếu chưa tồn tại (identity_db đã được tạo bởi POSTGRES_DB env)
SELECT 'CREATE DATABASE media_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'media_db')\gexec

SELECT 'CREATE DATABASE discussion_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'discussion_db')\gexec

SELECT 'CREATE DATABASE notification_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'notification_db')\gexec
