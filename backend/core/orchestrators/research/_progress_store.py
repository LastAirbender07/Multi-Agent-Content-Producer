"""
Lightweight in-memory store for per-run research node progress.
Imported by both research_graph.py (writer) and the research API router (reader).
"""

_store: dict[str, dict] = {}  # run_id → {node, step, total}

NODE_LABELS: dict[str, str] = {
    "intake":         "Starting…",
    "route":          "Planning queries…",
    "llm_knowledge":  "Loading background knowledge…",
    "execute_tools":  "Searching news & web…",
    "normalize":      "Processing sources…",
    "score_evidence": "Scoring evidence…",
    "synthesize":     "Synthesising findings…",
    "evaluate":       "Evaluating quality…",
    "refine":         "Refining — running another pass…",
    "finalize":       "Saving results…",
    "finalize_partial": "Saving results…",
}

_TOTAL = 9


def update(run_id: str, node: str, step: int) -> None:
    _store[run_id] = {"node": node, "step": step, "total": _TOTAL}


def get(run_id: str) -> dict | None:
    return _store.get(run_id)


def clear(run_id: str) -> None:
    _store.pop(run_id, None)
