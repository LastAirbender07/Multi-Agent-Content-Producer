from langchain_core.messages import HumanMessage, SystemMessage
from core.orchestration.contracts import ResearchSynthesis
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.schemas.workflow_state import ResearchGraphState
from infra.llm.langchain_adapter import get_langchain_llm
from infra.logging import get_logger

logger = get_logger(__name__)

def _build_evidence_block(state: ResearchGraphState) -> str:
    """Format top evidence items into a numbered block for the prompt"""
    lines = []
    for idx, evidence in enumerate(state.get("evidence", [])[:12], start=1):
        lines.append(f"[{idx}] {evidence.title}")
        lines.append(f"Source: {evidence.source_name or evidence.source_type}")
        lines.append(f"URL: {evidence.url}")
        if evidence.snippet:
            lines.append(f"Snippet: {evidence.snippet[:400]}")
        if evidence.extracted_content:
            lines.append(f"Extracted Content: {evidence.extracted_content[:600]}")
        lines.append("")

    return "\n".join(lines)

async def synthesize_node(state: ResearchGraphState) -> dict:
    request = state["request"]

    if not state.get("evidence"):
        logger.warning("synthesize_node_no_evidence", run_id=state.get("run_id"))
        return {
            "errors": state.get("errors", []) + ["No evidence collected to synthesize."],
            "messages": state.get("messages", []) + ["Synthesis skipped: No evidence."],
        }

    try:
        llm = get_langchain_llm()
        structured_llm = llm.with_structured_output(ResearchSynthesis)
        system_prompt = get_system_prompt("research")
        evidence_block = _build_evidence_block(state)
        user_prompt = load_prompt("research_synthesis", topic=request.topic, evidence_block=evidence_block)
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        synthesis: ResearchSynthesis = await structured_llm.ainvoke(messages)
        logger.info(
            "synthesis_node_completed",
            run_id=state.get("run_id"),
            confidence=synthesis.confidence_score,
            key_points_count=len(synthesis.key_points),
        )

        return {
            "synthesis": synthesis,
            "messages": state.get("messages", []) + ["Synthesis completed. Confidence score: {:.2f}".format(synthesis.confidence_score)],
            "errors": state.get("errors", []),
        }

    except Exception as e:
        logger.exception("synthesis_node_error", run_id=state.get("run_id"), error=str(e))
        return {
            "synthesis": None,
            "messages": state.get("messages", []) + ["Synthesis failed due to an error."],
            "errors": state.get("errors", []) + [f"Synthesis error: {str(e)}"],
        }
