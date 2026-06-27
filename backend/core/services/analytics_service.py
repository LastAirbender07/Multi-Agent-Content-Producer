"""
Analytics aggregation service.

Scans all run directories, reads token_usage.json from each,
and builds a structured analytics summary for the /analytics page.

Topic categorisation uses keyword matching — no LLM needed.
"""

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from configs.settings import get_settings
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[2]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir


# ── Topic category classifier ─────────────────────────────────────────────────

_CATEGORY_RULES: list[tuple[str, list[str]]] = [
    ("AI & Technology",     ["ai", "gpt", "llm", "machine learning", "neural", "chatgpt", "openai", "anthropic", "claude", "tech", "software", "algorithm", "automation", "robot", "model"]),
    ("Business & Startups", ["startup", "acquisition", "valuation", "funding", "vc", "venture", "saas", "revenue", "business", "enterprise", "salesforce", "microsoft", "google", "apple", "amazon", "company", "ceo", "market"]),
    ("Finance",             ["stock", "market cap", "investment", "crypto", "bitcoin", "eth", "defi", "finance", "economy", "gdp", "inflation", "interest rate", "ipo"]),
    ("Education & Career",  ["mba", "college", "university", "skill", "career", "job", "hire", "interview", "salary", "degree", "course", "learning", "education"]),
    ("Politics & Society",  ["election", "government", "policy", "law", "social", "culture", "india", "usa", "china", "geopolitics", "war", "protest", "rights"]),
    ("Health & Science",    ["health", "medical", "drug", "vaccine", "research", "climate", "space", "nasa", "science", "biology", "cancer", "diet"]),
    ("Content & Media",     ["instagram", "youtube", "podcast", "content", "creator", "influencer", "social media", "viral", "tiktok", "newsletter"]),
]


def _classify_topic(topic: str) -> str:
    lower = topic.lower()
    for category, keywords in _CATEGORY_RULES:
        if any(kw in lower for kw in keywords):
            return category
    return "Other"


# ── Run metadata loader ───────────────────────────────────────────────────────

def _load_run_meta(run_dir: Path) -> dict | None:
    """Load metadata for a single run. Returns None if essential files are missing."""
    research_path = run_dir / "research" / "research_result.json"
    token_path = run_dir / "token_usage.json"

    topic = ""
    created_at: float = run_dir.stat().st_mtime  # fallback: dir mtime

    if research_path.exists():
        try:
            data = json.loads(research_path.read_text())
            topic = data.get("topic", "")
        except (json.JSONDecodeError, OSError):
            pass

    token_records: list[dict] = []
    if token_path.exists():
        try:
            token_records = json.loads(token_path.read_text())
            if token_records:
                # Use earliest token record timestamp as run creation time
                created_at = min(
                    datetime.fromisoformat(r["timestamp"]).timestamp()
                    for r in token_records if r.get("timestamp")
                ) if any(r.get("timestamp") for r in token_records) else created_at
        except (json.JSONDecodeError, OSError, ValueError):
            pass

    # Count angles processed
    content_dir = run_dir / "content"
    angle_count = len(list(content_dir.glob("angle_*"))) if content_dir.exists() else 0
    slide_count = sum(
        len(list((content_dir / f"angle_{i}" / "png").glob("slide_*.png")))
        for i in range(angle_count)
        if (content_dir / f"angle_{i}" / "png").exists()
    )

    return {
        "run_id": run_dir.name,
        "topic": topic,
        "category": _classify_topic(topic) if topic else "Other",
        "created_at": created_at,
        "slide_count": slide_count,
        "token_records": token_records,
    }


# ── Aggregation ───────────────────────────────────────────────────────────────

def get_analytics_summary() -> dict:
    if not _OUTPUTS_ROOT.exists():
        return _empty_summary()

    runs_meta: list[dict] = []
    for run_dir in _OUTPUTS_ROOT.iterdir():
        if not run_dir.is_dir():
            continue
        meta = _load_run_meta(run_dir)
        if meta:
            runs_meta.append(meta)

    if not runs_meta:
        return _empty_summary()

    runs_meta.sort(key=lambda r: r["created_at"])

    # ── KPI totals ───────────────────────────────────────────────────────────
    total_runs = len(runs_meta)
    total_slides = sum(r["slide_count"] for r in runs_meta)
    all_token_records = [rec for r in runs_meta for rec in r["token_records"]]

    # Runs that have token tracking data
    tracked_runs = [r for r in runs_meta if r["token_records"]]
    untracked_count = total_runs - len(tracked_runs)

    tracked_cost_usd = sum(rec.get("cost_usd", 0) for rec in all_token_records)
    tracked_cost_inr = sum(rec.get("cost_inr", 0) for rec in all_token_records)

    # Average cost per tracked run — used to estimate untracked runs
    avg_tracked_usd = tracked_cost_usd / len(tracked_runs) if tracked_runs else 0.0
    avg_tracked_inr = tracked_cost_inr / len(tracked_runs) if tracked_runs else 0.0

    # Estimated total includes actual + estimated cost for untracked runs
    estimated_usd = avg_tracked_usd * untracked_count
    estimated_inr = avg_tracked_inr * untracked_count

    total_cost_usd = round(tracked_cost_usd + estimated_usd, 4)
    total_cost_inr = round(tracked_cost_inr + estimated_inr, 2)
    avg_cost_usd   = round(total_cost_usd / total_runs, 4) if total_runs else 0.0
    avg_cost_inr   = round(total_cost_inr / total_runs, 2) if total_runs else 0.0

    # ── Per-stage token breakdown ─────────────────────────────────────────────
    by_stage: dict[str, dict] = {}
    for rec in all_token_records:
        s = rec.get("stage", "unknown")
        if s not in by_stage:
            by_stage[s] = {"input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0, "cost_inr": 0.0, "calls": 0}
        by_stage[s]["input_tokens"] += rec.get("input_tokens", 0)
        by_stage[s]["output_tokens"] += rec.get("output_tokens", 0)
        by_stage[s]["cost_usd"]     += rec.get("cost_usd", 0)
        by_stage[s]["cost_inr"]     += rec.get("cost_inr", 0)
        by_stage[s]["calls"]        += 1

    # ── Per-run token series (last 30 runs) ──────────────────────────────────
    recent_runs = runs_meta[-30:]
    token_series = []
    for r in recent_runs:
        recs = r["token_records"]
        run_total = sum(rec.get("input_tokens", 0) + rec.get("output_tokens", 0) for rec in recs)
        run_cost_usd = round(sum(rec.get("cost_usd", 0) for rec in recs), 4)
        run_cost_inr = round(sum(rec.get("cost_inr", 0) for rec in recs), 2)
        by_stage_run: dict[str, int] = {}
        for rec in recs:
            s = rec.get("stage", "unknown")
            by_stage_run[s] = by_stage_run.get(s, 0) + rec.get("input_tokens", 0) + rec.get("output_tokens", 0)
        token_series.append({
            "run_id": r["run_id"][:8],
            "topic": r["topic"][:60] if r["topic"] else "Unknown",
            "total_tokens": run_total,
            "cost_usd": run_cost_usd,
            "cost_inr": run_cost_inr,
            "by_stage": by_stage_run,
        })

    # ── Topic category distribution ──────────────────────────────────────────
    category_counts: dict[str, int] = {}
    for r in runs_meta:
        cat = r["category"]
        category_counts[cat] = category_counts.get(cat, 0) + 1
    topic_distribution = sorted(
        [{"category": k, "count": v} for k, v in category_counts.items()],
        key=lambda x: -x["count"]
    )

    # ── Activity by day (last 90 days) ──────────────────────────────────────
    now = time.time()
    day_counts: dict[str, int] = {}
    for r in runs_meta:
        days_ago = int((now - r["created_at"]) / 86400)
        if days_ago <= 90:
            date_str = datetime.fromtimestamp(r["created_at"], tz=timezone.utc).strftime("%Y-%m-%d")
            day_counts[date_str] = day_counts.get(date_str, 0) + 1
    activity = [{"date": d, "count": c} for d, c in sorted(day_counts.items())]

    # ── Model breakdown ──────────────────────────────────────────────────────
    model_stats: dict[str, dict] = {}
    for rec in all_token_records:
        m = rec.get("model", "unknown")
        if m not in model_stats:
            model_stats[m] = {"cost_usd": 0.0, "cost_inr": 0.0, "calls": 0}
        model_stats[m]["cost_usd"] += rec.get("cost_usd", 0)
        model_stats[m]["cost_inr"] += rec.get("cost_inr", 0)
        model_stats[m]["calls"]    += 1

    return {
        "kpis": {
            "total_runs": total_runs,
            "total_slides": total_slides,
            "total_cost_usd": total_cost_usd,
            "total_cost_inr": total_cost_inr,
            "avg_cost_usd": avg_cost_usd,
            "avg_cost_inr": avg_cost_inr,
            "untracked_runs": untracked_count,
        },
        "token_by_stage": by_stage,
        "token_series": token_series,
        "topic_distribution": topic_distribution,
        "activity": activity,
        "model_breakdown": [
            {"model": m, **v} for m, v in sorted(model_stats.items(), key=lambda x: -x[1]["cost_usd"])
        ],
        "runs_with_token_data": len(tracked_runs),
    }


def _empty_summary() -> dict:
    return {
        "kpis": {"total_runs": 0, "total_slides": 0, "total_cost_usd": 0.0, "total_cost_inr": 0.0, "avg_cost_usd": 0.0, "avg_cost_inr": 0.0, "untracked_runs": 0},
        "token_by_stage": {}, "token_series": [], "topic_distribution": [],
        "activity": [], "model_breakdown": [], "runs_with_token_data": 0,
    }
