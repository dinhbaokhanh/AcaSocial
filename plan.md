# Kế hoạch triển khai quản trị room và môn học

Ngày lập: 13/11/2026. Tài liệu ghi lại phương án triển khai đã chọn; tiến độ cài đặt được cập nhật bên dưới.

> Cập nhật triển khai 14/11/2026: đã cài đặt API và UI thêm/sửa room/môn học, audit/version, lịch đóng room, worker, banner và delivery qua outbox. Chi tiết vận hành và kiểm thử: [room-administration.md](docs/room-administration.md). Các checklist phía dưới là danh sách nghiệm thu; không tự đánh dấu các kiểm tra staging/trình duyệt chưa thực hiện.

## 1. Phương án được chọn để triển khai

- Admin thêm room và sửa thông tin room.
- Admin thêm môn học và sửa thông tin môn học; chức năng xóa môn học để pha sau.
- Xóa room cần tham khảo giảng viên vì ảnh hưởng bài đăng, trả lời, bình luận, tài liệu và liên kết học thuật.
- Chọn kết hợp phương án 1 và 2: không xóa room; admin có thể lập lịch ngừng hoạt động, hệ thống thông báo trước, tới hạn chuyển room sang `read_only`. Admin có thể lưu trữ room đã chỉ đọc hoặc mở lại khi cần.
- Lý do lựa chọn: tận dụng trạng thái room và hạ tầng thông báo hiện có, bảo toàn bài đăng, không phải xử lý xóa dữ liệu xuyên service, đồng thời có luồng ngừng hoạt động rõ ràng.
- Chia hai bản phát hành: A hoàn thành thêm/sửa room và môn; B bổ sung lịch ngừng hoạt động và thông báo. B không chặn phát hành A.
- Không xây `deleteAt`, xóa mềm, purge hoặc bộ đếm xóa sau N ngày trong đợt này. Xóa room chỉ là backlog để trao đổi với giảng viên; không phải pha bắt buộc của kế hoạch code.
- Các quy tắc bên dưới là mặc định kỹ thuật đề xuất cho bản triển khai, không khẳng định giảng viên đã phê duyệt chính sách xóa.

| Phương án room | Hành vi | Lợi ích | Hạn chế / điều kiện |
| --- | --- | --- | --- |
| 1. Không cho xóa | Giữ room; chuyển `read_only` hoặc `archived` khi ngừng dùng | Bảo toàn dữ liệu, có thể mở lại | Cần lọc room lưu trữ khỏi danh sách mặc định và có nơi tra cứu |
| 2. Báo trước trong hệ thống | Lưu lịch ngừng hoạt động, hiện banner và gửi thông báo trước hạn | Người dùng có thời gian chuẩn bị | Phải chốt tới hạn là chỉ đọc hay lưu trữ; thông báo không bảo đảm mọi người đã đọc |
| 3. Ngừng hoạt động, xóa sau N ngày | Chuyển chỉ đọc, thông báo thời điểm xóa; hết hạn xử lý theo chính sách | Có quy trình dọn dẹp rõ ràng | Nguy cơ mất dữ liệu; phải phân biệt xóa mềm và xóa vĩnh viễn, có quyền hủy và phục hồi |

### Quy tắc mặc định để code

1. Quản trị metadata và lập lịch do admin thực hiện. Giữ quyền policy/thành viên hiện hữu; owner/moderator không được đổi lịch do admin đặt hoặc mở lại room đã đóng theo lịch. Rà soát endpoint status hiện hữu để không trở thành đường vượt quy tắc này.
2. Lịch đóng yêu cầu lý do và `closeAt` ít nhất 7 × 24 giờ sau thời điểm server nhận request. Thời gian báo trước là cấu hình `ROOM_CLOSURE_MIN_NOTICE_HOURS`, mặc định 168; không dùng giờ client để xác minh.
3. Room có lịch vẫn `active` đến hạn. Tới hạn trở thành `read_only`; không tự động xóa hoặc tự động archive sau N ngày. Admin archive thủ công khi room đã chỉ đọc, có thể mở lại và phải ghi lý do.
4. `read_only` và `archived` vẫn cho đọc nội dung theo quyền truy cập cũ. Archive chỉ bỏ room khỏi bộ chọn đăng bài/danh sách hoạt động; vẫn có danh sách lưu trữ và URL cũ.
5. Chặn tạo/sửa nội dung thông thường, trả lời, bình luận, vote và duyệt bài chờ thành công khai khi room đã đóng. Cho phép thao tác kiểm duyệt ẩn nội dung vi phạm và thao tác quản trị được cấp quyền, có audit. Không làm mất bài đang chờ duyệt.
6. Đóng room cha không tự đóng room con; UI hiển thị cảnh báo các room con vẫn hoạt động. Không thêm cascade vòng đời.
7. Room public: banner trong hệ thống cho mọi người dùng đăng nhập, có phân trang nếu nhiều lịch. Room restricted/private: chỉ hiện cho người được phép đọc room. Notification cá nhân gửi cho thành viên active, chủ room và người có bài trong room còn quyền đọc; không cần broadcast vào inbox mọi tài khoản.
8. Hủy lịch khi còn pending không đổi trạng thái room. Mở lại room đã đóng là thao tác admin riêng; lịch đã thực thi giữ nguyên lịch sử và không được chạy lại. Muốn đóng lần sau phải lập lịch mới.

Giảng viên chỉ cần quyết định riêng về việc có cho xóa trong tương lai; thêm/sửa và cơ chế bảo toàn nội dung có thể triển khai theo kế hoạch này.

## 2. Hiện trạng đã kiểm tra

| Thành phần | Đã có | Khoảng trống cần xử lý |
| --- | --- | --- |
| `discussion-service/src/rooms/rooms.controller.ts`, `rooms.service.ts`, `room.dto.ts` | `POST /rooms`; lấy danh sách/chi tiết; quản lý thành viên, policy và `PATCH /rooms/:id/status` | Chưa có API sửa metadata tổng quát; cần bổ sung quyền admin, audit và kiểm soát cập nhật đồng thời |
| `discussion-service/src/rooms/room.entity.ts` | Loại `major/course/event/forum`; trạng thái `draft/active/read_only/archived`; room cha, binding học thuật | Chưa có lịch đóng/xóa; không dùng nhầm `endAt` của sự kiện làm thời điểm xóa |
| Tạo room hiện tại | Chỉ admin được tạo canonical room `major/course`; tạo room có transaction và outbox event `room.created` | Không siết toàn bộ quyền tạo `event/forum` trước khi xác nhận vì có thể ảnh hưởng chức năng hiện hữu |
| `academic-service/src/academic.controller.ts`, `academic.service.ts`, `academic.dto.ts` | Admin `POST /courses`, `PATCH /courses/:id`; mã môn duy nhất; sửa tên, mô tả, trạng thái | Tận dụng API sẵn có; bổ sung UI, audit, chống ghi đè, kiểm thử nghiệp vụ |
| `academic-service/src/entities.ts` | `Course`, `MajorCourse`, `CourseTopic`; môn có `active/inactive` | Môn khác liên kết môn–ngành: tín chỉ, học kỳ đề xuất thuộc `MajorCourse`, không thuộc `Course` |
| `gateway/gateway.json` | Route tạo room, đổi trạng thái room, thêm/sửa môn học | Bổ sung route sửa room; kiểm tra auth, role và cache của từng route |
| `frontend/src/lib/api/rooms.ts`, `academic.ts` | API room đọc/thành viên/policy; academic client chủ yếu lấy môn theo ngành | Chưa có client thêm/sửa đầy đủ cho yêu cầu mới |
| `frontend/src/app/(app)/moderation/rooms/page.tsx` | Trang cấu hình quyền đăng và thành viên | Không phải màn hình CRUD thông tin room; đề xuất trang admin riêng |
| `notification-service` | NATS JetStream, lưu notification, SSE, inbox chống event trùng | Chưa coi việc broadcast mọi tài khoản là sẵn có; cần thiết kế người nhận và xử lý theo lô |

Lưu ý: đã có `DELETE /major-courses/:id`, tức xóa liên kết môn–ngành, khác xóa môn học. Đường này có thể làm binding của room mất ngữ cảnh; cần rà soát riêng, không đưa nút xóa liên kết vào giao diện mới.

## 3. Service phụ trách

| Chức năng | Nơi chịu trách nhiệm | Phối hợp |
| --- | --- | --- |
| Tạo/sửa room, quan hệ cha–con và binding | `discussion-service` | Gọi API nội bộ của academic để xác minh ngành/ngữ cảnh môn |
| Môn học, liên kết môn–ngành/topic | `academic-service` | Sở hữu dữ liệu học thuật; không ghi DB discussion |
| Đăng nhập và danh tính admin | `identity-service` | Gateway xác minh JWT; backend vẫn kiểm tra quyền nghiệp vụ |
| Route, xác thực token, giới hạn request | `gateway` | Chỉ tin header danh tính do gateway xác minh/inject; rà soát việc loại bỏ header giả từ client |
| Màn hình quản trị, validation và cập nhật dữ liệu hiển thị | `frontend` | Chỉ gọi qua gateway; ẩn nút không thay thế kiểm tra quyền backend |
| Lập lịch chuyển trạng thái room | Worker thuộc `discussion-service` — bản phát hành B | Sở hữu quyết định đóng room và thời điểm thực thi |
| Lưu/gửi thông báo | `notification-service` | Nhận event qua outbox → NATS; không tự quyết định xóa room |
| File đính kèm nếu có xóa vĩnh viễn | `media-service` — pha sau | Chỉ dọn file khi xác minh hết tham chiếu và qua thời hạn phục hồi |

Không cần tạo service mới. Mỗi service chỉ ghi DB của mình; không tạo transaction xuyên DB academic/discussion/notification.

## 4. API và dữ liệu dự kiến

### 4.1. Room

- Tái sử dụng `POST /api/rooms`: kiểm tra admin cho luồng quản trị, slug/tên hợp lệ, slug duy nhất, quan hệ cha hợp lệ và binding học thuật đang hoạt động.
- Thêm `PATCH /api/rooms/{id}`: `UpdateRoomDto` chỉ cho sửa `name`, `description` trong MVP. Giữ nguyên ID, slug, loại room, room cha và binding để tránh đứt URL hoặc đổi ý nghĩa nội dung cũ.
- Các trường visibility/membership/posting và review policy phải có đặc tả quyền riêng; không cho phép mass assignment qua API sửa metadata. Tái sử dụng endpoint policy hiện có cho nghiệp vụ tương ứng.
- Tái sử dụng `PATCH /api/rooms/{id}/status` và bổ sung kiểm tra chuyển trạng thái. Đóng/mở lại/archive theo vòng đời mới là admin-only; policy/thành viên vẫn giữ quyền riêng. Room có lịch pending phải hủy lịch trước khi đổi trạng thái thủ công; trả `409` nếu chưa hủy.
- Không thêm `DELETE /api/rooms/{id}` trong MVP.
- Đề xuất thêm `version` và audit metadata: actor, thời điểm, before/after, request ID. Audit được ghi cùng transaction cập nhật; không trộn lịch sử metadata với lịch sử policy một cách ngầm định.
- Trùng slug trả `409`; không tồn tại `404`; thiếu đăng nhập `401`; thiếu quyền `403`; dữ liệu sai `400`; cập nhật version cũ `409`. PATCH rỗng bị từ chối.
- Canonical room: một room major cho mỗi `majorId`, một room course cho mỗi `majorCourseId`, tính cả room lưu trữ để mở lại thay vì tạo bản trùng. Luồng tạo sử dụng advisory transaction lock theo loại/ngữ cảnh rồi kiểm tra lại sau lock để chống request đồng thời. Không đặt unique đơn giản lên binding vì forum/event có thể kế thừa cùng ngữ cảnh. Dữ liệu trùng có sẵn cần xử lý riêng, không tự gộp/xóa bài.

### 4.2. Môn học

- Tái sử dụng `POST /api/courses`: `code`, `name`, `description`, trạng thái theo DTO hiện tại.
- Tái sử dụng `PATCH /api/courses/{id}`: tên, mô tả; mã môn giữ bất biến trong MVP theo DTO hiện tại. Trạng thái `inactive` để ngoài form MVP cho đến khi chốt ảnh hưởng tới room/bài cũ.
- Không bổ sung API xóa môn học. Không dùng `inactive` như một cách xóa ngầm: API context hiện từ chối môn/ngành không active.
- Chuẩn hóa mã bằng trim + uppercase; trùng mã trả `409`; không ép tên duy nhất vì các môn khác mã có thể cùng tên.
- Bổ sung audit và version cho thay đổi; lưu người thực hiện bằng danh tính từ gateway, không lấy từ body.
- Nếu cần đưa môn vào ngành: bước riêng `POST /api/major-courses`, sau đó mới dùng `majorCourseId` tạo room môn. Một course có thể thuộc nhiều ngành.
- Không tự tạo room khi tạo môn trong MVP. UI hiển thị từng bước; nếu bước sau lỗi, giữ dữ liệu bước trước và cho thử lại, tránh tạo trùng môn.

## 5. Luồng thực thi

### 5.1. Admin thêm room

1. Admin mở trang quản trị room; frontend kiểm tra session và lấy dữ liệu ngành/môn cần thiết qua gateway.
2. Chọn loại room; room môn chọn ngành, `majorCourseId` và room cha loại major tương ứng.
3. Frontend kiểm tra biểu mẫu rồi gửi `POST /api/rooms` với token.
4. Gateway xác minh JWT và chuyển danh tính; discussion kiểm tra quyền, DTO, trạng thái ngữ cảnh qua `AcademicReferenceService`, quan hệ cha và trùng lặp.
5. Transaction lưu room, binding/thành viên theo logic hiện hữu và outbox `room.created`. Lỗi thì rollback toàn transaction local.
6. Trả room đã tạo; UI làm mới danh sách, room picker/context. Event được phát bất đồng bộ; lỗi notification không rollback room đã tạo.

### 5.2. Admin sửa room

1. Tải chi tiết room và version, sửa tên/mô tả, gửi PATCH.
2. Discussion kiểm tra admin và whitelist trường; cập nhật có điều kiện version, ghi audit trong cùng transaction; version không khớp trả `409` để tải lại.
3. Giữ nguyên bài đăng, ID và binding; UI cập nhật room đang chọn và các danh sách liên quan. Rà soát cache gateway để tên cũ không tiếp tục xuất hiện ngoài TTL cho phép.

### 5.3. Admin thêm/sửa môn học

1. Admin vào danh sách môn có phân trang; mở form tạo hoặc sửa.
2. Gateway xác thực, academic kiểm tra admin, DTO và ràng buộc DB.
3. Ghi môn và audit trong transaction; khi sửa kiểm tra version; trả bản ghi mới nhất.
4. Frontend tải lại danh sách và các bộ chọn có liên quan. Sửa tên course không tự đổi tên room: tên room độc lập trong MVP, UI ghi rõ điều này.
5. Nếu có nhu cầu, tiếp tục gắn môn vào ngành rồi tạo room ở bước riêng. Academic timeout khi xác minh binding phải trả lỗi có thể thử lại, không coi timeout là ngữ cảnh hợp lệ.

### 5.4. Báo trước/ngừng hoạt động — bản phát hành B

1. Admin nhập lý do và `closeAt`; backend kiểm tra thời gian báo trước theo cấu hình ở mục 1. Thời gian lưu UTC, UI hiển thị múi giờ và thời điểm cụ thể; không có thời điểm xóa.
2. Discussion lưu lịch bền vững trong DB, có version, actor và audit; không dùng `setTimeout` trong RAM. Đề xuất bảng `room_lifecycle_schedules` chứa trạng thái job, thời điểm, lần thử và lỗi gần nhất.
3. Ghi outbox `room.closure.scheduled` cùng transaction. Đây là event mới đề xuất, không coi consumer hiện đã hỗ trợ.
4. Notification tạo thông báo và đẩy SSE; banner hệ thống đọc dữ liệu lịch còn hiệu lực từ API để người offline vẫn thấy khi quay lại. Không thể bảo đảm người dùng đã đọc chỉ vì SSE gửi thành công.
5. Banner public hiện toàn hệ thống; banner restricted/private kiểm tra quyền đọc. Discussion tạo danh sách người nhận cá nhân theo quy tắc mục 1, loại trùng và chia lô bền vững. Notification chỉ phụ trách lưu/gửi, không phải đọc DB discussion hoặc tự suy ra quyền room.
6. Worker lấy lịch đến hạn bằng DB lock, kiểm tra version và trạng thái hiện tại, chuyển `active → read_only`; ghi audit và outbox cùng transaction. Job chạy lại không chuyển trạng thái/gửi nhắc trùng.
7. Admin có thể hủy/đổi lịch trước khi thực thi; event có schedule ID/version để bỏ qua thông báo cũ và cập nhật thông báo hủy. Worker restart phải quét lại lịch quá hạn.
8. Admin có thể archive room đã chỉ đọc hoặc mở lại bằng endpoint status, kèm lý do và version. Mọi thao tác giữ nguyên nội dung và lịch sử lịch đóng.

### 5.5. Hợp đồng lịch đóng và cách thực thi

| API mới qua gateway | Quyền | Chức năng |
| --- | --- | --- |
| `POST /api/rooms/{id}/closure-schedule` | Admin | Tạo lịch cho room active chưa có lịch pending |
| `PATCH /api/rooms/{id}/closure-schedule` | Admin | Sửa lịch pending với version; thời gian mới vẫn đủ thời gian báo trước |
| `POST /api/rooms/{id}/closure-schedule/cancel` | Admin | Hủy lịch pending với version và lý do |
| `GET /api/rooms/{id}/closure-schedule` | Người được đọc room | Xem lịch hiện tại và thời điểm ngừng hoạt động |
| `GET /api/room-announcements` | Đã đăng nhập | Banner phân trang, lọc quyền ở backend trước khi trả kết quả |

- Bảng `room_lifecycle_schedules`: `id`, `room_id`, `close_at`, `reason`, `status` (`pending/completed/cancelled`), `version`, `created_by`, `updated_by`, timestamps và `completed_at`. Partial unique index bảo đảm mỗi room chỉ một lịch pending; index `(status, close_at)` phục vụ worker.
- Worker polling mặc định 30 giây, xử lý theo batch; dùng transaction và `FOR UPDATE SKIP LOCKED`. Khóa room trước lịch trong mọi thao tác tạo/sửa/hủy/thực thi để thống nhất thứ tự. Lỗi transaction rollback giữ lịch pending để lần sau thử lại; log và metric chứa schedule ID, không cần job queue mới.
- Luồng ghi nội dung phải khóa/kiểm tra room trong cùng transaction với việc ghi. Tới `closeAt`, từ chối ghi ngay cả khi worker chưa kịp cập nhật status; worker chịu trách nhiệm lưu trạng thái và phát event. Rà soát thứ tự khóa với post/comment để tránh deadlock.
- Event đề xuất: `room.closure.scheduled`, `room.closure.rescheduled`, `room.closure.cancelled`, `room.closed`, `room.reopened`. Envelope giữ cấu trúc hiện hữu; data có `roomId`, `scheduleId`, `scheduleVersion`, `actorId`, thời điểm và dữ liệu hiển thị đã giới hạn quyền.
- Fan-out cá nhân dùng bảng delivery/outbox theo recipient, unique `(scheduleId, scheduleVersion, eventType, recipientId)`; checkpoint theo lô trong DB. Phát mỗi recipient một envelope có `eventId` ổn định để tận dụng inbox dedupe hiện có.
- Link notification luôn kiểm tra quyền khi người dùng mở; thu hồi quyền phải ngừng hiển thị chi tiết room trong thông báo/API liên quan. Banner lấy lịch mới nhất, không phụ thuộc event đến đúng thứ tự.
- Mục tiêu vận hành: trong điều kiện bình thường status được cập nhật trong 60 giây sau hạn; cảnh báo lịch quá hạn trên 2 phút. Quyền ghi luôn bị chặn đúng hạn theo giờ DB, kể cả khi worker dừng.

Chống trùng khi broadcast cần khóa theo `(eventId, recipientId)` hoặc delivery key tương đương. Không chỉ dựa vào inbox một event khi quá trình fan-out có thể thất bại giữa các lô.

## 6. Rủi ro thực tế và biện pháp

| Rủi ro | Hậu quả | Biện pháp / kiểm chứng |
| --- | --- | --- |
| Xóa room hoặc liên kết môn–ngành đang dùng | Bài cũ mất ngữ cảnh, URL lỗi, mất tài liệu | Không xóa trong MVP; kiểm kê tham chiếu xuyên service; dùng archive; thử phục hồi trước purge |
| Người dùng gọi API quản trị trực tiếp | Sửa dữ liệu trái phép | Kiểm tra admin tại backend; kiểm thử 401/403; bảo vệ mạng nội bộ và header gateway |
| Hai admin sửa cùng lúc | Ghi đè dữ liệu âm thầm | Optimistic concurrency bằng version; test hai request cùng version chỉ một thành công |
| Tạo trùng do double-click/retry | Nhiều room/môn trùng | Unique constraint; xử lý `409`; khóa nút khi gửi; nếu thêm idempotency key phải lưu phía server |
| Academic không sẵn sàng hoặc context đổi sau khi xác minh | Room có binding sai/không còn hoạt động | Timeout, fail rõ ràng, retry; không hứa atomic xuyên service; đối soát binding và hạn chế xóa/inactivate context đang dùng |
| Đóng room chỉ chặn tạo bài mới | Vẫn có thể trả lời, bình luận hoặc duyệt bài chờ | Rà soát mọi đường ghi, định nghĩa ngoại lệ kiểm duyệt và kiểm tra trạng thái ở backend trong transaction phù hợp |
| Đóng room đua với request tạo bài | Nội dung mới lọt vào sau thời hạn | Thống nhất thứ tự lock/kiểm tra room và post; test cạnh tranh, tránh deadlock với lock order hiện hữu |
| Worker trễ, chạy nhiều instance hoặc restart | Đóng muộn/đóng hai lần | Lịch DB bền vững, claim/lock, idempotency, đo độ trễ và cảnh báo job quá hạn |
| NATS/notification ngừng hoạt động | Người dùng không nhận cảnh báo | Outbox retry, inbox/delivery dedupe, banner từ dữ liệu thật; theo dõi lỗi và backlog |
| Broadcast cho toàn bộ tài khoản | Tải DB/SSE tăng, lộ tên room riêng tư | Phân lô, giới hạn tốc độ, xác định phạm vi người nhận và lọc quyền |
| Đổi tên hoặc inactive môn | UI hiển thị không nhất quán, bài cũ không truy cập được | Giữ ID/mã; quy định tên room độc lập; chưa mở inactive trước khi kiểm tra các đường đọc lịch sử |
| Migration trên dữ liệu đang chạy | Khóa bảng, lỗi constraint, gián đoạn | Migration bổ sung tương thích, backfill theo lô; kiểm tra dữ liệu trùng trước constraint; staging trên bản sao đã ẩn dữ liệu nhạy cảm |
| Nội dung tên/mô tả không an toàn | XSS hoặc giao diện lỗi | Giới hạn độ dài, render text an toàn; sanitize nếu hỗ trợ rich text |

## 7. Các pha cài đặt và điều kiện hoàn thành

### Pha 0 — Chuẩn bị hợp đồng và dữ liệu

- [ ] Dùng quy tắc mục 1 làm hợp đồng triển khai: bản A thêm/sửa; bản B báo trước → chỉ đọc → archive thủ công; không xóa.
- [ ] Lập ma trận quyền admin/owner/moderator/member cho metadata, status, lịch đóng và các thao tác nội dung; ghi rõ quyền hiện hữu cần giữ.
- [ ] Rà soát migrations, auth/header, route/cache, mọi đường đọc/ghi nội dung theo room; kiểm kê room/binding/course trùng và liên kết mất ngữ cảnh.
- [ ] Chốt DTO, mã lỗi, concurrency, audit và hành vi giữ tên room khi đổi tên môn.

Đầu ra: API/DTO, ma trận quyền và báo cáo dữ liệu trùng; không để câu hỏi xóa room chặn bản A hoặc thiết kế bảo toàn nội dung của bản B.

### Pha 1 — Backend thêm/sửa an toàn

- [ ] Discussion: thêm DTO/controller/service sửa metadata admin-only; tận dụng create, giữ binding bất biến.
- [ ] Academic: tận dụng create/update, bổ sung audit/version; giữ mã môn bất biến; không mở xóa/inactive trong UI MVP.
- [ ] Thêm migration audit/version theo cấu trúc migration/module hiện hữu, không dựa vào schema auto-sync ở production.
- [ ] Dùng cập nhật có điều kiện `WHERE id = :id AND version = :expectedVersion`, tăng version ngay trong câu UPDATE; kiểm tra số dòng thay đổi. Không chỉ đọc version rồi save vì vẫn có thể ghi đè khi chạy đồng thời. Audit tạo/cập nhật có actor và before/after trong cùng transaction.
- [ ] Dùng metadata version riêng cho tên/mô tả nếu endpoint policy/thành viên không cùng hợp đồng version; mọi đường cập nhật cùng nhóm trường phải tuân thủ cùng cơ chế. Với course, áp dụng tương tự vào `updateCatalog` mà không vô tình thay hợp đồng sửa major.
- [ ] Gateway: route PATCH metadata room; rà soát role và invalidation/TTL; không tạo route DELETE mới.
- [ ] Hoàn thiện xử lý trùng, DTO rỗng/trường lạ, not-found và conflict version.

Đầu ra: các API đi qua gateway hoạt động, có audit và kiểm tra quyền; dữ liệu bài đăng hiện hữu được giữ nguyên.

### Pha 2 — Frontend quản trị

- [ ] Đề xuất `/admin/rooms`, `/admin/courses`; bổ sung điều hướng chỉ admin và tái sử dụng thành phần UI dự án.
- [ ] Mở rộng `lib/api/rooms.ts`, `academic.ts` và types cho create/update/version; form tạo/sửa, trạng thái loading/error/success.
- [ ] Form room hỗ trợ chọn đúng ngành/ngữ cảnh môn; khóa các trường bất biến khi sửa.
- [ ] Form môn hỗ trợ danh sách phân trang, mã chỉ nhập lúc tạo; tách bước gắn ngành khỏi tạo môn.
- [ ] Xử lý lỗi 409 bằng hướng dẫn tải lại; refresh room context/picker sau cập nhật; không hiển thị nút xóa.

Đầu ra: admin hoàn thành thêm/sửa trên giao diện; user thường không thể truy cập API quản trị bằng request thủ công.

### Pha 3 — Kiểm thử và phát hành MVP

- [ ] Integration: tạo/sửa thành công; 401/403/404; dữ liệu sai; mã/slug trùng; sửa version cũ; transaction rollback không để audit/binding mồ côi.
- [ ] Room: binding sai ngành, room cha sai loại, academic timeout; hồi quy tạo room event/forum và quyền policy/thành viên hiện hữu.
- [ ] Course: mã được chuẩn hóa; không sửa mã qua body; course và major-course không bị nhầm; thay tên không đổi room hoặc mất bài cũ.
- [ ] E2E: admin thêm môn → gắn ngành nếu cần → tạo room → sửa tên → xem dữ liệu mới tại room picker; tài khoản thường bị từ chối.
- [ ] Chạy test/build/lint phù hợp theo script thực tế của từng package; kiểm tra gateway bằng bộ test Go hiện có. Ghi lại lệnh và kết quả khi cài đặt, không ghi nhận “đã pass” ở giai đoạn lập kế hoạch.
- [ ] Backup, chạy migration trên staging, smoke test, triển khai backend/gateway trước frontend; theo dõi lỗi và độ trễ.

Đầu ra: MVP được nghiệm thu độc lập, không phải chờ quyết định xóa room.

### Pha 4 — Backend vòng đời và thông báo, bản phát hành B

- [ ] Cài API/bảng/index/worker theo mục 5.5; tích hợp cấu hình thời gian báo trước, audit và outbox.
- [ ] Bảo vệ endpoint status hiện hữu; hoàn thiện read-only/archived và kiểm tra deadline ở mọi đường ghi theo quy tắc mục 1.
- [ ] Bổ sung API danh sách room có lọc trạng thái, phân trang và quyền để admin quản trị được room lưu trữ; không làm biến mất URL/bài cũ.
- [ ] Thêm event/consumer và delivery theo recipient; banner lọc quyền; retry và dedupe theo lô.
- [ ] Test clock tới hạn, restart, hai worker, đổi/hủy lịch khi worker đang chạy, mất NATS, người offline và quyền room private.

Đầu ra: lịch đóng thực thi đúng một lần về hiệu ứng, thông báo có thể truy cập lại, không xóa nội dung.

### Pha 5 — Giao diện và nghiệm thu bản B

- [ ] Form lập/sửa/hủy lịch có lý do, thời điểm, múi giờ và thông báo rõ “ngừng nhận nội dung mới, dữ liệu được giữ lại”.
- [ ] Banner toàn hệ thống theo quyền; hiển thị thời điểm đóng trên room; khóa các thao tác ghi khi tới hạn và xử lý lỗi backend nếu tab đang mở.
- [ ] Danh sách room lưu trữ, thao tác archive/mở lại admin-only, cảnh báo room con và audit lịch sử.
- [ ] E2E: đặt lịch → người dùng thấy banner → tới hạn không ghi được → bài cũ vẫn đọc được → archive → mở lại. Kiểm tra room private không lộ thông tin.
- [ ] Test mất NATS, worker restart, hủy/đổi lịch đua với đóng, request nội dung đua với deadline và fan-out lỗi giữa các batch; kiểm tra metric/cảnh báo.
- [ ] Bật bản B trên staging, kiểm chứng bằng lịch rút ngắn qua cấu hình test; production vẫn dùng thời gian báo trước mặc định 168 giờ.

Đầu ra: vòng đời ngừng hoạt động hoàn chỉnh, không cần bất kỳ cơ chế xóa dữ liệu nào.

Xóa room sau N ngày và xóa môn học là backlog riêng. Chỉ lập kế hoạch code khi có quyết định của giảng viên về lưu giữ/phục hồi; cần phân tích FK/cascade, `MajorCourse`, `CourseTopic`, binding room, bài đăng và file dùng chung. Không thêm migration hoặc API dự phòng cho xóa vào hai bản phát hành này.

Thứ tự phụ thuộc: Pha 0 → Pha 1 → Pha 2 → Pha 3 (phát hành A) → Pha 4 → Pha 5 (phát hành B). Chưa cần thêm service, Redis queue hoặc hệ thống scheduler riêng.

## 8. Triển khai và rollback

- Migration theo hướng bổ sung trước; dữ liệu cũ được backfill version. Giữ API tương thích trong thời gian frontend cũ còn chạy.
- Phát hành A trước; bản B dùng cấu hình bật tắt riêng, bật sau khi qua nghiệm thu staging. Không có cấu hình bật xóa trong đợt này.
- Theo dõi lỗi 4xx/5xx, conflict, thời gian gọi academic; pha lịch theo dõi outbox backlog, notification lỗi và job quá hạn.
- Nếu lỗi UI/API: tắt luồng mới hoặc rollback ứng dụng, giữ các cột bổ sung để tránh mất audit; không tự chạy down migration phá dữ liệu.
- Nếu lỗi lịch: ngừng worker bằng cấu hình và xử lý lịch bền vững trong DB; không coi tắt UI là đã hủy các lịch đang chờ.

## 9. Tiêu chí nghiệm thu chung

1. Admin thêm/sửa được room và môn qua gateway; quyền backend được kiểm chứng bằng tài khoản thường.
2. API sẵn có được tận dụng; ID, binding và nội dung cũ không bị đổi/xóa ngoài phạm vi.
3. Giao diện cập nhật sau thao tác, báo lỗi rõ ràng và không ghi đè âm thầm khi có hai admin.
4. Thay đổi có audit; migration và rollback đã được kiểm chứng trên staging trước phát hành.
5. Không có nút/API xóa mới. Bản B báo trước đúng cấu hình, chặn ghi khi đến hạn, giữ nội dung đọc được theo quyền cũ và cho admin mở lại.
6. Room private không lộ qua banner/notification; restart và xử lý lại event không tạo chuyển trạng thái hoặc thông báo trùng.
