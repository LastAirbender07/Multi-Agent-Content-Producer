from infra.llm.factory import LLMFactory
from infra.logging import get_logger
from core.schemas.workflow_state import ContentWorkflowState, AngleOutput
from core.prompts.system_prompts import get_system_prompt, format_prompt
from core.prompts.prompt_loader import load_prompt

logger = get_logger(__name__)

async def angle_node(state: ContentWorkflowState) -> dict:
    topic = state["topic"]
    research_data = state["research_data"]
    logger.info("angle_node_start", topic=topic)

    try:
        llm = await LLMFactory.get_client()
        system_prompt = get_system_prompt("angle")
        prompt_template = load_prompt("angle_generation", topic=topic)

        user_prompt = format_prompt(
            prompt_template, 
            topic=topic,
            research_summary=research_data["summary"],
            key_points="\n".join(f"- {pt}" for pt in research_data["key_points"])
        )

        angles = await llm.generate_structured(
            prompt = user_prompt,
            output_schema = AngleOutput,
            system_prompt = system_prompt
        )

        logger.info(
            "angle_node_complete", 
            topic=topic,
            angles_count=len(angles.angles),
        )

        return {
            "generated_angles": angles.angles,
            "messages": [f"✅ Generated {len(angles.angles)} angles based on research."]
        }
    
    except Exception as e:
        logger.error("angle_node_error", topic=topic, error=str(e))
        return {
            "errors": [f"Angle generation failed: {str(e)}"],
            "messages": [f"❌ Angle generation failed: {str(e)}"]
        }
    