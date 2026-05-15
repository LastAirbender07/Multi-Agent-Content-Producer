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
    content_idx = 0  # cycles layout variants (0=lr, 1=text-top, 2=image-top) for content slides

    for slide in slides:
        asset = image_assets.get(slide.slide_number, {})
        image_path = asset.get("processed_path") or ""
        has_image = bool(image_path) and asset.get("source") != "colour"

        if image_path:
            image_path = "/" + str(
                Path(image_path).relative_to(_BACKEND_ROOT)
            ).replace("\\", "/")

        if slide.type.value == "content":
            layout_variant = content_idx % 3
            content_idx += 1
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
            brand_name="",
            logo_path="",
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
                viewport={"width": 1080, "height": 1080},
                device_scale_factor=2,
            )
            page = await context.new_page()

            for html_path in html_paths:
                rel = Path(html_path).relative_to(_BACKEND_ROOT)
                url = f"{base_url}/{str(rel).replace(chr(92), '/')}"

                await page.goto(url, wait_until="networkidle")
                await page.evaluate("document.fonts.ready")
                # Chart.js writes to canvas synchronously but needs a small buffer
                # for raster flushing before Playwright captures the screenshot
                await page.wait_for_timeout(300)

                raw_path = output_dir / (Path(html_path).stem + "_raw.png")
                await page.screenshot(path=str(raw_path), full_page=False)

                final_path = output_dir / (Path(html_path).stem.replace("_raw", "") + ".png")
                img = Image.open(raw_path)
                img = img.resize((1080, 1080), Image.LANCZOS)
                img.save(str(final_path), "PNG", optimize=True)
                raw_path.unlink(missing_ok=True)

                png_paths.append(str(final_path))
                logger.info("slide_screenshotted", path=str(final_path))

            await browser.close()

    return {
        "slide_png_paths": png_paths,
        "messages": state.get("messages", []) + [f"Screenshotted {len(png_paths)} slides"],
    }
