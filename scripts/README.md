# Scripts - Công cụ hỗ trợ

## 🔧 Danh sách Scripts

### 1. `fix-cache.bat` / `fix-cache.ps1`
**Mục đích:** Xử lý lỗi cache toàn diện

**Chức năng:**
- Dừng frontend đang chạy
- Xóa cache Next.js (.next folder)
- Build lại frontend
- Khởi động lại Docker containers
- Chờ services sẵn sàng

**Khi nào dùng:**
- Gặp lỗi 500 với endpoint không tồn tại
- Sau khi pull code mới từ Git
- Khi thay đổi cấu trúc API
- Frontend không phản ánh code mới

**Cách dùng:**
```cmd
# Windows CMD
scripts\fix-cache.bat

# PowerShell
.\scripts\fix-cache.ps1
```

---

### 2. `clear-frontend-cache.ps1`
**Mục đích:** Chỉ xóa cache frontend (nhanh hơn)

**Chức năng:**
- Xóa thư mục .next
- Xóa node_modules\.cache
- Không động đến Docker

**Khi nào dùng:**
- Chỉ cần refresh frontend
- Backend đang chạy bình thường
- Muốn giải pháp nhanh

**Cách dùng:**
```powershell
.\scripts\clear-frontend-cache.ps1
```

Sau đó:
```bash
cd frontend
npm run dev
```

---

### 3. `quick-clean.bat`
**Mục đích:** Tương tự `clear-frontend-cache.ps1` nhưng cho CMD

**Cách dùng:**
```cmd
scripts\quick-clean.bat
```

---

### 4. `init-db.sql`
**Mục đích:** Khởi tạo databases cho các services

**Chức năng:**
- Tạo database cho mỗi microservice
- Được chạy tự động khi Docker compose up lần đầu

**Databases được tạo:**
- `acasocial_db` - Main database (Identity Service)
- `media_db` - Media Service
- `discussion_db` - Discussion Service
- `notification_db` - Notification Service
- `academic_db` - Academic Service

---

## 📋 Hướng dẫn xử lý lỗi thường gặp

### Lỗi 1: "Failed to load resource: 500" với endpoint `/api/posts/create`

**Giải pháp:**
```cmd
scripts\fix-cache.bat
```

Sau đó xóa browser cache (F12 > Hard Reload)

---

### Lỗi 2: Frontend không cập nhật sau khi sửa code

**Giải pháp nhanh:**
```powershell
.\scripts\clear-frontend-cache.ps1
```

**Giải pháp đầy đủ:**
```cmd
scripts\fix-cache.bat
```

---

### Lỗi 3: Docker services không khởi động

**Kiểm tra:**
```bash
docker-compose ps
docker-compose logs
```

**Restart:**
```bash
docker-compose down
docker-compose up -d
```

---

### Lỗi 4: Port đã được sử dụng

**Tìm process đang dùng port:**
```cmd
netstat -ano | findstr :8080
netstat -ano | findstr :3000
```

**Kill process:**
```cmd
taskkill /PID <PID_NUMBER> /F
```

---

## 🚀 Workflow khuyến nghị

### Khi bắt đầu làm việc:

```bash
# 1. Pull code mới
git pull

# 2. Xóa cache
scripts\quick-clean.bat

# 3. Start backend
docker-compose up -d

# 4. Start frontend
cd frontend
npm run dev
```

### Khi gặp lỗi cache:

```bash
# Option 1: Nhanh (chỉ frontend)
scripts\quick-clean.bat
cd frontend
npm run dev

# Option 2: Đầy đủ (frontend + backend)
scripts\fix-cache.bat
cd frontend
npm run dev
```

### Trước khi commit:

```bash
# Build test
cd frontend
npm run build

# Check lỗi
npm run lint
```

---

## 💡 Tips

### 1. Disable cache khi dev

Trong DevTools:
- Mở Network tab
- Check "Disable cache"
- Giữ DevTools mở

### 2. Sử dụng Incognito mode

- Ctrl+Shift+N
- Không có cache
- Thấy code mới nhất

### 3. Hard Reload thường xuyên

- F12 để mở DevTools
- Shift + Click Reload
- Hoặc: Chuột phải Reload > "Empty Cache and Hard Reload"

### 4. Watch logs

```bash
# Xem tất cả logs
docker-compose logs -f

# Chỉ một service
docker-compose logs -f gateway
docker-compose logs -f discussion-service
```

---

## 🔗 Tài liệu liên quan

- [XỬ_LÝ_LỖI_500.md](../XỬ_LÝ_LỖI_500.md) - Hướng dẫn chi tiết
- [CÁCH_XỬ_LÝ_NHANH.md](../CÁCH_XỬ_LÝ_NHANH.md) - Hướng dẫn ngắn gọn
- [HƯỚNG_DẪN_XỬ_LÝ_LỖI.md](../HƯỚNG_DẪN_XỬ_LÝ_LỖI.md) - Chi tiết kỹ thuật

---

## ❓ FAQ

**Q: Script không chạy được?**
A: Chạy PowerShell as Administrator, hoặc dùng file .bat thay vì .ps1

**Q: Cần restart Docker không?**
A: Không bắt buộc nếu chỉ sửa frontend. Dùng `quick-clean.bat` thay vì `fix-cache.bat`

**Q: Bao lâu mất để fix?**
A: 
- Quick clean: ~30 giây
- Full fix: ~2-3 phút

**Q: Mất dữ liệu không?**
A: Không, scripts chỉ xóa cache build, không động đến database

**Q: Khi nào cần chạy script?**
A:
- Sau khi pull code mới
- Gặp lỗi 404/500 với endpoint lạ
- Frontend không cập nhật
- Thay đổi cấu trúc API
