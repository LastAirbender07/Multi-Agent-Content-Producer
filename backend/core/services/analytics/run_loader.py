"""
run_loader.py — Load all metadata for a single run directory.

Returns a flat dict consumed by aggregator.py. All I/O is here;
no computation beyond what's needed to read the files.
"""

import json
from datetime import datetime
from pathlib import Path

from infra.logging import get_logger

logger = get_logger(__name__)

_CATEGORY_RULES: list[tuple[str, list[str]]] = [
    ("AI & Technology",     ["ai", "gpt", "llm", "machine learning", "neural", "chatgpt", "openai", "anthropic", "claude", "tech", "software", "algorithm", "automation", "robot", "model"]),
    ("Business & Startups", ["startup", "acquisition", "valuation", "funding", "vc", "venture", "saas", "revenue", "business", "enterprise", "salesforce", "microsoft", "google", "apple", "amazon", "company", "ceo", "market"]),
    ("Finance",             ["stock", "market cap", "investment", "crypto", "bitcoin", "eth", "defi", "finance", "economy", "gdp", "inflation", "interest rate", "ipo"]),
    ("Education & Career",  ["mba", "college", "university", "skill", "career", "job", "hire", "interview", "salary", "degree", "course", "learning", "education"]),
    ("Politics & Society",  ["election", "government", "policy", "law", "social", "culture", "india", "usa", "china", "geopolitics", "war", "protest", "rights"]),
    ("Health & Science",    ["health", "medical", "drug", "vaccine", "research", "climate", "space", "nasa", "science", "biology", "cancer", "diet"]),
    ("Content & Media",     ["instagram", "youtube", "podcast", "content", "creator", "influencer", "social media", "viral", "tiktok", "newsletter"]),
]


def _classify(topic: str) -> str:
    lower = topic.lower()
    for category, keywords in _CATEGORY_RULES:
        if any(kw in lower for kw in keywords):
            return category
    return "Other"


def _read_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


# The four canonical hooks the LLM is prompted to use.
_CANONICAL_HOOKS = {"Anger", "Hope", "Curiosity", "FOMO"}

def _normalise_hook(raw: str) -> str:
    """Map verbose LLM hook strings back to one of the 4 canonical values.

    LLM sometimes returns 'Anger - exposing systemic exploitation' instead of
    just 'Anger'. Strip the descriptor and normalise to the canonical word.
    """
    if not raw:
        return "Unknown"
    for canonical in _CANONICAL_HOOKS:
        # Match if the raw string starts with or contains the canonical word
        # followed by whitespace, dash, em-dash, comma, or end-of-string.
        import re
        if re.match(rf"^{canonical}(\s|[-—,]|$)", raw, re.IGNORECASE):
            return canonical
    # Multi-hook strings like "Anger and FOMO" → pick the first match
    for canonical in _CANONICAL_HOOKS:
        if canonical.lower() in raw.lower():
            return canonical
    return "Other"


def _first_pass_passed(data: dict) -> bool | None:
    """Return whether the research quality gate passed on the FIRST iteration.

    The graph always forces at least 2 iterations (loop_count == 0 unconditionally
    refines). iterations[0] records the result of iteration #1 — the first real
    evaluation. If it passed, no refinement was needed; the second loop was forced
    but redundant. If it didn't pass, refinement was genuinely required.

    - iterations[0].evaluation.passed → definitive first-iteration result
    - No iterations list (manual/partial run) → None
    """
    status = data.get("status", "")
    if status in ("manual", "unknown", ""):
        return None

    iters = data.get("iterations") or []
    if iters:
        first_eval = (iters[0] or {}).get("evaluation") or {}
        return first_eval.get("passed")  # True / False / None

    # No iteration history stored (single-pass run that skipped snapshot)
    # Fall back to final result
    return (data.get("evaluation") or {}).get("passed")


def load_run(run_dir: Path) -> dict:
    """Return a metadata dict for one run directory. Never raises."""
    research_path = run_dir / "research" / "research_result.json"
    token_path    = run_dir / "token_usage.json"
    content_dir   = run_dir / "content"

    topic      = ""
    created_at: float = run_dir.stat().st_mtime

    # ── Research quality ──────────────────────────────────────────────────────
    research_quality: dict = {}
    if research_path.exists():
        try:
            data       = _read_json(research_path)
            topic      = data.get("topic", "")
            evaluation = data.get("evaluation") or {}
            synthesis  = data.get("synthesis")  or {}
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
                "evidence_count":         data.get("evidence_count", 0),
                "total_iterations":       data.get("total_iterations", 1),
                # First-pass: did the research gate pass on the very first evaluation?
                # Iterations list records each refinement loop. If the list is empty
                # and total_iterations == 1, it passed first try. If iterations exist,
                # the first entry's evaluation.passed tells us whether it passed then.
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
            "has_blog":     (run_dir / "blog_post.md").exists(),
        }

    return {
        "run_id":              run_dir.name,
        "topic":               topic,
        "category":            _classify(topic) if topic else "Other",
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
