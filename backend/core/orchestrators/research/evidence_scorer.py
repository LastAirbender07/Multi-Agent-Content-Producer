import json
from langchain_core.messages import HumanMessage, SystemMessage
from core.orchestration.contracts import Evidence
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.schemas.workflow_state import ResearchGraphState
from infra.llm.langchain_adapter import get_langchain_llm
from infra.logging import get_logger

logger = get_logger(__name__)

_MAX_ITEMS = 25
_SNIPPET_LEN = 200


def _build_scoring_block(evidence: list[Evidence]) -> str:
    lines = []
    for i, e in enumerate(evidence, start=1):
        snippet = (e.snippet or e.evidence or "")[:_SNIPPET_LEN].replace("\n", " ")
        lines.append(f"[{i}] {e.title}\n    {snippet}")
    return "\n\n".join(lines)


async def _score_batch(topic: str, evidence: list[Evidence]) -> list[float]:
    """Single LLM call returning relevance scores for all evidence items."""
    llm = get_langchain_llm()
    system_prompt = get_system_prompt("research")
    evidence_block = _build_scoring_block(evidence)
    user_prompt = load_prompt(
        "evidence_scoring",
        topic=topic,
        evidence_block=evidence_block,
        item_count=len(evidence),
    )
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ]
    response = await llm.ainvoke(messages)
    raw = response.content if hasattr(response, "content") else str(response)

    # Parse JSON array from the response
    raw = raw.strip()
    start = raw.find("[")
    end = raw.rfind("]") + 1
    if start == -1 or end == 0:
        raise ValueError(f"No JSON array found in LLM response: {raw[:200]}")
    scores = json.loads(raw[start:end])
    if not isinstance(scores, list):
        raise ValueError(f"Expected list, got {type(scores)}")
    # Clamp scores to [0, 1] and pad/truncate to match item count
    scores = [max(0.0, min(1.0, float(s))) for s in scores]
    if len(scores) < len(evidence):
        scores.extend([0.5] * (len(evidence) - len(scores)))
    return scores[:len(evidence)]


async def score_evidence_node(state: ResearchGraphState) -> dict:
    """
    Replaces per-item relevance_score with LLM-judged semantic relevance.
    A single batched LLM call scores all EXTERNAL evidence items relative to the topic.
    llm_knowledge items are PINNED first — they are background context, not external sources,
    and should not compete in the relevance ranking.
    """
    evidence: list[Evidence] = list(state.get("evidence", []))
    if not evidence:
        return {}

    topic: str = state["request"].topic

    # Separate LLM background knowledge from external sources
    llm_knowledge_items = [e for e in evidence if e.source_type == "llm_knowledge"]
    external_items = [e for e in evidence if e.source_type != "llm_knowledge"]

    # Score only external items — cap to avoid oversized prompts
    to_score = external_items[:_MAX_ITEMS]
    rest = external_items[_MAX_ITEMS:]

    try:
        scores = await _score_batch(topic, to_score)
        updated: list[Evidence] = []
        for item, score in zip(to_score, scores):
            updated.append(item.model_copy(update={"relevance_score": round(score, 4)}))
        scored_external = sorted(updated + rest, key=lambda e: e.relevance_score, reverse=True)

        # Merge: llm_knowledge always first (pinned context), then ranked external sources
        all_evidence = llm_knowledge_items + scored_external

        logger.info(
            "score_evidence_node_completed",
            run_id=state.get("run_id"),
            scored=len(to_score),
            pinned_llm_knowledge=len(llm_knowledge_items),
            top_score=scored_external[0].relevance_score if scored_external else 0,
            avg_score=round(sum(e.relevance_score for e in scored_external) / len(scored_external), 3) if scored_external else 0,
        )
        return {
            "evidence": all_evidence,
            "messages": state.get("messages", []) + [
                f"Evidence scoring: {len(to_score)} items scored by LLM; "
                f"{len(llm_knowledge_items)} LLM background item(s) pinned first; re-ranked by relevance."
            ],
        }
    except Exception as e:
        logger.warning("score_evidence_node_failed", error=str(e), run_id=state.get("run_id"))
        return {
            "messages": state.get("messages", []) + [
                f"Evidence scoring failed ({str(e)[:80]}); using unscored evidence."
            ],
        }
