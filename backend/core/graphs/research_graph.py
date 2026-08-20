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
from core.schemas.workflow_state import ResearchGraphState
from core.services.progress_store import progress_store
from infra.logging import get_logger

logger = get_logger(__name__)

_URL_RE = _re.compile(r'https?://\S+')

# ── Progress metadata for each LangGraph node ─────────────────────────────────

_PHASE_MAP: dict[str, str] = {
    "intake":            "intake",
    "route":             "planning",
    "llm_knowledge":     "planning",
    "execute_tools":     "executing_tools",
    "normalize":         "executing_tools",
    "score_evidence":    "executing_tools",
    "synthesize":        "synthesizing",
    "evaluate":          "synthesizing",
    "refine":            "synthesizing",
    "finalize":          "synthesizing",
    "finalize_partial":  "synthesizing",
}

_NODE_PCT: dict[str, int] = {
    "intake":            8,
    "route":             18,
    "llm_knowledge":     25,
    "execute_tools":     55,
    "normalize":         65,
    "score_evidence":    72,
    "synthesize":        85,
    "evaluate":          92,
    "refine":            88,
    "finalize":          98,
    "finalize_partial":  98,
}

_NODE_LABELS: dict[str, str] = {
    "intake":            "Starting…",
    "route":             "Planning queries…",
    "llm_knowledge":     "Loading background knowledge…",
    "execute_tools":     "Searching news & web…",
    "normalize":         "Processing sources…",
    "score_evidence":    "Scoring evidence…",
    "synthesize":        "Synthesising findings…",
    "evaluate":          "Evaluating quality…",
    "refine":            "Refining…",
    "finalize":          "Saving results…",
    "finalize_partial":  "Saving results…",
}


def _emit(run_id: str, node: str) -> None:
    """Push a progress event for the given node to all SSE subscribers."""
    progress_store.update(f"research:{run_id}", {
        "phase":   _PHASE_MAP.get(node, "running"),
        "pct":     _NODE_PCT.get(node, 50),
        "message": _NODE_LABELS.get(node, "Running…"),
    })


async def intake_node(state: ResearchGraphState) -> dict:
    """Validate request, extract URLs from topic, run query preprocessor."""
    run_id = state["run_id"]
    _emit(run_id, "intake")
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
# Each underlying node function is wrapped to emit a progress event before
# delegating to the real implementation.

def _tracked(underlying_fn, node_name: str):
    """Wrap a node function to emit a progress event before delegating."""
    async def wrapper(state: ResearchGraphState) -> dict:
        _emit(state["run_id"], node_name)
        return await underlying_fn(state)
    wrapper.__name__ = f"_{node_name}_tracked"
    return wrapper

_route_node_tracked          = _tracked(route_node,              "route")
_llm_knowledge_node_tracked  = _tracked(llm_knowledge_node,      "llm_knowledge")
_execute_tools_node_tracked  = _tracked(execute_tools_node,       "execute_tools")
_normalize_node_tracked      = _tracked(normalize_evidence_node,  "normalize")
_score_evidence_node_tracked = _tracked(score_evidence_node,      "score_evidence")
_synthesize_node_tracked     = _tracked(synthesize_node,          "synthesize")
_evaluate_node_tracked       = _tracked(evaluate_node,            "evaluate")


async def refine_node(state: ResearchGraphState) -> dict:
    """Record completed iteration, save snapshot to disk, increment loop counter."""
    from core.orchestrators.research.orchestrator import save_iteration_snapshot

    _emit(state["run_id"], "refine")

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
    """Save full output to disk. Called on success."""
    from core.orchestrators.research.orchestrator import save_research_output
    run_id = state["run_id"]
    _emit(run_id, "finalize")
    output_path = await save_research_output(state, status="success", iteration_history=state.get("iteration_history", []))
    # Signal completion — push final event then close all SSE streams
    progress_store.update(f"research:{run_id}", {
        "phase": "complete", "pct": 100, "message": "Research complete"
    })
    progress_store.finish(f"research:{run_id}")
    return {
        "output_path": output_path,
        "messages": state.get("messages", []) + [f"Research run completed successfully. Output saved to {output_path}"],
    }


async def finalize_partial_node(state: ResearchGraphState) -> dict:
    """Save partial output to disk. Called when quality gate fails and no budget left."""
    from core.orchestrators.research.orchestrator import save_research_output
    run_id = state["run_id"]
    _emit(run_id, "finalize_partial")
    output_path = await save_research_output(state, status="partial_success", iteration_history=state.get("iteration_history", []))
    # Signal completion — push final event then close all SSE streams
    progress_store.update(f"research:{run_id}", {
        "phase": "complete", "pct": 100, "message": "Research complete"
    })
    progress_store.finish(f"research:{run_id}")
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