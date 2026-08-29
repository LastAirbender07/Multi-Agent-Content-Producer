"""
Slide editor service — business logic for the /editor page.

Handles slide preview, editing, AI rewriting, image swap, and new-slide creation.
All rendering goes through the Fabric.js renderer
"""
from __future__ import annotations

import io
import json
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import HTTPException
from PIL import Image as PilImage

from apps.api.v1.schemas import SlideEditRequest, SlideEditResponse
from configs.settings import get_settings
from core.orchestration.contracts import Slide, SlideType
from core.orchestrators.content.renderer import render_slide_fabric
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


def _resolve_image(angle_dir: Path, slide_number: int) -> tuple[str, bool]:
    """Return (image_path_url, has_image) for a slide, using the stored asset."""
    asset = read_image_assets(angle_dir).get(slide_number, {})
    raw_path = asset.get("processed_path") or ""
    if raw_path and asset.get("source") != "colour":
        return static_image_url(raw_path), True
    return "", False


def _fabric_preview_html(slide_data: dict, image_url: str | None) -> str:
    """
    Return a self-contained HTML page that renders the slide via the Fabric renderer.
    """
    slide_json = json.dumps({**slide_data, "image_url": image_url})
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>* {{ margin: 0; padding: 0; }} body {{ width: 1080px; height: 1080px; overflow: hidden; }}</style>
</head>
<body>
  <canvas id="slide" width="1080" height="1080"></canvas>
  <script src="/renderer/fabric.min.js"></script>
  <script src="/renderer/renderer.bundle.js"></script>
  <script>
    (async () => {{
      try {{
        const slide = {slide_json};
        await window.Renderer.render(slide, {{ imageBaseUrl: '' }});
      }} catch(e) {{
        console.error('Preview render failed:', e);
      }}
    }})();
  </script>
</body>
</html>"""


async def _render_and_save_png(
    run_id: str, angle_index: int, slide_number: int,
    slide: Slide, slide_data: dict, slides_raw: list[dict],
    angle_dir: Path, image_path: str, has_image: bool,
) -> str:
    """Re-render a slide via Fabric.js and save to PNG. Returns the png_url."""
    png_dir  = angle_dir / "png"
    png_dir.mkdir(parents=True, exist_ok=True)
    png_path = png_dir / f"slide_{slide_number:02d}.png"

    fabric_image_url: str | None = None
    if has_image and image_path:
        fabric_image_url = image_path if image_path.startswith("/") else f"/{image_path}"

    await render_slide_fabric(
        slide_data=slide_data,
        image_url=fabric_image_url,
        output_path=png_path,
        total_slides=len(slides_raw),
    )
    return f"/outputs/runs/{run_id}/content/angle_{angle_index}/png/{png_path.name}"


# ── Public service functions ──────────────────────────────────────────────────

def get_slide_html_preview(run_id: str, angle_index: int, slide_number: int) -> str:
    """Return an HTML page rendering the slide via the Fabric renderer.
    The editor embeds this in an iframe — same renderer as PNG export, so
    live preview matches the final output exactly."""
    path = slides_json_path(run_id, angle_index)
    slides_raw = read_slides(path)
    slide_data = next((s for s in slides_raw if s["slide_number"] == slide_number), None)
    if slide_data is None:
        raise HTTPException(status_code=404, detail=f"Slide {slide_number} not found")

    angle_dir = _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}"
    image_path, has_image = _resolve_image(angle_dir, slide_number)
    image_url = image_path if has_image else None
    return _fabric_preview_html(slide_data, image_url)


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
    if request.compact_meta is not None:
        slide_data["compact_meta"] = request.compact_meta

    write_slides(path, slides_raw)

    angle_dir = _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}"
    image_path, has_image = _resolve_image(angle_dir, slide_number)
    slide = Slide.model_validate(slide_data)
    png_url = await _render_and_save_png(run_id, angle_index, slide_number, slide, slide_data, slides_raw, angle_dir, image_path, has_image)
    return SlideEditResponse(png_url=png_url, updated_at=datetime.now(timezone.utc).isoformat())


async def bulk_style_slides(
    run_id: str,
    angle_index: int,
    slide_numbers: list[int],
    slide_overrides: dict,
    canvas_template: str | None = None,
) -> dict:
    """Apply style overrides to multiple slides in one operation.

    Reads slides.json once, patches all targets, writes once, then re-renders
    PNGs for each affected slide sequentially.
    Returns {"updated": N, "skipped": M}.
    """
    path = slides_json_path(run_id, angle_index)
    slides_raw = read_slides(path)
    angle_dir = _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}"

    updated = 0
    skipped = 0

    for sn in slide_numbers:
        idx = next((i for i, s in enumerate(slides_raw) if s["slide_number"] == sn), None)
        if idx is None:
            skipped += 1
            continue
        slides_raw[idx]["slide_overrides"] = {
            **slides_raw[idx].get("slide_overrides", {}),
            **slide_overrides,
        }
        if canvas_template is not None:
            slides_raw[idx]["canvas_template"] = canvas_template
        updated += 1

    if updated:
        write_slides(path, slides_raw)
        # Re-render PNGs for affected slides
        for sn in slide_numbers:
            slide_data = next((s for s in slides_raw if s["slide_number"] == sn), None)
            if slide_data is None:
                continue
            try:
                image_path, has_image = _resolve_image(angle_dir, sn)
                slide = Slide.model_validate(slide_data)
                await _render_and_save_png(run_id, angle_index, sn, slide, slide_data, slides_raw, angle_dir, image_path, has_image)
            except Exception:
                pass  # continue rendering remaining slides on failure

    return {"updated": updated, "skipped": skipped}


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
