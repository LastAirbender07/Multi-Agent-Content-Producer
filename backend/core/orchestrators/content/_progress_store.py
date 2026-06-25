"""
Lightweight in-memory progress store for per-run content generation.
Tracks which slide is currently being rendered during screenshot_slides_node.

Imported by both carousel_generator.py (writer) and the content API router (reader).
"""

_store: dict[str, dict] = {}  # run_id → {current, total, label}


def update(run_id: str, current: int, total: int) -> None:
    _store[run_id] = {
        "current": current,
        "total": total,
        "pct": round(current / total * 100) if total else 0,
        "label": f"Rendering slide {current} of {total}…",
    }


def get(run_id: str) -> dict | None:
    return _store.get(run_id)


def clear(run_id: str) -> None:
    _store.pop(run_id, None)
