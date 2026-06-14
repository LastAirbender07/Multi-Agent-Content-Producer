"""
Run browser service — business logic for listing runs and their file manifests.
"""
import json as _json
from pathlib import Path

from fastapi import HTTPException

from configs.settings import get_settings
from core.persistence.run_repository import read_topic
from core.persistence.slide_repository import read_slides
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[2]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir


def list_runs() -> dict:
    """Return metadata for all pipeline runs, sorted newest first."""
    if not _OUTPUTS_ROOT.exists():
        return {"runs": []}

    runs = []
    for run_dir in _OUTPUTS_ROOT.iterdir():
        if not run_dir.is_dir():
            continue
        rr = run_dir / "research" / "research_result.json"
        topic = "Unknown topic"
        mtime = run_dir.stat().st_mtime
        if rr.exists():
            try:
                data = _json.loads(rr.read_text())
                topic = (data.get("topic") or "")[:80]
                mtime = rr.stat().st_mtime
            except Exception:
                pass
        content_dir = run_dir / "content"
        runs.append({
            "run_id": run_dir.name,
            "topic": topic,
            "created_at": mtime,
            "has_content": content_dir.exists() and any(content_dir.iterdir()),
            "has_blog": (run_dir / "blog_post.md").exists(),
        })

    runs.sort(key=lambda r: r["created_at"], reverse=True)
    return {"runs": runs[:50]}


def get_run_manifest(run_id: str) -> dict:
    """Return the file tree for one run: angles, slide counts, png paths, blog flag."""
    run_dir = _OUTPUTS_ROOT / run_id
    if not run_dir.exists():
        raise HTTPException(status_code=404, detail="Run not found")

    topic = read_topic(run_id)
    angles = []
    content_dir = run_dir / "content"

    if content_dir.exists():
        for angle_dir in sorted(content_dir.iterdir()):
            if not angle_dir.is_dir() or not angle_dir.name.startswith("angle_"):
                continue
            idx = int(angle_dir.name.split("_")[1])
            png_dir = angle_dir / "png"
            png_paths = [
                f"/outputs/runs/{run_id}/content/{angle_dir.name}/png/{p.name}"
                for p in sorted(png_dir.glob("*.png"))
            ] if png_dir.exists() else []

            slide_count = 0
            slides_path = angle_dir / "slides.json"
            if slides_path.exists():
                try:
                    slide_count = len(read_slides(slides_path))
                except Exception:
                    pass

            angles.append({"index": idx, "slide_count": slide_count, "png_paths": png_paths})

    return {
        "run_id": run_id,
        "topic": topic,
        "angles": angles,
        "has_blog": (run_dir / "blog_post.md").exists(),
    }
