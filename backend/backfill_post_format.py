"""
backfill_post_format.py — Phase 3 one-off backfill script.

Classifies existing runs and writes format_selection.json for each.
Run: uv run python backfill_post_format.py [--dry-run]

Reads:  outputs/runs/{run_id}/research/research_result.json
Writes: outputs/runs/{run_id}/format_selection/format_selection.json
Skips:  runs that already have format_selection.json
        runs without research_result.json (incomplete/failed runs)

Cost: ~64 real runs × $0.003 ≈ $0.19 total LLM cost.
Always run with --dry-run first to confirm.
"""
import argparse
import asyncio
import json
from pathlib import Path

from core.orchestration.contracts import PostFormat, TemplateFamily, COMPACT_FORMATS, FormatSelectionOutput
from core.orchestrators.content.format_selector import select_format
from infra.logging import get_logger

logger = get_logger(__name__)

_BACKEND_ROOT = Path(__file__).parent
_OUTPUTS_ROOT = _BACKEND_ROOT / "outputs" / "runs"


async def backfill_run(run_id: str, dry_run: bool) -> str:
    """Classify one run. Returns a status string."""
    out_path = _OUTPUTS_ROOT / run_id / "format_selection" / "format_selection.json"

    if out_path.exists():
        return "skipped (format_selection.json already exists)"

    research_path = _OUTPUTS_ROOT / run_id / "research" / "research_result.json"
    if not research_path.exists():
        return "skipped (no research_result.json)"

    try:
        research   = json.loads(research_path.read_text())
        topic      = research.get("topic", "")
        synthesis  = research.get("synthesis") or {}
        summary    = synthesis.get("summary", "") if isinstance(synthesis, dict) else ""

        if not topic:
            return "skipped (no topic in research)"
    except Exception as e:
        return f"error reading research: {e}"

    if dry_run:
        return f"dry_run: would classify '{topic[:60]}'"

    result = await select_format(run_id=run_id, topic=topic, research_summary=summary)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(result.model_dump(), indent=2, default=str),
        encoding="utf-8",
    )
    return f"written: format={result.recommended_format.value} family={result.template_family.value}"


async def main(dry_run: bool) -> None:
    run_dirs = sorted([d for d in _OUTPUTS_ROOT.iterdir() if d.is_dir()])
    print(f"Found {len(run_dirs)} run directories. dry_run={dry_run}")

    counts = {"written": 0, "skipped": 0, "error": 0}

    for run_dir in run_dirs:
        run_id = run_dir.name
        status = await backfill_run(run_id, dry_run)
        tag = (
            "written"  if status.startswith("written")
            else "error"   if "error" in status
            else "skipped"
        )
        counts[tag] += 1
        print(f"  [{run_id[:8]}..] {status}")

    print(f"\nDone. written={counts['written']} skipped={counts['skipped']} errors={counts['error']}")
    if not dry_run:
        written = list(_OUTPUTS_ROOT.rglob("format_selection.json"))
        print(f"format_selection.json files on disk: {len(written)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill post_format for existing runs.")
    parser.add_argument("--dry-run", action="store_true", default=False,
                        help="Print what would happen without calling the LLM.")
    args = parser.parse_args()
    asyncio.run(main(args.dry_run))
