"""
Persistence layer for slide and image asset data.

Handles reading/writing slides.json and image_assets.json, both of which
may be either a flat list or a wrapper dict from older pipeline versions.
"""
import json as _json
from pathlib import Path

from fastapi import HTTPException

from configs.settings import get_settings

_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[2]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir


# ── Slides ────────────────────────────────────────────────────────────────────

def slides_json_path(run_id: str, angle_index: int) -> Path:
    """Return the path to slides.json, raising 404 if missing."""
    p = _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}" / "slides.json"
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"Slides not found for angle {angle_index}")
    return p


def read_slides(path: Path) -> list[dict]:
    """Read slides.json — handles both flat list and {"slides": [...]} wrapper format."""
    data = _json.loads(path.read_text())
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "slides" in data:
        return data["slides"]
    raise HTTPException(status_code=500, detail="Unexpected slides.json format")


def write_slides(path: Path, slides: list[dict]) -> None:
    """Write slides back, preserving the wrapper dict if one existed."""
    data = _json.loads(path.read_text())
    if isinstance(data, dict):
        data["slides"] = slides
        path.write_text(_json.dumps(data, indent=2), encoding="utf-8")
    else:
        path.write_text(_json.dumps(slides, indent=2), encoding="utf-8")


# ── Image assets ──────────────────────────────────────────────────────────────

def read_image_assets(angle_dir: Path) -> dict[int, dict]:
    """Read image_assets.json keyed by slide_number. Handles flat/wrapped formats."""
    p = angle_dir / "image_assets.json"
    if not p.exists():
        return {}
    data = _json.loads(p.read_text())
    if isinstance(data, list):
        assets = data
    elif isinstance(data, dict) and "image_assets" in data:
        assets = data["image_assets"]
    else:
        return {}
    return {a["slide_number"]: a for a in assets}


def write_image_assets(angle_dir: Path, assets: dict[int, dict]) -> None:
    """Write image_assets.json, preserving existing wrapper format."""
    p = angle_dir / "image_assets.json"
    asset_list = list(assets.values())
    if p.exists():
        raw = _json.loads(p.read_text())
        if isinstance(raw, dict):
            raw["image_assets"] = asset_list
            p.write_text(_json.dumps(raw, indent=2), encoding="utf-8")
            return
    p.write_text(_json.dumps(asset_list, indent=2), encoding="utf-8")
