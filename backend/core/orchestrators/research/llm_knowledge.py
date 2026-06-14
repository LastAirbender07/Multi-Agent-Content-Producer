from datetime import datetime, timezone
from core.orchestration.contracts import Evidence
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.schemas.workflow_state import ResearchGraphState
from core.utils.text_utils import make_llm_url
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)


async def llm_knowledge_node(state: ResearchGraphState) -> dict:
    """
    Injects LLM background knowledge as a synthetic evidence item.
    Only runs on the first iteration (loop_count == 0).
    """
    if state.get("loop_count", 0) > 0:
        return {}

    request = state["request"]
    topic = request.topic

    try:
        system_prompt = get_system_prompt("research")
        user_prompt = load_prompt("llm_knowledge", topic=topic)
        response = await LLMFactory.get_client_with_retry(
            lambda llm: llm.generate(prompt=user_prompt, system_prompt=system_prompt)
        )
        content = response.content

        now = datetime.now(timezone.utc)
        item = Evidence(
            evidence=content,
            source_type="llm_knowledge",
            title=f"LLM Background Knowledge: {topic}",
            url=make_llm_url(topic.replace(" ", "_")),
            snippet=content[:400],
            retrieval_time=now,
            credibility_score=0.5,
            relevance_score=0.5,
        )

        existing: list[Evidence] = list(state.get("evidence", []))
        existing.insert(0, item)

        logger.info("llm_knowledge_node_completed", run_id=state.get("run_id"), chars=len(content))
        return {
            "evidence": existing,
            "messages": state.get("messages", []) + ["LLM background knowledge injected as synthetic evidence."],
        }

    except Exception as e:
        logger.exception("llm_knowledge_node_error", run_id=state.get("run_id"), error=str(e))
        return {
            "errors": state.get("errors", []) + [f"LLM knowledge node error: {str(e)}"],
            "messages": state.get("messages", []) + ["LLM knowledge node failed; continuing without it."],
        }
