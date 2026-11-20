# Triển khai AI và báo cáo vi phạm

## Chức năng đã thêm trong mã

- Loại trùng keyword sau chuẩn hóa; ưu tiên tên môn nhiều từ cho bài có dấu và không dấu, hỗ trợ chọn chủ đề con theo điểm embedding. Quy tắc tên môn vẫn có thể gợi ý nhầm khi trích dẫn hoặc phủ định tên môn, cần đánh giá trên dữ liệu thật.
- `POST /api/content-reports`: báo cáo bài viết theo phiên bản, kiểm tra quyền đọc, giới hạn 30 báo cáo/giờ/người, chống trùng và gộp vào case. Hiện từ chối gửi báo cáo khi bài có bản sửa đang chờ duyệt để tránh nhầm nội dung được phân tích với bản sửa.
- `GET /api/moderation/cases`: danh sách theo quyền toàn cục/room, lọc trạng thái, lý do, roomId, phân trang 30 hồ sơ. `POST /api/moderation/cases/{id}/claim` nhận hồ sơ bằng cập nhật có điều kiện.
- Worker dùng PostgreSQL nhận job có lease, tối đa ba lần thử, backoff 30 giây, lưu kết quả và loại bỏ kết quả khi phiên bản bài/case không còn hợp lệ. Không tự thay đổi trạng thái bài theo AI.
- `POST /internal/ai/moderate`: adapter cho endpoint chat-completions tương thích, kiểm tra kết quả và đoạn bằng chứng. Nội quy mặc định `v1` gồm spam, quấy rối, công kích thù ghét, đe dọa và thông tin riêng tư; chưa dùng nội quy tùy chỉnh theo room. Đây là chính sách khởi đầu cần được nhóm dự án rà soát trước khi sử dụng.
- Giao diện báo cáo trên trang chi tiết bài; trang `/moderation/cases` cho người có quyền xem báo cáo, nhận xử lý, xem gợi ý AI và quyết định thủ công. Quyết định sử dụng API kiểm duyệt hiện có, có kiểm tra phiên bản; case/report tương ứng được đóng và liên kết inference thành công nếu có.

## Cấu hình và chạy

Migration `AiCases1791800000000` tạo bảng job và được đăng ký trong discussion-service. Sao lưu DB trước khi áp dụng trên môi trường có dữ liệu. Luồng báo cáo và worker yêu cầu migration này chạy thành công.

Trong môi trường Docker Compose, cấu hình biến môi trường gốc (hoặc môi trường shell):

```dotenv
LLM_CHAT_URL=https://your-provider.example/v1/chat/completions
LLM_MODEL=your-model
LLM_API_KEY=your-secret
```

Đây là URL minh họa; điền endpoint, model và khóa của dịch vụ được chọn. Khi chạy AI service ngoài Compose, đặt các biến trên cho tiến trình AI; `.env.example` chỉ là mẫu, ứng dụng không tự đọc file này. Không đưa khóa vào frontend. AI và discussion-service cần cùng `INTERNAL_SERVICE_TOKEN`. Nội dung bài được gửi đến endpoint đã cấu hình; chỉ cấu hình nhà cung cấp phù hợp chính sách dữ liệu của dự án.

Worker tự chạy trong discussion-service mỗi 3 giây. Thiếu cấu hình LLM hoặc provider lỗi thì job thử lại trong giới hạn rồi chuyển `failed`; người có quyền vẫn có thể xử lý hồ sơ thủ công. Không có chế độ giả lập kết quả thành công khi thiếu provider. AI service hiện vẫn nạp model embedding lúc khởi động, nên cần model/prototype và dependency AI sẵn sàng trước khi kiểm thử API moderation.

## Kiểm tra

```powershell
# Tại services/discussion-service
node node_modules/typescript/bin/tsc --noEmit
node --test test/ai-cases.unit.cjs

# Tại frontend
node node_modules/typescript/bin/tsc --noEmit

# Tại services/ai-service
python -m unittest discover -s tests -v
```

Các unit test backend mock DB và không chứng minh migration, khóa PostgreSQL hoặc truy vấn chạy đúng trên DB thật. Cần chạy tích hợp với PostgreSQL, AI service và LLM được cấu hình: gửi báo cáo từ tài khoản thường, kiểm tra case, kết quả worker, claim, duyệt/ẩn và lịch sử; lặp lại khi gửi đồng thời, sửa/xóa bài, tắt AI và worker mất lease. Với mô hình thật cần thử đầu ra sai định dạng, bằng chứng không tồn tại và nội dung yêu cầu mô hình bỏ qua chỉ dẫn.

## Phần chưa thể hoàn tất chỉ từ source hiện có

- Chưa xác nhận vận hành end-to-end, migration trên PostgreSQL thật hoặc chất lượng LLM. Chưa có provider/model/key được lựa chọn; Python hệ thống thiếu dependency AI và lần kiểm tra trước chưa kết nối được Docker Engine.
- Chưa dựng lại prototype hoặc đo độ chính xác/F1 vì bộ `ai-lab` chưa có trong workspace; chưa có tập đánh giá kiểm duyệt được gán nhãn và phê duyệt.
- Chưa có quản trị phiên bản nội quy theo room, giao diện cấu hình model, chủ động chạy lại job, hoặc thao tác đóng riêng một case phiên bản cũ. Case phiên bản cũ không dùng để duyệt bản mới.
- Phản hồi tag vẫn theo cơ chế hiện tại khi tạo bài, chưa có ID phiên gợi ý được xác minh phía server; chưa có pipeline rà soát nhãn và cập nhật model.
- Đã ghi audit tạo report/claim và log JSON cho kết quả/lỗi worker với job ID, số lần thử, thời gian xử lý. Chưa có dashboard metrics, cảnh báo và chính sách lưu dữ liệu vận hành.
- Tóm tắt, RAG, kiểm duyệt comment/answer và tự động ẩn bài không thuộc bản tối thiểu này. Tóm tắt/RAG vẫn là hướng phát triển theo Word (6).

Tham khảo [thiết kế](ke-hoach-thiet-ke-ai.md) để tiếp tục các đầu ra chưa hoàn tất. Không sử dụng báo cáo review cũ như bằng chứng rằng các chức năng mới đã qua kiểm thử vận hành.
