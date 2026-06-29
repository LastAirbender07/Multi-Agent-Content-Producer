from configs.settings import get_settings
from core.orchestration.contracts import ContentRequest, CaptionOutput
from core.orchestrators.content.content_evidence_bundle import filtered_research_summary
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.schemas.workflow_state import ContentGraphState
from core.services.caption_validator import enforce_caption_limits, validate_caption
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()

async def generate_caption_node(state: ContentGraphState) -> dict:
    request = ContentRequest.model_validate(state["request"])
    angle = state["angle"]
    slides = state.get("slides", [])

    hook_title = next(
        (s["title"] for s in slides if s.get("type") == "hook"),
        slides[0]["title"] if slides else ""
    )
    slide_titles = "\n".join(
        f"{i+1}. {s['title']}" for i, s in enumerate(slides)
    )

    # Strip meta-commentary from the angle statement before using it in the
    # caption — the angle may have been generated before the research was fully
    # validated and could contain references to research gaps.
    clean_angle_statement, _ = filtered_research_summary(
        angle.get("statement", ""),
        [],
    )

    try:
        llm = await LLMFactory.get_client()
        system_prompt = get_system_prompt("content")
        user_prompt = load_prompt(
            "caption_generation",
            topic=request.topic,
            angle_statement=clean_angle_statement or angle["statement"],
            emotional_hook=angle["emotional_hook"],
            hook_slide_title=hook_title,
            slide_titles=slide_titles,
        )

        result = await llm.generate_structured(
            prompt=user_prompt,
            output_schema=CaptionOutput,
            system_prompt=system_prompt,
            _token_meta=(state.get("run_id"), "caption"),
        )

        logger.info("generate_caption_node_complete", run_id=state.get("run_id"))
        caption = (
            result.caption.rstrip()
            + f"\n\nRead the full story 👉 {_settings.medium_url}"
            + f"\n📖 Also on Blogger: {_settings.blogger_url}"
            + f"\n\nFollow us on Instagram: {_settings.instagram_url}"
        )

        # Enforce Instagram limits — silently trim if over
        caption, hashtags = enforce_caption_limits(caption, result.hashtags)
        validation = validate_caption(caption, hashtags)
        if validation.warnings:
            for w in validation.warnings:
                logger.warning("caption_validation_warning", warning=w, run_id=state.get("run_id"))

        return {
            "caption": caption,
            "hashtags": hashtags,
            "messages": state.get("messages", []) + ["Caption generated"],
        }

    except Exception as e:
        logger.error("generate_caption_node_error", error=str(e))
        return {
            "caption": "",
            "hashtags": [],
            "errors": state.get("errors", []) + [f"Caption generation failed: {str(e)}"],
        }
