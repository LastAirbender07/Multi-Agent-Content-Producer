from infra.llm.factory import LLMFactory
from infra.logging import get_logger
from core.schemas.workflow_state import ContentWorkflowState, ContentOutput
from core.prompts.system_prompts import get_system_prompt, format_prompt
from core.prompts.prompt_loader import load_prompt

logger = get_logger(__name__)

async def content_node(state: ContentWorkflowState) -> dict:
    topic = state["topic"]
    angle = state["selected_angle"]
    research_summary = state["research_summary"]
    logger.info("content_node_start", topic=topic)

    try:
        llm = LLMFactory.get_client()
        system_prompt = get_system_prompt("content")
        prompt_template = load_prompt("content_generation", topic=topic)

        user_prompt = format_prompt(
            prompt_template, 
            topic=topic,
            angle=angle,
            research_summary=research_summary
        )

        content = await llm.generate_structured(
            prompt = user_prompt,
            output_schema = ContentOutput,
            system_prompt = system_prompt
        )

        logger.info(
            "content_node_complete", 
            topic=topic,
            slides_count=len(content.slides),
            hashtags_count=len(content.hashtags)
        )

        return {
            "content_slides": [s.model_dump() for s in content.slides],
            "content_hook": content.hook,
            "content_caption": content.caption,
            "content_hashtags": content.hashtags,
            "messages": [f"✅ Content created: {len(content.slides)} slides"]
        }
    
    except Exception as e:
        logger.error("content_node_error", topic=topic, error=str(e))
        return {
            "errors": [f"Content generation failed: {str(e)}"],
            "messages": [f"❌ Content generation failed: {str(e)}"]
        }