"""
e2e_pipeline_test.py — Full pipeline E2E validation

Tests TWO topics end-to-end:
  1. FACTS topic → expect compact-clean family, aurora-compact-* templates
  2. OPINION topic → expect aurora-lite family, aurora-lite-* templates

For each run:
  - Triggers full pipeline (research + angles + slides + render)
  - Reads format_selection.json
  - Checks canvas_template fields on rendered slides
  - Verifies PNG files were actually created
  - Reports pass/fail for each check

Run: uv run python e2e_pipeline_test.py
"""
import asyncio, json, sys, time
from pathlib import Path

BACKEND = Path(__file__).parent
sys.path.insert(0, str(BACKEND))

from apps.cli.run_workflow import ContentPipelineOrchestrator as WorkflowRunner

PASS, FAIL = [], []
def chk(label, ok, detail=""):
    if ok:  PASS.append(label);  print(f"  ✅ {label}")
    else:   FAIL.append(label);  print(f"  ❌ {label}{' — ' + detail if detail else ''}")


async def run_topic(topic: str, angle_mode: str = "auto") -> dict:
    """Run full pipeline and return the final state."""
    runner = WorkflowRunner()
    print(f"  Running pipeline... (research + angles + slides + render)")
    t0 = time.time()
    state = await runner.run(
        topic=topic,
        mode="standard",
        freshness="recent",
        angle_mode=angle_mode,
        image_source="auto",
    )
    elapsed = round(time.time() - t0)
    print(f"  Done in {elapsed}s")
    return state


async def check_run(state: dict, expected_family: str, expected_template_prefix: str, label: str):
    print(f"\n{'─'*60}")
    print(f"CHECKING: {label}")
    print(f"{'─'*60}")

    run_id = state.get("run_id", "")
    errors  = state.get("errors", [])
    msgs    = state.get("messages", [])

    chk(f"{label}: pipeline completed without errors", len(errors) == 0,
        f"errors: {errors[:2]}" if errors else "")

    if not run_id:
        chk(f"{label}: run_id present", False, "no run_id in state")
        return

    run_dir = BACKEND / "outputs" / "runs" / run_id
    print(f"  Run dir: {run_id[:8]}...")

    # ── format_selection.json ──────────────────────────────────────────────
    fmt_path = run_dir / "format_selection" / "format_selection.json"
    if fmt_path.exists():
        fmt = json.loads(fmt_path.read_text())
        actual_family = fmt.get("template_family", "?")
        actual_format = fmt.get("recommended_format", "?")
        reasoning     = fmt.get("reasoning", "")[:70]
        print(f"  Format: {actual_format} → family: {actual_family}")
        print(f"  Reason: {reasoning}")
        chk(f"{label}: format_selection.json written", True)
        chk(f"{label}: family = '{expected_family}'",
            actual_family == expected_family,
            f"got '{actual_family}'")
        chk(f"{label}: aurora-extended NOT chosen (never auto-routed)",
            actual_family != "aurora-extended",
            f"got '{actual_family}'")
    else:
        chk(f"{label}: format_selection.json written", False, "file missing")

    # ── slides.json — check canvas_templates ───────────────────────────────
    slides_path = run_dir / "content" / "angle_0" / "slides.json"
    if slides_path.exists():
        slides_data = json.loads(slides_path.read_text())
        slides = slides_data.get("slides", [])
        templates_used = [s.get("canvas_template", "null") for s in slides if s.get("canvas_template")]
        unique_templates = list(set(templates_used))
        print(f"  Templates used: {unique_templates}")

        has_expected = any(t.startswith(expected_template_prefix) for t in templates_used)
        chk(f"{label}: slides use '{expected_template_prefix}*' templates",
            has_expected, f"got {unique_templates[:4]}")

        extended_templates = [t for t in templates_used if t.startswith("aurora-content") or t.startswith("aurora-hook") or t.startswith("aurora-stat") or t.startswith("aurora-quote")]
        uses_old_extended = any(t in ("aurora-hook","aurora-content-0","aurora-content-text","aurora-content-1","aurora-content-2","aurora-content-3","aurora-stat","aurora-quote","aurora-cta","aurora-engage") for t in templates_used)
        chk(f"{label}: old dense aurora-extended NOT used for content slides",
            not uses_old_extended or expected_family == "aurora-extended",
            f"found old templates: {extended_templates[:3]}")
    else:
        chk(f"{label}: slides.json found", False, "file missing")

    # ── PNG files ──────────────────────────────────────────────────────────
    png_dir = run_dir / "content" / "angle_0" / "png"
    if png_dir.exists():
        pngs = sorted(png_dir.glob("*.png"))
        chk(f"{label}: PNG slides rendered ({len(pngs)} files)", len(pngs) > 0)
        if pngs:
            sizes = [p.stat().st_size for p in pngs]
            min_size = min(sizes)
            chk(f"{label}: PNGs non-empty (min {min_size//1024}KB)", min_size > 50_000,
                f"smallest PNG is only {min_size} bytes")
            print(f"  PNG count: {len(pngs)} | sizes: {min(sizes)//1024}KB–{max(sizes)//1024}KB")
    else:
        chk(f"{label}: PNG directory exists", False, "png/ dir missing")


async def main():
    print("=" * 65)
    print("FULL PIPELINE E2E TEST")
    print("Tests: FACTS topic + OPINION topic")
    print("=" * 65)

    # ── Topic 1: FACTS ────────────────────────────────────────────────────
    print("\n\n" + "═"*65)
    print("TOPIC 1: FACTS — '5 surprising facts about how sleep affects memory'")
    print("Expected: FACTS format → compact-clean family → aurora-compact-* slides")
    print("═"*65)

    try:
        state_facts = await run_topic(
            "5 surprising facts about how sleep affects memory and learning — the science is shocking"
        )
        await check_run(
            state_facts,
            expected_family="compact-clean",
            expected_template_prefix="aurora-compact",
            label="FACTS",
        )
    except Exception as e:
        print(f"  FATAL: {e}")
        FAIL.append("FACTS: pipeline failed")

    # ── Topic 2: OPINION ──────────────────────────────────────────────────
    print("\n\n" + "═"*65)
    print("TOPIC 2: OPINION — 'Why hustle culture is destroying Gen Z'")
    print("Expected: OPINION format → aurora-lite family → aurora-lite-* slides")
    print("═"*65)

    try:
        state_opinion = await run_topic(
            "Why hustle culture is secretly destroying the mental health of an entire generation"
        )
        await check_run(
            state_opinion,
            expected_family="aurora-lite",
            expected_template_prefix="aurora-lite",
            label="OPINION",
        )
    except Exception as e:
        print(f"  FATAL: {e}")
        FAIL.append("OPINION: pipeline failed")

    # ── Summary ───────────────────────────────────────────────────────────
    print("\n\n" + "="*65)
    print(f"RESULT: {len(PASS)} PASS, {len(FAIL)} FAIL")
    if FAIL:
        print("FAILURES:")
        for f in FAIL: print(f"  ❌ {f}")
    else:
        print("✅ ALL PASS — Format routing works end-to-end!")
    print("="*65)
    return len(FAIL)


if __name__ == "__main__":
    failures = asyncio.run(main())
    sys.exit(failures)
