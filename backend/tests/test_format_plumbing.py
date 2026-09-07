"""Unit tests for Phase 3 format plumbing."""
import pytest
from unittest.mock import AsyncMock, patch

from core.orchestration.contracts import (
    PostFormat, TemplateFamily, FormatSelectionOutput,
    COMPACT_FORMATS, ContentRequest,
)
from core.orchestrators.content.carousel_generator import _canvas_template_id, COMPACT_ROUTING
from core.orchestrators.content.format_blocks import (
    SLIDE_FORMAT_BLOCKS, ANGLE_FORMAT_BLOCKS, CAPTION_FORMAT_BLOCKS,
)


# ── Enum tests ─────────────────────────────────────────────────────────────────

def test_post_format_values():
    assert PostFormat.opinion.value    == "OPINION"
    assert PostFormat.facts.value      == "FACTS"
    assert PostFormat.tutorial.value   == "TUTORIAL"
    assert PostFormat.listicle.value   == "LISTICLE"
    assert len(list(PostFormat))       == 10

def test_template_family_values():
    """Values MUST match TEMPLATE_FAMILIES keys in templateFamilies.ts."""
    assert TemplateFamily.aurora_extended.value == "aurora-extended"
    assert TemplateFamily.compact_clean.value   == "compact-clean"

def test_compact_formats_set():
    """OPINION, EXPLAINER, TRENDING → extended. FACTS, TUTORIAL, LISTICLE → compact."""
    assert PostFormat.opinion   not in COMPACT_FORMATS
    assert PostFormat.explainer not in COMPACT_FORMATS
    assert PostFormat.trending  not in COMPACT_FORMATS
    assert PostFormat.facts     in COMPACT_FORMATS
    assert PostFormat.tutorial  in COMPACT_FORMATS
    assert PostFormat.listicle  in COMPACT_FORMATS
    assert len(COMPACT_FORMATS) == 7


# ── Routing table tests ────────────────────────────────────────────────────────

def test_compact_routing_facts_content():
    result = _canvas_template_id("content", "aurora", 0, False, "compact-clean", "FACTS")
    assert result == "aurora-compact-fact"

def test_compact_routing_tutorial_content():
    result = _canvas_template_id("content", "aurora", 0, False, "compact-clean", "TUTORIAL")
    assert result == "aurora-compact-step"

def test_compact_routing_listicle_content():
    result = _canvas_template_id("content", "aurora", 0, False, "compact-clean", "LISTICLE")
    assert result == "aurora-compact-list-item"

def test_compact_routing_comparison_content():
    result = _canvas_template_id("content", "aurora", 0, False, "compact-clean", "COMPARISON")
    assert result == "aurora-compact-fact-compare"

def test_compact_routing_hook_all_compact_formats():
    for fmt in COMPACT_FORMATS:
        result = _canvas_template_id("hook", "aurora", 0, False, "compact-clean", fmt.value)
        assert result == "aurora-compact-hook", f"hook failed for {fmt.value}"

def test_compact_routing_cta_uses_compact_clean_cta():
    result = _canvas_template_id("cta", "aurora", 0, False, "compact-clean", "FACTS")
    assert result == "aurora-compact-clean-cta"

def test_compact_routing_engage_uses_compact_clean_engage():
    result = _canvas_template_id("engage", "aurora", 0, False, "compact-clean", "TUTORIAL")
    assert result == "aurora-compact-clean-engage"

def test_extended_routing_opinion_content_no_image():
    result = _canvas_template_id("content", "aurora", 0, False, "aurora-extended", "OPINION")
    assert result == "aurora-content-text"

def test_extended_routing_opinion_content_with_image():
    result = _canvas_template_id("content", "aurora", 2, True, "aurora-extended", "OPINION")
    assert result == "aurora-content-2"

def test_extended_routing_default_family():
    """Phase 3.5: No template_family arg → aurora-lite (default changed from aurora-extended)."""
    result = _canvas_template_id("content", "aurora", 0, False)
    assert result == "aurora-lite-content"  # Phase 3.5: default is now aurora-lite

def test_compact_story_content_falls_through_to_extended():
    """story+content has no compact template yet → extended fallback."""
    result = _canvas_template_id("content", "aurora", 0, False, "compact-clean", "STORY")
    assert result == "aurora-content-text"


# ── Format blocks tests ────────────────────────────────────────────────────────

def test_opinion_format_blocks_are_empty():
    assert SLIDE_FORMAT_BLOCKS[PostFormat.opinion]   == ""
    assert ANGLE_FORMAT_BLOCKS[PostFormat.opinion]   == ""
    assert CAPTION_FORMAT_BLOCKS[PostFormat.opinion] == ""

def test_all_formats_have_slide_blocks():
    for fmt in PostFormat:
        assert fmt in SLIDE_FORMAT_BLOCKS, f"Missing SLIDE block for {fmt}"

def test_all_formats_have_angle_blocks():
    for fmt in PostFormat:
        assert fmt in ANGLE_FORMAT_BLOCKS, f"Missing ANGLE block for {fmt}"

def test_all_formats_have_caption_blocks():
    for fmt in PostFormat:
        assert fmt in CAPTION_FORMAT_BLOCKS, f"Missing CAPTION block for {fmt}"

def test_facts_slide_block_mentions_format_rules():
    assert "FORMAT RULES (FACTS)" in SLIDE_FORMAT_BLOCKS[PostFormat.facts]

def test_tutorial_slide_block_mentions_steps():
    block = SLIDE_FORMAT_BLOCKS[PostFormat.tutorial]
    assert "TUTORIAL" in block
    assert "step" in block.lower()


# ── ContentRequest backward compat ────────────────────────────────────────────

def test_content_request_default_post_format():
    req = ContentRequest(
        run_id="test",
        topic="test topic",
        selected_angles=[{"statement": "s", "emotional_hook": "Curiosity", "supporting_evidence": "e"}],
        research_summary="summary",
    )
    assert req.post_format == PostFormat.opinion

def test_content_request_with_facts_format():
    req = ContentRequest(
        run_id="test",
        topic="test topic",
        selected_angles=[],
        research_summary="summary",
        post_format=PostFormat.facts,
    )
    assert req.post_format == PostFormat.facts


# ── FormatSelector fallback test ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_select_format_fallback_on_llm_error():
    from core.orchestrators.content.format_selector import select_format
    with patch(
        "core.orchestrators.content.format_selector.LLMFactory.get_client_with_retry",
        side_effect=Exception("LLM unreachable"),
    ):
        result = await select_format("run-test", "some topic", "some summary")

    assert result.recommended_format == PostFormat.opinion
    assert result.template_family    == TemplateFamily.aurora_lite   # Phase 3.5: never aurora-extended
    assert result.auto_mode          is True


# ── Prompt template injection test ───────────────────────────────────────────

def test_format_selection_prompt_loads():
    from core.prompts.prompt_loader import load_prompt
    p = load_prompt("format_selection", topic="AI productivity", research_summary="test")
    assert "AI productivity" in p
    assert "FACTS" in p
    assert "TUTORIAL" in p

def test_slide_generation_prompt_has_both_blocks():
    from core.prompts.prompt_loader import load_prompt
    p = load_prompt(
        "slide_generation",
        topic="test", angle_statement="test", emotional_hook="Curiosity",
        supporting_evidence="test", research_summary="test",
        key_points="- test", target_slides=12,
        template_spec_block="SPEC_BLOCK_HERE",
        format_block="FORMAT_BLOCK_HERE",
    )
    assert "SPEC_BLOCK_HERE"   in p   # Phase 2.8
    assert "FORMAT_BLOCK_HERE" in p   # Phase 3
