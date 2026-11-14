@echo off
REM Script nhanh để xóa cache frontend

echo Đang xóa frontend cache...
cd frontend

if exist .next (
    rmdir /s /q .next
    echo Đã xóa thư mục .next
) else (
    echo Không tìm thấy thư mục .next
)

if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo Đã xóa node_modules\.cache
)

echo.
echo Hoàn tất! Bây giờ chạy: npm run dev
pause
