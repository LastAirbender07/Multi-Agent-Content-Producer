"""
run_loader.py — Load all metadata for a single run directory.

Returns a flat dict consumed by aggregator.py. All I/O is here;
no computation beyond what's needed to read the files.
"""

import json
import re
from datetime import datetime
from pathlib import Path

from infra.logging import get_logger
from core.orchestration.contracts import ContentCategory, EmotionalHook

logger = get_logger(__name__)

# Derived directly from the enums — stays in sync automatically when new values are added.
_VALID_CATEGORIES = {c.value for c in ContentCategory}
_VALID_HOOKS      = {h.value for h in EmotionalHook}


def _read_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def _normalise_hook(raw: str) -> str:
    """Normalise a hook string to a canonical EmotionalHook value.

    New runs: Pydantic enforces the enum, so raw is already an exact value.
    The prefix/substring fallback paths exist purely as a safety net.
    """
    if not raw:
        return "Other"
    # Exact match first (new runs with enum enforcement)
    if raw in _VALID_HOOKS:
        return raw
    # Prefix match for old verbose strings (e.g. 'Anger - ...')
    for hook in _VALID_HOOKS:
        if re.match(rf"^{hook}(\s|[-—,]|$)", raw, re.IGNORECASE):
            return hook
    # Substring match as last resort
    for hook in _VALID_HOOKS:
        if hook.lower() in raw.lower():
            return hook
    return "Other"


def _first_pass_passed(data: dict) -> bool | None:
    """Return whether the research quality gate passed on the FIRST iteration.

    - iterations[0].evaluation.passed → definitive first-iteration result
    - No iterations list (older schema) → None (unknown, excluded from gate rate)
    """
    status = data.get("status", "")
    if status in ("manual", "unknown", ""):
        return None

    iters = data.get("iterations") or []
    if iters:
        first_eval = (iters[0] or {}).get("evaluation") or {}
        return first_eval.get("passed")  # True / False / None

    # No iteration history stored — we cannot determine first-pass result.
    # Returning None excludes this run from the quality_gate_rate denominator,
    # which is correct: we don't know if it passed on first try.
    return None


def load_run(run_dir: Path) -> dict:
    """Return a metadata dict for one run directory. Never raises."""
    research_path = run_dir / "research" / "research_result.json"
    token_path    = run_dir / "token_usage.json"
    content_dir   = run_dir / "content"

    topic      = ""
    created_at: float = run_dir.stat().st_mtime

    # ── Research quality ──────────────────────────────────────────────────────
    research_quality: dict = {}
    categories: list[str] = []
    if research_path.exists():
        try:
            data       = _read_json(research_path)
            topic      = data.get("topic", "")
            evaluation = data.get("evaluation") or {}
            synthesis  = data.get("synthesis")  or {}

            # LLM-assigned categories from synthesis (all runs backfilled via backfill_categories.py)
            raw_cats = synthesis.get("categories") or []
            categories = [c for c in raw_cats if c in _VALID_CATEGORIES] or ["Other"]

            research_quality = {
                "combined_confidence":    evaluation.get("combined_confidence"),
                "llm_content_score":      evaluation.get("llm_content_score"),
                "source_diversity_score": evaluation.get("source_diversity_score"),
                "source_count":           evaluation.get("source_count", 0),
                "passed":                 evaluation.get("passed"),
                "status":                 data.get("status"),
                "key_points_count":       len(synthesis.get("key_points", [])),
                "gaps_count":             len(synthesis.get("gaps", [])),
                "contradictions_count":   len(synthesis.get("contradictions", [])),
                "evidence_count":         data.get("evidence_count") or len(data.get("evidence", [])),
                "total_iterations":       data.get("total_iterations", 1),
                "first_pass": _first_pass_passed(data),
            }
        except (json.JSONDecodeError, OSError, AttributeError):
            pass

    # ── Token records ─────────────────────────────────────────────────────────
    token_records: list[dict] = []
    if token_path.exists():
        try:
            raw = _read_json(token_path)
            token_records = raw if isinstance(raw, list) else []
            if token_records:
                timestamps = [r["timestamp"] for r in token_records if r.get("timestamp")]
                if timestamps:
                    created_at = min(datetime.fromisoformat(ts).timestamp() for ts in timestamps)
        except (json.JSONDecodeError, OSError, ValueError):
            pass

    # ── Content dir scanning ──────────────────────────────────────────────────
    angle_dirs = sorted(content_dir.glob("angle_*")) if content_dir.exists() else []
    angle_count = len(angle_dirs)

    slide_count      = 0
    hook_counts:         dict[str, int] = {}
    slide_type_counts:   dict[str, int] = {}
    image_source_counts: dict[str, int] = {}

    for angle in angle_dirs:
        # PNG count
        png_dir = angle / "png"
        if png_dir.exists():
            slide_count += len(list(png_dir.glob("slide_*.png")))

        # Slides.json → type distribution
        slides_path = angle / "slides.json"
        if slides_path.exists():
            try:
                raw    = _read_json(slides_path)
                # Handle both flat list and {"slides": [...]} wrapper
                slides = raw if isinstance(raw, list) else raw.get("slides", [])
                for s in (slides or []):
                    t = s.get("type", "unknown")
                    slide_type_counts[t] = slide_type_counts.get(t, 0) + 1
            except (json.JSONDecodeError, OSError, AttributeError):
                pass

        # Image assets → source distribution
        assets_path = angle / "image_assets.json"
        if assets_path.exists():
            try:
                raw    = _read_json(assets_path)
                # Handle both flat list and {"image_assets": [...]} wrapper
                assets = raw if isinstance(raw, list) else raw.get("image_assets", [])
                for a in (assets or []):
                    src = a.get("source", "unknown")
                    image_source_counts[src] = image_source_counts.get(src, 0) + 1
            except (json.JSONDecodeError, OSError, AttributeError):
                pass

    # ── Emotional hooks from angles/selection.json ────────────────────────────
    selection_path = run_dir / "angles" / "selection.json"
    if selection_path.exists():
        try:
            sel = _read_json(selection_path)
            for angle in (sel.get("selected_angles") or []):
                hook = _normalise_hook(angle.get("emotional_hook", "Unknown"))
                hook_counts[hook] = hook_counts.get(hook, 0) + 1
        except (json.JSONDecodeError, OSError, AttributeError):
            pass

    # ── Publish readiness ─────────────────────────────────────────────────────
    readiness: dict[str, bool] = {}
    if content_dir.exists():
        angles = list(content_dir.glob("angle_*"))
        # Blog is written at run_dir/blog_post.md (not inside content/)
        readiness = {
            "has_slides":   any(list((a / "png").glob("slide_*.png")) for a in angles),
            "has_images":   any((a / "image_assets.json").exists() for a in angles),
            "has_captions": any((a / "carousel.json").exists() for a in angles),
            "has_blog":     (run_dir / "blog" / "blog_post.md").exists(),
        }

    return {
        "run_id":              run_dir.name,
        "topic":               topic,
        "categories":          categories or ["Other"],
        "created_at":          created_at,
        "slide_count":         slide_count,
        "angle_count":         angle_count,
        "token_records":       token_records,
        "research_quality":    research_quality,
        "hook_counts":         hook_counts,
        "slide_type_counts":   slide_type_counts,
        "image_source_counts": image_source_counts,
        "readiness":           readiness,
    }
