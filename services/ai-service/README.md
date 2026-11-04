# AI Service

Gợi ý tag (topic) cho bài đăng dựa trên [taxonomy.json](taxonomy.json): 10 môn + 20 topic con. Cổng **8087**, chỉ gọi nội bộ.

## Cách hoạt động

- **Bài viết có dấu**: model embedding pre-trained `intfloat/multilingual-e5-large` (chạy offline, không gọi API ngoài)
  biến bài viết thành vector, so với **prototype** của từng tag. Prototype = trung bình embedding của mô tả tag và
  các bài đã gán nhãn của tag đó. Bài gần lớp `_none` (đời sống sinh viên) nhất thì không gán tag.
- **Bài viết không dấu**: embedding kém hẳn với văn bản không dấu, nên so khớp `keywords` trong taxonomy trước;
  không khớp từ khóa nào mới dùng embedding.
- Tối đa 3 tag; đã có topic con thì không trả kèm môn cha.

## Ngưỡng

Không khớp từ khóa thì chỉ gợi ý khi tag gần nhất có cosine ≥ `TAG_MIN_SIMILARITY` (mặc định 0.89) **và** gần hơn
lớp `_none`. Ngưỡng chọn bằng [ai-lab/scripts/calibrate.py](ai-lab/scripts/calibrate.py), so bài thật với 78 văn bản
gõ linh tinh (gõ phím ngẫu nhiên, âm tiết ngẫu nhiên, từ xáo trộn, 2–225 từ):

| Cosine cao nhất với tag | min | median | max |
|---|---|---|---|
| Bài học thuật có dấu | 0.895 | 0.925 | 0.958 |
| Bài học thuật không dấu | 0.861 | 0.889 | 0.942 |
| Văn bản linh tinh | 0.846 | 0.867 | 0.887 |

- Văn bản linh tinh: trước có 34/78 được gợi ý tag, giờ 0/78. Bài có dấu: không mất gợi ý nào.
- Bài không dấu chồng lấn với văn bản linh tinh nên ngưỡng không tách được; nhánh này dựa vào từ khóa.
  Không khớp từ khóa và dưới ngưỡng thì không gợi ý (mất 4/144 bài, trong đó 2 bài vốn gợi ý sai).
- Không dùng ngưỡng theo độ dài bài: cosine của văn bản linh tinh không tăng theo độ dài (0.85–0.89 từ 2 đến 225 từ).
  Yếu tố quyết định là bài có dấu hay không.
- Tag phụ (`related`): tối đa `TAG_MAX_RELATED` (2) tag cách tag chính ≤ `TAG_RELATED_MAX_GAP` (0.005), cũng phải qua
  ngưỡng. Không có tag chính thì không có tag phụ. Trước đây luôn trả 5 tag cao nhất, chỉ 21/478 tag phụ đúng; giờ 10/33.
  Muốn tắt hẳn: `TAG_MAX_RELATED=0`.

## API

`POST /internal/ai/tag`, header `X-Internal-Token: <INTERNAL_SERVICE_TOKEN>`

```json
{ "title": "Banker tính sao", "content": "Mình không hiểu cách tính Need trong giải thuật Banker..." }
```

```json
{
  "status": "ok",
  "tags": [
    { "slug": "deadlock", "name": "Deadlock", "level": "topic", "tagId": "dddddddd-...-000000000001",
      "topicId": "7a5b5c9c-...", "score": 0.8777, "source": "keyword" }
  ],
  "related": [],
  "model": "intfloat/multilingual-e5-large"
}
```

`status`: `ok` (có gợi ý), `low_confidence` (nội dung không đủ rõ, vd. gõ linh tinh), `off_topic` (không thuộc môn
chuyên ngành); hai trường hợp sau thì `tags` và `related` rỗng. `score` là độ tương đồng cosine với prototype, không
phải xác suất.
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
| Bài không dấu | 0.72 | 0.62 | 0.53 |

Chạy lại: `python ai-lab/scripts/eval_service.py`. Lưu ý: cấu hình được chọn sau khi đã xem kết quả trên
`test_external`, nên các số trên có thể hơi lạc quan; bài thật thu thập sau này nên dùng làm bộ kiểm tra cuối.
