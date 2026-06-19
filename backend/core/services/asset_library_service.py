"""
Asset library service — image library browsing, uploads, deletion, and canvas JSON save/load.

Manages two image storage roots:
  - outputs/runs/{run_id}/content/angle_N/images/  (AI-fetched per run)
  - assets/user_uploads/                           (persistent, cross-run user uploads)
"""
from __future__ import annotations

import io
import json
from pathlib import Path

from fastapi import HTTPException
from PIL import Image as PilImage

from configs.settings import get_settings
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

def save_canvas(run_id: str, angle_index: int, slide_number: int, fabric_json: dict) -> dict:
    """Persist the Fabric.js canvas JSON for a slide alongside slides.json."""
    angle_dir = _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}"
    if not angle_dir.exists():
        raise HTTPException(status_code=404, detail=f"Angle {angle_index} not found for run {run_id}")

    canvas_path = angle_dir / f"canvas_{slide_number:02d}.json"
    canvas_path.write_text(json.dumps(fabric_json, ensure_ascii=False), encoding="utf-8")

    logger.info("asset_library.save_canvas", run_id=run_id, angle=angle_index, slide=slide_number)
    return {"saved": True}


def load_canvas(run_id: str, angle_index: int, slide_number: int) -> dict | None:
    """Load saved Fabric.js canvas JSON for a slide. Returns None if not yet saved."""
    canvas_path = (
        _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}" / f"canvas_{slide_number:02d}.json"
    )
    if not canvas_path.exists():
        return None
    return json.loads(canvas_path.read_text(encoding="utf-8"))
