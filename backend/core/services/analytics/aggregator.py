"""
aggregator.py — Pure computation: takes a list of run dicts (from run_loader)
and returns the full analytics summary dict. No filesystem I/O here.
"""

import time as _time
from collections import defaultdict
from datetime import datetime, timezone


def compute(runs_meta: list[dict]) -> dict:
    """Aggregate all run metadata into the analytics summary payload."""
    if not runs_meta:
        return _empty()

    runs_meta = sorted(runs_meta, key=lambda r: r["created_at"])

    # ── KPI totals ────────────────────────────────────────────────────────────
    total_runs   = len(runs_meta)
    total_slides = sum(r["slide_count"] for r in runs_meta)
    all_records  = [rec for r in runs_meta for rec in r["token_records"]]

    tracked_runs    = [r for r in runs_meta if r["token_records"]]
    untracked_count = total_runs - len(tracked_runs)

    tracked_usd = sum(rec.get("cost_usd", 0) for rec in all_records)
    tracked_inr = sum(rec.get("cost_inr", 0) for rec in all_records)
    avg_usd     = tracked_usd / len(tracked_runs) if tracked_runs else 0.0
    avg_inr     = tracked_inr / len(tracked_runs) if tracked_runs else 0.0

    total_cost_usd = round(tracked_usd + avg_usd * untracked_count, 4)
    total_cost_inr = round(tracked_inr + avg_inr * untracked_count, 2)
    avg_cost_usd   = round(total_cost_usd / total_runs, 4) if total_runs else 0.0
    avg_cost_inr   = round(total_cost_inr / total_runs, 2) if total_runs else 0.0

    # ── Per-stage token breakdown ─────────────────────────────────────────────
    by_stage: dict[str, dict] = {}
    for rec in all_records:
        s = rec.get("stage", "unknown")
        if s not in by_stage:
            by_stage[s] = {"input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0, "cost_inr": 0.0, "calls": 0}
        by_stage[s]["input_tokens"]  += rec.get("input_tokens", 0)
        by_stage[s]["output_tokens"] += rec.get("output_tokens", 0)
        by_stage[s]["cost_usd"]      += rec.get("cost_usd", 0)
        by_stage[s]["cost_inr"]      += rec.get("cost_inr", 0)
        by_stage[s]["calls"]         += 1

    # ── Stage latency from token timestamps ───────────────────────────────────
    stage_dur: dict[str, list[float]] = defaultdict(list)
    for r in runs_meta:
        per: dict[str, list[float]] = defaultdict(list)
        for rec in r["token_records"]:
            ts    = rec.get("timestamp")
            stage = rec.get("stage")
            if ts and stage:
                try:
                    per[stage].append(datetime.fromisoformat(ts).timestamp())
                except ValueError:
                    pass
        for stage, ts_list in per.items():
            if len(ts_list) >= 2:
                stage_dur[stage].append(max(ts_list) - min(ts_list))

    stage_latency = {
        s: {"avg_s": round(sum(d) / len(d), 1), "min_s": round(min(d), 1), "max_s": round(max(d), 1), "samples": len(d)}
        for s, d in stage_dur.items() if d
    }

    # ── Research quality ──────────────────────────────────────────────────────
    q_runs = [r for r in runs_meta if r.get("research_quality", {}).get("combined_confidence") is not None]

    avg_conf     = round(sum(r["research_quality"]["combined_confidence"] for r in q_runs) / len(q_runs), 4) if q_runs else None
    # Quality gate rate = fraction that PASSED ON THE FIRST ATTEMPT (no refinement needed)
    first_pass_runs = [r for r in q_runs if r["research_quality"].get("first_pass") is not None]
    gate_passed  = sum(1 for r in first_pass_runs if r["research_quality"]["first_pass"] is True)
    gate_rate    = round(gate_passed / len(first_pass_runs), 4) if first_pass_runs else None

    status_counts: dict[str, int] = {"success": 0, "partial_success": 0, "failed": 0, "unknown": 0}
    for r in runs_meta:
        s = r.get("research_quality", {}).get("status") or "unknown"
        status_counts[s] = status_counts.get(s, 0) + 1

    depth = [r for r in q_runs if r["research_quality"].get("evidence_count", 0) > 0]
    avg_ev  = round(sum(r["research_quality"]["evidence_count"]  for r in depth) / len(depth), 1) if depth else 0.0
    avg_kp  = round(sum(r["research_quality"]["key_points_count"] for r in depth) / len(depth), 1) if depth else 0.0
    avg_gp  = round(sum(r["research_quality"]["gaps_count"]        for r in depth) / len(depth), 1) if depth else 0.0
    avg_it  = round(sum(r["research_quality"]["total_iterations"]  for r in depth) / len(depth), 2) if depth else 0.0

    confidence_dist = sorted([
        {
            "run_id":     r["run_id"][:8],
            "topic":      (r["topic"] or "Unknown")[:50],
            "confidence": round(r["research_quality"]["combined_confidence"], 3),
            "passed":     r["research_quality"].get("passed", False),
            "evidence":   r["research_quality"].get("evidence_count", 0),
            "cost_usd":   round(sum(rec.get("cost_usd", 0) for rec in r["token_records"]), 4),
            "slides":     r["slide_count"],
        }
        for r in q_runs
    ], key=lambda x: x["confidence"], reverse=True)

    # ── Category × confidence ─────────────────────────────────────────────────
    cat_qual: dict[str, list[float]] = {}
    for r in runs_meta:
        c = r.get("research_quality", {}).get("combined_confidence")
        if c is not None:
            cat_qual.setdefault(r["category"], []).append(c)

    category_confidence = sorted([
        {"category": cat, "avg_confidence": round(sum(v) / len(v), 3), "run_count": len(v)}
        for cat, v in cat_qual.items()
    ], key=lambda x: -x["avg_confidence"])

    # ── Hook / slide-type / image-source distributions ────────────────────────
    hooks:  dict[str, int] = {}
    stypes: dict[str, int] = {}
    srcs:   dict[str, int] = {}
    for r in runs_meta:
        for k, v in r.get("hook_counts", {}).items():         hooks[k]  = hooks.get(k, 0)  + v
        for k, v in r.get("slide_type_counts", {}).items():   stypes[k] = stypes.get(k, 0) + v
        for k, v in r.get("image_source_counts", {}).items(): srcs[k]   = srcs.get(k, 0)   + v

    def _sort(d: dict, key_name: str, cap: int | None = None) -> list[dict]:
        """Sort descending. If cap is set, keep items until count drops below the
        cap-th item's count — i.e., don't show a long tail of count=1 entries."""
        items = sorted([{key_name: k, "count": v} for k, v in d.items()], key=lambda x: -x["count"])
        if cap and len(items) > cap:
            # Keep all items that share the same count as the cap-th item
            cutoff_count = items[cap - 1]["count"]
            items = [i for i in items if i["count"] >= cutoff_count]
        return items

    # ── Blog count — scan ALL runs, not just last 10 ─────────────────────────
    blog_count = sum(1 for r in runs_meta if r.get("readiness", {}).get("has_blog", False))

    # ── Publish readiness table — last 10 runs for detail view ───────────────
    run_readiness = [
        {
            "run_id":       r["run_id"][:8],
            "topic":        (r["topic"] or "Unknown")[:50],
            "has_slides":   r.get("readiness", {}).get("has_slides", False),
            "has_images":   r.get("readiness", {}).get("has_images", False),
            "has_captions": r.get("readiness", {}).get("has_captions", False),
            "has_blog":     r.get("readiness", {}).get("has_blog", False),
        }
        for r in runs_meta[-10:]
    ]

    # ── Token series (last 30) ────────────────────────────────────────────────
    token_series = []
    for r in runs_meta[-30:]:
        recs = r["token_records"]
        by_s: dict[str, int] = {}
        for rec in recs:
            s = rec.get("stage", "unknown")
            by_s[s] = by_s.get(s, 0) + rec.get("input_tokens", 0) + rec.get("output_tokens", 0)
        token_series.append({
            "run_id":       r["run_id"][:8],
            "topic":        (r["topic"] or "Unknown")[:60],
            "total_tokens": sum(rec.get("input_tokens", 0) + rec.get("output_tokens", 0) for rec in recs),
            "cost_usd":     round(sum(rec.get("cost_usd", 0) for rec in recs), 4),
            "cost_inr":     round(sum(rec.get("cost_inr", 0) for rec in recs), 2),
            "by_stage":     by_s,
        })

    # ── Topic distribution ────────────────────────────────────────────────────
    cat_counts: dict[str, int] = {}
    for r in runs_meta:
        cat_counts[r["category"]] = cat_counts.get(r["category"], 0) + 1
    topic_dist = sorted([{"category": k, "count": v} for k, v in cat_counts.items()], key=lambda x: -x["count"])

    # ── Activity (last 90 days) ───────────────────────────────────────────────
    now_ts = _time.time()
    day_counts: dict[str, int] = {}
    for r in runs_meta:
        if int((now_ts - r["created_at"]) / 86400) <= 90:
            d = datetime.fromtimestamp(r["created_at"], tz=timezone.utc).strftime("%Y-%m-%d")
            day_counts[d] = day_counts.get(d, 0) + 1
    activity = [{"date": d, "count": c} for d, c in sorted(day_counts.items())]

    # ── Model breakdown ───────────────────────────────────────────────────────
    model_stats: dict[str, dict] = {}
    for rec in all_records:
        m = rec.get("model", "unknown")
        if m not in model_stats:
            model_stats[m] = {"cost_usd": 0.0, "cost_inr": 0.0, "calls": 0}
        model_stats[m]["cost_usd"] += rec.get("cost_usd", 0)
        model_stats[m]["cost_inr"] += rec.get("cost_inr", 0)
        model_stats[m]["calls"]    += 1

    return {
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "kpis": {
            "total_runs": total_runs, "total_slides": total_slides,
            "total_cost_usd": total_cost_usd, "total_cost_inr": total_cost_inr,
            "avg_cost_usd": avg_cost_usd, "avg_cost_inr": avg_cost_inr,
            "untracked_runs": untracked_count,
        },
        "token_by_stage":   by_stage,
        "token_series":     token_series,
        "topic_distribution": topic_dist,
        "activity":         activity,
        "model_breakdown":  [{"model": m, **v} for m, v in sorted(model_stats.items(), key=lambda x: -x[1]["cost_usd"])],
        "runs_with_token_data": len(tracked_runs),
        "stage_latency":      stage_latency,
        "research_quality": {
            "avg_confidence": avg_conf, "quality_gate_rate": gate_rate,
            "quality_gate_passed": gate_passed, "runs_with_quality_data": len(q_runs),
            "distribution": confidence_dist, "run_status_counts": status_counts,
            "avg_evidence_count": avg_ev, "avg_key_points": avg_kp,
            "avg_gaps_found": avg_gp, "avg_iterations": avg_it,
        },
        "hook_distribution":         _sort(hooks,  "hook",   cap=5),
        "slide_type_distribution":   _sort(stypes, "type"),
        "image_source_distribution": _sort(srcs,   "source"),
        "category_confidence":        category_confidence,
        "run_readiness":              run_readiness,
        "blog_count":                 blog_count,
    }


def _empty() -> dict:
    from datetime import datetime, timezone
    return {
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "kpis": {"total_runs": 0, "total_slides": 0, "total_cost_usd": 0.0, "total_cost_inr": 0.0,
                 "avg_cost_usd": 0.0, "avg_cost_inr": 0.0, "untracked_runs": 0},
        "token_by_stage": {}, "token_series": [], "topic_distribution": [],
        "activity": [], "model_breakdown": [], "runs_with_token_data": 0,
        "stage_latency": {},
        "research_quality": {
            "avg_confidence": None, "quality_gate_rate": None, "quality_gate_passed": 0,
            "runs_with_quality_data": 0, "distribution": [], "run_status_counts": {},
            "avg_evidence_count": 0.0, "avg_key_points": 0.0, "avg_gaps_found": 0.0, "avg_iterations": 0.0,
        },
        "hook_distribution": [], "slide_type_distribution": [],
        "image_source_distribution": [], "category_confidence": [], "run_readiness": [],
        "blog_count": 0,
    }
