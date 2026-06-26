from core.orchestration.contracts import ResearchSynthesis
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.schemas.workflow_state import ResearchGraphState
from core.utils.text_utils import format_evidence_block
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)


async def synthesize_node(state: ResearchGraphState) -> dict:
    request = state["request"]

    if not state.get("evidence"):
        logger.warning("synthesize_node_no_evidence", run_id=state.get("run_id"))
        return {
            "synthesis": None,
            "errors": state.get("errors", []) + ["No evidence collected to synthesize."],
            "messages": state.get("messages", []) + ["Synthesis skipped: No evidence."],
        }

    run_id = state.get("run_id")
    try:
        system_prompt = get_system_prompt("research")
        evidence_block = format_evidence_block(state.get("evidence", []), max_items=12)
        user_prompt = load_prompt("research_synthesis", topic=request.topic, evidence_block=evidence_block)

        synthesis: ResearchSynthesis = await LLMFactory.get_client_with_retry(
            lambda llm: llm.generate_structured(
                prompt=user_prompt,
                output_schema=ResearchSynthesis,
                system_prompt=system_prompt,
                _token_meta=(run_id, "research"),
            )
        )

        logger.info(
            "synthesis_node_completed",
            run_id=run_id,
            confidence=synthesis.confidence_score,
            key_points_count=len(synthesis.key_points),
        )
        return {
            "synthesis": synthesis,
            "messages": state.get("messages", []) + [
                "Synthesis completed. Confidence score: {:.2f}".format(synthesis.confidence_score)
            ],
            "errors": state.get("errors", []),
        }

    except Exception as e:
        logger.exception("synthesis_node_error", run_id=run_id, error=str(e))
        return {
            "synthesis": None,
            "messages": state.get("messages", []) + ["Synthesis failed due to an error."],
            "errors": state.get("errors", []) + [f"Synthesis error: {str(e)}"],
        }
