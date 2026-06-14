import json
from core.orchestration.contracts import ContentRequest
from core.prompts.prompt_loader import load_prompt
from core.schemas.workflow_state import ContentGraphState
from core.utils.text_utils import has_cjk
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)


def _make_cta_slide(topic: str, angle_statement: str, slide_number: int) -> dict:
    return {
        "type": "cta",
        "slide_number": slide_number,
        "title": "Take Action",
        "body": f"Explore more about {topic}",
        "bullets": [],
        "image_query": None,
        "image_source_preference": "none",
        "chart_type": None,
        "chart_data": None,
        "stat_value": None,
        "stat_label": None,
    }


def _make_engage_slide(topic: str, angle_statement: str, slide_number: int) -> dict:
    return {
        "type": "engage",
        "slide_number": slide_number,
        "title": f"Follow for more insights on {topic}",
        "body": "Hit follow — we break down stories like this every week.",
        "bullets": [],
        "image_query": None,
        "image_source_preference": "none",
        "chart_type": None,
        "chart_data": None,
        "stat_value": None,
        "stat_label": None,
    }


def _enforce_cta_count_and_position(
    slides: list[dict], topic: str, angle_statement: str
) -> list[dict]:
    """
    Structure rules:
    - ≥10 slides: exactly 1 engage at midpoint + 1 cta at the end.
    - <10 slides: exactly 1 cta at the end; engage slides are removed.

    Any extra CTAs or extra engage slides beyond the required one are stripped.
    """
    content_slides = [s for s in slides if s.get("type") not in {"cta", "engage"}]
    ctas = [s for s in slides if s.get("type") == "cta"]
    engages = [s for s in slides if s.get("type") == "engage"]

    end_cta = ctas[-1] if ctas else _make_cta_slide(topic, angle_statement, 0)

    if len(slides) >= 10:
        mid_engage = engages[0] if engages else _make_engage_slide(topic, angle_statement, 0)
        mid = len(content_slides) // 2
        result = content_slides[:mid] + [mid_engage] + content_slides[mid:] + [end_cta]
    else:
        # Short deck: no engage, just CTA at end
        result = content_slides + [end_cta]

    for i, slide in enumerate(result, start=1):
        slide["slide_number"] = i

    logger.info(
        "cta_engage_enforced",
        long_deck=len(slides) >= 10,
        original_cta_count=len(ctas),
        original_engage_count=len(engages),
        final_slide_count=len(result),
    )
    return result


async def _check_slide_relevance(
    slides: list[dict], topic: str, angle_statement: str, llm
) -> list[int]:
    """Single LLM call to batch-check all slides. Returns list of failing slide_numbers."""
    slides_summary = [
        {
            "slide_number": s["slide_number"],
            "type": s.get("type", "content"),
            "title": s.get("title", ""),
            "body": s.get("body", "") or "",
        }
        for s in slides
    ]

    try:
        prompt = load_prompt(
            "slide_relevance_check",
            topic=topic,
            angle_statement=angle_statement,
            slides_json=json.dumps(slides_summary, ensure_ascii=False, indent=2),
        )
        raw = await llm.generate(prompt=prompt)
        text = raw.strip()
        # Strip markdown fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text)
        irrelevant = data.get("irrelevant", [])
        return [int(n) for n in irrelevant]
    except Exception as e:
        logger.warning("slide_relevance_check_failed", error=str(e))
        return []


async def _regen_single_slide(
    slide: dict,
    prev_slide: dict | None,
    next_slide: dict | None,
    topic: str,
    angle_statement: str,
    llm,
) -> dict:
    """Re-generate a single failing slide with 1 attempt. Returns original on failure."""
    def _slide_desc(s: dict | None) -> str:
        if s is None:
            return "(none)"
        return f"[{s.get('type','content')}] {s.get('title','')}: {s.get('body','') or ''}"

    try:
        prompt = load_prompt(
            "slide_regen",
            topic=topic,
            angle_statement=angle_statement,
            slide_type=slide.get("type", "content"),
            prev_slide=_slide_desc(prev_slide),
            current_slide=_slide_desc(slide),
            next_slide=_slide_desc(next_slide),
        )
        raw = await llm.generate(prompt=prompt)
        text = raw.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        patch = json.loads(text)
        updated = {**slide, **patch}
        logger.info("slide_regenned", slide_number=slide.get("slide_number"))
        return updated
    except Exception as e:
        logger.warning(
            "slide_regen_failed",
            slide_number=slide.get("slide_number"),
            error=str(e),
        )
        return slide


async def validate_content_node(state: ContentGraphState) -> dict:
    request = ContentRequest.model_validate(state["request"])
    slides: list[dict] = state.get("slides", [])
    angle = state.get("angle", {})
    topic = request.topic
    angle_statement = angle.get("statement", "")

    if not slides:
        return {}

    # Pass 1: CTA count + position enforcement
    slides = _enforce_cta_count_and_position(slides, topic, angle_statement)

    # Pass 2: Content relevance check + single-slide regen
    try:
        llm = await LLMFactory.get_client()
        flagged = await _check_slide_relevance(slides, topic, angle_statement, llm)

        if flagged:
            logger.info("slides_flagged_for_regen", slide_numbers=flagged)
            # Build index for fast lookup
            idx_map = {s["slide_number"]: i for i, s in enumerate(slides)}

            for slide_num in flagged:
                if slide_num not in idx_map:
                    continue
                i = idx_map[slide_num]
                prev_slide = slides[i - 1] if i > 0 else None
                next_slide = slides[i + 1] if i < len(slides) - 1 else None
                slides[i] = await _regen_single_slide(
                    slides[i], prev_slide, next_slide, topic, angle_statement, llm
                )
    except Exception as e:
        logger.warning("validate_content_node_relevance_check_failed", error=str(e))

    return {
        "slides": slides,
        "messages": state.get("messages", []) + [
            f"Content validated: {len(slides)} slides, CTA rule enforced."
        ],
    }
