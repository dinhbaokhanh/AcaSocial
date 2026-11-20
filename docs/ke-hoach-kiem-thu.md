# Kế hoạch và checklist kiểm thử AcaSocial

Trạng thái: **đề xuất, chưa thực thi**. Cơ sở: checklist các pha kiểm thử do người dùng cung cấp, mã nguồn, README và `docs/academic-foundation.md`. Mọi ô chưa đánh dấu không hàm ý đã đạt. Chốt phạm vi và kết quả mong đợi với chủ sản phẩm trước khi chạy; mã nguồn không thay thế đặc tả được duyệt.

## 1. Mục tiêu và phạm vi

Kiểm tra chức năng, phân quyền, toàn vẹn dữ liệu và khả năng vận hành của frontend, Go gateway, identity, academic, discussion, media, notification và AI service; các phụ thuộc PostgreSQL, Redis, NATS JetStream, ClamAV, email và lưu trữ media. Luồng nghiệp vụ đi qua gateway; kiểm tra thêm ranh giới truy cập nội bộ trong môi trường cô lập.

Tài liệu phạm vi học thuật nói AI moderation/topic suggestions chưa triển khai, nhưng repository có AI service và route gợi ý tag. Cần xác nhận phạm vi thực tế và hợp đồng trước khi coi kết quả AI là tiêu chí nghiệm thu. Báo cáo vi phạm, RAG và xác thực tính đúng đắn học thuật không nằm trong phạm vi đã xác nhận. README discussion có các mô tả cũ mâu thuẫn tài liệu phạm vi; dùng `academic-foundation.md` làm cơ sở tạm thời, xác nhận lại với chủ sản phẩm.

Ưu tiên: **P0** bảo mật, đăng nhập, quyền, mất dữ liệu và luồng chính; **P1** nghiệp vụ còn lại, tích hợp và phục hồi; **P2** giao diện, tương thích và tối ưu. Mỗi mục kiểm thử cần ghi build/commit, môi trường, người chạy, ngày, kết quả Pass/Fail/Blocked/Not run, bằng chứng và mã lỗi; checkbox chỉ đánh dấu khi đã kiểm tra và lưu bằng chứng.

## 2. Tổ chức và tiến độ đề xuất

| Bước | Công việc và đầu ra | Người phụ trách | Ước lượng tham khảo |
|---|---|---|---|
| 1 | Chốt yêu cầu, rủi ro, vai trò, tiêu chí và môi trường; lập ma trận yêu cầu–test | QA lead + chủ sản phẩm + dev | 1–2 ngày |
| 2 | Chuẩn bị dữ liệu, thiết kế và review ca kiểm thử; cấu hình công cụ | QA + dev | 2–3 ngày |
| 3 | Unit, tích hợp tăng dần, smoke build; sửa lỗi chặn | Dev + QA | 3–5 ngày |
| 4 | System, bảo mật, hiệu năng, hồi quy và retest | QA + dev | 4–6 ngày |
| 5 | UAT, tổng kết và quyết định bàn giao | Chủ sản phẩm + người dùng đại diện | 1–2 ngày |

Ước lượng tính theo ngày làm việc, giả định một QA và dev hỗ trợ, có thể chạy xen kẽ; điều chỉnh sau khi chốt nhân lực, khối lượng và tình trạng build. Không phải cam kết lịch.

## 3. Chuẩn bị và điều kiện vào

- [ ] Chốt phiên bản mã, yêu cầu, các giới hạn đầu vào, quyền từng vai trò, trạng thái phòng và mục tiêu phi chức năng; ánh xạ từng yêu cầu tới mã test và người duyệt.
- [ ] Tạo môi trường test độc lập, dữ liệu giả và thông tin truy cập riêng; không dùng tài khoản hoặc dữ liệu thật. Ghi cấu hình và phiên bản trình duyệt.
- [ ] Dựng stack theo README và `docker-compose.yml`, cấu hình các file môi trường test, kiểm tra gateway `/health`, các service, DB, Redis, NATS và ClamAV sẵn sàng. Frontend chạy riêng theo README frontend; Compose hiện không khai báo frontend.
- [ ] Dùng hộp thư thử và dịch vụ lưu trữ media thử; chuẩn bị tệp hợp lệ, sai loại, quá giới hạn và mẫu kiểm thử antivirus an toàn. Xác định cách reset dữ liệu và sao lưu trước thử phục hồi.
- [ ] Chuẩn bị khách chưa đăng nhập, ít nhất hai người dùng thường, admin, global moderator, chủ phòng, moderator phòng và thành viên pending/muted/banned; tạo phòng và nội dung ở các trạng thái cần thiết.
- [ ] Build cài đặt thành công, smoke đăng nhập và truy cập API qua gateway; ghi rõ dependency không sẵn sàng và đánh dấu các ca liên quan Blocked.
- [ ] Thiết lập nơi lưu test case và lỗi. Mẫu ca: ID, yêu cầu, ưu tiên, tiền điều kiện, dữ liệu, bước, kết quả mong đợi, kết quả thực tế, bằng chứng, phiên bản và người chạy.

## 4. Checklist theo mức kiểm thử

### Unit — developer, mock các phụ thuộc ngoài

- [ ] **U01 P0** Xác thực DTO, mật khẩu, email, OTP, token và TTL: hợp lệ, thiếu, sai định dạng, giá trị biên và hết hạn; không lộ bí mật trong lỗi.
- [ ] **U02 P0** Logic phân quyền toàn cục, vai trò phòng và trạng thái thành viên; từ chối quyền khi thiếu hoặc sai danh tính.
- [ ] **U03 P1** Quy tắc chuyển trạng thái bài, duyệt nội dung, chọn/hủy đáp án, sửa nội dung và vô hiệu lựa chọn; thử nhánh lỗi và phiên bản cũ.
- [ ] **U04 P1** Vote tạo/đổi/hủy, tính bộ đếm; phân trang, slug, lọc tag và dữ liệu học thuật với đầu vào biên.
- [ ] **U05 P1** Kiểm tra loại/kích thước file, kết quả quét, xử lý lỗi lưu trữ; mapping sự kiện, người nhận và loại bỏ event trùng.
- [ ] **U06 P1** Gateway xử lý JWT, header tin cậy, route, rate limit và lỗi upstream; AI xử lý chuỗi rỗng/Unicode và đầu ra theo hợp đồng được xác nhận.
- [ ] Ghi coverage dòng/nhánh cho logic rủi ro, review các nhánh chưa phủ; bổ sung test tự động vào CI. Không giả định repository đã có test runner đầy đủ.

### Integration — developer và QA, tích hợp tăng dần

- [ ] **I01 P0** Frontend → gateway → identity: đăng ký/OTP/đăng nhập/refresh/logout; token hết hạn hoặc thu hồi bị từ chối; gateway loại header danh tính giả trước khi chuyển tiếp.
- [ ] **I02 P0** Gateway → service: user chỉ truy cập dữ liệu và thao tác được phép; endpoint nội bộ không truy cập được qua gateway công khai, token nội bộ sai bị từ chối tại ranh giới service.
- [ ] **I03 P1** Discussion ↔ academic/identity: tham chiếu môn/topic/người dùng hợp lệ và không tồn tại; lỗi dependency không để lại dữ liệu dở dang.
- [ ] **I04 P1** Upload → ClamAV/lưu trữ → gắn bài → đọc/xóa: kiểm tra quyền sở hữu, file đang được sử dụng và lỗi từng dependency; không tạo liên kết mồ côi.
- [ ] **I05 P0** Discussion → outbox → NATS → notification DB → SSE: đúng người nhận, lịch sử và realtime; thử gửi lại cùng `eventId`, restart consumer và mất kết nối, không tạo thông báo trùng; kiểm tra hành vi khi publish thất bại theo thiết kế.
- [ ] **I06 P1** Vote/bình luận đồng thời và cập nhật nội dung: ràng buộc duy nhất, bộ đếm và transaction nhất quán sau lỗi hoặc request cạnh tranh.
- [ ] **I07 P1** Migration và seed trên DB mới và bản sao DB cũ: chạy lại an toàn theo thiết kế, kiểm tra dữ liệu và quan hệ; thử khôi phục từ backup trong môi trường test.

### System — QA thực hiện trên bản tích hợp

- [ ] **S01 P0 — Tài khoản:** đăng ký mới, email trùng, OTP sai/hết hạn/gửi lại; đăng nhập đúng/sai, refresh, logout, quên và đặt lại mật khẩu; xác minh phiên cũ theo chính sách đã duyệt.
- [ ] **S02 P1 — Hồ sơ:** sửa hồ sơ, avatar, mật khẩu, email có xác nhận, quyền riêng tư và xóa tài khoản; dữ liệu thiếu/sai và người khác truy cập trái phép.
- [ ] **S03 P0 — Phòng:** tìm/xem/tạo/sửa/tham gia, quy tắc, thành viên, chính sách và lịch đóng/hủy; kiểm tra owner/mod phòng đang hoạt động và các trạng thái thành viên không có quyền quản lý.
- [ ] **S04 P0 — Bài viết:** tạo câu hỏi/thảo luận, đính kèm, sửa/xóa, danh sách/chi tiết và phân trang; bài mới hoặc sửa chờ duyệt, chỉ tác giả và admin/global moderator thấy nội dung chưa duyệt hoặc bị ẩn, đồng thời áp dụng quyền riêng tư của phòng.
- [ ] **S05 P0 — Kiểm duyệt:** admin/global moderator duyệt hoặc ẩn bài; người không có quyền bị từ chối; quyết định trên phiên bản cũ bị từ chối, lịch sử được lưu. Bình luận/đáp án không qua hàng đợi duyệt.
- [ ] **S06 P0 — Hỏi đáp:** trả lời, sửa/xóa; tác giả câu hỏi hoặc admin chọn/hủy đáp án trên câu hỏi đã duyệt; tác giả không chọn đáp án của chính mình; vai trò khác bị từ chối. Sửa bài hoặc sửa ngữ nghĩa đáp án đã chọn thu hồi lựa chọn theo đặc tả.
- [ ] **S07 P1 — Tương tác:** thêm/sửa/xóa bình luận và trả lời theo nhánh; vote bài/bình luận/đáp án, đổi và hủy vote; xác nhận hiển thị và bộ đếm sau tải lại.
- [ ] **S08 P1 — Tag/học thuật:** danh sách, tìm/lọc, tạo/sửa/vô hiệu/gộp tag theo quyền; ngành, môn, topic và liên kết của chúng; giá trị trùng, không tồn tại, phân trang và phân quyền quản trị.
- [ ] **S09 P1 — Thông báo:** tài khoản đúng nhận thông báo khi có sự kiện đủ điều kiện; tự bình luận không thông báo cho chính mình; đọc, đánh dấu đã đọc, thử ID của user khác, ngắt/kết nối lại SSE và đổi tài khoản.
- [ ] **S10 P1 — Media/AI:** upload và xem file hợp lệ; từ chối file sai, quá lớn, nhiễm hoặc không có quyền; thử AI/tag suggestion và khi service không sẵn sàng sau khi xác nhận phạm vi và kết quả kỳ vọng.
- [ ] **S11 P1 — Giao diện:** kiểm tra tiếng Việt/Unicode, trạng thái loading/rỗng/lỗi, thông báo xác thực, bàn phím và focus; màn hình desktop/mobile, Chrome, Firefox, Safari/Edge theo ma trận thiết bị được thống nhất.
- [ ] **S12 P0 — An ninh:** thử IDOR, giả mạo header/role, JWT sai/hết hạn, endpoint nội bộ, injection/XSS, upload độc hại, rate limit và rò rỉ dữ liệu nhạy cảm trong phản hồi/log. Chỉ kiểm thử xâm nhập trên môi trường được phép.
- [ ] **S13 P1 — Vận hành:** thử restart service, mất Redis/PostgreSQL/NATS/lưu trữ, timeout, kết nối lại SSE, backup/restore và triển khai sạch; ghi nhận mất dữ liệu, thời gian phục hồi và lỗi hiển thị.
- [ ] **S14 P1 — Hiệu năng:** sau khi thống nhất tải, dữ liệu và ngưỡng p95/tỷ lệ lỗi, đo baseline và tải đồng thời cho đăng nhập, feed, tạo bài, bình luận và SSE; lưu cấu hình, kết quả và giới hạn môi trường. Chưa có ngưỡng được duyệt nên không tự kết luận đạt.

### Acceptance — người dùng đại diện và chủ sản phẩm

- [ ] **A01 P0** Người dùng đăng ký, xác minh, đăng nhập, tham gia phòng, đăng câu hỏi; người duyệt phê duyệt, người khác trả lời, tác giả chọn đáp án và nhận thông báo đúng.
- [ ] **A02 P1** Quản trị viên quản lý người dùng, môn học, phòng và nội dung; xác nhận quyền thực tế khớp quy trình nghiệp vụ đã duyệt.
- [ ] **A03 P1** Thực hiện alpha trên môi trường test; nếu thống nhất phát hành beta, lấy phản hồi người dùng trên môi trường phù hợp, ghi lỗi và retest. Chốt ngoại lệ và biên bản nghiệm thu với người có thẩm quyền.

## 5. Thực thi, quản lý lỗi và kết thúc

- [ ] Chạy P0 trước, sau đó P1/P2; ghi Pass/Fail/Blocked/Not run cho từng ca, liên kết bằng chứng và yêu cầu. Khi sửa lỗi, retest rồi chạy hồi quy các luồng liên quan.
- [ ] Mỗi lỗi có ID, phiên bản, môi trường, mức nghiêm trọng/ưu tiên, điều kiện, bước tái hiện, kết quả thực tế/mong đợi, log hoặc ảnh đã loại dữ liệu nhạy cảm, người phụ trách và liên kết ca test.
- [ ] Theo dõi New → Assigned → Fixed → Retested → Closed; nếu tái hiện thì Reopened, nếu từ chối ghi lý do. Không đóng lỗi chưa được xác minh hoặc chưa được người có thẩm quyền chấp nhận ngoại lệ.
- [ ] Báo cáo số ca Pass/Fail/Blocked/Not run trên tổng số theo mức ưu tiên và phạm vi, lỗi mở theo mức độ, rủi ro, phạm vi chưa kiểm thử và quyết định đề xuất.
- [ ] Điều kiện kết thúc đề xuất theo tài liệu nguồn: thực thi 100% ca tích hợp và system trong kế hoạch, tối thiểu 95% lỗi đã đóng, không còn lỗi nghiêm trọng cao/Fatal/Serious đang mở, và tiêu chí UAT được chấp nhận. Thống nhất định nghĩa mức lỗi và mẫu số trước khi đo; các ca Blocked không tính là đã thực thi. Mọi ngoại lệ phải ghi rủi ro, người chấp nhận và thời hạn xử lý.
- [ ] Lưu bộ ca, bằng chứng, báo cáo, phân tích nguyên nhân lỗi quan trọng và biên bản; xóa dữ liệu thử theo chính sách môi trường.
