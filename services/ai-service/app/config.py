import os

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "intfloat/multilingual-e5-large")
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "")
PORT = int(os.getenv("PORT", "8087"))

# Ngưỡng gợi ý, chọn bằng ai-lab/scripts/calibrate.py (xem README, mục "Ngưỡng").
# Cosine thấp nhất với prototype tag để được gợi ý khi không khớp từ khóa nào.
TAG_MIN_SIMILARITY = float(os.getenv("TAG_MIN_SIMILARITY", "0.89"))
# Tag phụ ("có thể liên quan") phải cách tag chính không quá chừng này, tối đa TAG_MAX_RELATED tag.
TAG_RELATED_MAX_GAP = float(os.getenv("TAG_RELATED_MAX_GAP", "0.005"))
TAG_MAX_RELATED = int(os.getenv("TAG_MAX_RELATED", "2"))
