"""
Fabric.js-based slide renderer — renders slides to PNG via a static HTML shell + Playwright.
Replaces the Jinja2+CSS+Playwright pipeline from carousel_generator.py.
"""

from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image
from playwright.async_api import Page, async_playwright

from configs.settings import get_settings
from core.orchestrators.content.render_server import serve_directory
from infra.logging import get_logger

logger   = get_logger(__name__)
_settings = get_settings()

_BACKEND_ROOT  = Path(__file__).parents[3]
_CANVAS_SIZE   = 1080


@dataclass
class SlideRenderTask:
    """One slide to render. image_url is a server-relative path or None."""
    slide_data:  dict
    image_url:   str | None
    output_path: Path
    brand_name:  str = field(default_factory=lambda: _settings.brand_name)


async def _render_one(page: Page, task: SlideRenderTask, asset_base_url: str, total_slides: int) -> None:
    """Render a single slide onto the already-loaded page and save the PNG."""
    task.output_path.parent.mkdir(parents=True, exist_ok=True)

    await page.evaluate(
        """async (args) => {
            await window.Renderer.render(args.slideJson, args.options);
        }""",
        {
            "slideJson": {**task.slide_data, "image_url": task.image_url},
            "options": {
                "imageBaseUrl": asset_base_url,
                "totalSlides":  total_slides,
                "brandName":    task.brand_name,
            },
        },
    )

    raw_path = task.output_path.with_suffix("._raw.png")
    await page.screenshot(path=str(raw_path), full_page=False)

    with Image.open(raw_path) as img:
        img = img.resize((_CANVAS_SIZE, _CANVAS_SIZE), Image.LANCZOS)
        img.save(str(task.output_path), "PNG", optimize=True)
    raw_path.unlink(missing_ok=True)


async def render_slides_fabric(tasks: list[SlideRenderTask]) -> list[str]:
    """
    Render a batch of slides to PNG using Fabric.js via a single shared browser.

    Opens one browser and one static file server for the whole carousel.
    Each slide is rendered sequentially on the same page (no browser restart overhead).

    Args:
        tasks: Ordered list of SlideRenderTask — one per slide in the carousel.

    Returns:
        List of absolute PNG path strings in the same order as tasks.
    """
    if not tasks:
        return []

    total = len(tasks)
    png_paths: list[str] = []

    async with serve_directory(_BACKEND_ROOT) as asset_base_url:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            # device_scale_factor=2 renders at 2160×2160 physical pixels for 2x supersampling.
            # The screenshot is downscaled to 1080×1080 via Pillow.
            page    = await browser.new_page(
                viewport={"width": _CANVAS_SIZE, "height": _CANVAS_SIZE},
                device_scale_factor=2,
            )

            js_errors: list[str] = []
            page.on("console",   lambda m: js_errors.append(m.text()[:120]) if m.type == "error" else None)
            page.on("pageerror", lambda e: js_errors.append(str(e)[:120]))

            # Load the shell once — Renderer.render() reuses it for every slide.
            # serve_directory serves _BACKEND_ROOT, so the shell is at /renderer/slide_render.html
            renderer_url = f"{asset_base_url}/renderer/slide_render.html"
            await page.goto(renderer_url, wait_until="networkidle")

            for i, task in enumerate(tasks):
                slide_num = task.slide_data.get("slide_number", i + 1)
                logger.info("render_slides_fabric_progress", slide=slide_num, total=total)
                await _render_one(page, task, asset_base_url, total)
                png_paths.append(str(task.output_path))
                logger.info("render_slides_fabric_done", path=str(task.output_path))

            await browser.close()

    if js_errors:
        logger.warning("render_slides_fabric_js_errors", count=len(js_errors), first=js_errors[0])

    return png_paths


async def render_slide_fabric(
    slide_data: dict,
    image_url: str | None,
    output_path: Path,
    total_slides: int = 10,
) -> str:
    """
    Render a single slide to PNG. Convenience wrapper around render_slides_fabric().
    Used by slide_editor_service for per-slide re-renders.
    """
    results = await render_slides_fabric([
        SlideRenderTask(slide_data=slide_data, image_url=image_url, output_path=Path(output_path))
    ])
    return results[0]
