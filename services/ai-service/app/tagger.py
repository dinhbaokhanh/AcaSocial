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

from app.keywords import KeywordMatcher
from app.text import accent_ratio, expand_teencode

SERVICE_ROOT = Path(__file__).resolve().parents[1]
TAXONOMY_PATH = SERVICE_ROOT / "taxonomy.json"
PROTOTYPES_PATH = SERVICE_ROOT / "model" / "prototypes.npz"
MAX_TAGS = 3
MAX_CANDIDATES = 5
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


class PrototypeTagger:
    def __init__(self, encoder, prototypes: np.ndarray, slugs: list[str], tags: dict, prefix: str = "query: "):
        self.encoder = encoder
        self.prototypes = prototypes
        self.slugs = slugs
        self.tags = tags
        self.prefix = prefix
        self.keywords = KeywordMatcher(tags)

    @classmethod
    def load(cls, encoder, path: Path = PROTOTYPES_PATH):
        data = np.load(path, allow_pickle=False)
        return cls(encoder, data["prototypes"], [str(s) for s in data["slugs"]], load_taxonomy())

    def embed(self, texts: list[str]) -> np.ndarray:
        return self.encoder.encode([self.prefix + t for t in texts], normalize_embeddings=True, batch_size=32)

    def suggest(self, title: str, content: str) -> list[TagSuggestion]:
        return self.analyze(title, content)[0]

    def analyze(self, title: str, content: str) -> tuple[list[TagSuggestion], list[TagSuggestion]]:
        """(gợi ý chính, ứng viên). Gợi ý chính là quyết định được đánh giá trong ai-lab; ứng viên là tối đa
        MAX_CANDIDATES tag xếp hạng cao nhất (bắt đầu bằng gợi ý chính), vẫn trả về cả khi bài bị coi là lạc đề.
        Trên test_external (bài có dấu), tag đúng nằm trong top 5 ở 96% bài học thuật, so với 69% ở top 1."""
        sims = self.embed([post_doc(title, content)])[0] @ self.prototypes.T
        sim_of = {slug: float(s) for slug, s in zip(self.slugs, sims)}

        raw = f"{title}. {content}" if title else content
        keyword_hits = {} if accent_ratio(raw) >= ACCENTED_MIN_RATIO else self.keywords.scores(raw, accented=False)
        by_keyword = sorted(keyword_hits, key=lambda s: (-keyword_hits[s], -sim_of[s]))
        by_embedding = [s for s in sorted(sim_of, key=lambda s: -sim_of[s]) if s != NONE]
        make = lambda s: TagSuggestion(s, round(sim_of[s], 4), "keyword" if s in keyword_hits else "embedding")

        best = max(sim_of, key=sim_of.get)
        if keyword_hits:
            ranked = by_keyword
        elif best == NONE:
            ranked = []
        else:
            ranked = [s for s in by_embedding if sim_of[s] >= sim_of[best]]
        parents = {self.tags[s]["parent"] for s in ranked if self.tags[s]["parent"]}
        primary = [make(s) for s in ranked if s not in parents][:MAX_TAGS]

        order = [s.slug for s in primary] + by_keyword + by_embedding
        candidates = [make(s) for s in dict.fromkeys(order)][:MAX_CANDIDATES]
        return primary, candidates
