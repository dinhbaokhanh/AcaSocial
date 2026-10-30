"""Tính prototype cho từng tag và lưu vào model/prototypes.npz.

Dùng toàn bộ bài đã gán nhãn trong ai-lab/data/raw.jsonl (train + dev + test tổng hợp).
test_external KHÔNG được dùng để giữ nó làm bộ đánh giá độc lập.
    python -m app.build_prototypes
"""
import json

import numpy as np
from sentence_transformers import SentenceTransformer

from app.config import MODEL_NAME
from app.tagger import NONE, NONE_DOC, PROTOTYPES_PATH, SERVICE_ROOT, load_taxonomy, post_doc, tag_doc

LABELED_DATA = SERVICE_ROOT / "ai-lab" / "data" / "raw.jsonl"


def main():
    tags = load_taxonomy()
    slugs = sorted(tags) + [NONE]
    docs = {**{s: tag_doc(t) for s, t in tags.items()}, NONE: NONE_DOC}
    rows = [json.loads(l) for l in LABELED_DATA.read_text(encoding="utf-8").splitlines() if l.strip()]

    model = SentenceTransformer(MODEL_NAME)
    encode = lambda texts: model.encode(["query: " + t for t in texts], normalize_embeddings=True, batch_size=32)
    doc_emb = encode([docs[s] for s in slugs])
    post_emb = encode([post_doc(r["title"], r["content"]) for r in rows])

    protos = []
    for i, slug in enumerate(slugs):
        members = [post_emb[j] for j, r in enumerate(rows) if slug in (r["tags"] or [NONE])]
        v = np.mean([doc_emb[i]] + members, axis=0)
        protos.append(v / np.linalg.norm(v))
        print(f"{slug:<26} {len(members):>3} bài")

    PROTOTYPES_PATH.parent.mkdir(parents=True, exist_ok=True)
    np.savez(PROTOTYPES_PATH, prototypes=np.array(protos, dtype=np.float32), slugs=np.array(slugs))
    print(f"\nĐã lưu {len(slugs)} prototype -> {PROTOTYPES_PATH.relative_to(SERVICE_ROOT)}")


if __name__ == "__main__":
    main()
