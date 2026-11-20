import json
import unittest
from pathlib import Path
from app.keywords import KeywordMatcher


class KeywordTests(unittest.TestCase):
    def test_case_duplicates_do_not_inflate_score(self):
        matcher = KeywordMatcher({"x": {"name": "Deadlock", "keywords": ["deadlock", "DEADLOCK"]}})
        self.assertEqual(matcher.scores("deadlock", False), {"x": 1})

    def test_plain_duplicates_do_not_inflate_score(self):
        matcher = KeywordMatcher({"x": {"name": "cơ sở", "keywords": ["co so"]}})
        self.assertEqual(matcher.scores("co so", False), {"x": 1})

    def test_word_boundaries(self):
        matcher = KeywordMatcher({"x": {"name": "SQL", "keywords": []}})
        self.assertEqual(matcher.scores("nosql", False), {})

    def test_course_name_with_and_without_accents(self):
        matcher = KeywordMatcher({"web": {"name": "Lập trình Web", "level": "course", "keywords": []}})
        for text in ["Hỏi điểm môn lập trình web", "hoi diem mon lap trinh web"]:
            self.assertEqual(matcher.course_scores(text), {"web": 1})

    def test_course_override_excludes_generic_keywords(self):
        matcher = KeywordMatcher({"os": {"name": "Hệ điều hành", "level": "course", "keywords": ["thread"]}})
        self.assertEqual(matcher.course_scores("thread"), {})

    def test_real_taxonomy_deadlock(self):
        taxonomy = json.loads((Path(__file__).resolve().parents[1] / "taxonomy.json").read_text(encoding="utf-8"))
        matcher = KeywordMatcher({t["slug"]: t for t in taxonomy["tags"]})
        self.assertEqual(matcher.scores("cho minh hoi deadlock xay ra khi nao vay mn", False)["deadlock"], 1)


if __name__ == '__main__':
    unittest.main()
