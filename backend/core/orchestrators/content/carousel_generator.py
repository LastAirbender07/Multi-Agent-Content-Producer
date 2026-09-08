from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

from configs.settings import get_settings
from core.orchestration.contracts import ContentRequest, PostFormat, Slide
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


# Phase 3: compact-clean routing table
# Keys: (PostFormat.value, slide_type) → aurora-compact-* template ID
# Falls through to extended for types not listed here (story+content, etc.)
COMPACT_ROUTING: dict[tuple[str, str], str] = {
    # hook — all compact formats use compact-hook
    (PostFormat.facts.value,     "hook"):    "aurora-compact-hook",
    (PostFormat.tutorial.value,  "hook"):    "aurora-compact-hook",
    (PostFormat.listicle.value,  "hook"):    "aurora-compact-hook",
    (PostFormat.review.value,    "hook"):    "aurora-compact-hook",
    (PostFormat.story.value,     "hook"):    "aurora-compact-hook",
    (PostFormat.checklist.value, "hook"):    "aurora-compact-hook",
    (PostFormat.comparison.value,"hook"):    "aurora-compact-hook",
    # content slides
    (PostFormat.facts.value,     "content"): "aurora-compact-fact",
    (PostFormat.tutorial.value,  "content"): "aurora-compact-step",
    (PostFormat.listicle.value,  "content"): "aurora-compact-list-item",
    (PostFormat.review.value,    "content"): "aurora-compact-fact",
    (PostFormat.checklist.value, "content"): "aurora-compact-list-item",
    (PostFormat.comparison.value,"content"): "aurora-compact-fact-compare",
    # stat slides
    (PostFormat.facts.value,     "stat"):    "aurora-compact-fact",
    (PostFormat.tutorial.value,  "stat"):    "aurora-compact-stat-hero",
    (PostFormat.listicle.value,  "stat"):    "aurora-compact-fact",
    (PostFormat.review.value,    "stat"):    "aurora-compact-fact",
    (PostFormat.comparison.value,"stat"):    "aurora-compact-fact-compare",
    # quote slides
    (PostFormat.facts.value,     "quote"):   "aurora-compact-quote",
    (PostFormat.tutorial.value,  "quote"):   "aurora-compact-quote",
    (PostFormat.listicle.value,  "quote"):   "aurora-compact-quote",
    (PostFormat.review.value,    "quote"):   "aurora-compact-quote",
    (PostFormat.story.value,     "quote"):   "aurora-compact-quote",
    (PostFormat.comparison.value,"quote"):   "aurora-compact-quote",
    # cta + engage — use compact-clean variants (Phase 2.5 templates)
    (PostFormat.facts.value,     "cta"):     "aurora-compact-clean-cta",
    (PostFormat.facts.value,     "engage"):  "aurora-compact-clean-engage",
    (PostFormat.tutorial.value,  "cta"):     "aurora-compact-clean-cta",
    (PostFormat.tutorial.value,  "engage"):  "aurora-compact-clean-engage",
    (PostFormat.listicle.value,  "cta"):     "aurora-compact-clean-cta",
    (PostFormat.listicle.value,  "engage"):  "aurora-compact-clean-engage",
    (PostFormat.review.value,    "cta"):     "aurora-compact-clean-cta",
    (PostFormat.review.value,    "engage"):  "aurora-compact-clean-engage",
    (PostFormat.checklist.value, "cta"):     "aurora-compact-clean-cta",
    (PostFormat.checklist.value, "engage"):  "aurora-compact-clean-engage",
    (PostFormat.comparison.value,"cta"):     "aurora-compact-clean-cta",
    (PostFormat.comparison.value,"engage"):  "aurora-compact-clean-engage",
    (PostFormat.story.value,     "cta"):     "aurora-compact-clean-cta",
    (PostFormat.story.value,     "engage"):  "aurora-compact-clean-engage",
}


# Phase 3.5: aurora-lite routing table
# Keys: (slide_type, "aurora-lite") → template ID
AURORA_LITE_ROUTING: dict[tuple[str, str], str] = {
    ("hook",    "aurora-lite"): "aurora-lite-hook",     # = aurora-hook
    ("content", "aurora-lite"): "aurora-lite-content",  # NEW — no bullets, 64pt title
    ("stat",    "aurora-lite"): "aurora-lite-stat",     # = aurora-stat
    ("quote",   "aurora-lite"): "aurora-lite-quote",    # NEW — no insight bullets
    ("cta",     "aurora-lite"): "aurora-lite-cta",      # = aurora-cta
    ("engage",  "aurora-lite"): "aurora-lite-engage",   # = aurora-engage
}


def _canvas_template_id(
    slide_type: str,
    theme: str,
    layout_variant: int,
    has_image: bool,
    template_family: str = "aurora-lite",  # Phase 3.5: default changed from aurora-extended to aurora-lite
    post_format: str = PostFormat.opinion.value,
) -> str:
    """Compute the Fabric canvas template identifier for this slide.

    Phase 3:   compact-clean → COMPACT_ROUTING table
    Phase 3.5: aurora-lite → AURORA_LITE_ROUTING table
    Fallback:  aurora-extended (user-explicit) or unrecognised family → existing logic
    """
    if template_family == "compact-clean":
        key = (post_format, slide_type)
        if key in COMPACT_ROUTING:
            return COMPACT_ROUTING[key]
        # Fallback for unrouted types (story+content, etc.) → extended
    elif template_family == "aurora-lite":
        key = (slide_type, "aurora-lite")
        if key in AURORA_LITE_ROUTING:
            return AURORA_LITE_ROUTING[key]
        # Fallback for unrecognised aurora-lite slide types → extended
    # aurora-extended (user-explicit) OR unrouted fallback: existing logic unchanged
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

        # Phase 3: read format/family from state for compact routing
        post_format_val  = state.get("post_format",    PostFormat.opinion.value)
        template_family  = state.get("template_family", "aurora-lite")

        # Compute canvas_template:
        # - For aurora-lite and compact-clean: ALWAYS re-derive from routing table.
        #   The LLM may output aurora-* IDs from the template_spec_block prompt injection
        #   which would bypass the Phase 3/3.5 routing. Always override for these families.
        # - For aurora-extended (user-explicit): honour existing canvas_template if set.
        stored_template = slide_dict.get("canvas_template")
        if template_family in ("aurora-lite", "compact-clean") or not stored_template:
            canvas_template = _canvas_template_id(
                slide_type, theme, layout_variant, has_image,
                template_family=template_family,
                post_format=post_format_val,
            )
        else:
            # aurora-extended: respect LLM-supplied canvas_template (user chose dense)
            canvas_template = stored_template
        slide_dict = {**slide_dict, "canvas_template": canvas_template, "_theme": theme}

        # Phase 3 — compact_meta adapter
        # Compact-clean templates (aurora-compact-*) read from slide.compact_meta.
        # The LLM generates standard title/body/bullets. If compact_meta is absent,
        # synthesise it from the standard fields so content renders correctly.
        # Field mapping follows the TypeScript interfaces in each compact template:
        #   aurora-compact-fact:      body_header + body_copy + stat{value,caption} + variant
        #   aurora-compact-step:      step_number + title + steps[{label,detail}]
        #   aurora-compact-hook:      headline_runs (falls back to slide.title natively)
        #   aurora-compact-stat-hero: stat_value + stat_label + body_copy
        #   aurora-compact-quote:     quote + attribution (partially via compact_meta)
        #   aurora-compact-clean-cta/engage: headline_runs (falls back to slide.title natively)
        # Hooks, cta, engage fall back natively → only fact/step/stat-hero need this adapter.
        if template_family == "compact-clean" and not slide_dict.get("compact_meta"):
            import re as _re
            bullets_raw = slide_dict.get("bullets") or []
            bullets_clean = [
                _re.sub(r"^\d+[\.\)]\s*", "", str(b)).strip()
                for b in bullets_raw if str(b).strip()
            ]
            stat_v = slide_dict.get("stat_value")
            stat_l = slide_dict.get("stat_label") or ""
            title  = slide_dict.get("title", "")
            body   = slide_dict.get("body",  "")

            if canvas_template == "aurora-compact-fact":
                if stat_v:
                    # Numeric stat → single variant
                    slide_dict = {**slide_dict, "compact_meta": {
                        "variant":      "single",
                        "stat":         {"value": str(stat_v), "caption": stat_l},
                        "body_header":  title,
                        "body_copy":    body,
                        "attribution":  "",
                        "category_pill": "STAT",
                        "brand_wordmark": "",
                    }}
                else:
                    # Text-only fact: compare variant, inject title/body into the body section
                    # Zero out the stat placeholders so no Anthropic demo data appears
                    slide_dict = {**slide_dict, "compact_meta": {
                        "variant":       "compare",
                        "stat_baseline": {"value": "", "caption": ""},
                        "stat_featured": {"value": "", "caption": ""},
                        "body_header":   title,
                        "body_copy":     body,
                        "attribution":   bullets_clean[0] if bullets_clean else "",
                        "brand_wordmark": "",
                    }}

            elif canvas_template == "aurora-compact-stat-hero":
                slide_dict = {**slide_dict, "compact_meta": {
                    "stat_value": str(stat_v) if stat_v else "",
                    "stat_label": stat_l,
                    "body_copy":  body,
                }}

            elif canvas_template in ("aurora-compact-step", "aurora-compact-list-item"):
                slide_dict = {**slide_dict, "compact_meta": {
                    "title":      title,
                    "body_copy":  body,
                    "steps":      [{"label": b, "detail": ""} for b in bullets_clean[:4]],
                }}

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
