# Discussion: quy tắc và kiểm thử

## Phạm vi

Bản refactor tập trung nghiệp vụ discussion, giao diện và tích hợp notification/media/identity. Không có pipeline, API xuất dữ liệu, embedding hoặc indexing cho RAG.

## Cấu trúc

- Controller nhận DTO và gọi service; DTO chuẩn hóa khoảng trắng, giới hạn kích thước, UUID, danh sách tag/media và từ chối `null` không hợp lệ.
- `common/content-policy.ts` tập trung quyền sở hữu, trạng thái và thứ tự khóa bản ghi. Mutation khóa bài viết trước bình luận/vote; bộ đếm được cập nhật cùng transaction.
- `common/content-presenter.ts` tạo dữ liệu trả về theo người xem: ẩn tác giả ẩn danh/đã xóa, nạp hồ sơ theo lô và bổ sung `isMine`, `canManage`, `canVote`, `myVote`.
- `common/media-reference.service.ts` xác minh media tồn tại và thuộc người gắn file qua API nội bộ có token. Lời gọi mạng này diễn ra trước transaction.
- `events/` chỉ phụ trách outbox: ghi sự kiện cùng transaction nghiệp vụ, gửi JetStream rồi đánh dấu đã gửi sau ACK. Lỗi gửi được thử lại với cùng event ID; notification consumer cần giữ cơ chế chống trùng.

## Quy tắc hiện tại

- Người dùng được trao đổi dưới bài của mình, nhưng không được tự vote hoặc tự chấp nhận câu trả lời của mình.
- Chỉ chủ câu hỏi được accept câu trả lời gốc, còn tồn tại, của người khác trong cùng câu hỏi. Reply không phải ứng viên accept. Xóa câu trả lời được accept sẽ bỏ liên kết và mở lại câu hỏi.
- Admin/moderator có API đóng/mở bài. Bài đóng chặn sửa nội dung, bình luận, vote và accept. Mở lại bài có câu trả lời được accept sẽ trở về `solved`.
- Reply phải có parent còn tồn tại trong cùng bài. Xóa bình luận giữ nút thay thế khi còn nhánh con để người đọc tiếp tục mở trao đổi. Bài đã xóa chặn mọi mutation lên bình luận bên dưới.
- POST vote đặt giá trị mong muốn; gửi lại cùng giá trị không bật/tắt vote. DELETE xóa vote và có thể gửi lại an toàn.
- Bài có 1–5 tag khác nhau. Admin/mod quản lý tag; slug không đổi khi đổi tên. Không xóa tag đang được bài còn hoạt động sử dụng; kiểm tra liên kết thật thay vì chỉ tin bộ đếm.
- Bài hỗ trợ tối đa 10 tệp; giới hạn upload 10 MB/tệp theo danh sách định dạng media service. Giao diện tạo bài có chọn/xóa tệp trước khi đăng; chi tiết hiển thị Markdown, ảnh và liên kết tệp.
- Không được gắn media của người khác hoặc xóa media đang được bài còn hoạt động sử dụng. Dedup upload theo chủ sở hữu và nội dung. Metadata công khai không trả `uploadedBy`.

## Hợp đồng API cần chú ý

- Phân trang trả `{ data, meta: { page, limit, totalItems, totalPages } }`.
- `GET /api/discussions/:id/comments` chỉ trả cấp gốc. Thêm `parentCommentId` để lấy một nhánh con có phân trang; mỗi phần tử có `replyCount` và `kind`.
- Chi tiết bài trả `acceptedAnswer` riêng để giao diện hiển thị được câu trả lời đã chọn dù ngoài trang bình luận hiện tại.
- `authorId` có thể là `null`. Không suy ra quyền sửa/vote từ `authorId` công khai; dùng các trường capability.
- Public GET chấp nhận khách không đăng nhập; nếu gửi Authorization thì token phải hợp lệ.

## Kiểm thử đã thực hiện

Đã kiểm tra trên Docker: phân quyền, ẩn danh, tag, phân nhánh, accept, trạng thái đóng, validation, 20 vote đồng thời, xóa và outbox đã gửi. Đã upload ảnh/file thật để kiểm tra quyền sở hữu, thay thế liên kết và xóa.

Đã smoke test Chrome cho chi tiết Markdown, mở nhánh con, accept, gửi câu trả lời, ẩn nút tự accept, bộ chọn tệp và trang tag. Build Docker các service liên quan, TypeScript frontend và kiểm thử Go đã qua tại thời điểm xác minh.

Các script kiểm thử bổ sung, ảnh chụp và cache tạm đã được dọn khỏi workspace theo yêu cầu. Phần này ghi nhận kết quả đã chạy, không cung cấp bộ script để chạy lại.

## Giới hạn còn lại

- Chưa tự sửa dữ liệu cũ đã vi phạm quy tắc; cần đối soát và migration sửa dữ liệu riêng.
- Outbox có migration riêng. Production cần schema nền và migration được quản lý đầy đủ; không bật TypeORM synchronize ở production để thay thế migration.
- Kiểm tra gắn/xóa media giữa hai service chưa có giao dịch phân tán: vẫn có cửa sổ cạnh tranh nếu hai thao tác diễn ra đúng đồng thời. File upload rồi bỏ form chưa có tác vụ dọn rác tự động.
- Chưa có quét malware, kiểm duyệt tệp, hạn mức dung lượng theo người dùng; validation hiện tại kiểm tra phần mở rộng/MIME/kích thước.
- Giao diện sửa bài hiện sửa tiêu đề/nội dung; thay tag/media và đóng/mở bài đã có API nhưng chưa có đầy đủ điều khiển trên trang chi tiết.
- Lượt xem vẫn tăng theo lần đọc chi tiết; chưa loại bot/lượt xem lặp. Kiểm thử tải dài hạn và cải thiện hiển thị nhánh rất sâu trên mobile chưa nằm trong smoke test.
