# Gamification Service

Service nhận sự kiện từ Discussion Service, tính điểm uy tín và huy hiệu, rồi gửi sự kiện kết quả cho Notification Service. Người dùng xem điểm qua gateway.

- [Chạy trên máy local](#chạy-trên-máy-local)
- [Tìm mã nguồn](#cấu-trúc-thư-mục)
- [Xem API](#api-http)
- [Hiểu cách tính điểm hoặc xử lý sự cố](../../docs/tai-lieu-gamification.md)

## Chạy trên máy local

1. Chuẩn bị PostgreSQL có database `gamification_db` và NATS có JetStream. Chạy Discussion Service nếu cần nhận và phục hồi sự kiện từ dữ liệu thật. [Cấu hình các service trong Docker Compose](../../docker-compose.yml)
2. Từ gốc repository, tạo file cấu hình local và cài thư viện.

   ```powershell
   cd services/gamification-service
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   npm ci
   ```

3. Mở `.env` và điền địa chỉ PostgreSQL, mật khẩu, NATS và token phù hợp với môi trường. Sau đó chạy service. [Mẫu cấu hình](.env.example)

   ```powershell
   npm run start:dev
   ```

4. Mở cửa sổ PowerShell khác và kiểm tra hai địa chỉ dưới đây. Nếu đổi `PORT`, dùng cổng đã cấu hình.

   ```powershell
   Invoke-RestMethod http://localhost:8088/health
   Invoke-RestMethod http://localhost:8088/health/ready
   ```

`/health` kiểm tra kết nối PostgreSQL. `/health/ready` còn kiểm tra kết nối và đăng ký nhận sự kiện NATS khi worker đang bật. Nếu `/health/ready` trả 503, hãy kiểm tra NATS và tên stream.

### Biến môi trường cần biết

| Biến | Dùng để làm gì |
| --- | --- |
| `PORT` | Cổng HTTP, mặc định là `8088`. |
| `DB_HOST`, `DB_PORT`, `DB_NAME` | Địa chỉ PostgreSQL và tên database. Mã mặc định dùng `localhost:5432` và `gamification_db`. Mẫu local dùng `5433`, cổng PostgreSQL mà Docker Compose mở ra máy host. |
| `DB_USERNAME`, `DB_PASSWORD` | Tài khoản PostgreSQL. Tên người dùng mặc định là `postgres`. Điền mật khẩu theo môi trường. |
| `INTERNAL_SERVICE_TOKEN` | Token nội bộ dùng chung với gateway và Discussion Service. |
| `DISCUSSION_SERVICE_URL` | Địa chỉ Discussion để tải sự kiện lịch sử. Mặc định là `http://localhost:8084`. |
| `NATS_URL`, `NATS_STREAM` | Địa chỉ JetStream và tên stream. Mặc định là `nats://localhost:4222` và `ACASOCIAL_EVENTS`. |
| `GAMIFICATION_ENABLED` | Mặc định `true`. Đặt `false` để thử HTTP với PostgreSQL khi chưa có NATS. Khi đó các tác vụ nền sẽ chờ worker được bật lại. |
| `GAMIFICATION_NOTIFICATIONS_ENABLED` | Mặc định `true`. Điều khiển việc đưa thông báo tính điểm vào hàng gửi. |
| `GAMIFICATION_MAX_SNAPSHOT_BYTES` | Giới hạn kích thước một sự kiện gốc sau khi tải đủ các phần. Mặc định là 16 MiB (`16777216` byte). |

Để chạy bản đã build, dùng `npm run build` rồi `npm run start:prod`. TypeORM áp dụng các migration còn thiếu khi service khởi động.

## Cấu trúc thư mục

```text
gamification-service/
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── controller/
    ├── service/
    ├── repository/
    └── database/
```

| Bạn muốn tìm | Mở ở đâu |
| --- | --- |
| Đường dẫn API, kiểm tra quyền, dữ liệu đầu vào | [`src/controller/`](src/controller/) |
| Cách tính điểm, xử lý quy tắc, đối soát và phục hồi | [`src/service/`](src/service/) |
| Câu lệnh SQL đọc hoặc ghi dữ liệu | [`src/repository/`](src/repository/) |
| Kết nối PostgreSQL và migration | [`src/database/`](src/database/) |
| Cách ứng dụng khởi động và ghép các module | [`main.ts`](src/main.ts) · [`app.module.ts`](src/app.module.ts) |

Ví dụ, khi cần sửa API đối soát, hãy bắt đầu từ controller nhận yêu cầu, sang service để xem điều kiện tạo job, rồi tới repository để tìm SQL. [Controller](src/controller/reconciliation/reconciliation.controller.ts) · [Service](src/service/reconciliation/reconciliation.service.ts) · [Repository](src/repository/reconciliation/reconciliation.repository.ts)

Xem cây thư mục đầy đủ và mô tả từng file trong tài liệu Gamification. [Cây thư mục](../../docs/tai-lieu-gamification.md#cấu-trúc-bốn-tầng) · [Danh sách file theo nghiệp vụ](../../docs/tai-lieu-gamification.md#chức-năng-từng-file)

## API HTTP

Các đường dẫn dưới đây gọi trực tiếp Gamification Service. Khi gọi qua gateway, thêm `/api` trước đường dẫn người dùng và quản trị. Hai tuyến health dùng để kiểm tra service trực tiếp.

Gateway chuyển `x-internal-token` và `x-user-id` vào service. Tuyến quản trị còn yêu cầu `x-user-role` là `admin`. [Cấu hình tuyến của gateway](../../gateway/gateway.json)

### Health và điểm của người dùng

| API | Kết quả |
| --- | --- |
| `GET /health` | Kết nối database và trạng thái worker. |
| `GET /health/ready` | Trạng thái sẵn sàng nhận sự kiện khi worker bật. |
| `GET /gamification/me` | Tổng điểm, điểm chung và trạng thái cập nhật. |
| `GET /gamification/me/courses` | Điểm theo môn. |
| `GET /gamification/me/ledger` | Từng lần cộng hoặc trừ điểm của tài khoản. |
| `GET /gamification/me/badges` | Huy hiệu của tài khoản. |
| `GET /gamification/badges` | Tên và ngưỡng điểm của các huy hiệu hiện hành. |

### Quy tắc và đối soát

| API | Kết quả |
| --- | --- |
| `GET /admin/gamification/rules` | Quy tắc tính điểm hiện hành. |
| `POST /admin/gamification/rules` | Lưu phiên bản quy tắc mới. |
| `GET /admin/gamification/audits` | Lịch sử thay đổi quy tắc. |
| `GET /admin/gamification/reconciliation-jobs` | Danh sách job kiểm tra và dựng lại dữ liệu. |
| `POST /admin/gamification/reconciliation-jobs` | Tạo job kiểm tra sai lệch. |
| `GET /admin/gamification/reconciliation-jobs/:id/findings` | Sai lệch tìm được trong một job. |
| `POST /admin/gamification/rebuild-jobs` | Dựng lại dữ liệu tổng hợp của một tài khoản. |

### Lỗi, thử lại và phát lại

Các yêu cầu thử lại, tạo bản kiểm tra replay và xác nhận replay đều cần `reason` trong body.

| API | Kết quả |
| --- | --- |
| `GET /admin/gamification/gaps` | Các khoảng sự kiện bị thiếu. |
| `GET /admin/gamification/references` | Tham chiếu cần tải dữ liệu gốc. |
| `GET /admin/gamification/failures` | Các lỗi nhận hoặc đọc sự kiện. |
| `GET /admin/gamification/inbox` | Sự kiện đã nhận nhưng gặp lỗi khi tính điểm. |
| `POST /admin/gamification/gaps/:id/retry` | Thử tìm lại sự kiện thiếu theo ID bài viết. |
| `POST /admin/gamification/references/:id/retry` | Thử tải lại dữ liệu gốc theo ID sự kiện. |
| `POST /admin/gamification/failures/:id/retry` | Đưa sự kiện hợp lệ trở lại hàng đợi theo ID bản ghi lỗi. |
| `POST /admin/gamification/inbox/:id/retry` | Thử tính lại sự kiện theo ID sự kiện. |
| `GET /admin/gamification/metrics` | Số lượng sự kiện chờ, mục lỗi và độ trễ gửi thông báo. |
| `GET /admin/gamification/replay-jobs` | Tiến độ và kết quả kiểm tra của các job phát lại. |
| `POST /admin/gamification/replay-jobs` | Tạo bản kiểm tra từ lịch sử sự kiện. |
| `POST /admin/gamification/replay-jobs/:id/execute` | Xác nhận phát lại hoặc yêu cầu kiểm tra lại job cần can thiệp. |

Khi tạo preview, có thể gửi `aggregateId` để chọn một bài viết, hoặc gửi cả `fromDate` và `toDate` theo định dạng `YYYY-MM-DD` để chọn khoảng ngày trong nhật ký. Hai ngày đầu và cuối đều được tính theo giờ Việt Nam. Có thể kết hợp các bộ lọc. Mỗi bản xuất chứa tối đa 10.000 sự kiện trong phạm vi đã chọn. Preview có thể nạp thêm revision trước khoảng ngày để nối tiếp checkpoint của bài.

Replay theo phạm vi kiểm tra cả các lượt thưởng chưa xử lý ngoài phạm vi nếu dùng chung hạn mức. Job cần can thiệp khi phát hiện cạnh tranh hoặc lịch sử còn lưu không đủ để xác minh hạn mức.

## Triển khai và phục hồi

1. Sao lưu database Discussion và Gamification. Bản sao lưu Gamification cần có sổ điểm, quyền và quyết định thưởng, hạn mức, lịch sử huy hiệu và mốc sự kiện đã xử lý.
2. Triển khai Discussion có API `/internal/reputation/replay-candidates` trước Gamification. Dừng các worker Gamification cũ, để phiên bản mới áp dụng migration `ScopedReplay1792500000000` nếu còn thiếu và khởi động các worker cùng phiên bản. [API xuất lịch sử và kiểm tra hạn mức](../discussion-service/src/events/reputation-snapshots.controller.ts) · [Migration Gamification](src/database/migrations/scoped-replay.migration.ts)
3. Kiểm tra `/health/ready` và hàng đợi trên trang quản trị. Trên staging, thử vote, bỏ vote, chọn và hủy câu trả lời được chấp nhận, rồi kiểm tra thông báo đến đúng tài khoản qua gateway/SSE.

Khi cần quay về phiên bản ứng dụng cũ, chọn bản tương thích với schema hiện tại và tham chiếu V2. Các migration sau schema ban đầu chặn thao tác `down` để giữ dữ liệu phục hồi và quyết định thưởng.

Worker đăng ký nhận sự kiện với tên `gamification-service-v2`. Khi NATS gửi lại sự kiện cũ, service đối chiếu ID và số thứ tự của bài viết để tránh cộng điểm hai lần.

Xem quy trình theo từng tình huống và các giới hạn lưu lịch sử trong tài liệu Gamification. [Hướng dẫn quản trị](../../docs/tai-lieu-gamification.md#dành-cho-quản-trị-viên) · [Giới hạn phục hồi](../../docs/tai-lieu-gamification.md#giới-hạn-phục-hồi) · [Luồng xử lý sự cố](../../docs/pipeline-sua-loi-gamification.md)
