# =============================================================================
# setup.ps1 — Script khởi tạo môi trường cho Windows (PowerShell)
#
# Chạy lệnh này một lần sau khi clone repo:
#   .\scripts\setup.ps1
#
# Script sẽ tự động copy các file .env.example thành .env ở đúng vị trí.
# Sau đó bạn chỉ cần mở từng file .env và điền giá trị thật vào.
# =============================================================================

# Đường dẫn gốc của repo (thư mục cha của scripts/)
$root = Split-Path -Parent $PSScriptRoot

# Danh sách các cặp [nguồn .env.example] -> [đích .env cần tạo]
# Thêm vào đây khi có service mới
$envFiles = @(
    # .env ở root — chứa DB_PASSWORD và REDIS_PASSWORD dùng bởi Docker Compose
    @{ src = "$root\.env.example";                                      dst = "$root\.env" },

    # .env của Gateway — chứa JWT_SECRET, REDIS_URL, IDENTITY_SERVICE_URL, v.v.
    @{ src = "$root\gateway\.env.example";                              dst = "$root\gateway\.env" },

    # .env của Identity Service — chứa DB credentials, JWT, Redis, Mail, Cloudinary
    @{ src = "$root\services\identity-service\.env.example";            dst = "$root\services\identity-service\.env" }
)

Write-Host ""
Write-Host "=== AcaSocial Setup ===" -ForegroundColor Cyan
Write-Host ""

$created = 0
$skipped = 0

foreach ($pair in $envFiles) {
    $src = $pair.src
    $dst = $pair.dst

    # Kiểm tra file .env.example có tồn tại không
    if (-not (Test-Path $src)) {
        Write-Host "[SKIP] Không tìm thấy: $src" -ForegroundColor Yellow
        $skipped++
        continue
    }

    # Nếu .env đã tồn tại thì không ghi đè — tránh mất giá trị đã điền
    if (Test-Path $dst) {
        $rel = $dst.Replace($root, "").TrimStart("\")
        Write-Host "[OK]   $rel đã tồn tại, bỏ qua" -ForegroundColor Green
        $skipped++
        continue
    }

    # Copy .env.example -> .env
    Copy-Item $src $dst
    $rel = $dst.Replace($root, "").TrimStart("\")
    Write-Host "[TAO]  $rel" -ForegroundColor Cyan
    $created++
}

Write-Host ""

if ($created -gt 0) {
    Write-Host "Đã tạo $created file .env." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Tiếp theo — mở từng file và điền giá trị thật:" -ForegroundColor Yellow
    Write-Host "  1. .env                               -> DB_PASSWORD, REDIS_PASSWORD"
    Write-Host "  2. gateway\.env                       -> JWT_SECRET"
    Write-Host "  3. services\identity-service\.env     -> DB_PASSWORD, JWT_SECRET, REDIS_PASSWORD, MAIL_PASS, Cloudinary"
    Write-Host ""
    Write-Host "Lưu y: JWT_SECRET phai GIONG NHAU o gateway\.env va services\identity-service\.env" -ForegroundColor Red
    Write-Host "Luu y: REDIS_PASSWORD phai GIONG NHAU o .env va services\identity-service\.env" -ForegroundColor Red
} else {
    Write-Host "Tat ca file .env da co san, khong can tao them." -ForegroundColor Green
}

Write-Host ""
Write-Host "Sau khi dien xong, chay: docker compose up --build" -ForegroundColor Cyan
Write-Host ""
