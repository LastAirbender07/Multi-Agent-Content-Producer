"""
Slide editor service — business logic for the /editor page.

Handles slide preview, editing, AI rewriting, image swap, and new-slide creation.
All Jinja2 rendering and Playwright screenshotting is centralised here.
"""
from __future__ import annotations

import io
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import HTTPException
from jinja2 import Environment, FileSystemLoader
from PIL import Image as PilImage

from apps.api.v1.schemas import SlideEditRequest, SlideEditResponse
from configs.settings import get_settings
from core.orchestration.contracts import Slide, SlideType
from core.orchestrators.content.carousel_generator import (
    render_and_screenshot_single_slide,
    _TEMPLATES_ROOT,
)
from core.orchestrators.content.image_fetcher import fetch_and_download_single_image
from core.persistence.run_repository import read_topic, static_image_url
from core.persistence.slide_repository import (
    read_image_assets, read_slides, slides_json_path,
    write_image_assets, write_slides,
)
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[2]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir

# One Jinja2 Environment per theme — loaded once, reused for all requests
_ENVS: dict[str, Environment] = {}

# Click-detection script embedded into every slide preview HTML.
# Sends postMessage to parent window when user clicks a text or image element.
_CLICK_LISTENER_SCRIPT = """
<script>
window.addEventListener('DOMContentLoaded', function() {
  var TARGETS = [
    {sel: '.hook-headline,.slide-title', field: 'title'},
    {sel: '.hook-sub,.slide-body', field: 'body'},
    {sel: '.bullet-text', field: 'bullet'},
    {sel: '.bg-image,.image-card,.image-panel img', field: 'image'},
  ];
  TARGETS.forEach(function(t) {
    document.querySelectorAll(t.sel).forEach(function(el) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', function(ev) {
        ev.stopPropagation();
        window.parent.postMessage({type: 'SLIDE_ELEMENT_CLICK', field: t.field}, '*');
      });
    });
  });
});
</script>
"""


def _jinja_env(theme: str) -> Environment:
    """Return (and cache) a Jinja2 Environment for the given carousel theme."""
    if theme not in _ENVS:
        _ENVS[theme] = Environment(
            loader=FileSystemLoader(str(_TEMPLATES_ROOT / theme))
        )
    return _ENVS[theme]


def _resolve_image(angle_dir: Path, slide_number: int) -> tuple[str, bool]:
    """Return (image_path_url, has_image) for a slide, using the stored asset."""
    asset = read_image_assets(angle_dir).get(slide_number, {})
    raw_path = asset.get("processed_path") or ""
    if raw_path and asset.get("source") != "colour":
        return static_image_url(raw_path), True
    return "", False


def _render_slide_html(
    slide: Slide,
    slide_data: dict,
    slides_raw: list[dict],
    angle_dir: Path,
    slide_number: int,
    image_path: str = "",
    has_image: bool = False,
) -> str:
    """Render one slide to HTML using the correct Jinja2 template."""
    theme = slide_data.get("_theme", "aurora")
    template_name = theme if theme in ("aurora", "lumina") else "aurora"
    tpl = _jinja_env(template_name).get_template(f"{slide.type.value}.html.j2")
    return tpl.render(
        slide=slide,
        image_path=image_path,
        has_image=has_image,
        slide_number=slide_number,
        total_slides=len(slides_raw),
        template=template_name,
        brand_name=_settings.brand_name,
        logo_path=f"/{_settings.brand_logo_path}",
        assets_root="/assets",
        layout_variant=0,
    )


async def _render_and_save_png(
    run_id: str, angle_index: int, slide_number: int,
    slide: Slide, slide_data: dict, slides_raw: list[dict],
    angle_dir: Path, image_path: str, has_image: bool,
) -> str:
    """Re-render HTML for a slide, write it to disk, screenshot to PNG. Returns png_url."""
    html = _render_slide_html(slide, slide_data, slides_raw, angle_dir, slide_number, image_path, has_image)

    html_path = angle_dir / "slides" / f"slide_{slide_number:02d}.html"
    html_path.parent.mkdir(parents=True, exist_ok=True)
    html_path.write_text(html, encoding="utf-8")

    png_dir = angle_dir / "png"
    png_dir.mkdir(parents=True, exist_ok=True)
    png_path = png_dir / f"slide_{slide_number:02d}.png"
    await render_and_screenshot_single_slide(str(html_path), str(png_path), _BACKEND_ROOT)

    return f"/outputs/runs/{run_id}/content/angle_{angle_index}/png/{png_path.name}"


# ── Public service functions ──────────────────────────────────────────────────

def get_slide_html_preview(run_id: str, angle_index: int, slide_number: int) -> str:
    """Render one slide to HTML for the editor live preview iframe.
    The returned HTML includes a postMessage click-detection script so the parent
    page knows which element the user clicked on."""
    path = slides_json_path(run_id, angle_index)
    slides_raw = read_slides(path)
    slide_data = next((s for s in slides_raw if s["slide_number"] == slide_number), None)
    if slide_data is None:
        raise HTTPException(status_code=404, detail=f"Slide {slide_number} not found")

    slide = Slide.model_validate(slide_data)
    angle_dir = _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}"
    image_path, has_image = _resolve_image(angle_dir, slide_number)
    html = _render_slide_html(slide, slide_data, slides_raw, angle_dir, slide_number, image_path, has_image)
    # Inject the click-detection script before </body>
    return html.replace("</body>", _CLICK_LISTENER_SCRIPT + "</body>")


async def edit_slide(
    run_id: str, angle_index: int, slide_number: int, request: SlideEditRequest
) -> SlideEditResponse:
    """Patch slide fields, re-render HTML, re-screenshot PNG."""
    path = slides_json_path(run_id, angle_index)
    slides_raw = read_slides(path)

    idx = next((i for i, s in enumerate(slides_raw) if s["slide_number"] == slide_number), None)
    if idx is None:
        raise HTTPException(status_code=404, detail=f"Slide {slide_number} not found")

    slide_data = slides_raw[idx]
    if request.title is not None:       slide_data["title"] = request.title
    if request.body is not None:        slide_data["body"] = request.body
    if request.bullets is not None:     slide_data["bullets"] = request.bullets
    if request.stat_value is not None:  slide_data["stat_value"] = request.stat_value
    if request.stat_label is not None:  slide_data["stat_label"] = request.stat_label
    if request.chart_data is not None:  slide_data["chart_data"] = request.chart_data
    if request.chart_type is not None:  slide_data["chart_type"] = request.chart_type
    if request.slide_overrides is not None:
        slide_data["slide_overrides"] = {**slide_data.get("slide_overrides", {}), **request.slide_overrides}
    if request.template_type is not None:
        try:
            slide_data["type"] = SlideType(request.template_type).value
        except ValueError:
            pass
    if request.theme is not None:
        slide_data["_theme"] = request.theme
    if request.canvas_template is not None:
        slide_data["canvas_template"] = request.canvas_template

    write_slides(path, slides_raw)

    angle_dir = _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}"
    image_path, has_image = _resolve_image(angle_dir, slide_number)
    slide = Slide.model_validate(slide_data)
    png_url = await _render_and_save_png(run_id, angle_index, slide_number, slide, slide_data, slides_raw, angle_dir, image_path, has_image)
    return SlideEditResponse(png_url=png_url, updated_at=datetime.now(timezone.utc).isoformat())


async def ai_rewrite_slide(run_id: str, angle_index: int, slide_number: int, feedback: str) -> dict:
    """Rewrite slide content via LLM, persist updated slide."""
    from core.orchestrators.content.slide_validator import _regen_single_slide

    path = slides_json_path(run_id, angle_index)
    slides_raw = read_slides(path)

    idx = next((i for i, s in enumerate(slides_raw) if s["slide_number"] == slide_number), None)
    if idx is None:
        raise HTTPException(status_code=404, detail=f"Slide {slide_number} not found")

    prev_slide = slides_raw[idx - 1] if idx > 0 else None
    next_slide = slides_raw[idx + 1] if idx < len(slides_raw) - 1 else None
    topic = read_topic(run_id)

    updated = await _regen_single_slide(
        slide=slides_raw[idx],
        prev_slide=prev_slide,
        next_slide=next_slide,
        topic=topic,
        feedback=feedback,
    )
    slides_raw[idx] = updated
    write_slides(path, slides_raw)
    return {"slide": updated, "message": "Rewritten successfully"}


async def swap_slide_image(run_id: str, angle_index: int, slide_number: int, query: str, source: str) -> dict:
    """Fetch a new image, update assets, re-render and re-screenshot."""
    angle_dir = _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}"
    dest = angle_dir / "images" / f"slide_{slide_number:02d}.jpg"
    dest.parent.mkdir(parents=True, exist_ok=True)

    ok = await fetch_and_download_single_image(query, source, dest)
    if not ok:
        raise HTTPException(status_code=502, detail="Could not fetch an image for this query")

    existing_assets = read_image_assets(angle_dir)
    existing_assets[slide_number] = {
        "slide_number": slide_number,
        "source": source,
        "original_url": None,
        "local_raw_path": str(dest),
        "processed_path": str(dest),
    }
    write_image_assets(angle_dir, existing_assets)

    path = slides_json_path(run_id, angle_index)
    slides_raw = read_slides(path)
    slide_data = next((s for s in slides_raw if s["slide_number"] == slide_number), None)
    if slide_data is None:
        raise HTTPException(status_code=404, detail="Slide not found")

    slide = Slide.model_validate(slide_data)
    image_path = static_image_url(str(dest))
    png_url = await _render_and_save_png(run_id, angle_index, slide_number, slide, slide_data, slides_raw, angle_dir, image_path, True)
    return {"png_url": png_url}


def create_slide(run_id: str, angle_index: int, slide_type: str, theme: str) -> dict:
    """Append a blank slide to slides.json and return it."""
    try:
        SlideType(slide_type)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid slide type: {slide_type}")

    slides_path = _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}" / "slides.json"
    slides_raw = read_slides(slides_path) if slides_path.exists() else []
    new_num = max((s["slide_number"] for s in slides_raw), default=0) + 1
    new_slide_data = {
        "slide_number": new_num,
        "type": slide_type,
        "title": "New Slide",
        "body": "Add your content here.",
        "bullets": [],
        "slide_overrides": {},
        "_theme": theme,
    }
    slides_raw.append(new_slide_data)
    write_slides(slides_path, slides_raw)
    return {"slide": new_slide_data}


async def upload_image(
    run_id: str, angle_index: int, slide_number: int,
    file_bytes: bytes, filename: str,
) -> dict:
    """Save an uploaded image file to the slide's image slot, then re-render and screenshot."""
    angle_dir = _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}"
    dest = angle_dir / "images" / f"slide_{slide_number:02d}.jpg"
    dest.parent.mkdir(parents=True, exist_ok=True)

    # Convert to JPG (handles PNG, WEBP, etc.)
    try:
        img = PilImage.open(io.BytesIO(file_bytes)).convert("RGB")
        img.save(str(dest), "JPEG", quality=90, optimize=True)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid image file: {e}")

    # Update image_assets.json
    existing_assets = read_image_assets(angle_dir)
    existing_assets[slide_number] = {
        "slide_number": slide_number,
        "source": "upload",
        "original_url": None,
        "local_raw_path": str(dest),
        "processed_path": str(dest),
    }
    write_image_assets(angle_dir, existing_assets)

    # Re-render slide + screenshot PNG
    path = slides_json_path(run_id, angle_index)
    slides_raw = read_slides(path)
    slide_data = next((s for s in slides_raw if s["slide_number"] == slide_number), None)
    if slide_data is None:
        raise HTTPException(status_code=404, detail="Slide not found")

    slide = Slide.model_validate(slide_data)
    image_path = static_image_url(str(dest))
    png_url = await _render_and_save_png(
        run_id, angle_index, slide_number, slide, slide_data, slides_raw, angle_dir, image_path, True
    )
    return {"png_url": png_url}


async def swap_image_url(
    run_id: str, angle_index: int, slide_number: int, url: str,
) -> dict:
    """Download an image from a URL, save it as the slide image, re-render and screenshot."""
    angle_dir = _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}"
    dest = angle_dir / "images" / f"slide_{slide_number:02d}.jpg"
    dest.parent.mkdir(parents=True, exist_ok=True)

    # Download from URL
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
        content_type = resp.headers.get("content-type", "")
        if not content_type.startswith("image/"):
            raise HTTPException(status_code=422, detail=f"URL does not point to an image (content-type: {content_type})")
        file_bytes = resp.content
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to download image from URL: {e}")

    # Convert + save as JPG
    try:
        img = PilImage.open(io.BytesIO(file_bytes)).convert("RGB")
        img.save(str(dest), "JPEG", quality=90, optimize=True)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not process downloaded image: {e}")

    # Update image_assets.json
    existing_assets = read_image_assets(angle_dir)
    existing_assets[slide_number] = {
        "slide_number": slide_number,
        "source": "url",
        "original_url": url,
        "local_raw_path": str(dest),
        "processed_path": str(dest),
    }
    write_image_assets(angle_dir, existing_assets)

    # Re-render + screenshot
    path = slides_json_path(run_id, angle_index)
    slides_raw = read_slides(path)
    slide_data = next((s for s in slides_raw if s["slide_number"] == slide_number), None)
    if slide_data is None:
        raise HTTPException(status_code=404, detail="Slide not found")

    slide = Slide.model_validate(slide_data)
    image_path = static_image_url(str(dest))
    png_url = await _render_and_save_png(
        run_id, angle_index, slide_number, slide, slide_data, slides_raw, angle_dir, image_path, True
    )
    return {"png_url": png_url}
