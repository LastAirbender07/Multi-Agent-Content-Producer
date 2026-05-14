from langgraph.graph import START, END, StateGraph

from core.orchestrators.content.caption_generator import generate_caption_node
from core.orchestrators.content.carousel_generator import render_slides_node, screenshot_slides_node
from core.orchestrators.content.finalizer import finalize_content_node
from core.orchestrators.content.image_fetcher import fetch_images_node
from core.orchestrators.content.reorder import reorder_slides_node
from core.orchestrators.content.slide_generator import generate_slides_node
from core.schemas.workflow_state import ContentGraphState


def _route_after_generate(state: ContentGraphState) -> str:
    if state.get("errors") or not state.get("slides"):
        return "finalize"
    return "reorder"


def build_content_graph() -> StateGraph:
    graph = StateGraph(ContentGraphState)

    graph.add_node("generate_slides", generate_slides_node)
    graph.add_node("reorder", reorder_slides_node)
    graph.add_node("generate_caption", generate_caption_node)
    graph.add_node("fetch_images", fetch_images_node)
    graph.add_node("render_slides", render_slides_node)
    graph.add_node("screenshot_slides", screenshot_slides_node)
    graph.add_node("finalize", finalize_content_node)

    graph.add_edge(START, "generate_slides")
    graph.add_conditional_edges(
        "generate_slides",
        _route_after_generate,
        {"reorder": "reorder", "finalize": "finalize"},
    )
    graph.add_edge("reorder", "generate_caption")
    graph.add_edge("generate_caption", "fetch_images")
    graph.add_edge("fetch_images", "render_slides")
    graph.add_edge("render_slides", "screenshot_slides")
    graph.add_edge("screenshot_slides", "finalize")
    graph.add_edge("finalize", END)

    return graph
