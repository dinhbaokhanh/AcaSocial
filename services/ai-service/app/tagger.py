"""Gợi ý tag cho bài đăng.

- Bài viết CÓ DẤU: embedding multilingual-e5-large + prototype mỗi tag. Prototype = trung bình embedding
  (mô tả tag trong taxonomy + các bài gán nhãn của tag đó). Gần lớp "_none" nhất -> lạc đề.
- Bài viết KHÔNG DẤU: embedding kém hẳn (đúng môn 0.44 so với 0.85 trên bộ test ngoài), nên dùng so khớp
  từ khóa trước, không khớp từ khóa nào thì mới dùng embedding (đúng môn 0.72).
Prototype được tính sẵn bởi `python -m app.build_prototypes` và lưu ở model/prototypes.npz.
"""
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from app.config import TAG_MAX_RELATED, TAG_MIN_SIMILARITY, TAG_RELATED_MAX_GAP
from app.keywords import KeywordMatcher
from app.text import accent_ratio, expand_teencode

SERVICE_ROOT = Path(__file__).resolve().parents[1]
TAXONOMY_PATH = SERVICE_ROOT / "taxonomy.json"
PROTOTYPES_PATH = SERVICE_ROOT / "model" / "prototypes.npz"
MAX_TAGS = 3
ACCENTED_MIN_RATIO = 0.05
NONE = "_none"
NONE_DOC = ("Đời sống sinh viên không liên quan môn chuyên ngành: ăn uống, phòng trọ, ký túc xá, gửi xe, "
            "thủ tục, học bổng, lịch thi, môn đại cương, tiếng Anh, thể thao, câu lạc bộ, du lịch, mua bán đồ cũ.")


def tag_doc(tag: dict) -> str:
    return expand_teencode(f"{tag['name']}. {tag['description']} Từ khóa: {', '.join(tag['keywords'])}")


def post_doc(title: str, content: str) -> str:
    return expand_teencode(f"{title}. {content}" if title else content)


def load_taxonomy(path: Path = TAXONOMY_PATH) -> dict:
    return {t["slug"]: t for t in json.loads(path.read_text(encoding="utf-8"))["tags"]}


@dataclass
class TagSuggestion:
    slug: str
    score: float
    source: str


@dataclass
class TagAnalysis:
    status: str  # ok | low_confidence (nội dung không đủ rõ / vô nghĩa) | off_topic (không thuộc môn chuyên ngành)
    tags: list[TagSuggestion]
    related: list[TagSuggestion]


class PrototypeTagger:
    def __init__(self, encoder, prototypes: np.ndarray, slugs: list[str], tags: dict, prefix: str = "query: ",
                 min_similarity: float = TAG_MIN_SIMILARITY, related_max_gap: float = TAG_RELATED_MAX_GAP,
                 max_related: int = TAG_MAX_RELATED):
        self.encoder = encoder
        self.prototypes = prototypes
        self.slugs = slugs
        self.tags = tags
        self.prefix = prefix
        self.keywords = KeywordMatcher(tags)
        self.min_similarity = min_similarity
        self.related_max_gap = related_max_gap
        self.max_related = max_related

    @classmethod
    def load(cls, encoder, path: Path = PROTOTYPES_PATH):
        data = np.load(path, allow_pickle=False)
        return cls(encoder, data["prototypes"], [str(s) for s in data["slugs"]], load_taxonomy())

    def embed(self, texts: list[str]) -> np.ndarray:
        return self.encoder.encode([self.prefix + t for t in texts], normalize_embeddings=True, batch_size=32)

    def suggest(self, title: str, content: str) -> list[TagSuggestion]:
        return self.analyze(title, content).tags

    def analyze(self, title: str, content: str) -> TagAnalysis:
        """Gợi ý chính (`tags`) là quyết định được đánh giá trong ai-lab; `related` là vài tag sát nút tag chính.

        Không khớp từ khóa thì chỉ gợi ý khi tag gần nhất đạt `min_similarity` VÀ gần hơn lớp `_none`.
        Văn bản gõ linh tinh có cosine cao nhất 0.887, bài học thuật có dấu thấp nhất 0.895 (ai-lab/calibrate.py),
        nên ngưỡng 0.89 chặn được văn bản vô nghĩa. Bài không dấu không tách được bằng ngưỡng, phải dựa vào từ khóa.
        Không có gợi ý chính thì cũng không có tag phụ: không đẩy tag đoán mò cho người dùng chọn."""
        sims = self.embed([post_doc(title, content)])[0] @ self.prototypes.T
        sim_of = {slug: float(s) for slug, s in zip(self.slugs, sims)}

        raw = f"{title}. {content}" if title else content
        keyword_hits = {} if accent_ratio(raw) >= ACCENTED_MIN_RATIO else self.keywords.scores(raw, accented=False)
        make = lambda s: TagSuggestion(s, round(sim_of[s], 4), "keyword" if s in keyword_hits else "embedding")

        if keyword_hits:
            ranked = sorted(keyword_hits, key=lambda s: (-keyword_hits[s], -sim_of[s]))
            parents = {self.tags[s]["parent"] for s in ranked if self.tags[s]["parent"]}
            return TagAnalysis("ok", [make(s) for s in ranked if s not in parents][:MAX_TAGS], [])

        by_embedding = [s for s in sorted(sim_of, key=lambda s: -sim_of[s]) if s != NONE]
        best = by_embedding[0]
        if sim_of[best] < self.min_similarity:
            return TagAnalysis("low_confidence", [], [])
        if sim_of[NONE] > sim_of[best]:
            return TagAnalysis("off_topic", [], [])

        floor = max(self.min_similarity, sim_of[NONE], sim_of[best] - self.related_max_gap)
        related = [s for s in by_embedding[1:] if sim_of[s] >= floor and s != self.tags[best]["parent"]]
        return TagAnalysis("ok", [make(best)], [make(s) for s in related][:self.max_related])
