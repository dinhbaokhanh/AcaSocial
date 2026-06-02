#!/usr/bin/env bash
# =============================================================================
# setup.sh — Script khởi tạo môi trường cho macOS / Linux
#
# Chạy lệnh này một lần sau khi clone repo:
#   bash scripts/setup.sh
#
# Script sẽ tự động copy các file .env.example thành .env ở đúng vị trí.
# Sau đó bạn chỉ cần mở từng file .env và điền giá trị thật vào.
# =============================================================================

set -e

# Đường dẫn gốc của repo (thư mục cha của scripts/)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Màu sắc terminal
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}=== AcaSocial Setup ===${NC}"
echo ""

created=0
skipped=0

# Hàm xử lý từng cặp .env.example -> .env
# Thêm dòng copy_env vào cuối hàm main khi có service mới
copy_env() {
    local src="$1"
    local dst="$2"

    # Kiểm tra file .env.example có tồn tại không
    if [ ! -f "$src" ]; then
        echo -e "${YELLOW}[SKIP] Không tìm thấy: ${src#$ROOT/}${NC}"
        skipped=$((skipped + 1))
        return
    fi

    # Nếu .env đã tồn tại thì không ghi đè — tránh mất giá trị đã điền
    if [ -f "$dst" ]; then
        echo -e "${GREEN}[OK]   ${dst#$ROOT/} đã tồn tại, bỏ qua${NC}"
        skipped=$((skipped + 1))
        return
    fi

    cp "$src" "$dst"
    echo -e "${CYAN}[TẠO]  ${dst#$ROOT/}${NC}"
    created=$((created + 1))
}

# .env ở root — chứa DB_PASSWORD và REDIS_PASSWORD dùng bởi Docker Compose
copy_env "$ROOT/.env.example" "$ROOT/.env"

# .env của Gateway — chứa JWT_SECRET, REDIS_URL, IDENTITY_SERVICE_URL, v.v.
copy_env "$ROOT/gateway/.env.example" "$ROOT/gateway/.env"

# .env của Identity Service — chứa DB credentials, JWT, Redis, Mail, Cloudinary
copy_env "$ROOT/services/identity-service/.env.example" "$ROOT/services/identity-service/.env"

# Thêm service mới ở đây:
# copy_env "$ROOT/services/community-service/.env.example" "$ROOT/services/community-service/.env"

echo ""

if [ "$created" -gt 0 ]; then
    echo -e "${CYAN}Đã tạo ${created} file .env.${NC}"
    echo ""
    echo -e "${YELLOW}Tiếp theo — mở từng file và điền giá trị thật:${NC}"
    echo "  1. .env                                  -> DB_PASSWORD, REDIS_PASSWORD"
    echo "  2. gateway/.env                          -> JWT_SECRET"
    echo "  3. services/identity-service/.env        -> DB_PASSWORD, JWT_SECRET, REDIS_PASSWORD, MAIL_PASS, Cloudinary"
    echo ""
    echo -e "${RED}Lưu ý: JWT_SECRET phải GIỐNG NHAU ở gateway/.env và services/identity-service/.env${NC}"
    echo -e "${RED}Lưu ý: REDIS_PASSWORD phải GIỐNG NHAU ở .env và services/identity-service/.env${NC}"
else
    echo -e "${GREEN}Tất cả file .env đã có sẵn, không cần tạo thêm.${NC}"
fi

echo ""
echo -e "${CYAN}Sau khi điền xong, chạy: docker compose up --build${NC}"
echo ""
