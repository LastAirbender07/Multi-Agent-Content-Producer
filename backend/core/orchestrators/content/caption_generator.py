from configs.settings import get_settings
from core.orchestration.contracts import ContentRequest, CaptionOutput
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.schemas.workflow_state import ContentGraphState
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

    try:
        llm = await LLMFactory.get_client()
        system_prompt = get_system_prompt("content")
        user_prompt = load_prompt(
            "caption_generation",
            topic=request.topic,
            angle_statement=angle["statement"],
            emotional_hook=angle["emotional_hook"],
            hook_slide_title=hook_title,
            slide_titles=slide_titles,
        )

        result = await llm.generate_structured(
            prompt=user_prompt,
            output_schema=CaptionOutput,
            system_prompt=system_prompt,
        )

        logger.info("generate_caption_node_complete", run_id=state.get("run_id"))
        caption = result.caption.rstrip() + f"\n\nRead the full story → {_settings.medium_url}\n\nFollow us on Instagram: {_settings.instagram_url}"
        return {
            "caption": caption,
            "hashtags": result.hashtags,
            "messages": state.get("messages", []) + ["Caption generated"],
        }

    except Exception as e:
        logger.error("generate_caption_node_error", error=str(e))
        return {
            "caption": "",
            "hashtags": [],
            "errors": state.get("errors", []) + [f"Caption generation failed: {str(e)}"],
        }
