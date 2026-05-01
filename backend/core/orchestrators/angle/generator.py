from core.orchestration.contracts import Angle, AngleGenerationOutput, AngleRequest
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.schemas.workflow_state import AngleGraphState
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)


async def generate_angles_node(state: AngleGraphState) -> dict:
    request = AngleRequest.model_validate(state["request"])
    synthesis = request.synthesis

    try:
        llm = await LLMFactory.get_client()
        system_prompt = get_system_prompt("angle")
        user_prompt = load_prompt(
            "angle_generation",
            topic=request.topic,
            research_summary=synthesis.summary,
            key_points="\n".join(f"- {p}" for p in synthesis.key_points),
        )

        result = await llm.generate_structured(
            prompt=user_prompt,
            output_schema=AngleGenerationOutput,
            system_prompt=system_prompt,
        )

        logger.info(
            "generate_angles_node_complete",
            run_id=state.get("run_id"),
            count=len(result.angles),
        )
        return {
            "angles": [a.model_dump() for a in result.angles],
            "messages": state.get("messages", []) + [f"Generated {len(result.angles)} angles."],
        }

    except Exception as e:
        logger.error("generate_angles_node_error", run_id=state.get("run_id"), error=str(e))
        return {
            "angles": [],
            "errors": state.get("errors", []) + [f"Angle generation failed: {str(e)}"],
            "messages": state.get("messages", []) + [f"Angle generation failed: {str(e)}"],
        }
