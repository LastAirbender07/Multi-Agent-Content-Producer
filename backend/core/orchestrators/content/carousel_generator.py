from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from PIL import Image
from playwright.async_api import async_playwright

from configs.settings import get_settings
from core.orchestration.contracts import ContentRequest, Slide
from core.orchestrators.content.render_server import serve_directory
from core.schemas.workflow_state import ContentGraphState
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()

_BACKEND_ROOT = Path(__file__).parents[3]
_TEMPLATES_ROOT = _BACKEND_ROOT / "core" / "templates" / "carousel"

_TEMPLATE_MAP = {
    "Anger": "aurora", "Fear": "aurora", "Urgency": "aurora",
    "Controversy": "aurora", "Surprise": "aurora",
    "Hope": "lumina", "Inspiration": "lumina", "Curiosity": "lumina",
}


def _get_template_name(emotional_hook: str) -> str:
    return _TEMPLATE_MAP.get(emotional_hook, "aurora")


def _layout_variant_for_image(image_path: str, landscape_counter: list) -> int:
    """
    Choose layout variant from the actual downloaded image's aspect ratio.
    - Portrait  (ratio < 0.95)  → 0  (left-text / right-portrait-card)
    - Square    (0.95–1.4)      → 0  (portrait card still fits fine)
    - Landscape (ratio > 1.4)   → alternate 1 / 2 for visual variety
    Returns the variant int.  landscape_counter is a mutable [int] so we can
    increment it across calls without passing state explicitly.
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
        variant = 1 if (landscape_counter[0] % 2 == 0) else 2
        landscape_counter[0] += 1
        return variant
    return 0


async def render_slides_node(state: ContentGraphState) -> dict:
    """Render HTML for each slide using Jinja2 templates."""
    request = ContentRequest.model_validate(state["request"])
    angle = state["angle"]
    slides = [Slide.model_validate(s) for s in state.get("slides", [])]
    image_assets = {a["slide_number"]: a for a in state.get("image_assets", [])}
    run_id = state.get("run_id")
    angle_index = state.get("angle_index", 0)

    template_name = _get_template_name(angle.get("emotional_hook", ""))
    env = Environment(loader=FileSystemLoader(str(_TEMPLATES_ROOT / template_name)))

    slides_dir = (
        _BACKEND_ROOT / _settings.content_output_dir
        / run_id / "content" / f"angle_{angle_index}" / "slides"
    )
    slides_dir.mkdir(parents=True, exist_ok=True)

    total = len(slides)
    html_paths: list[str] = []
    landscape_counter = [0]  # mutable counter shared across landscape slides

    for slide in slides:
        asset = image_assets.get(slide.slide_number, {})
        image_path = asset.get("processed_path") or ""
        has_image = bool(image_path) and asset.get("source") != "colour"

        if image_path:
            local_path = image_path  # absolute path for dimension reading
            image_path = "/" + str(
                Path(image_path).relative_to(_BACKEND_ROOT)
            ).replace("\\", "/")
        else:
            local_path = ""

        if slide.type.value == "content":
            layout_variant = _layout_variant_for_image(local_path, landscape_counter) if has_image else 0
        else:
            layout_variant = 0

        template = env.get_template(f"{slide.type.value}.html.j2")
        html = template.render(
            slide=slide,
            image_path=image_path,
            has_image=has_image,
            slide_number=slide.slide_number,
            total_slides=total,
            template=template_name,
            brand_name=_settings.brand_name,
            logo_path=f"/{_settings.brand_logo_path}",
            assets_root="/assets",
            layout_variant=layout_variant,
        )

        out_path = slides_dir / f"slide_{slide.slide_number:02d}.html"
        out_path.write_text(html, encoding="utf-8")
        html_paths.append(str(out_path))

    logger.info("render_slides_node_complete", count=len(html_paths))
    return {
        "slide_html_paths": html_paths,
        "messages": state.get("messages", []) + [f"Rendered {len(html_paths)} HTML slides"],
    }


async def screenshot_slides_node(state: ContentGraphState) -> dict:
    """Screenshot each HTML slide via Playwright; downscale 2160→1080."""
    run_id = state.get("run_id")
    angle_index = state.get("angle_index", 0)
    html_paths = state.get("slide_html_paths", [])

    output_dir = (
        _BACKEND_ROOT / _settings.content_output_dir
        / run_id / "content" / f"angle_{angle_index}" / "png"
    )
    output_dir.mkdir(parents=True, exist_ok=True)

    serve_root = _BACKEND_ROOT

    png_paths: list[str] = []

    async with serve_directory(serve_root) as base_url:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": _settings.carousel_viewport_size, "height": _settings.carousel_viewport_size},
                device_scale_factor=_settings.carousel_scale_factor,
            )
            page = await context.new_page()

            for html_path in html_paths:
                rel = Path(html_path).relative_to(_BACKEND_ROOT)
                url = f"{base_url}/{str(rel).replace('\\', '/')}"

                await page.goto(url, wait_until="networkidle")
                await page.evaluate("document.fonts.ready")
                # Chart.js writes to canvas synchronously but needs a small buffer
                # for raster flushing before Playwright captures the screenshot
                await page.wait_for_timeout(_settings.carousel_chart_render_wait_ms)

                raw_path = output_dir / (Path(html_path).stem + "_raw.png")
                await page.screenshot(path=str(raw_path), full_page=False)

                final_path = output_dir / (Path(html_path).stem.replace("_raw", "") + ".png")
                img = Image.open(raw_path)
                img = img.resize((_settings.carousel_viewport_size, _settings.carousel_viewport_size), Image.LANCZOS)
                img.save(str(final_path), "PNG", optimize=True)
                raw_path.unlink(missing_ok=True)

                png_paths.append(str(final_path))
                logger.info("slide_screenshotted", path=str(final_path))

            await browser.close()

    return {
        "slide_png_paths": png_paths,
        "messages": state.get("messages", []) + [f"Screenshotted {len(png_paths)} slides"],
    }
