"""So khớp từ khóa trong taxonomy - dùng cho bài viết không dấu, nơi embedding hoạt động kém.

Bài có dấu: so keyword có dấu trên văn bản còn dấu (tránh "lượng" khớp nhầm "luồng").
Bài không dấu: bỏ dấu cả bài lẫn keyword rồi so.
"""
import re

from app.text import canonical, plain


def _pattern(term: str):
    return re.compile(r"(?<!\w)" + re.escape(term) + r"(?!\w)")


class KeywordMatcher:
    def __init__(self, tags: dict):
        self.patterns = {
            slug: [(_pattern(canonical(term)), _pattern(plain(term))) for term in set(t["keywords"]) | {t["name"]}]
            for slug, t in tags.items()
        }

    def scores(self, text: str, accented: bool) -> dict[str, int]:
        """Số keyword khớp của mỗi tag (chỉ trả về tag có ít nhất 1 khớp)."""
        text = canonical(text) if accented else plain(text)
        counts = {slug: sum(1 for acc, pln in pats if (acc if accented else pln).search(text))
                  for slug, pats in self.patterns.items()}
        return {slug: n for slug, n in counts.items() if n}
