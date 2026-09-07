from core.orchestration.contracts import ContentRequest, SlideGenerationOutput
from core.orchestrators.content.content_evidence_bundle import filtered_research_summary
from core.orchestrators.content.graph_validator import validate_and_fix_slides
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.schemas.workflow_state import ContentGraphState
from core.services.template_spec_service import get_all_specs, format_spec_for_prompt
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)


def _build_template_spec_block() -> str:
    """
    Build a compact per-family spec reference for the slide generation prompt.
    Groups specs by family and lists tone + char limits for each.
    Injected as {template_spec_block} — tells the LLM how to size content per slide type.
    Returns empty string if no specs loaded (graceful degradation).
    """
    specs = get_all_specs()
    if not specs:
        return ""

    # Group by family
    by_family: dict[str, list[dict]] = {}
    for spec in specs:
        fam = spec.get("family", "unknown")
        by_family.setdefault(fam, []).append(spec)

    lines = ["TEMPLATE CONTENT CONSTRAINTS (write content that FITS each template):"]
    for family, fam_specs in by_family.items():
        lines.append(f"\n{family.upper().replace('-',' ')} family:")
        for spec in fam_specs:
            tid = spec.get("templateId", "")
            role = spec.get("slideRole", "")
            tone = spec.get("contentTone", "")
            # Summarise text fields to key char limits
            field_summaries = []
            for tf in spec.get("textFields", []):
                field_summaries.append(
                    f"{tf.get('label')} ({tf.get('field')}): max {tf.get('maxChars')} / target {tf.get('targetChars')} chars"
                )
            example = spec.get("exampleContent", "")
            lines.append(f"  [{role}] {tid}")
            lines.append(f"    Tone: {tone}")
            if field_summaries:
                lines.append(f"    Fields: {' | '.join(field_summaries)}")
            if example:
                lines.append(f"    Example: {example[:120]}")

    return "\n".join(lines)


async def generate_slides_node(state: ContentGraphState) -> dict:
    request = ContentRequest.model_validate(state["request"])
    angle = state["angle"]
    target_slides = min(request.max_slides, 14)

    # Strip research meta-commentary (gaps, "evidence missing", process notes)
    # before passing to the slide generator — slides must never discuss the
    # research pipeline's internal state.
    clean_summary, clean_key_points = filtered_research_summary(
        request.research_summary,
        request.key_points,
    )

    try:
        system_prompt = get_system_prompt("content")
        # Build per-template content constraints from Phase 2.8 specs.
        # Injected as {template_spec_block} so the LLM knows char limits and tone
        # for each slide type. Gracefully empty if specs not yet generated.
        template_spec_block = _build_template_spec_block()

        user_prompt = load_prompt(
            "slide_generation",
            topic=request.topic,
            angle_statement=angle["statement"],
            emotional_hook=angle["emotional_hook"],
            supporting_evidence=angle["supporting_evidence"],
            research_summary=clean_summary,
            key_points="\n".join(f"- {point}" for point in clean_key_points),
            target_slides=target_slides,
            template_spec_block=template_spec_block,
        )
        result = await LLMFactory.get_client_with_retry(
            lambda llm: llm.generate_structured(
                prompt=user_prompt,
                output_schema=SlideGenerationOutput,
                system_prompt=system_prompt,
                _token_meta=(state.get("run_id"), "carousel"),
            )
        )

        slides = result.slides
        slides_dicts = validate_and_fix_slides([s.model_dump() for s in slides])
        if len(slides_dicts) > request.max_slides:
            logger.warning(f"Generated {len(slides_dicts)} slides, which exceeds the requested maximum of {request.max_slides}. Truncating to fit.")
            slides_dicts = slides_dicts[:request.max_slides]

        logger.info(
            "generate_slide_node_complete",
            run_id=state["run_id"],
            angle_index=state.get("angle_index"),
            slide_count=len(slides_dicts)
        )

        return {
            "slides": slides_dicts,
            "messages": state.get("messages", []) + [f"Generated {len(slides_dicts)} slides successfully."]
        }
    except Exception as e:
        logger.error(
            "generate_slide_node_error",
            run_id=state["run_id"],
            angle_index=state.get("angle_index"),
            error=str(e)
        )
        return {
            "slides": [],
            "errors": state.get("errors", []) + [f"Slide generation failed: {str(e)}"],
            "messages": state.get("messages", []) + [f"Slide generation failed: {str(e)}"],
        }