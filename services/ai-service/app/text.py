"""Chuẩn hóa văn bản tiếng Việt dùng chung cho embedding và so khớp từ khóa."""
import re
import unicodedata

TEENCODE = {
    "ko": "khong", "k": "khong", "mk": "minh", "mn": "moi nguoi", "dc": "duoc",
    "j": "gi", "vs": "voi", "r": "roi", "v": "vay", "z": "vay", "bn": "bao nhieu",
    "ntn": "nhu the nao", "lm": "lam", "trc": "truoc", "sv": "sinh vien", "cty": "cong ty",
}
_TEENCODE_RE = re.compile(r"\b(" + "|".join(TEENCODE) + r")\b")

# Kiểu bỏ dấu cũ -> mới ("khoá" -> "khóa", "thuỷ" -> "thủy").
_TONE_CANON = dict(zip("oá oà oả oã oạ oé oè oẻ oẽ oẹ uý uỳ uỷ uỹ uỵ".split(),
                       "óa òa ỏa õa ọa óe òe ỏe õe ọe úy ùy ủy ũy ụy".split()))


def expand_teencode(text: str) -> str:
    """Chữ thường, NFC, mở rộng teencode phổ biến; GIỮ dấu."""
    text = unicodedata.normalize("NFC", text.lower()).replace("đc", "dc")
    return _TEENCODE_RE.sub(lambda m: TEENCODE[m.group(1)], text)


def strip_accents(text: str) -> str:
    text = text.replace("đ", "d").replace("Đ", "D")
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def canonical(text: str) -> str:
    """expand_teencode + thống nhất kiểu đặt dấu; dùng để so khớp keyword có dấu."""
    text = expand_teencode(text)
    for old, new in _TONE_CANON.items():
        text = text.replace(old, new)
    return text


def plain(text: str) -> str:
    """expand_teencode + bỏ dấu; dùng để so khớp với bài viết không dấu."""
    return strip_accents(expand_teencode(text))


def accent_ratio(text: str) -> float:
    """Tỉ lệ chữ cái mang dấu tiếng Việt; bài viết có dấu bình thường khoảng 0.3."""
    letters = [c for c in text if c.isalpha()]
    return sum(1 for c in letters if strip_accents(c) != c) / len(letters) if letters else 0.0
