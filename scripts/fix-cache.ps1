# Script PowerShell để dọn dẹp cache và khởi động lại hệ thống

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Dọn dẹp cache và khởi động lại hệ thống" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Bước 1: Dừng frontend
Write-Host "[1/5] Dừng frontend nếu đang chạy..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host ""

# Bước 2: Dọn dẹp frontend cache
Write-Host "[2/5] Dọn dẹp frontend cache..." -ForegroundColor Yellow
Set-Location frontend

if (Test-Path .next) {
    Write-Host "Đang xóa thư mục .next..." -ForegroundColor Gray
    Remove-Item -Recurse -Force .next
    Write-Host "Đã xóa .next" -ForegroundColor Green
}

if (Test-Path node_modules\.cache) {
    Write-Host "Đang xóa node_modules\.cache..." -ForegroundColor Gray
    Remove-Item -Recurse -Force node_modules\.cache
    Write-Host "Đã xóa node_modules\.cache" -ForegroundColor Green
}
Write-Host ""

# Bước 3: Build frontend
Write-Host "[3/5] Build lại frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Lỗi khi build frontend!" -ForegroundColor Red
    Read-Host "Nhấn Enter để thoát"
    exit 1
}
Write-Host "Build thành công!" -ForegroundColor Green
Write-Host ""

Set-Location ..

# Bước 4: Khởi động lại Docker
Write-Host "[4/5] Khởi động lại Docker containers..." -ForegroundColor Yellow
docker-compose down
docker-compose up -d
Write-Host ""

# Bước 5: Chờ services
Write-Host "[5/5] Chờ services khởi động..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host ""

# Kiểm tra trạng thái
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Kiểm tra trạng thái services:" -ForegroundColor Cyan
docker-compose ps
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "Hoàn tất! Bây giờ bạn có thể:" -ForegroundColor Green
Write-Host "1. Khởi động frontend: cd frontend; npm run dev" -ForegroundColor White
Write-Host "2. Mở trình duyệt ẩn danh (Ctrl+Shift+N)" -ForegroundColor White
Write-Host "3. Truy cập http://localhost:3000" -ForegroundColor White
Write-Host "4. Xóa cache browser (Ctrl+Shift+Delete hoặc F12 > Hard Reload)" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Read-Host "Nhấn Enter để thoát"
