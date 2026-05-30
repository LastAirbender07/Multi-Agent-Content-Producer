import json
import re
from dataclasses import dataclass
from pathlib import Path

from core.orchestration.contracts import ResearchSynthesis
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.tools.metadata_helper import get_llm_metadata_block
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)


@dataclass
class BlogAssets:
    topic: str
    synthesis: ResearchSynthesis
    evidence: list[dict]
    all_angle_slides: list[dict]   # [{"angle": {...}, "angle_index": int, "slides": [...], "image_assets": [...]}]
    run_id: str
    outputs_root: Path
    is_llm_only: bool


def _pick_section_images(assets: BlogAssets) -> list[dict]:
    """One image per angle section — first non-colour asset, fallback to first PNG."""
    images = []
    for item in assets.all_angle_slides:
        angle = item["angle"]
        image_assets = item.get("image_assets", [])
        slides = item.get("slides", [])
        angle_index = item["angle_index"]

        real = next(
            (a for a in image_assets if a.get("source") != "colour" and a.get("local_raw_path")),
            None,
        )

        if real:
            slide_num = real["slide_number"]
            caption = "Photo via Pexels" if real["source"] == "pexels" else "Photo via DuckDuckGo"
            slide = next((s for s in slides if s["slide_number"] == slide_num), {})
            images.append({
                "original_url": real.get("original_url", ""),
                "caption": caption,
                "alt": slide.get("title", assets.topic),
                "angle_index": angle_index,
                "slide_number": slide_num,
            })
        else:
            png_dir = assets.outputs_root / assets.run_id / "content" / f"angle_{angle_index}" / "png"
            pngs = sorted(png_dir.glob("slide_*.png")) if png_dir.exists() else []
            if pngs:
                images.append({
                    "original_url": "",
                    "caption": "@TheOpinionBoard",
                    "alt": angle.get("statement", assets.topic)[:80],
                    "angle_index": angle_index,
                    "slide_number": 0,
                })

    return images


def _img_url(item: dict, run_id: str) -> str:
    """Resolve the best image URL: CDN first, localhost fallback."""
    if item.get("original_url"):
        return item["original_url"]
    sn = item["slide_number"]
    ai = item["angle_index"]
    return f"http://localhost:8000/outputs/{run_id}/content/angle_{ai}/images/slide_{sn:02d}.jpg"


def _build_citations_md(evidence: list[dict]) -> str:
    real = [e for e in evidence if e.get("url") and not e["url"].startswith("llm://")]
    if not real:
        return ""
    lines = ["## References\n"]
    for i, e in enumerate(real[:15], 1):
        title = e.get("title") or "Source"
        url = e["url"]
        snippet = (e.get("snippet") or "")[:100]
        lines.append(f"{i}. **[{title}]({url})**  \n   {snippet}\n")
    return "\n".join(lines)


def _llm_callout_md() -> str:
    return ""  # No callout — LLM-only runs are treated the same as web runs


def _stat_pull_quotes(all_angle_slides: list[dict]) -> list[str]:
    quotes = []
    for item in all_angle_slides:
        for s in item.get("slides", []):
            if s.get("type") == "stat" and s.get("stat_value"):
                label = s.get("stat_label") or s.get("title") or ""
                quotes.append(f'> **{s["stat_value"]}** — {label}\n')
    return quotes[:4]


def _assemble_markdown(prose: str, assets: BlogAssets, images: list[dict]) -> str:
    lines = prose.splitlines(keepends=True)
    result: list[str] = []
    hero_inserted = False
    angle_img_idx = 0
    pull_quotes = _stat_pull_quotes(assets.all_angle_slides)
    pq_idx = 0

    for line in lines:
        result.append(line)

        # Hero image after the first blockquote (subtitle line)
        if not hero_inserted and line.startswith("> ") and images:
            hero = images[0]
            url = _img_url(hero, assets.run_id)
            result.append(f"\n![{hero['alt']}]({url})\n*{hero['caption']}*\n\n")
            hero_inserted = True

        # Section image before each ANGLE heading
        if re.match(r"^## \[ANGLE:", line) and angle_img_idx + 1 < len(images):
            angle_img_idx += 1
            img = images[angle_img_idx]
            url = _img_url(img, assets.run_id)
            result.append(f"\n![{img['alt']}]({url})\n*{img['caption']}*\n\n")

        # Pull-quote after each FINDING heading
        if re.match(r"^## \[FINDING:", line) and pq_idx < len(pull_quotes):
            result.append("\n" + pull_quotes[pq_idx])
            pq_idx += 1

    # Append citations or LLM callout
    if assets.is_llm_only:
        result.append("\n\n---\n\n" + _llm_callout_md())
    else:
        citations = _build_citations_md(assets.evidence)
        if citations:
            result.append("\n\n---\n\n" + citations)

    # Strip [MARKER] and [MARKER: text] wrappers from headings.
    # e.g.  ## [BACKGROUND]           → ## Background
    #       ## [FINDING: Key point]   → ## Key point
    #       ## [ANGLE: The statement] → ## The statement
    cleaned: list[str] = []
    heading_re = re.compile(r"^(#{1,3})\s+\[([A-Z]+)(?::\s*(.+?))?\]\s*$")
    for line in result:
        m = heading_re.match(line.rstrip("\n"))
        if m:
            hashes, marker, text = m.group(1), m.group(2).title(), m.group(3)
            heading_text = text if text else marker
            # Preserve trailing newline
            line = f"{hashes} {heading_text}\n"
        cleaned.append(line)

    return "".join(cleaned)


def _markdown_to_html(md: str, topic: str, tags: list[str]) -> str:
    import markdown as md_lib
    body_html = md_lib.markdown(md, extensions=["extra", "tables", "toc"])

    tags_html = " ".join(f'<span class="tag">#{t}</span>' for t in tags[:12])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{topic}</title>
  <style>
    :root {{
      --text: #1a1a1a; --muted: #555; --accent: #7c3aed;
      --bg: #fff; --border: #e5e7eb; --callout-bg: #fef9c3;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: Georgia, 'Times New Roman', serif; background: var(--bg);
            color: var(--text); line-height: 1.75; max-width: 760px;
            margin: 48px auto; padding: 0 24px; }}
    h1 {{ font-size: 2.4rem; font-weight: 700; line-height: 1.2; margin-bottom: 12px; }}
    h2 {{ font-size: 1.5rem; font-weight: 600; margin: 40px 0 12px;
          border-bottom: 2px solid var(--accent); padding-bottom: 4px; }}
    h3 {{ font-size: 1.15rem; font-weight: 600; margin: 28px 0 8px; color: var(--accent); }}
    p {{ margin-bottom: 20px; font-size: 1.08rem; }}
    blockquote {{ border-left: 4px solid var(--accent); padding: 12px 20px;
                  margin: 24px 0; background: #f5f3ff; border-radius: 4px;
                  font-style: italic; color: #374151; }}
    blockquote strong {{ font-size: 1.4rem; color: var(--accent); }}
    img {{ width: 100%; max-height: 480px; object-fit: cover;
           border-radius: 8px; margin: 24px 0 8px; display: block; }}
    em {{ display: block; text-align: center; font-size: 0.85rem;
          color: var(--muted); margin-bottom: 20px; }}
    a {{ color: var(--accent); text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
    .callout {{ background: var(--callout-bg); border: 1px solid #fde68a;
                border-radius: 6px; padding: 16px 20px; margin: 24px 0; font-size: 0.95rem; }}
    .tags {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border); }}
    .tag {{ display: inline-block; background: #f3f4f6; color: var(--muted);
             padding: 3px 10px; border-radius: 12px; font-size: 0.8rem;
             margin: 4px; font-family: sans-serif; }}
    .footer {{ margin-top: 32px; font-size: 0.8rem; color: var(--muted);
               text-align: center; font-family: sans-serif; }}
    @media (max-width: 600px) {{
      body {{ padding: 0 16px; margin: 24px auto; }}
      h1 {{ font-size: 1.8rem; }}
    }}
  </style>
</head>
<body>
  {body_html}
  <div class="tags">{tags_html}</div>
  <p class="footer">Originally produced by <strong>@TheOpinionBoard</strong></p>
</body>
</html>"""


def _slides_summary(slides: list[dict]) -> str:
    parts = []
    for s in slides:
        if s.get("type") in ("cta", "engage"):
            continue
        title = s.get("title", "")
        body = s.get("body", "")
        bullets = " | ".join(s.get("bullets", []))
        stat = f" [{s['stat_value']}]" if s.get("stat_value") else ""
        parts.append(f"• {title}{stat}: {body} {bullets}".strip())
    return "\n".join(parts)


async def generate_blog_post(assets: BlogAssets) -> tuple[str, str]:
    """Generate blog post. Returns (markdown_str, html_str)."""
    synthesis = assets.synthesis
    all_angle_slides = assets.all_angle_slides

    if not all_angle_slides:
        raise ValueError("No angle slides provided")

    angles = [item["angle"] for item in all_angle_slides]
    slides_per_angle = [item.get("slides", []) for item in all_angle_slides]

    key_points_block = "\n".join(f"- {p}" for p in synthesis.key_points)
    implications_block = "\n".join(synthesis.implications) if synthesis.implications else "Not specified"
    contradictions_block = "\n".join(synthesis.contradictions) if synthesis.contradictions else "None identified"

    def _get(lst, i, default=""):
        return lst[i] if i < len(lst) else default

    user_prompt = load_prompt(
        "blog_post",
        topic=assets.topic,
        current_date=get_llm_metadata_block(),
        primary_emotional_hook=angles[0].get("emotional_hook", "curiosity"),
        research_summary=synthesis.summary,
        key_points_block=key_points_block,
        contradictions_block=contradictions_block,
        implications_block=implications_block,
        angle_1_statement=_get(angles, 0, {}).get("statement", ""),
        angle_2_statement=_get(angles, 1, {}).get("statement", ""),
        angle_3_statement=_get(angles, 2, {}).get("statement", ""),
        angle_1_slides=_slides_summary(_get(slides_per_angle, 0, [])),
        angle_2_slides=_slides_summary(_get(slides_per_angle, 1, [])),
        angle_3_slides=_slides_summary(_get(slides_per_angle, 2, [])),
        key_point_1_short=(synthesis.key_points[0][:50] if synthesis.key_points else "Point 1"),
        key_point_2_short=(synthesis.key_points[1][:50] if len(synthesis.key_points) > 1 else "Point 2"),
        key_point_3_short=(synthesis.key_points[2][:50] if len(synthesis.key_points) > 2 else "Point 3"),
        angle_1_heading=_get(angles, 0, {}).get("statement", "Angle 1")[:60],
        angle_2_heading=_get(angles, 1, {}).get("statement", "Angle 2")[:60],
        angle_3_heading=_get(angles, 2, {}).get("statement", "Angle 3")[:60],
    )

    llm = await LLMFactory.get_client()
    response = await llm.generate(
        prompt=user_prompt,
        system_prompt=get_system_prompt("content"),
    )
    prose = response.content

    section_images = _pick_section_images(assets)
    markdown_str = _assemble_markdown(prose, assets, section_images)

    # Get hashtags from first angle's carousel.json
    tags: list[str] = []
    carousel_path = (
        assets.outputs_root / assets.run_id / "content" / "angle_0" / "carousel.json"
    )
    if carousel_path.exists():
        carousel_data = json.loads(carousel_path.read_text())
        tags = carousel_data.get("hashtags", [])

    html_str = _markdown_to_html(markdown_str, assets.topic, tags)
    return markdown_str, html_str
