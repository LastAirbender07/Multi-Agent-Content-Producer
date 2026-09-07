"""
format_selector.py — Phase 3 format classification node.

Called imperatively from content_node ONLY in auto mode.
Single responsibility: call LLM, parse result, return FormatSelectionOutput.
File I/O (saving format_selection.json) is the caller's responsibility.
Never raises — falls back to OPINION on any error.
"""
import json
from core.orchestration.contracts import (
    FormatSelectionOutput, PostFormat, TemplateFamily, COMPACT_FORMATS,
)
from core.prompts.prompt_loader import load_prompt
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)

_FALLBACK_OPINION = lambda run_id: FormatSelectionOutput(
    run_id=run_id,
    recommended_format=PostFormat.opinion,
    template_family=TemplateFamily.aurora_lite,   # Phase 3.5: never aurora-extended
    reasoning="Fallback: defaulting to OPINION (aurora-lite).",
    auto_mode=True,
)


async def select_format(
    run_id: str,
    topic: str,
    research_summary: str,
) -> FormatSelectionOutput:
    """
    Classify topic into one of 10 PostFormats via LLM.
    Falls back to OPINION (extended family) on any error — never raises.
    """
    try:
        prompt = load_prompt(
            "format_selection",
            topic=topic,
            research_summary=research_summary[:2000],  # cap to avoid token waste
        )
        # get_client_with_retry handles HAI Proxy JWT expiry (30-min token lifetime)
        # The provider returns LLMResponse(content=...) — extract .content before strip()
        response = await LLMFactory.get_client_with_retry(
            lambda llm: llm.generate(prompt=prompt)
        )
        raw = response.content if hasattr(response, "content") else str(response)

        # Strip markdown fences if present
        text = raw.strip()
        if text.startswith("```"):
            parts = text.split("```")
            text = parts[1] if len(parts) > 1 else text
            if text.startswith("json"):
                text = text[4:]

        data = json.loads(text.strip())
        fmt_str = str(data.get("format", "OPINION")).upper()

        try:
            fmt = PostFormat(fmt_str)
        except ValueError:
            logger.warning("format_selector_unknown_format", fmt=fmt_str, run_id=run_id)
            return _FALLBACK_OPINION(run_id)

        # Phase 3.5: aurora-extended NEVER returned by LLM — user explicit only.
        # All non-compact formats (OPINION, EXPLAINER, TRENDING, STORY) → aurora-lite.
        family = (
            TemplateFamily.compact_clean
            if fmt in COMPACT_FORMATS
            else TemplateFamily.aurora_lite
        )

        result = FormatSelectionOutput(
            run_id=run_id,
            recommended_format=fmt,
            template_family=family,
            reasoning=str(data.get("reasoning", ""))[:200],
            auto_mode=True,
        )
        logger.info(
            "format_selector_complete",
            run_id=run_id,
            format=fmt.value,
            family=family.value,
            reasoning=result.reasoning[:80],
        )
        return result

    except Exception as e:
        logger.warning("format_selector_failed", run_id=run_id, error=str(e))
        return _FALLBACK_OPINION(run_id)
