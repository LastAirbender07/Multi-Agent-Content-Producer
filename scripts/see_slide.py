#!/usr/bin/env python3
"""
see_slide.py — Visual inspection of rendered PNG slides via direct API vision call.

WHY THIS EXISTS:
  The Read tool silently fails on images in this environment because SAP AI Core
  does NOT support images inside tool_result content blocks. The Read tool sends
  images as tool results → they get silently dropped → Claude sees nothing.

  This script sends images directly as USER MESSAGE content blocks — the same path
  the VS Code IDE attachment uses. SAP AI Core supports this path fully.

USAGE:
  # Single slide
  .venv/bin/python scripts/see_slide.py path/to/slide.png

  # All slides in a run/angle
  .venv/bin/python scripts/see_slide.py --run RUN_ID --angle 0

  # With a specific question
  .venv/bin/python scripts/see_slide.py path/to/slide.png --question "Is any text overlapping?"

REQUIRES:
  - LiteLLM bridge running on localhost:6657 (started by VS Code extension)
  - requests library in .venv
"""
import argparse
import base64
import json
import os
import sys
from pathlib import Path

LITELLM_URL = "http://localhost:6657/v1/messages"
LITELLM_KEY = "sk-local-aicore-bridge"
MODEL       = "claude-sonnet-4-6"
BACKEND_DIR = Path(__file__).parent.parent / "backend"

DEFAULT_QUESTION = (
    "Describe this slide image in detail:\n"
    "1. What text is on screen? Quote the headline and body text exactly.\n"
    "2. What is the layout? (text position, image position, colors)\n"
    "3. Is any text overlapping other text or UI elements?\n"
    "4. Is there significant empty space anywhere (top, bottom, middle)?\n"
    "5. Does the content match the topic or are there placeholder defaults "
       "(e.g. '@nextwork', '+47%', 'Anthropic Research Report')?\n"
    "6. Overall: does this look like a publishable Instagram slide?"
)


def see_image(image_path: str, question: str = DEFAULT_QUESTION) -> str:
    """Send image as user message to Claude via LiteLLM bridge. Returns description."""
    try:
        import requests
    except ImportError:
        return "ERROR: requests not installed. Run: .venv/bin/pip install requests"

    path = Path(image_path)
    if not path.exists():
        return f"ERROR: file not found: {image_path}"

    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    media_type = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"

    payload = {
        "model": MODEL,
        "max_tokens": 500,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": media_type, "data": b64},
                    },
                    {"type": "text", "text": question},
                ],
            }
        ],
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {LITELLM_KEY}",
        "anthropic-version": "2023-06-01",
    }

    try:
        import requests as req
        r = req.post(LITELLM_URL, json=payload, headers=headers, timeout=60)
        result = r.json()
        if r.status_code != 200:
            return f"ERROR {r.status_code}: {result.get('error', result)}"
        return result.get("content", [{}])[0].get("text", f"ERROR: unexpected response: {result}")
    except Exception as e:
        return f"ERROR: {e}"


def see_run(run_id: str, angle: int = 0, question: str = DEFAULT_QUESTION):
    """Inspect all slides in a run/angle."""
    png_dir = BACKEND_DIR / "outputs" / "runs" / run_id / "content" / f"angle_{angle}" / "png"
    if not png_dir.exists():
        print(f"ERROR: directory not found: {png_dir}")
        sys.exit(1)

    pngs = sorted(png_dir.glob("*.png"))
    if not pngs:
        print(f"ERROR: no PNGs found in {png_dir}")
        sys.exit(1)

    # Load slides.json for context
    slides_json = png_dir.parent / "slides.json"
    slides_meta = {}
    if slides_json.exists():
        try:
            data = json.loads(slides_json.read_text())
            slides_meta = {s["slide_number"]: s for s in data.get("slides", [])}
        except Exception:
            pass

    print(f"\nVisual inspection: run={run_id[:8]}... angle={angle} ({len(pngs)} slides)")
    print("=" * 70)

    for png in pngs:
        # Get slide number from filename
        try:
            num = int(png.stem.split("_")[-1])
        except ValueError:
            num = 0

        meta = slides_meta.get(num, {})
        template = meta.get("canvas_template", "?")
        slide_type = meta.get("type", "?")
        title_preview = (meta.get("title", "") or "")[:50]

        print(f"\n--- {png.name} | template={template} | type={slide_type}")
        print(f"    title: {title_preview}")
        print()

        description = see_image(str(png), question)
        # Indent description
        for line in description.split("\n"):
            print(f"  {line}")
        print()


def main():
    parser = argparse.ArgumentParser(description="Visually inspect rendered slide PNGs")
    parser.add_argument("image", nargs="?", help="Path to a single PNG file")
    parser.add_argument("--run", help="Run ID (use with --angle)")
    parser.add_argument("--angle", type=int, default=0, help="Angle index (default: 0)")
    parser.add_argument("--question", default=DEFAULT_QUESTION, help="Custom question to ask")
    args = parser.parse_args()

    if args.run:
        see_run(args.run, args.angle, args.question)
    elif args.image:
        print(see_image(args.image, args.question))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
