from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

from configs.settings import get_settings
from core.orchestration.contracts import ContentRequest, Slide
from core.orchestrators.content import _progress_store as content_progress
from core.orchestrators.content.render_server import serve_directory
from core.schemas.workflow_state import ContentGraphState
from core.services.progress_store import progress_store
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()

_BACKEND_ROOT = Path(__file__).parents[3]

_TEMPLATE_MAP = {
    "Anger": "aurora", "Fear": "aurora", "Urgency": "aurora",
    "Controversy": "aurora", "Surprise": "aurora",
    "Hope": "lumina", "Inspiration": "lumina", "Curiosity": "lumina",
}


def _get_template_name(emotional_hook: str) -> str:
    return _TEMPLATE_MAP.get(emotional_hook, "aurora")


def _canvas_template_id(slide_type: str, theme: str, layout_variant: int, has_image: bool) -> str:
    """Compute the Fabric canvas template identifier for this slide."""
    if slide_type == "content":
        return f"{theme}-content-text" if not has_image else f"{theme}-content-{layout_variant}"
    return f"{theme}-{slide_type}"


class _Counter:
    """Simple mutable counter — cleaner than the mutable-list [int] idiom."""
    def __init__(self) -> None:
        self.value = 0

    def next(self) -> int:
        v = self.value
        self.value += 1
        return v


def _layout_variant_for_image(image_path: str, landscape_counter: _Counter) -> int:
    """
    Choose layout variant from the actual downloaded image's aspect ratio.
    - Portrait  (ratio < 0.95)  → 0  (left-text / right-portrait-card)
    - Square    (0.95–1.4)      → 0  (portrait card still fits fine)
    - Landscape (ratio > 1.4)   → cycles 1 → 2 → 3 → 1 … for visual variety
    Returns the variant int.
    """
    if not image_path:
        return 0
    try:
        with Image.open(image_path) as img:
            w, h = img.size
        ratio = w / h
    except Exception:
        return 0

    if ratio > 1.4:
        variant = (landscape_counter.next() % 3) + 1  # cycles 1 → 2 → 3 → 1 …
        return variant
    return 0


async def screenshot_slides_fabric_node(state: ContentGraphState) -> dict:
    """
    Render all slides to PNG via Fabric.js + Playwright.
    Single rendering node — replaces the old Jinja2 render_slides_node +
    screenshot_slides_node pair that was deleted in Phase 3.

    Reads canvas_template from each slide (set by _canvas_template_id during
    slide generation) so the correct Fabric builder is selected for every type.
    """
    from core.orchestrators.content.renderer import SlideRenderTask, render_slides_fabric

    run_id      = state.get("run_id")
    angle_index = state.get("angle_index", 0)
    slides_raw  = state.get("slides", [])
    image_assets = {a["slide_number"]: a for a in state.get("image_assets", [])}

    output_dir = (
        _BACKEND_ROOT / _settings.content_output_dir
        / run_id / "content" / f"angle_{angle_index}" / "png"
    )
    output_dir.mkdir(parents=True, exist_ok=True)

    tasks: list[SlideRenderTask] = []
    landscape_counter = _Counter()
    angle_obj  = state.get("angle", {})
    theme      = _get_template_name(angle_obj.get("emotional_hook", ""))

    for i, slide_dict in enumerate(slides_raw):
        slide_num  = slide_dict.get("slide_number", i + 1)
        slide_type = str(slide_dict.get("type", "hook")).split(".")[-1]  # handle both str and SlideType enum
        asset      = image_assets.get(slide_num, {})
        local_path = asset.get("processed_path") or ""
        has_image  = bool(local_path) and asset.get("source") != "colour"

        if has_image:
            image_url      = "/" + str(Path(local_path).relative_to(_BACKEND_ROOT)).replace("\\", "/")
            layout_variant = _layout_variant_for_image(local_path, landscape_counter) if slide_type == "content" else 0
        else:
            image_url      = None
            layout_variant = 0

        # Compute canvas_template if not already stored, then build enriched dict
        # with canvas_template + _theme so inferTemplate() picks the right builder.
        canvas_template = slide_dict.get("canvas_template") or _canvas_template_id(slide_type, theme, layout_variant, has_image)
        slide_dict = {**slide_dict, "canvas_template": canvas_template, "_theme": theme}
        # Update the legacy polling store (for /render-status endpoint)
        content_progress.update(run_id, i + 1, len(slides_raw))

        # Push per-slide rendering progress to all SSE subscribers.
        # pct spans the angle's reserved range within 10–90% across all angles.
        total_angles  = state.get("total_angles", 1) or 1
        angle_start   = round(angle_index / total_angles * 80) + 10
        angle_end     = round((angle_index + 1) / total_angles * 80) + 5
        slide_pct     = angle_start + round((i + 1) / len(slides_raw) * (angle_end - angle_start))
        progress_store.update(f"content:{run_id}", {
            "phase":   "rendering",
            "pct":     slide_pct,
            "message": (
                f"Angle {angle_index + 1}/{total_angles} — slide {i + 1} of {len(slides_raw)}…"
                if total_angles > 1
                else f"Rendering slide {i + 1} of {len(slides_raw)}…"
            ),
        })

        tasks.append(SlideRenderTask(
            slide_data=slide_dict,
            image_url=image_url,
            output_path=output_dir / f"slide_{slide_num:02d}.png",
        ))

    # Rebuild slides list with canvas_template + _theme persisted so finalize
    # writes these fields to slides.json — without mutating LangGraph state in place.
    enriched_slides = [
        {**t.slide_data}
        for t in tasks
    ]

    png_paths = await render_slides_fabric(tasks)

    # Remove the non-fatal writeback attempt — slides are now returned
    # via the state dict so finalize_content_node writes them correctly.

    content_progress.clear(run_id)
    return {
        "slide_png_paths": png_paths,
        "slides": enriched_slides,  # canvas_template + _theme persisted for finalize
        "messages": state.get("messages", []) + [f"Rendered {len(png_paths)} slides via Fabric.js"],
    }
