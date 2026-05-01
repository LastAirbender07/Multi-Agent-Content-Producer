from langgraph.graph import START, END, StateGraph
from core.orchestrators.angle.auto_selector import llm_select_node
from core.orchestrators.angle.evaluator import evaluate_angles_node
from core.orchestrators.angle.finalizer import finalize_angles_node, finalize_angles_partial_node
from core.orchestrators.angle.generator import generate_angles_node
from core.orchestrators.angle.human_approval import human_approval_node
from core.schemas.workflow_state import AngleGraphState


def _route_after_evaluate(state: AngleGraphState) -> str:
    evaluation = state.get("evaluation") or {}
    if not evaluation.get("passed"):
        return "finalize_partial"
    request = state.get("request") or {}
    if request.get("mode") == "auto":
        return "llm_select"
    return "human_approval"


def build_angle_graph() -> StateGraph:
    graph = StateGraph(AngleGraphState)

    graph.add_node("generate", generate_angles_node)
    graph.add_node("evaluate", evaluate_angles_node)
    graph.add_node("llm_select", llm_select_node)
    graph.add_node("human_approval", human_approval_node)
    graph.add_node("finalize", finalize_angles_node)
    graph.add_node("finalize_partial", finalize_angles_partial_node)

    graph.add_edge(START, "generate")
    graph.add_edge("generate", "evaluate")

    graph.add_conditional_edges(
        "evaluate",
        _route_after_evaluate,
        {
            "llm_select": "llm_select",
            "human_approval": "human_approval",
            "finalize_partial": "finalize_partial",
        },
    )

    graph.add_edge("llm_select", "finalize")
    graph.add_edge("human_approval", "finalize")
    graph.add_edge("finalize", END)
    graph.add_edge("finalize_partial", END)

    return graph
