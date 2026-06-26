from datetime import datetime, timezone
import re as _re
from langgraph.graph import START, END, StateGraph
from core.orchestration.contracts import Evidence
from core.orchestrators.research.evaluator import evaluate_node
from core.orchestrators.research.evidence_scorer import score_evidence_node
from core.orchestrators.research.executor import execute_tools_node
from core.orchestrators.research.llm_knowledge import llm_knowledge_node
from core.orchestrators.research.normalizer import normalize_evidence_node
from core.orchestrators.research.query_preprocessor import QueryPreprocessor
from core.orchestrators.research.router import route_node
from core.orchestrators.research.synthesizer import synthesize_node
from core.orchestrators.research import _progress_store as progress
from core.schemas.workflow_state import ResearchGraphState
from infra.logging import get_logger

logger = get_logger(__name__)

_URL_RE = _re.compile(r'https?://\S+')


async def intake_node(state: ResearchGraphState) -> dict:
    """Validate request, extract URLs from topic, run query preprocessor."""
    run_id = state["run_id"]
    progress.update(run_id, "intake", 1)
    request = state["request"]
    updates: dict = {}

    # ── Fix 1: Extract URLs embedded in the raw topic ─────────────────────────
    found_urls = _URL_RE.findall(request.topic)
    if found_urls:
        existing = list(request.explicit_urls or [])
        merged = list(dict.fromkeys(existing + found_urls))  # dedup, preserve order
        request = request.model_copy(update={"explicit_urls": merged})
        updates["request"] = request
        logger.info("intake_urls_extracted", run_id=run_id, count=len(found_urls), urls=merged)

    # ── Fix 2: Run QueryPreprocessor to get intelligent search queries ─────────
    if not request.preprocessed_queries:
        try:
            preprocessor = QueryPreprocessor()
            processed = await preprocessor.process(request.topic, run_id=run_id)
            freshness = (
                request.freshness
                if request.freshness != "recent"
                else processed.freshness_hint
            )
            request = request.model_copy(update={
                "preprocessed_queries": processed.search_queries,
                "freshness": freshness,
            })
            updates["request"] = request
            logger.info(
                "intake_preprocessor_complete",
                run_id=run_id,
                query_count=len(processed.search_queries),
                freshness_hint=processed.freshness_hint,
            )
        except Exception as e:
            logger.warning("intake_preprocessor_failed", run_id=run_id, error=str(e))
            # Non-fatal — routing policy uses raw topic as single fallback query

    logger.info(
        "research_graph_start",
        run_id=run_id,
        topic=request.topic,
        mode=request.mode,
        freshness=request.freshness,
    )

    # ── Fix 3: Pre-seed evidence from caller (discover snippet, uploaded docs) ──
    seeded: list = []
    if request.seeded_evidence:
        for item in request.seeded_evidence:
            try:
                seeded.append(Evidence(
                    evidence=item.get("evidence", ""),
                    source_type=item.get("source_type", "document"),
                    title=item.get("title", "Attached source"),
                    url=item.get("url", ""),
                    snippet=item.get("snippet"),
                    source_name=item.get("source_name"),
                    credibility_score=float(item.get("credibility_score", 0.85)),
                    relevance_score=0.5,
                    retrieval_time=datetime.now(timezone.utc),
                ))
            except Exception as e:
                logger.warning("intake_seed_evidence_skip", run_id=run_id, error=str(e)[:80])
        if seeded:
            logger.info("intake_seeded_evidence", run_id=run_id, count=len(seeded),
                        types=list({e.source_type for e in seeded}))

    base_updates = {**updates, "messages": state.get("messages", []) + ["intake complete."]}
    if seeded:
        base_updates["evidence"] = seeded
    return base_updates


# ── Progress-tracked node wrappers ────────────────────────────────────────────
# Each underlying node function is wrapped to report progress before delegating.

def _tracked(underlying_fn, step: int):
    """Wrap a node function to report progress before delegating."""
    async def wrapper(state: ResearchGraphState) -> dict:
        progress.update(state["run_id"], underlying_fn.__name__, step)
        return await underlying_fn(state)
    wrapper.__name__ = f"_{underlying_fn.__name__}_tracked"
    return wrapper

_route_node_tracked          = _tracked(route_node,              2)
_llm_knowledge_node_tracked  = _tracked(llm_knowledge_node,      3)
_execute_tools_node_tracked  = _tracked(execute_tools_node,       4)
_normalize_node_tracked      = _tracked(normalize_evidence_node,  5)
_score_evidence_node_tracked = _tracked(score_evidence_node,      6)
_synthesize_node_tracked     = _tracked(synthesize_node,          7)
_evaluate_node_tracked       = _tracked(evaluate_node,            8)


async def refine_node(state: ResearchGraphState) -> dict:
    """Record completed iteration, save snapshot to disk, increment loop counter."""
    from core.orchestrators.research.orchestrator import save_iteration_snapshot

    # Step back to 4 (execute_tools) since the graph loops back there
    progress.update(state["run_id"], "refine", 4)

    loop_count = state.get("loop_count", 0)
    iteration_number = loop_count + 1

    synthesis = state.get("synthesis")
    evaluation = state.get("evaluation")
    history = list(state.get("iteration_history", []))
    history.append({
        "iteration": iteration_number,
        "synthesis": synthesis.model_dump() if synthesis else None,
        "evaluation": evaluation.model_dump() if evaluation else None,
        "evidence_count": len(state.get("evidence", [])),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    await save_iteration_snapshot(state, iteration_history=history)

    return {
        "loop_count": loop_count + 1,
        "iteration_history": history,
        "messages": state.get("messages", []) + [
            f"Iteration {iteration_number} complete (confidence below threshold). Retrying research."
        ],
    }


async def finalize_node(state: ResearchGraphState) -> dict:
    """save full output to disk. Called on Success"""
    from core.orchestrators.research.orchestrator import save_research_output
    progress.update(state["run_id"], "finalize", 9)
    output_path = await save_research_output(state, status="success", iteration_history=state.get("iteration_history", []))
    progress.clear(state["run_id"])
    return {
        "output_path": output_path,
        "messages": state.get("messages", []) + [f"Research run completed successfully. Output saved to {output_path}"],
    }


async def finalize_partial_node(state: ResearchGraphState) -> dict:
    """save partial output to disk. Called when quality gate fails and no budget left."""
    from core.orchestrators.research.orchestrator import save_research_output
    progress.update(state["run_id"], "finalize_partial", 9)
    output_path = await save_research_output(state, status="partial_success", iteration_history=state.get("iteration_history", []))
    progress.clear(state["run_id"])
    return {
        "output_path": output_path,
        "messages": state.get("messages", []) + [f"Research run completed with partial results. Output saved to {output_path}"],
    }


def should_continue_after_evaluation(state: ResearchGraphState) -> str:
    loop_count = state.get("loop_count", 0)
    evaluation = state.get("evaluation")
    request = state["request"]
    budget = request.budget

    # Always run at least 2 tool-execution cycles
    if loop_count == 0:
        return "refine"

    if evaluation and evaluation.passed:
        return "finalize"

    if evaluation and evaluation.should_refine and loop_count < budget.max_refinement_loops:
        return "refine"

    return "finalize_partial"


def build_research_graph() -> StateGraph:
    graph = StateGraph(ResearchGraphState)

    graph.add_node("intake", intake_node)
    graph.add_node("route", _route_node_tracked)
    graph.add_node("llm_knowledge", _llm_knowledge_node_tracked)
    graph.add_node("execute_tools", _execute_tools_node_tracked)
    graph.add_node("normalize", _normalize_node_tracked)
    graph.add_node("score_evidence", _score_evidence_node_tracked)
    graph.add_node("synthesize", _synthesize_node_tracked)
    graph.add_node("evaluate", _evaluate_node_tracked)
    graph.add_node("refine", refine_node)
    graph.add_node("finalize", finalize_node)
    graph.add_node("finalize_partial", finalize_partial_node)

    graph.add_edge(START, "intake")
    graph.add_edge("intake", "route")
    graph.add_edge("route", "llm_knowledge")
    graph.add_edge("llm_knowledge", "execute_tools")
    graph.add_edge("execute_tools", "normalize")
    graph.add_edge("normalize", "score_evidence")
    graph.add_edge("score_evidence", "synthesize")
    graph.add_edge("synthesize", "evaluate")

    graph.add_conditional_edges(
        "evaluate",
        should_continue_after_evaluation,
        {
            "finalize": "finalize",
            "refine": "refine",
            "finalize_partial": "finalize_partial",
        },
    )

    graph.add_edge("refine", "execute_tools")
    graph.add_edge("finalize", END)
    graph.add_edge("finalize_partial", END)

    return graph
