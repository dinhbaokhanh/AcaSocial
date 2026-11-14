# Script nhanh để xóa cache frontend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Xóa cache frontend Next.js" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location frontend

$cleaned = $false

if (Test-Path .next) {
    Write-Host "Đang xóa thư mục .next..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .next
    Write-Host "✓ Đã xóa .next" -ForegroundColor Green
    $cleaned = $true
}

if (Test-Path node_modules\.cache) {
    Write-Host "Đang xóa node_modules\.cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force node_modules\.cache
    Write-Host "✓ Đã xóa node_modules\.cache" -ForegroundColor Green
    $cleaned = $true
}

if (Test-Path .next\cache) {
    Write-Host "Đang xóa .next\cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .next\cache
    Write-Host "✓ Đã xóa .next\cache" -ForegroundColor Green
    $cleaned = $true
}

Write-Host ""

if ($cleaned) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Hoàn tất! Cache đã được xóa." -ForegroundColor Green
    Write-Host ""
    Write-Host "Bước tiếp theo:" -ForegroundColor Yellow
    Write-Host "1. Chạy: npm run dev" -ForegroundColor White
    Write-Host "2. Mở browser và Hard Reload (F12 > Chuột phải Reload > Hard Reload)" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "Không tìm thấy cache cần xóa." -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
}

Write-Host ""
Set-Location ..
Read-Host "Nhấn Enter để thoát"
