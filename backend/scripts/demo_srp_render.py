"""
Demo: render Type A (aurora-compact-stat-hero) and Type B (aurora-compact-chart)
side-by-side from the afe481d9 run data.

Usage:
  cd backend
  PYTHONPATH=. .venv/bin/python scripts/demo_srp_render.py
"""
import asyncio, json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from core.orchestrators.content.renderer import SlideRenderTask, render_slides_fabric

RUN_ID  = "afe481d9-6486-4bb2-87d9-46dc3cc5ffb7"
ANGLE   = 0
OUT_DIR = Path("outputs/runs") / RUN_ID / "content" / f"angle_{ANGLE}" / "png_srp_demo"
OUT_DIR.mkdir(parents=True, exist_ok=True)

slides_json = Path("outputs/runs") / RUN_ID / "content" / f"angle_{ANGLE}" / "slides.json"
data = json.loads(slides_json.read_text())
stat_slides = [s for s in data["slides"] if s.get("type") == "stat"]


async def main() -> None:
    brand = "@TheOpinionBoard"
    tasks: list[SlideRenderTask] = []

    for i, s in enumerate(stat_slides[:3]):
        num = s["slide_number"]
        title  = s.get("title", "")
        stat_v = s.get("stat_value", "")
        stat_l = s.get("stat_label", "")
        bullets = s.get("bullets") or []

        # ── Type A: pure stat hero ─────────────────────────────────────────────
        type_a = {
            **s,
            "canvas_template": "aurora-compact-stat-hero",
            "compact_meta": {
                "headline":         title,
                "stat_value":       str(stat_v),
                "stat_explanation": stat_l,
                "attribution":      bullets[0] if bullets else "",
                "brand_wordmark":   brand,
            },
        }
        tasks.append(SlideRenderTask(
            slide_data=type_a,
            image_url=None,
            output_path=OUT_DIR / f"type_A_{num:02d}_stat_hero.png",
        ))

        # ── Type B: pure chart card ────────────────────────────────────────────
        type_b = {
            **s,
            "canvas_template": "aurora-compact-chart",
            "compact_meta": {
                "headline":      title,
                "brand_wordmark": brand,
            },
            # stat_value stripped so routing would also kick in via pipeline
        }
        tasks.append(SlideRenderTask(
            slide_data=type_b,
            image_url=None,
            output_path=OUT_DIR / f"type_B_{num:02d}_chart.png",
        ))

    png_paths = await render_slides_fabric(tasks)
    print(f"\nRendered {len(png_paths)} demo slides → {OUT_DIR}/")
    for p in sorted(OUT_DIR.iterdir()):
        print(f"  {p.name}")


if __name__ == "__main__":
    asyncio.run(main())
