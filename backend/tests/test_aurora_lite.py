"""Unit tests for Phase 3.5 — aurora-lite family + routing fixes."""
import pytest
from unittest.mock import patch

from core.orchestration.contracts import (
    PostFormat, TemplateFamily, COMPACT_FORMATS, FormatSelectionOutput,
)
from core.orchestrators.content.carousel_generator import (
    _canvas_template_id, COMPACT_ROUTING, AURORA_LITE_ROUTING,
)


# ── TemplateFamily enum ────────────────────────────────────────────────────────

def test_template_family_aurora_lite():
    assert TemplateFamily.aurora_lite.value == "aurora-lite"

def test_template_family_aurora_extended_still_exists():
    """aurora-extended must still be reachable — for user explicit selection."""
    assert TemplateFamily.aurora_extended.value == "aurora-extended"

def test_template_family_has_three_values():
    values = {f.value for f in TemplateFamily}
    assert "aurora-lite"     in values
    assert "compact-clean"   in values
    assert "aurora-extended" in values


# ── aurora-lite routing table ─────────────────────────────────────────────────

def test_aurora_lite_content_routing():
    result = _canvas_template_id("content", "aurora", 0, False, "aurora-lite", "OPINION")
    assert result == "aurora-lite-content"

def test_aurora_lite_quote_routing():
    result = _canvas_template_id("quote", "aurora", 0, False, "aurora-lite", "OPINION")
    assert result == "aurora-lite-quote"

def test_aurora_lite_hook_reuses_aurora_hook():
    result = _canvas_template_id("hook", "aurora", 0, False, "aurora-lite", "OPINION")
    assert result == "aurora-lite-hook"

def test_aurora_lite_stat_reuses_aurora_stat():
    result = _canvas_template_id("stat", "aurora", 0, False, "aurora-lite", "OPINION")
    assert result == "aurora-lite-stat"

def test_aurora_lite_cta_reuses_aurora_cta():
    result = _canvas_template_id("cta", "aurora", 0, False, "aurora-lite", "OPINION")
    assert result == "aurora-lite-cta"

def test_aurora_lite_engage_reuses_aurora_engage():
    result = _canvas_template_id("engage", "aurora", 0, False, "aurora-lite", "OPINION")
    assert result == "aurora-lite-engage"


# ── Default family changed to aurora-lite ────────────────────────────────────

def test_default_family_is_aurora_lite():
    """Phase 3.5: default changed from aurora-extended to aurora-lite."""
    result = _canvas_template_id("content", "aurora", 0, False)
    assert result == "aurora-lite-content", (
        f"Expected 'aurora-lite-content', got '{result}'. "
        "Did you forget to update the default `template_family` param?"
    )

def test_default_hook_is_aurora_lite_hook():
    result = _canvas_template_id("hook", "aurora", 0, False)
    assert result == "aurora-lite-hook"


# ── aurora-extended still works for explicit selection ────────────────────────

def test_aurora_extended_content_explicit():
    result = _canvas_template_id("content", "aurora", 0, False, "aurora-extended", "OPINION")
    assert result == "aurora-content-text"

def test_aurora_extended_content_with_image():
    result = _canvas_template_id("content", "aurora", 2, True, "aurora-extended", "OPINION")
    assert result == "aurora-content-2"

def test_aurora_extended_hook_explicit():
    result = _canvas_template_id("hook", "aurora", 0, False, "aurora-extended", "OPINION")
    assert result == "aurora-hook"


# ── compact-clean routing unchanged ─────────────────────────────────────────

def test_compact_clean_still_works():
    result = _canvas_template_id("content", "aurora", 0, False, "compact-clean", "FACTS")
    assert result == "aurora-compact-fact"


# ── format_selector never returns aurora-extended ────────────────────────────

@pytest.mark.asyncio
async def test_fallback_returns_aurora_lite():
    from core.orchestrators.content.format_selector import select_format
    with patch(
        "core.orchestrators.content.format_selector.LLMFactory.get_client_with_retry",
        side_effect=Exception("LLM down"),
    ):
        result = await select_format("run-x", "some topic", "some summary")
    assert result.template_family == TemplateFamily.aurora_lite
    assert result.template_family != TemplateFamily.aurora_extended

@pytest.mark.asyncio
async def test_opinion_routes_to_aurora_lite_not_extended():
    """Simulate LLM returning OPINION — must map to aurora-lite, not aurora-extended."""
    import json
    mock_response = type("R", (), {"content": json.dumps({"format": "OPINION", "reasoning": "test"})})()
    from core.orchestrators.content.format_selector import select_format
    with patch(
        "core.orchestrators.content.format_selector.LLMFactory.get_client_with_retry",
        return_value=mock_response,
    ):
        result = await select_format("run-y", "opinion topic", "summary")
    assert result.recommended_format == PostFormat.opinion
    assert result.template_family == TemplateFamily.aurora_lite
    assert result.template_family != TemplateFamily.aurora_extended


# ── AURORA_LITE_ROUTING table completeness ────────────────────────────────────

def test_aurora_lite_routing_has_all_slide_types():
    required = {"hook", "content", "stat", "quote", "cta", "engage"}
    routed   = {slide_type for (slide_type, _) in AURORA_LITE_ROUTING}
    assert routed >= required, f"Missing slide types in AURORA_LITE_ROUTING: {required - routed}"
