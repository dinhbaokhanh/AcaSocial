# AI Service

Gợi ý tag (topic) cho bài đăng dựa trên [taxonomy.json](taxonomy.json): 10 môn + 20 topic con. Cổng **8087**, chỉ gọi nội bộ.

## Cách hoạt động

- **Bài viết có dấu**: model embedding pre-trained `intfloat/multilingual-e5-large` (chạy offline, không gọi API ngoài)
  biến bài viết thành vector, so với **prototype** của từng tag. Prototype = trung bình embedding của mô tả tag và
  các bài đã gán nhãn của tag đó. Bài gần lớp `_none` (đời sống sinh viên) nhất thì không gán tag.
- **Bài viết không dấu**: embedding kém hẳn với văn bản không dấu, nên so khớp `keywords` trong taxonomy trước;
  không khớp từ khóa nào mới dùng embedding.
- Tối đa 3 tag; đã có topic con thì không trả kèm môn cha.

## API

`POST /internal/ai/tag`, header `X-Internal-Token: <INTERNAL_SERVICE_TOKEN>`

```json
{ "title": "Banker tính sao", "content": "Mình không hiểu cách tính Need trong giải thuật Banker..." }
```

```json
{
  "tags": [
    { "slug": "deadlock", "name": "Deadlock", "level": "topic", "tagId": "dddddddd-...-000000000001",
      "topicId": "7a5b5c9c-...", "score": 0.8777, "source": "keyword" }
  ],
  "model": "intfloat/multilingual-e5-large"
}
```

`tags: []` nghĩa là bài lạc đề hoặc không đủ tin cậy. `score` là độ tương đồng cosine với prototype, không phải xác suất.
`GET /health` trả `{"status": "ok"}` khi model đã nạp xong (mất khoảng 30–60 giây lúc khởi động).

## Chạy local

```bash
pip install -r requirements.txt
python -m app.build_prototypes          # chỉ cần chạy lại khi đổi taxonomy.json hoặc dữ liệu gán nhãn
INTERNAL_SERVICE_TOKEN=dev uvicorn app.main:app --port 8087
```

## Đánh giá

Thư mục [ai-lab/](ai-lab/) chứa dữ liệu, các baseline và script đánh giá. Kết quả trên `test_external`
(78 bài do người khác viết, không dùng để tính prototype):

| | Đúng môn | Nhãn micro-F1 | Lạc đề F1 |
|---|---|---|---|
| Bài có dấu | 0.85 | 0.68 | 0.91 |
| Bài không dấu | 0.72 | 0.61 | 0.40 |

Chạy lại: `python ai-lab/scripts/eval_service.py`. Lưu ý: cấu hình được chọn sau khi đã xem kết quả trên
`test_external`, nên các số trên có thể hơi lạc quan; bài thật thu thập sau này nên dùng làm bộ kiểm tra cuối.
