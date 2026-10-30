FROM python:3.12-slim

WORKDIR /app
ENV PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/.hf \
    PYTHONUNBUFFERED=1

# Torch bản CPU (nhẹ hơn nhiều so với bản mặc định kèm CUDA)
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu
COPY requirements.txt .
RUN pip install -r requirements.txt

# Tải sẵn model embedding vào image để container chạy được offline
ARG EMBEDDING_MODEL=intfloat/multilingual-e5-large
ENV EMBEDDING_MODEL=${EMBEDDING_MODEL}
RUN python -c "import os; from sentence_transformers import SentenceTransformer; SentenceTransformer(os.environ['EMBEDDING_MODEL'])"
ENV HF_HUB_OFFLINE=1

COPY taxonomy.json .
COPY model ./model
COPY app ./app

EXPOSE 8087
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8087"]
