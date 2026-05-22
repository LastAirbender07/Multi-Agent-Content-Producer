"""
Unit tests for the carousel validation framework (Session 22).

Covers:
- slide_validator: CTA enforcement, _has_cjk, _make_cta_slide, content relevance + regen
- image_fetcher: _has_cjk, _score_image (CJK disqualification + query relevance)
- graph_validator: stat_value digit check, stat_label default, single-char label rejection
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_slide(num: int, slide_type: str = "content", title: str = "Test") -> dict:
    return {
        "slide_number": num,
        "type": slide_type,
        "title": title,
        "body": f"Body for slide {num}",
        "bullets": [],
        "image_query": "test",
        "image_source_preference": "pexels",
        "chart_type": None,
        "chart_data": None,
        "stat_value": None,
        "stat_label": None,
    }


def _make_slides(count: int, cta_positions: list[int] | None = None) -> list[dict]:
    """Build `count` slides; positions in `cta_positions` (1-indexed) become CTAs."""
    slides = []
    for i in range(1, count + 1):
        t = "cta" if (cta_positions and i in cta_positions) else "content"
        slides.append(_make_slide(i, t))
    return slides


# ─────────────────────────────────────────────────────────────────────────────
# slide_validator — _has_cjk
# ─────────────────────────────────────────────────────────────────────────────

class TestHasCjkSlideValidator:
    def setup_method(self):
        from core.orchestrators.content.slide_validator import _has_cjk
        self.fn = _has_cjk

    def test_latin_returns_false(self):
        assert self.fn("virat kohli cricket") is False

    def test_chinese_unified_ideograph(self):
        assert self.fn("最新消息") is True

    def test_japanese_katakana(self):
        assert self.fn("コンテンツ") is True

    def test_japanese_hiragana(self):
        assert self.fn("こんにちは") is True

    def test_korean_hangul(self):
        assert self.fn("안녕하세요") is True

    def test_mixed_latin_cjk(self):
        assert self.fn("hello 世界") is True

    def test_empty_string(self):
        assert self.fn("") is False

    def test_digits_punctuation(self):
        assert self.fn("1234 !@#$ abc") is False


# ─────────────────────────────────────────────────────────────────────────────
# slide_validator — _enforce_cta_count_and_position
# ─────────────────────────────────────────────────────────────────────────────

class TestEnforceCtaCountAndPosition:
    def setup_method(self):
        from core.orchestrators.content.slide_validator import _enforce_cta_count_and_position
        self.fn = _enforce_cta_count_and_position

    # ── <10 slides: 1 CTA at end, no engage ─────────────────────────────────

    def test_short_deck_no_cta_gets_one_synthesised_at_end(self):
        slides = _make_slides(7)
        result = self.fn(slides, "cricket", "hook")
        ctas = [s for s in result if s["type"] == "cta"]
        assert len(ctas) == 1
        assert result[-1]["type"] == "cta"

    def test_short_deck_existing_engage_removed(self):
        slides = _make_slides(8)
        slides[3]["type"] = "engage"
        result = self.fn(slides, "cricket", "hook")
        engage_slides = [s for s in result if s["type"] == "engage"]
        assert len(engage_slides) == 0

    def test_short_deck_multiple_ctas_trimmed_to_one(self):
        slides = _make_slides(9, cta_positions=[3, 7, 9])
        result = self.fn(slides, "cricket", "hook")
        ctas = [s for s in result if s["type"] == "cta"]
        assert len(ctas) == 1
        assert result[-1]["type"] == "cta"

    # ── ≥10 slides: 1 engage at mid + 1 CTA at end ──────────────────────────

    def test_long_deck_gets_engage_at_mid_and_cta_at_end(self):
        slides = _make_slides(12)
        result = self.fn(slides, "cricket", "hook")
        assert result[-1]["type"] == "cta"
        ctas = [s for s in result if s["type"] == "cta"]
        engages = [s for s in result if s["type"] == "engage"]
        assert len(ctas) == 1
        assert len(engages) == 1

    def test_long_deck_engage_is_at_midpoint(self):
        slides = _make_slides(10)
        result = self.fn(slides, "cricket", "hook")
        engage_pos = next(s["slide_number"] for s in result if s["type"] == "engage")
        total = len(result)
        # Mid engage should be roughly in the first half (not at end)
        assert engage_pos < total

    def test_long_deck_existing_engage_reused(self):
        slides = _make_slides(12)
        slides[4]["type"] = "engage"
        slides[4]["title"] = "Custom engage title"
        result = self.fn(slides, "cricket", "hook")
        engages = [s for s in result if s["type"] == "engage"]
        assert len(engages) == 1
        assert engages[0]["title"] == "Custom engage title"

    def test_long_deck_extra_engages_stripped(self):
        slides = _make_slides(12)
        slides[2]["type"] = "engage"
        slides[6]["type"] = "engage"
        result = self.fn(slides, "cricket", "hook")
        engages = [s for s in result if s["type"] == "engage"]
        assert len(engages) == 1

    def test_long_deck_extra_ctas_stripped(self):
        slides = _make_slides(12, cta_positions=[4, 8, 12])
        result = self.fn(slides, "cricket", "hook")
        ctas = [s for s in result if s["type"] == "cta"]
        assert len(ctas) == 1
        assert result[-1]["type"] == "cta"

    # ── Slide numbering always 1..N ─────────────────────────────────────────

    def test_slide_numbers_renumbered_sequentially(self):
        slides = _make_slides(10, cta_positions=[3, 7, 10])
        result = self.fn(slides, "topic", "angle")
        numbers = [s["slide_number"] for s in result]
        assert numbers == list(range(1, len(result) + 1))

    def test_exactly_10_slides_uses_long_deck_rule(self):
        slides = _make_slides(10)
        result = self.fn(slides, "topic", "angle")
        assert any(s["type"] == "engage" for s in result)
        assert result[-1]["type"] == "cta"

    def test_exactly_9_slides_uses_short_deck_rule(self):
        slides = _make_slides(9)
        result = self.fn(slides, "topic", "angle")
        assert not any(s["type"] == "engage" for s in result)
        assert result[-1]["type"] == "cta"


# ─────────────────────────────────────────────────────────────────────────────
# slide_validator — validate_content_node (async, mocked LLM)
# ─────────────────────────────────────────────────────────────────────────────

class TestValidateContentNode:
    def _make_state(self, slide_count: int, cta_positions: list[int] | None = None) -> dict:
        return {
            "request": {
                "topic": "cricket",
                "run_id": "test-run",
                "selected_angles": [{"statement": "test angle", "emotional_hook": "", "supporting_evidence": ""}],
                "max_slides": 14,
                "image_source": "auto",
                "research_summary": "",
                "key_points": [],
            },
            "slides": _make_slides(slide_count, cta_positions),
            "angle": {"statement": "test angle", "emotional_hook": "", "supporting_evidence": ""},
            "run_id": "test-run",
            "angle_index": 0,
        }

    @pytest.mark.asyncio
    async def test_no_flagged_slides_returns_slides_unchanged_count(self):
        from core.orchestrators.content.slide_validator import validate_content_node

        mock_llm = AsyncMock()
        mock_llm.generate = AsyncMock(return_value='{"irrelevant": []}')

        with patch("core.orchestrators.content.slide_validator.LLMFactory.get_client", new_callable=AsyncMock) as mock_factory:
            mock_factory.return_value = mock_llm
            state = self._make_state(12, [6, 12])
            result = await validate_content_node(state)

        assert "slides" in result
        # New rule: ≥10 slides → 1 engage at mid + 1 CTA at end
        ctas = [s for s in result["slides"] if s["type"] == "cta"]
        engages = [s for s in result["slides"] if s["type"] == "engage"]
        assert len(ctas) == 1
        assert len(engages) == 1
        assert result["slides"][-1]["type"] == "cta"

    @pytest.mark.asyncio
    async def test_flagged_slide_gets_regenned(self):
        from core.orchestrators.content.slide_validator import validate_content_node

        mock_llm = AsyncMock()
        # First call: relevance check flags slide 3
        mock_llm.generate = AsyncMock(side_effect=[
            '{"irrelevant": [3]}',
            '{"title": "Rewritten Title", "body": "Rewritten body", "bullets": []}',
        ])

        with patch("core.orchestrators.content.slide_validator.LLMFactory.get_client", new_callable=AsyncMock) as mock_factory:
            mock_factory.return_value = mock_llm
            state = self._make_state(12, [6, 12])
            result = await validate_content_node(state)

        slide_3 = next(s for s in result["slides"] if s["slide_number"] == 3)
        assert slide_3["title"] == "Rewritten Title"

    @pytest.mark.asyncio
    async def test_llm_failure_on_relevance_returns_slides_without_crash(self):
        from core.orchestrators.content.slide_validator import validate_content_node

        mock_llm = AsyncMock()
        mock_llm.generate = AsyncMock(side_effect=Exception("LLM timeout"))

        with patch("core.orchestrators.content.slide_validator.LLMFactory.get_client", new_callable=AsyncMock) as mock_factory:
            mock_factory.return_value = mock_llm
            state = self._make_state(12, [6, 12])
            result = await validate_content_node(state)

        # Should still return slides (CTA enforcement ran before LLM)
        assert result["slides"]

    @pytest.mark.asyncio
    async def test_regen_failure_keeps_original_slide(self):
        from core.orchestrators.content.slide_validator import validate_content_node

        mock_llm = AsyncMock()
        mock_llm.generate = AsyncMock(side_effect=[
            '{"irrelevant": [2]}',
            Exception("LLM failed on regen"),
        ])

        with patch("core.orchestrators.content.slide_validator.LLMFactory.get_client", new_callable=AsyncMock) as mock_factory:
            mock_factory.return_value = mock_llm
            state = self._make_state(12, [6, 12])
            original_slide_2_title = state["slides"][1]["title"]
            result = await validate_content_node(state)

        slide_2 = next(s for s in result["slides"] if s["slide_number"] == 2)
        assert slide_2["title"] == original_slide_2_title


# ─────────────────────────────────────────────────────────────────────────────
# image_fetcher — _has_cjk + _score_image
# ─────────────────────────────────────────────────────────────────────────────

class TestImageFetcherScoring:
    def setup_method(self):
        from core.orchestrators.content.image_fetcher import _has_cjk, _score_image
        self.has_cjk = _has_cjk
        self.score = _score_image

    def test_cjk_title_disqualified(self):
        img = {"title": "最新新闻", "url": "http://example.com/img.jpg", "width": 1200, "height": 1200}
        assert self.score(img) == -99.0

    def test_cjk_in_url_disqualified(self):
        img = {"title": "news", "url": "http://example.com/日本語.jpg", "width": 1200, "height": 1200}
        assert self.score(img) == -99.0

    def test_clean_image_passes(self):
        img = {"title": "virat kohli batting", "url": "http://example.com/img.jpg", "width": 1200, "height": 1200}
        assert self.score(img) > 0

    def test_query_relevance_bonus_applied(self):
        img_relevant = {"title": "virat kohli batting", "url": "http://example.com/a.jpg", "width": 1200, "height": 1200}
        img_generic = {"title": "random photo", "url": "http://example.com/b.jpg", "width": 1200, "height": 1200}
        score_relevant = self.score(img_relevant, query="virat kohli")
        score_generic = self.score(img_generic, query="virat kohli")
        assert score_relevant > score_generic

    def test_query_relevance_bonus_capped_at_4(self):
        # Title contains all words from a very long query — bonus should not exceed 4.0
        img = {"title": "alpha beta gamma delta epsilon zeta eta theta", "url": "http://x.com/a.jpg", "width": 1200, "height": 1200}
        score_with_query = self.score(img, query="alpha beta gamma delta epsilon")
        score_without = self.score(img)
        bonus = score_with_query - score_without
        assert bonus <= 4.0 + 0.01  # small float tolerance

    def test_small_image_penalised(self):
        img_small = {"title": "photo", "url": "http://x.com/a.jpg", "width": 400, "height": 400}
        img_large = {"title": "photo", "url": "http://x.com/b.jpg", "width": 1200, "height": 1200}
        assert self.score(img_large) > self.score(img_small)

    def test_square_aspect_ratio_bonus(self):
        img_square = {"title": "photo", "url": "http://x.com/a.jpg", "width": 1000, "height": 1000}
        img_wide = {"title": "photo", "url": "http://x.com/b.jpg", "width": 2000, "height": 500}
        assert self.score(img_square) > self.score(img_wide)

    def test_no_cjk_in_latin_text(self):
        assert self.has_cjk("hello world 2024") is False

    def test_cjk_detected_chinese(self):
        assert self.has_cjk("中文文本") is True


# ─────────────────────────────────────────────────────────────────────────────
# graph_validator — validate_and_fix_slides (strengthened)
# ─────────────────────────────────────────────────────────────────────────────

class TestGraphValidatorStrengthened:
    def setup_method(self):
        from core.orchestrators.content.graph_validator import validate_and_fix_slides
        self.fn = validate_and_fix_slides

    def _stat_slide(self, stat_value=None, stat_label=None, chart_type=None, chart_data=None) -> dict:
        return {
            "slide_number": 1,
            "type": "stat",
            "title": "Stats",
            "body": "",
            "stat_value": stat_value,
            "stat_label": stat_label,
            "chart_type": chart_type,
            "chart_data": chart_data,
        }

    # ── stat_value digit check ───────────────────────────────────────────────

    def test_stat_value_with_digit_kept(self):
        slide = self._stat_slide(stat_value="42%", stat_label="Score")
        result = self.fn([slide])
        assert result[0]["stat_value"] == "42%"

    def test_stat_value_no_digit_cleared(self):
        slide = self._stat_slide(stat_value="Many", stat_label="Score")
        result = self.fn([slide])
        assert result[0]["stat_value"] is None

    def test_stat_value_none_untouched(self):
        slide = self._stat_slide(stat_value=None, stat_label=None)
        result = self.fn([slide])
        assert result[0]["stat_value"] is None

    def test_stat_value_number_string_kept(self):
        slide = self._stat_slide(stat_value="1.5 billion", stat_label="Users")
        result = self.fn([slide])
        assert result[0]["stat_value"] == "1.5 billion"

    # ── stat_label default fill ──────────────────────────────────────────────

    def test_stat_label_filled_when_stat_value_set_and_label_empty(self):
        slide = self._stat_slide(stat_value="42%", stat_label=None)
        result = self.fn([slide])
        assert result[0]["stat_label"] == "Key Statistic"

    def test_stat_label_not_overwritten_when_already_set(self):
        slide = self._stat_slide(stat_value="42%", stat_label="Win Rate")
        result = self.fn([slide])
        assert result[0]["stat_label"] == "Win Rate"

    def test_stat_label_not_filled_when_stat_value_cleared(self):
        # stat_value "Many" → cleared to None, so stat_label should not get default
        slide = self._stat_slide(stat_value="Many", stat_label=None)
        result = self.fn([slide])
        assert result[0]["stat_value"] is None
        assert result[0]["stat_label"] is None

    # ── Single-char chart label rejection ───────────────────────────────────

    def _valid_chart_data(self) -> dict:
        return {"labels": ["Cricket", "Football", "Tennis"], "values": [30, 45, 25]}

    def _singlechar_chart_data(self) -> dict:
        return {"labels": ["A", "B", "C"], "values": [10, 20, 30]}

    def test_single_char_labels_chart_nulled(self):
        slide = self._stat_slide(
            stat_value="50%",
            stat_label="Share",
            chart_type="bar",
            chart_data=self._singlechar_chart_data(),
        )
        result = self.fn([slide])
        assert result[0]["chart_type"] is None
        assert result[0]["chart_data"] is None

    def test_valid_labels_chart_kept(self):
        slide = self._stat_slide(
            stat_value="50%",
            stat_label="Share",
            chart_type="bar",
            chart_data=self._valid_chart_data(),
        )
        result = self.fn([slide])
        assert result[0]["chart_type"] == "bar"

    def test_two_char_labels_not_rejected(self):
        chart_data = {"labels": ["UK", "US", "IN"], "values": [10, 20, 30]}
        slide = self._stat_slide(
            stat_value="30",
            stat_label="Count",
            chart_type="bar",
            chart_data=chart_data,
        )
        result = self.fn([slide])
        assert result[0]["chart_type"] == "bar"

    # ── Non-stat slides pass through unchanged ───────────────────────────────

    def test_content_slide_not_modified(self):
        slide = {"slide_number": 1, "type": "content", "title": "Hello", "body": "World"}
        result = self.fn([slide])
        assert result[0] == slide

    def test_cta_slide_not_modified(self):
        slide = {"slide_number": 2, "type": "cta", "title": "CTA", "body": "Follow"}
        result = self.fn([slide])
        assert result[0] == slide
