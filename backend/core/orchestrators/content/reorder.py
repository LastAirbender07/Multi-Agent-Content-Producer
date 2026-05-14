from core.orchestration.contracts import Slide, SlideType
from core.schemas.workflow_state import ContentGraphState
from infra.logging import get_logger

logger = get_logger(__name__)

def reorder_slides_node(state: ContentGraphState) -> dict:
    """
    Enforce the carousel arc:
      hook → content[:1] → stats[:2] → engage → early_ctas → stats[2:] → body_contents → quotes → final_cta

    - One content slide lands right after the hook to give context before data
    - Engage lands at position 5 (hook + intro + 2 stats + engage)
    - Early CTAs (all but the last) follow engage as a mid-carousel conversion point
    - Final CTA always closes the carousel
    """
    raw = state.get("slides", [])
    slides = [Slide.model_validate(slide) for slide in raw]

    hooks    = [s for s in slides if s.type == SlideType.hook]
    stats    = [s for s in slides if s.type == SlideType.stat]
    contents = [s for s in slides if s.type == SlideType.content]
    quotes   = [s for s in slides if s.type == SlideType.quote]
    engages  = [s for s in slides if s.type == SlideType.engage]
    ctas     = [s for s in slides if s.type == SlideType.cta]

    intro_content = contents[:1]   # first content slide goes right after hook
    body_contents = contents[1:]   # remaining content slides after the data section
    early_ctas    = ctas[:-1]      # mid-carousel CTA(s) — after engage
    final_cta     = ctas[-1:]      # always closes the carousel

    ordered = (
        hooks
        + intro_content
        + stats[:2]
        + engages
        + early_ctas
        + stats[2:]
        + body_contents
        + quotes
        + final_cta
    )

    for idx, slide in enumerate(ordered):
        slide.slide_number = idx + 1

    logger.info("reorder_slides_node_complete", run_id=state["run_id"], slide_count=len(ordered))
    return {"slides": [slide.model_dump() for slide in ordered]}
