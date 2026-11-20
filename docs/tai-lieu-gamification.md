# Tài liệu Gamification

*Ngày cập nhật 19/11/2026.*

Gamification ghi nhận đóng góp học thuật bằng **điểm uy tín** và **huy hiệu**. Mở trang **Điểm uy tín và huy hiệu** (`/reputation`) để xem điểm theo môn, lịch sử cộng trừ và huy hiệu của bạn.

- [Cách tính điểm và huy hiệu](#cách-tính-điểm)
- [Hướng dẫn quản trị](#dành-cho-quản-trị-viên)
- [Cấu trúc bốn tầng](#cấu-trúc-bốn-tầng)
- [Chức năng từng file](#chức-năng-từng-file)
- [Cách chạy service và tra cứu API](../services/gamification-service/README.md)

## Cách tính điểm

| Việc xảy ra | Điểm mặc định của tác giả |
| --- | ---: |
| Bài viết hoặc câu trả lời được người khác upvote hợp lệ | +10 |
| Câu trả lời được chọn là câu trả lời được chấp nhận | +40 |
| Đăng bài | 0 |
| Nhận upvote cho bình luận hoặc nhận downvote | 0 |

Ví dụ, nếu câu trả lời của bạn được upvote và được chọn là câu trả lời được chấp nhận, bạn nhận **50 điểm** theo quy tắc mặc định. Nếu người đã upvote bỏ phiếu đó, hệ thống trừ **10 điểm**. Việc bỏ chọn câu trả lời, ẩn hoặc xóa nội dung cũng có thể thu hồi khoản điểm tương ứng.

- Hệ thống tính thưởng cho nội dung đủ điều kiện và đang hiển thị. Tự upvote và tự chọn câu trả lời của mình không được thưởng.
- Hạn mức upvote mặc định là **200 điểm mỗi người nhận mỗi ngày** và **5 lượt thưởng mỗi cặp người cho và người nhận mỗi ngày**. Ngày bắt đầu lúc 0 giờ Việt Nam (`Asia/Ho_Chi_Minh`).
- Hạn mức tính theo số điểm đã từng cấp trong ngày. Nếu một lượt +10 bị thu hồi, 10 điểm đó vẫn được tính vào hạn mức ngày đã cấp.
- Quản trị viên có thể đổi điểm, hạn mức và ngưỡng huy hiệu. Mỗi dòng trong **sổ điểm** (`ledger`) lưu số điểm cộng hoặc trừ và phiên bản quy tắc đã dùng. [Quy tắc mặc định trong mã nguồn](../services/gamification-service/src/database/migrations/schema.migration.ts)

### Tổng điểm, điểm chung và huy hiệu

Nếu bạn có **30 điểm từ một môn** và **10 điểm từ nội dung không gắn môn**, tổng điểm của bạn là **40**, trong đó **10** là điểm chung. Hệ thống xét huy hiệu theo tổng điểm và theo từng môn.

| Huy hiệu | Ngưỡng mặc định |
| --- | ---: |
| Helper | 100 |
| Contributor | 300 |
| Expert | 1.000 |

Huy hiệu mất hiệu lực khi điểm giảm dưới ngưỡng và được khôi phục khi điểm đạt lại ngưỡng. Thông báo mở khóa được gửi ở lần đạt đầu tiên.

**Đang cập nhật** nghĩa là có đóng góp mới đang chờ được xử lý. Sau khi vote hoặc chọn câu trả lời, có thể mất một lúc để điểm hiển thị. API lịch sử điểm chỉ đọc dữ liệu của tài khoản đang đăng nhập, với các trường như số điểm, lý do và thời điểm. [Truy vấn lịch sử điểm](../services/gamification-service/src/repository/reputation/reputation.repository.ts)

## Dành cho quản trị viên

Mở **Cấu hình Gamification** tại `/admin/gamification`. Chọn thao tác theo tình trạng thực tế.

| Tình huống | Cách xử lý |
| --- | --- |
| Cần đổi quy tắc tính điểm | Nhập cấu hình và lý do, rồi chọn **Lưu phiên bản mới**. Nếu có xung đột phiên bản, dùng tùy chọn tải phiên bản mới và giữ giá trị đang nhập. |
| Có mục báo lỗi | Xem lỗi trong mục tương ứng, xử lý nguyên nhân rồi chọn **Thử lại**. Đây là retry cho một mục cụ thể. |
| Điểm hoặc huy hiệu hiển thị lệch dữ liệu đã ghi | Chọn **Tạo báo cáo đối soát**. Đọc danh sách sai lệch rồi chọn **Dựng lại projection của tài khoản** nếu cần. Đây là rebuild bảng tổng hợp của một người dùng. |
| Cần áp dụng các sự kiện lịch sử còn thiếu | Nhập ID bài viết từ URL, khoảng ngày hoặc cả hai để giới hạn phạm vi nếu cần. Chọn **Tạo preview lịch sử**, xem số sự kiện và revision tiền đề, rồi chọn **Xác nhận đọc lại** khi job sẵn sàng. |

**Đối soát** chỉ kiểm tra và ghi báo cáo. **Rebuild** cần báo cáo kiểm tra đã hoàn tất trong 24 giờ, tài khoản và lý do. API dùng `idempotencyKey` để nhận ra yêu cầu đã gửi và tránh tạo job trùng. Tác vụ lấy điểm từ sổ điểm và lấy trạng thái huy hiệu từ lịch sử quyết định huy hiệu.

**Replay** kiểm tra thứ tự sự kiện và hạn mức trước khi áp dụng cả đợt trong một giao dịch. Các sự kiện đã xử lý giữ kết quả cũ. Khi bản kiểm tra báo thiếu dữ liệu gốc, khôi phục lịch sử hoặc quyết định thưởng rồi chọn **Kiểm tra lại sau khi xử lý lỗi** trên cùng job. Replay chạy im lặng với thông báo lịch sử. [Luồng xử lý sự cố](pipeline-sua-loi-gamification.md) · [API quản trị](../services/gamification-service/README.md#api-http)

### Giới hạn phục hồi

| Mục | Giới hạn |
| --- | --- |
| Sự kiện lỗi khi tính điểm | Service thử lại với khoảng chờ tăng dần. Sau 8 lần lỗi, hoặc khi định danh khoản thưởng xung đột, mục đó chuyển sang trạng thái cần can thiệp. |
| Lịch sử ở Discussion | Mặc định giữ 90 ngày, tối thiểu 8 ngày theo `REPUTATION_JOURNAL_RETENTION_DAYS`. Lịch sử chưa gửi vẫn được giữ. Hàng gửi đã giao của Discussion giữ 7 ngày. |
| Bản xuất để replay | Có hiệu lực 24 giờ và chứa tối đa 10.000 sự kiện trong phạm vi đã chọn. Khoảng ngày tính cả hai ngày đầu và cuối theo giờ Việt Nam. Một job đã tải đủ bản xuất vẫn có thể kiểm tra lại khi bản xuất hết hạn. |
| Kích thước một job replay | Tối đa 32 MiB dữ liệu tạm chưa áp dụng, 1.000 bài viết và 1.000 tài khoản trong một lần thực thi. |

Với lịch sử đã hết hạn, cần khôi phục dữ liệu nguồn trước khi tính lại. [Cách Discussion dọn dữ liệu lịch sử](../services/discussion-service/src/events/outbox.worker.ts)

## Điểm đi từ thao tác đến màn hình thế nào

1. **Discussion ghi sự kiện.** Khi có vote hoặc thay đổi trạng thái nội dung, Discussion ghi sự kiện kèm số thứ tự của bài viết. Số thứ tự này gọi là `revision`. NATS JetStream chuyển sự kiện sang Gamification.
2. **Gamification lưu và tính điểm.** Worker là tiến trình xử lý nền. Worker lưu sự kiện vào hộp nhận (`inbox`) hoặc lưu tham chiếu V2 để tải nội dung gốc từ nhật ký của Discussion (`journal`). Engine kiểm tra sự kiện trùng và chờ nếu thiếu số thứ tự trước đó. Khi áp dụng, engine ghi sổ điểm, cập nhật điểm tổng hợp và huy hiệu trong cùng giao dịch.
3. **Giao diện đọc kết quả.** Frontend lấy điểm qua gateway. Khi có thông báo, worker gửi sự kiện kết quả từ hộp gửi (`outbox`) qua NATS để Notification Service chuyển tới người dùng.

Các chức năng như bảng xếp hạng công khai, điểm theo tag và chỉnh điểm thủ công thuộc phạm vi đề xuất cho giai đoạn sau. [Kế hoạch Gamification](ke-hoach-gamification.md)

## Cấu trúc bốn tầng

| Tầng trong `src/` | Giải thích |
| --- | --- |
| `controller/` | Nhận yêu cầu HTTP, kiểm tra dữ liệu và quyền truy cập. `dto/` mô tả dữ liệu đầu vào dùng chung. `guards/` kiểm tra token. |
| `service/` | Quyết định phải làm gì. Ví dụ, chọn quy tắc tính điểm hoặc kiểm tra có thể tạo job rebuild hay chưa. |
| `repository/` | Chứa câu lệnh SQL để lấy, lưu và cập nhật dữ liệu. |
| `database/` | Kết nối PostgreSQL và quản lý giao dịch. `migrations/` chứa từng bước tạo hoặc nâng cấp database. |

Các thư mục cùng tên như `reputation/` hay `recovery/` tập hợp mã của cùng một nghiệp vụ ở các tầng khác nhau. `dist/` chứa bản build, còn `node_modules/` chứa thư viện do npm cài.

<details>
<summary>Xem cây thư mục đầy đủ</summary>

```text
gamification-service/
└── src/
    ├── app.module.ts
    ├── main.ts
    ├── controller/
    │   ├── dto/
    │   ├── guards/
    │   ├── health/
    │   ├── reconciliation/
    │   ├── recovery/
    │   ├── reputation/
    │   └── rules/
    ├── service/
    │   ├── health/
    │   ├── reconciliation/
    │   ├── recovery/
    │   ├── reputation/
    │   ├── rules/
    │   └── worker/
    ├── repository/
    │   ├── health/
    │   ├── reconciliation/
    │   ├── recovery/
    │   ├── reputation/
    │   ├── rules/
    │   └── worker/
    └── database/
        └── migrations/
```

</details>

## Chức năng từng file

Mở nhóm liên quan bên dưới rồi bấm tên file để xem mã nguồn. Các đường dẫn tính từ thư mục `services/gamification-service/`.

<details>
<summary>Khởi động và thành phần dùng chung</summary>

- [`src/main.ts`](../services/gamification-service/src/main.ts). Khởi động ứng dụng, đăng ký kiểm tra token và dữ liệu đầu vào, mở cổng HTTP.
- [`src/app.module.ts`](../services/gamification-service/src/app.module.ts). Nạp cấu hình môi trường và kết nối module HTTP với module database.
- [`src/controller/controller.module.ts`](../services/gamification-service/src/controller/controller.module.ts). Đăng ký các controller HTTP và nạp module nghiệp vụ mà chúng sử dụng.
- [`src/controller/gateway-user.ts`](../services/gamification-service/src/controller/gateway-user.ts). Lấy ID người dùng từ gateway và kiểm tra quyền admin khi tuyến yêu cầu.
- [`src/controller/guards/internal-token.guard.ts`](../services/gamification-service/src/controller/guards/internal-token.guard.ts). Kiểm tra token nội bộ. Hai đường dẫn health được miễn kiểm tra token.
- [`src/controller/dto/pagination.dto.ts`](../services/gamification-service/src/controller/dto/pagination.dto.ts). Kiểm tra số trang và số mục mỗi trang. Mặc định trả 20 mục.
- [`src/controller/dto/reason.dto.ts`](../services/gamification-service/src/controller/dto/reason.dto.ts). Cắt khoảng trắng ở hai đầu và kiểm tra lý do dài từ 5 đến 1.000 ký tự.
- [`src/service/pagination.ts`](../services/gamification-service/src/service/pagination.ts). Khai báo kiểu dữ liệu chung có số trang và số mục mỗi trang.
- [`src/service/uuid.ts`](../services/gamification-service/src/service/uuid.ts). Kiểm tra định dạng ID dùng trong request, sự kiện và tham chiếu.

</details>

<details>
<summary>Điểm uy tín và huy hiệu</summary>

- [`src/controller/reputation/reputation.controller.ts`](../services/gamification-service/src/controller/reputation/reputation.controller.ts). Mở các API xem tổng điểm, điểm theo môn, sổ điểm và huy hiệu.
- [`src/service/reputation/reputation.module.ts`](../services/gamification-service/src/service/reputation/reputation.module.ts). Kết nối bộ tính điểm, service tra cứu và các repository. Đọc cấu hình bật thông báo.
- [`src/service/reputation/reputation.service.ts`](../services/gamification-service/src/service/reputation/reputation.service.ts). Chuẩn bị dữ liệu tra cứu điểm, trạng thái cập nhật và ngưỡng huy hiệu cho API.
- [`src/service/reputation/reputation.engine.ts`](../services/gamification-service/src/service/reputation/reputation.engine.ts). Áp dụng sự kiện đúng thứ tự, tính điểm, ghi sổ điểm, cập nhật huy hiệu và tạo sự kiện thông báo. Cũng xử lý tính điểm khi replay.
- [`src/service/reputation/replay-preflight.ts`](../services/gamification-service/src/service/reputation/replay-preflight.ts). Kiểm tra trước khi replay xem các sự kiện có tranh cùng hạn mức và làm kết quả phụ thuộc vào thứ tự hay không.
- [`src/repository/reputation/reputation.repository.ts`](../services/gamification-service/src/repository/reputation/reputation.repository.ts). Đọc tổng điểm, điểm theo môn, sổ điểm và huy hiệu của tài khoản.
- [`src/repository/reputation/reputation-inbox.repository.ts`](../services/gamification-service/src/repository/reputation/reputation-inbox.repository.ts). Lưu sự kiện đã nhận, theo dõi số thứ tự, ghi sự kiện thiếu và hẹn thử lại. Đọc dữ liệu cần cho bước kiểm tra replay.
- [`src/repository/reputation/reputation-scoring.repository.ts`](../services/gamification-service/src/repository/reputation/reputation-scoring.repository.ts). Đọc quy tắc lịch sử, lưu quyết định thưởng và cập nhật hạn mức, sổ điểm, điểm, huy hiệu và hộp gửi.

</details>

<details>
<summary>Quy tắc tính điểm</summary>

- [`src/controller/rules/rules.controller.ts`](../services/gamification-service/src/controller/rules/rules.controller.ts). Mở API xem quy tắc, lưu quy tắc mới và xem lịch sử cập nhật.
- [`src/controller/rules/rules.dto.ts`](../services/gamification-service/src/controller/rules/rules.dto.ts). Kiểm tra dữ liệu yêu cầu đổi phiên bản quy tắc, điểm, hạn mức và ngưỡng huy hiệu.
- [`src/service/rules/rules.module.ts`](../services/gamification-service/src/service/rules/rules.module.ts). Đăng ký service và repository quy tắc cho các phần khác sử dụng.
- [`src/service/rules/rules.service.ts`](../services/gamification-service/src/service/rules/rules.service.ts). Kiểm tra ngưỡng tăng dần, xử lý xung đột phiên bản và lưu quy tắc cùng lịch sử thay đổi.
- [`src/service/rules/rules.ts`](../services/gamification-service/src/service/rules/rules.ts). Khai báo các trường của quy tắc và yêu cầu cập nhật.
- [`src/repository/rules/rules.repository.ts`](../services/gamification-service/src/repository/rules/rules.repository.ts). Đọc và lưu phiên bản quy tắc. Đọc và ghi lịch sử thay đổi.

</details>

<details>
<summary>Đối soát và rebuild</summary>

- [`src/controller/reconciliation/reconciliation.controller.ts`](../services/gamification-service/src/controller/reconciliation/reconciliation.controller.ts). Nhận yêu cầu kiểm tra sai lệch, đọc kết quả và tạo job dựng lại điểm.
- [`src/controller/reconciliation/rebuild.dto.ts`](../services/gamification-service/src/controller/reconciliation/rebuild.dto.ts). Kiểm tra lý do, ID tài khoản, ID báo cáo đối soát và khóa chống gửi trùng.
- [`src/service/reconciliation/reconciliation.module.ts`](../services/gamification-service/src/service/reconciliation/reconciliation.module.ts). Cung cấp service đối soát cho controller và worker.
- [`src/service/reconciliation/reconciliation.service.ts`](../services/gamification-service/src/service/reconciliation/reconciliation.service.ts). Kiểm tra điều kiện rebuild, tạo job và điều phối xử lý job trong giao dịch.
- [`src/repository/reconciliation/reconciliation.repository.ts`](../services/gamification-service/src/repository/reconciliation/reconciliation.repository.ts). Đọc và ghi job, lập danh sách sai lệch, dựng lại bảng điểm và huy hiệu.

</details>

<details>
<summary>Phục hồi và replay</summary>

- [`src/controller/recovery/recovery.controller.ts`](../services/gamification-service/src/controller/recovery/recovery.controller.ts). Mở API xem lỗi, thử lại, xem chỉ số và tạo hoặc xác nhận replay.
- [`src/service/recovery/recovery.module.ts`](../services/gamification-service/src/service/recovery/recovery.module.ts). Kết nối các service, repository phục hồi và bộ tính điểm.
- [`src/service/recovery/recovery-operations.service.ts`](../services/gamification-service/src/service/recovery/recovery-operations.service.ts). Xử lý yêu cầu thử lại của quản trị viên. Kiểm tra dữ liệu lỗi trước khi đưa vào hàng đợi và ghi lịch sử thao tác.
- [`src/service/recovery/recovery.service.ts`](../services/gamification-service/src/service/recovery/recovery.service.ts). Tải và kiểm tra dữ liệu gốc từ Discussion, tìm sự kiện thiếu và điều phối quá trình phát lại.
- [`src/repository/recovery/recovery.repository.ts`](../services/gamification-service/src/repository/recovery/recovery.repository.ts). Lưu tham chiếu, sự kiện thiếu, lịch thử lại và tiến độ từng job replay.
- [`src/repository/recovery/recovery-operations.repository.ts`](../services/gamification-service/src/repository/recovery/recovery-operations.repository.ts). Đọc lỗi và chỉ số, đưa mục đã kiểm tra vào hàng đợi và ghi lịch sử thử lại.

</details>

<details>
<summary>Worker và health check</summary>

- [`src/controller/health/health.controller.ts`](../services/gamification-service/src/controller/health/health.controller.ts). Mở hai đường dẫn kiểm tra hoạt động và trạng thái sẵn sàng.
- [`src/service/health/health.module.ts`](../services/gamification-service/src/service/health/health.module.ts). Kết nối health check với PostgreSQL và worker.
- [`src/service/health/health.service.ts`](../services/gamification-service/src/service/health/health.service.ts). Kiểm tra database và báo worker đã kết nối, đăng ký nhận sự kiện hay chưa.
- [`src/service/worker/worker.module.ts`](../services/gamification-service/src/service/worker/worker.module.ts). Kết nối worker với bộ tính điểm, phục hồi và đối soát.
- [`src/service/worker/gamification.worker.ts`](../services/gamification-service/src/service/worker/gamification.worker.ts). Nhận sự kiện từ NATS, xử lý các tác vụ nền, gửi thông báo và nối lại khi mất đăng ký nhận sự kiện.
- [`src/repository/health/health.repository.ts`](../services/gamification-service/src/repository/health/health.repository.ts). Chạy một truy vấn đơn giản để thử kết nối PostgreSQL.
- [`src/repository/worker/worker.repository.ts`](../services/gamification-service/src/repository/worker/worker.repository.ts). Tìm sự kiện cần xử lý, lấy thông báo cần gửi và cập nhật trạng thái gửi hoặc lỗi.

</details>

<details>
<summary>Database và migration</summary>

- [`src/database/database.module.ts`](../services/gamification-service/src/database/database.module.ts). Mở kết nối PostgreSQL và chạy các migration còn thiếu khi khởi động.
- [`src/database/transaction-manager.ts`](../services/gamification-service/src/database/transaction-manager.ts). Cung cấp giao dịch để nhiều câu lệnh SQL hoàn tất cùng nhau.
- [`src/database/migrations/schema.migration.ts`](../services/gamification-service/src/database/migrations/schema.migration.ts). Tạo các bảng ban đầu cho quy tắc, sự kiện, điểm và huy hiệu. Nạp quy tắc mặc định.
- [`src/database/migrations/reliability.migration.ts`](../services/gamification-service/src/database/migrations/reliability.migration.ts). Thêm bảng theo dõi lỗi, sự kiện thiếu, replay, lịch sử huy hiệu và kết quả đối soát.
- [`src/database/migrations/reward-decision-date.migration.ts`](../services/gamification-service/src/database/migrations/reward-decision-date.migration.ts). Lưu ngày dùng để tính hạn mức của quyết định thưởng.
- [`src/database/migrations/inbox-retry.migration.ts`](../services/gamification-service/src/database/migrations/inbox-retry.migration.ts). Thêm số lần thử và lịch thử lại vào bảng sự kiện đã nhận.
- [`src/database/migrations/replay-preflight.migration.ts`](../services/gamification-service/src/database/migrations/replay-preflight.migration.ts). Lưu quyết định thưởng gốc và bổ sung bước kiểm tra trước khi replay.
- [`src/database/migrations/scoped-replay.migration.ts`](../services/gamification-service/src/database/migrations/scoped-replay.migration.ts). Lưu phạm vi replay và mã nhận việc cho tham chiếu nguồn.

</details>

<details>
<summary>Cấu hình và build</summary>

- [`README.md`](../services/gamification-service/README.md). Hướng dẫn chạy service, tra cứu API và triển khai.
- [`.env.example`](../services/gamification-service/.env.example). Mẫu điền cấu hình PostgreSQL, NATS, Discussion và token.
- [`.gitignore`](../services/gamification-service/.gitignore). Loại file cấu hình máy cá nhân và đầu ra build khỏi Git.
- [`.dockerignore`](../services/gamification-service/.dockerignore). Loại file cấu hình máy cá nhân, đầu ra build và test khỏi bộ file gửi vào Docker.
- [`Dockerfile`](../services/gamification-service/Dockerfile). Build và đóng gói service để chạy bằng Node.js trong Docker.
- [`package.json`](../services/gamification-service/package.json). Khai báo thư viện và các lệnh npm của service.
- [`package-lock.json`](../services/gamification-service/package-lock.json). Lưu phiên bản thư viện để `npm ci` cài nhất quán.
- [`nest-cli.json`](../services/gamification-service/nest-cli.json). Chỉ định thư mục mã nguồn và dọn đầu ra cũ khi build.
- [`tsconfig.json`](../services/gamification-service/tsconfig.json). Cấu hình trình biên dịch TypeScript và thư mục đầu ra.
- [`tsconfig.build.json`](../services/gamification-service/tsconfig.build.json). Cấu hình build ứng dụng, loại file kiểm thử.

</details>
