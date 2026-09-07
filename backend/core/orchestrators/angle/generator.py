from core.orchestration.contracts import Angle, AngleGenerationOutput, AngleRequest, PostFormat
from core.orchestrators.content.format_blocks import ANGLE_FORMAT_BLOCKS
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.schemas.workflow_state import AngleGraphState
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)


async def generate_angles_node(state: AngleGraphState) -> dict:
    request = AngleRequest.model_validate(state["request"])
    synthesis = request.synthesis

    exclude_statements = request.exclude_statements or []
    if exclude_statements:
        lines = "\n".join(f"- {s}" for s in exclude_statements)
        exclude_block = (
            f"\n\nPREVIOUSLY GENERATED ANGLES (DO NOT REPEAT THESE):\n{lines}\n"
            "Generate completely different angles that approach the topic from new directions."
        )
    else:
        exclude_block = ""

    try:
        # Phase 3: inject format-specific angle guidance
        post_format_str = state.get("post_format", PostFormat.opinion.value)
        try:
            post_format = PostFormat(post_format_str.upper())
        except ValueError:
            post_format = PostFormat.opinion
        format_block = ANGLE_FORMAT_BLOCKS.get(post_format, "")

        system_prompt = get_system_prompt("angle")
        user_prompt = load_prompt(
            "angle_generation",
            topic=request.topic,
            research_summary=synthesis.summary,
            key_points="\n".join(f"- {p}" for p in synthesis.key_points),
            exclude_block=exclude_block,
            format_block=format_block,   # Phase 3: empty string for OPINION = no change
        )

        run_id = state.get("run_id")
        result = await LLMFactory.get_client_with_retry(
            lambda llm: llm.generate_structured(
                prompt=user_prompt,
                output_schema=AngleGenerationOutput,
                system_prompt=system_prompt,
                _token_meta=(run_id, "angles"),
            )
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
