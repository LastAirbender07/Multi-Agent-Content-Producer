from core.orchestration.contracts import ContentRequest, SlideGenerationOutput
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.schemas.workflow_state import ContentGraphState
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)

async def generate_slides_node(state: ContentGraphState) -> dict:
    request = ContentRequest.model_validate(state["request"])
    angle = state["angle"]
    target_slides = min(request.max_slides, 14)

    try:
        llm = await LLMFactory.get_client()
        system_prompt = get_system_prompt("content")
        user_prompt = load_prompt(
            "slide_generation",
            topic=request.topic,
            angle_statement=angle["statement"],
            emotional_hook=angle["emotional_hook"],
            supporting_evidence=angle["supporting_evidence"],
            research_summary=request.research_summary,
            key_points="\n".join(f"- {point}" for point in request.key_points),
            target_slides=target_slides
        )

        result = await llm.generate_structured(
            prompt=user_prompt,
            output_schema=SlideGenerationOutput,
            system_prompt=system_prompt
        )

        slides = result.slides
        if len(slides) > request.max_slides:
            logger.warning(f"Generated {len(slides)} slides, which exceeds the requested maximum of {request.max_slides}. Truncating to fit.")
            slides = slides[:request.max_slides]

        logger.info(
            "generate_slide_node_complete",
            run_id=state["run_id"],
            angle_index=state.get("angle_index"),
            slide_count=len(slides)
        )

        return {
            "slides": [slide.model_dump() for slide in slides],
            "messages": state.get("messages", []) + [f"Generated {len(slides)} slides successfully."]
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