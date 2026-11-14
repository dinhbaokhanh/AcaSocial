@echo off
echo ========================================
echo Dọn dẹp cache và khởi động lại hệ thống
echo ========================================
echo.

echo [1/5] Dừng frontend nếu đang chạy...
taskkill /F /IM node.exe 2>nul
echo.

echo [2/5] Dọn dẹp frontend cache...
cd frontend
if exist .next (
    echo Đang xóa thư mục .next...
    rmdir /s /q .next
)
echo.

echo [3/5] Build lại frontend...
call npm run build
if errorlevel 1 (
    echo Lỗi khi build frontend!
    pause
    exit /b 1
)
echo.

cd ..

echo [4/5] Khởi động lại Docker containers...
docker-compose down
docker-compose up -d
echo.

echo [5/5] Chờ services khởi động...
timeout /t 10 /nobreak
echo.

echo ========================================
echo Hoàn tất! Bây giờ bạn có thể:
echo 1. Khởi động frontend: cd frontend ^&^& npm run dev
echo 2. Mở trình duyệt ẩn danh
echo 3. Truy cập http://localhost:3000
echo 4. Xóa cache browser (Ctrl+Shift+Delete)
echo ========================================
echo.

pause
