from langgraph.graph import START, END, StateGraph
from core.orchestrators.research.evaluator import evaluate_node
from core.orchestrators.research.executor import execute_tools_node
from core.orchestrators.research.normalizer import normalize_evidence_node
from core.orchestrators.research.router import route_node
from core.orchestrators.research.synthesizer import synthesize_node
from core.schemas.workflow_state import ResearchGraphState
from infra.logging import get_logger

logger = get_logger(__name__)

async def intake_node(state: ResearchGraphState) -> dict:
    """Validate request and log start"""
    request = state["request"]
    logger.info(
        "research_graph_start",
        run_id=state["run_id"],
        topic=request.topic,
        mode=request.mode,
        freshness=request.freshness,
    )
    return {"messages": state.get("messages", []) + ["intake complete."]}

async def refine_node(state: ResearchGraphState) -> dict:
    """Increment loop counter before looping back to execute_tools"""
    loop_count = state.get("loop_count", 0)
    return {
        "loop_count": loop_count + 1,
        "messages": state.get("messages", []) + [f"Refinement loop triggered. Loop count: {loop_count + 1}"],
    }

async def finalize_node(state: ResearchGraphState) -> dict:
    """save full output to disk. Called on Success"""
    from core.orchestrators.research.orchestrator import save_research_output
    output_path = await save_research_output(state, status="success")
    return {
        "output_path": output_path,
        "messages": state.get("messages", []) + [f"Research run completed successfully. Output saved to {output_path}"],
    }

async def finalize_partial_node(state: ResearchGraphState) -> dict:
    """save partial output to disk. Called when quality gate fails and no budget left."""
    from core.orchestrators.research.orchestrator import save_research_output
    output_path = await save_research_output(state, status="partial_success")
    return {
        "output_path": output_path,
        "messages": state.get("messages", []) + [f"Research run completed with partial results. Output saved to {output_path}"],
    }

def should_continue_after_evaluation(state: ResearchGraphState) -> str:
    evaluation = state.get("evaluation")

    if evaluation and evaluation.passed:
        return "finalize"

    loop_count = state.get("loop_count", 0)
    request = state["request"]
    budget = request.budget

    if evaluation and evaluation.should_refine and loop_count < budget.max_refinement_loops:
        return "refine"

    return "finalize_partial"

def build_research_graph() -> StateGraph:
    graph = StateGraph(ResearchGraphState)

    graph.add_node("intake", intake_node)
    graph.add_node("route", route_node)
    graph.add_node("execute_tools", execute_tools_node)
    graph.add_node("normalize", normalize_evidence_node)
    graph.add_node("synthesize", synthesize_node)
    graph.add_node("evaluate", evaluate_node)
    graph.add_node("refine", refine_node)
    graph.add_node("finalize", finalize_node)
    graph.add_node("finalize_partial", finalize_partial_node)

    graph.add_edge(START, "intake")
    graph.add_edge("intake", "route")
    graph.add_edge("route", "execute_tools")
    graph.add_edge("execute_tools", "normalize")
    graph.add_edge("normalize", "synthesize")
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
