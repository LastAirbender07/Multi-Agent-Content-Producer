from infra.llm.factory import LLMFactory
from infra.logging import get_logger
from core.schemas.workflow_state import ContentWorkflowState, ResearchOutput
from core.prompts.system_prompts import get_system_prompt, format_prompt
from core.prompts.prompt_loader import load_prompt

logger = get_logger(__name__)

async def research_node(state: ContentWorkflowState) -> dict:
    topic = state["topic"]
    logger.info("resarch_node_start", topic=topic)

    try:
        llm = await LLMFactory.get_client()
        system_prompt = get_system_prompt("research")
        prompt_template = load_prompt("research", topic=topic)

        user_prompt = format_prompt(
            prompt_template, 
            topic=topic
        )

        research = await llm.generate_structured(
            prompt = user_prompt,
            output_schema = ResearchOutput,
            system_prompt = system_prompt
        )

        logger.info(
            "research_node_complete", 
            topic=topic,
            key_points_count=len(research.key_points),
            relevance=research.relevance_score
        )

        return {
            "research_data": research,
            "research_summary": research.summary,
            "messages": [f"✅ Research completed: {research.summary[:50]}..."]
        }
    
    except Exception as e:
        logger.error("research_node_error", topic=topic, error=str(e))
        return {
            "errors": [f"Research failed: {str(e)}"],
            "messages": [f"❌ Research failed: {str(e)}"]
        }
