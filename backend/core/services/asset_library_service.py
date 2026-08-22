"""
Asset library service — image library browsing, uploads, deletion, and canvas JSON save/load.

Manages two image storage roots:
  - outputs/runs/{run_id}/content/angle_N/images/  (AI-fetched per run)
  - assets/user_uploads/                           (persistent, cross-run user uploads)
"""
from __future__ import annotations

import base64
import io
import json
import re
import time
from pathlib import Path

from fastapi import HTTPException
from PIL import Image as PilImage

from configs.settings import get_settings
from core.orchestrators.content.renderer import render_from_canvas_json
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[2]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir
_USER_UPLOADS_DIR = _BACKEND_ROOT / "assets" / "user_uploads"

_ALLOWED_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


# ── Image library ──────────────────────────────────────────────────────────────

def get_image_library(run_id: str) -> dict:
    """Return all run images grouped by angle + all persistent user uploads."""
    _USER_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    run_images: dict[str, list[dict]] = {}
    if run_id:
        run_content_dir = _OUTPUTS_ROOT / run_id / "content"
        if run_content_dir.exists():
            for angle_dir in sorted(run_content_dir.iterdir()):
                if not angle_dir.name.startswith("angle_"):
                    continue
                imgs_dir = angle_dir / "images"
                if not imgs_dir.exists():
                    continue
                items = []
                for f in sorted(imgs_dir.iterdir()):
                    if f.suffix.lower() not in _ALLOWED_SUFFIXES:
                        continue
                    items.append({
                        "filename": f.name,
                        "url": f"/outputs/runs/{run_id}/content/{angle_dir.name}/images/{f.name}",
                        "path": f"outputs/runs/{run_id}/content/{angle_dir.name}/images/{f.name}",
                        "slide_number": _slide_number_from_filename(f.name),
                    })
                if items:
                    run_images[angle_dir.name] = items

    user_uploads = []
    for f in sorted(_USER_UPLOADS_DIR.iterdir()):
        if f.suffix.lower() not in _ALLOWED_SUFFIXES:
            continue
        user_uploads.append({
            "filename": f.name,
            "url": f"/assets/user_uploads/{f.name}",
            "path": f"assets/user_uploads/{f.name}",
        })

    return {"run_images": run_images, "user_uploads": user_uploads}


def _slide_number_from_filename(filename: str) -> int | None:
    """Extract slide number from filenames like slide_01.jpg → 1."""
    stem = Path(filename).stem  # "slide_01"
    parts = stem.split("_")
    for part in reversed(parts):
        if part.isdigit():
            return int(part)
    return None


# ── Upload ─────────────────────────────────────────────────────────────────────

def upload_to_library(file_bytes: bytes, filename: str) -> dict:
    """Save uploaded image to persistent user_uploads/ (not tied to any run)."""
    _USER_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    try:
        img = PilImage.open(io.BytesIO(file_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Cannot read image: {exc}")

    dest = _make_unique_path(_USER_UPLOADS_DIR, Path(filename).stem + ".jpg")
    img.save(dest, "JPEG", quality=92)

    logger.info("asset_library.upload", filename=dest.name)
    return {
        "filename": dest.name,
        "url": f"/assets/user_uploads/{dest.name}",
        "path": f"assets/user_uploads/{dest.name}",
    }


def _make_unique_path(directory: Path, filename: str) -> Path:
    """Return a path that doesn't already exist, appending _1, _2 etc. as needed."""
    candidate = directory / filename
    if not candidate.exists():
        return candidate
    stem = Path(filename).stem
    suffix = Path(filename).suffix
    counter = 1
    while True:
        candidate = directory / f"{stem}_{counter}{suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


# ── Delete ─────────────────────────────────────────────────────────────────────

def delete_image(path: str) -> dict:
    """Permanently delete an image from disk. Path must be within allowed roots."""
    resolved = (_BACKEND_ROOT / path.lstrip("/")).resolve()

    allowed_roots = [
        _OUTPUTS_ROOT.resolve(),
        _USER_UPLOADS_DIR.resolve(),
    ]
    if not any(str(resolved).startswith(str(root)) for root in allowed_roots):
        raise HTTPException(
            status_code=400,
            detail="Path is outside allowed roots (outputs/runs/ or assets/user_uploads/)",
        )

    if not resolved.exists():
        raise HTTPException(status_code=404, detail="File not found")

    resolved.unlink()
    logger.info("asset_library.delete", path=path)
    return {"deleted": True}


# ── Canvas JSON save/load ──────────────────────────────────────────────────────

_DATA_URL_RE = re.compile(r"^data:image/(?P<ext>\w+);base64,(?P<data>.+)$", re.DOTALL)


def _persist_inline_images(
    fabric_json: dict,
    images_dir: Path,
    slide_number: int,
    static_url_prefix: str,
) -> dict:
    """Walk fabric_json.objects recursively.  For every image object whose ``src``
    is an inline base64 data URL, decode the bytes, save them as a file inside
    ``images_dir``, and rewrite the ``src`` to the resulting static URL.

    Returns the same ``fabric_json`` (mutated in place) for chaining.
    Non-image objects and http/https srcs are passed through untouched.
    """
    counter = 0

    def walk(objects: list) -> None:
        nonlocal counter
        for obj in objects:
            if not isinstance(obj, dict):
                continue
            src = obj.get("src")
            if isinstance(src, str) and src.startswith("data:image/"):
                m = _DATA_URL_RE.match(src)
                if m:
                    ext = m.group("ext").lower()
                    if ext == "jpeg":
                        ext = "jpg"
                    try:
                        payload = base64.b64decode(m.group("data"))
                    except Exception as exc:  # noqa: BLE001 — malformed base64 shouldn't kill save
                        logger.warning("asset_library.bad_base64", error=str(exc))
                        continue
                    filename = f"slide_{slide_number:02d}_canvas_{counter}.{ext}"
                    dest = images_dir / filename
                    images_dir.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(payload)
                    obj["src"] = f"{static_url_prefix}/{filename}"
                    counter += 1
            nested = obj.get("objects")
            if isinstance(nested, list):
                walk(nested)

    walk(fabric_json.get("objects", []))
    return fabric_json


async def save_canvas(
    run_id: str,
    angle_index: int,
    slide_number: int,
    fabric_json: dict,
) -> dict:
    """Persist the Fabric.js canvas JSON AND re-render the slide PNG.

    Fabric JSON is the canonical source of truth for an edited slide.  This
    function:

    1. Extracts any inline base64 image data (from user uploads) to disk under
       ``images/`` alongside the slide and rewrites the srcs in the JSON to
       relative static URLs.
    2. Writes the (rewritten) canvas JSON to ``canvas_{NN}.json``.
    3. Regenerates ``png/slide_{NN}.png`` via the Fabric renderer bundle by
       calling ``render_from_canvas_json``.
    4. Returns the cache-bust-decorated PNG URL so the frontend can force a
       fresh fetch of the new image.
    """
    angle_dir = _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}"
    if not angle_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Angle {angle_index} not found for run {run_id}",
        )

    # Deep-clone so we never mutate the caller's object
    canvas_data = json.loads(json.dumps(fabric_json))

    images_dir = angle_dir / "images"
    static_url_prefix = f"/outputs/runs/{run_id}/content/angle_{angle_index}/images"
    canvas_data = _persist_inline_images(
        canvas_data, images_dir, slide_number, static_url_prefix
    )

    canvas_path = angle_dir / f"canvas_{slide_number:02d}.json"
    canvas_path.write_text(json.dumps(canvas_data, ensure_ascii=False), encoding="utf-8")

    png_path = angle_dir / "png" / f"slide_{slide_number:02d}.png"
    await render_from_canvas_json(canvas_data, png_path)

    version_query = str(int(time.time() * 1000))
    png_url = (
        f"/outputs/runs/{run_id}/content/angle_{angle_index}/png/"
        f"slide_{slide_number:02d}.png?v={version_query}"
    )

    logger.info(
        "asset_library.save_canvas",
        run_id=run_id, angle=angle_index, slide=slide_number,
        png_url=png_url,
    )

    return {
        "saved": True,
        "png_url": png_url,
        "canvas_json": canvas_data,
        "version_query": version_query,
    }


def load_canvas(run_id: str, angle_index: int, slide_number: int) -> dict | None:
    """Load saved Fabric.js canvas JSON for a slide. Returns None if not yet saved."""
    canvas_path = (
        _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}" / f"canvas_{slide_number:02d}.json"
    )
    if not canvas_path.exists():
        return None
    return json.loads(canvas_path.read_text(encoding="utf-8"))
