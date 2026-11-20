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
        self.tags = tags
        self.patterns = {
            slug: [(_pattern(acc), _pattern(pln)) for acc, pln in
                   sorted({(canonical(term), plain(term)) for term in [*t["keywords"], t["name"]]})]
            for slug, t in tags.items()
        }

    def scores(self, text: str, accented: bool) -> dict[str, int]:
        """Số keyword khớp của mỗi tag (chỉ trả về tag có ít nhất 1 khớp)."""
        text = canonical(text) if accented else plain(text)
        counts = {slug: sum(1 for pattern in {p.pattern: p for acc, pln in pats for p in [acc if accented else pln]}.values() if pattern.search(text))
                  for slug, pats in self.patterns.items()}
        return {slug: n for slug, n in counts.items() if n}

    def course_scores(self, text: str) -> dict[str, int]:
        normalized = plain(text)
        return {slug: 1 for slug, tag in self.tags.items()
                if tag.get("level") == "course" and len(plain(tag["name"]).split()) >= 2
                and _pattern(plain(tag["name"])).search(normalized)}
