import json
import re
import httpx
from dataclasses import dataclass
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from core.orchestration.contracts import ResearchSynthesis
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.tools.metadata_helper import get_llm_metadata_block
from configs.settings import get_settings
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_BLOG_TEMPLATE_DIR = Path(__file__).parents[3] / "core" / "templates" / "blog"
_jinja_env = Environment(loader=FileSystemLoader(str(_BLOG_TEMPLATE_DIR)), autoescape=False)


@dataclass
class BlogAssets:
    topic: str
    synthesis: ResearchSynthesis
    evidence: list[dict]
    all_angle_slides: list[dict]   # [{"angle": {...}, "angle_index": int, "slides": [...], "image_assets": [...]}]
    run_id: str
    outputs_root: Path
    is_llm_only: bool


_SLIDE_TYPE_PRIORITY = {"hook": 0, "content": 1, "quote": 2, "stat": 3, "engage": 9, "cta": 9}

def _build_image_pool(assets: BlogAssets, max_images: int = 8) -> list[dict]:
    """
    Collect all real images across every angle, deduplicate by URL,
    sort by slide type priority, return up to max_images.
    """
    seen_urls: set[str] = set()
    pool: list[dict] = []

    for item in assets.all_angle_slides:
        image_assets = item.get("image_assets", [])
        slides = item.get("slides", [])
        angle_index = item["angle_index"]
        slides_by_num = {s["slide_number"]: s for s in slides}

        for asset in image_assets:
            if asset.get("source") == "colour" or not asset.get("local_raw_path"):
                continue
            url = asset.get("original_url", "")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)

            slide = slides_by_num.get(asset["slide_number"], {})
            slide_type = slide.get("type", "content")
            if slide_type in ("cta", "engage"):
                continue  # colour-card types even if they somehow have an image

            caption = "Photo via Pexels" if asset["source"] == "pexels" else "Photo via DuckDuckGo"
            pool.append({
                "original_url": url,
                "caption": caption,
                "alt": slide.get("title", assets.topic)[:80],
                "angle_index": angle_index,
                "slide_number": asset["slide_number"],
                "_priority": _SLIDE_TYPE_PRIORITY.get(slide_type, 5),
            })

    # Sort: hook/content first, quote second, others last
    pool.sort(key=lambda x: x["_priority"])
    for img in pool:
        img.pop("_priority", None)

    return pool[:max_images]


def _img_url(item: dict, run_id: str) -> str:
    """Resolve the best image URL: CDN first, localhost fallback."""
    if item.get("original_url"):
        return item["original_url"]
    sn = item["slide_number"]
    ai = item["angle_index"]
    return f"{_settings.backend_base_url}/outputs/{run_id}/content/angle_{ai}/images/slide_{sn:02d}.jpg"


async def _is_url_alive(url: str) -> bool:
    """HEAD request to verify the image URL is reachable. Returns True for localhost paths."""
    if url.startswith(_settings.backend_base_url):
        return True
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
            resp = await client.head(url, headers={"User-Agent": "Mozilla/5.0"})
            return resp.status_code < 400
    except Exception:
        return False


async def _filter_live_images(images: list[dict], run_id: str) -> list[dict]:
    """Return only images whose URL responds successfully."""
    import asyncio
    urls = [_img_url(img, run_id) for img in images]
    checks = await asyncio.gather(*[_is_url_alive(u) for u in urls])
    live = [img for img, ok in zip(images, checks) if ok]
    dead = len(images) - len(live)
    if dead:
        logger.warning("blog_images_dead_urls_filtered", count=dead, total=len(images))
    return live


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
    """
    Replace [IMAGE_HERE] tokens the LLM placed in prose with real images from the pool.
    Guarantee at least 2 images: if the LLM placed fewer tokens than we have images,
    inject remaining images at the first available section boundary.
    Strips [MARKER] and [MARKER: text] brackets from headings.
    Cleans up any residual raw image tokens that were not consumed.
    """
    # Token the LLM writes — no curly braces so str.format() in load_prompt leaves it intact
    TOKEN = "[IMAGE_HERE]"

    pool = list(images)
    pull_quotes = _stat_pull_quotes(assets.all_angle_slides)
    pq_idx = 0

    lines = prose.splitlines(keepends=True)
    result: list[str] = []
    images_injected = 0

    heading_re = re.compile(r"^(#{1,3})\s+\[([A-Z]+)(?::\s*(.+?))?\]\s*$")

    for line in lines:
        stripped = line.rstrip("\n")

        # Replace [IMAGE_HERE] token
        if stripped.strip() == TOKEN:
            if pool:
                img = pool.pop(0)
                url = _img_url(img, assets.run_id)
                result.append(f"\n![{img['alt']}]({url})\n*{img['caption']}*\n\n")
                images_injected += 1
            # Pool exhausted — token silently dropped (cleaned up below)
            continue

        # Strip [MARKER] brackets from headings
        m = heading_re.match(stripped)
        if m:
            hashes, marker, text = m.group(1), m.group(2).title(), m.group(3)
            heading_text = text if text else marker
            line = f"{hashes} {heading_text}\n"

        result.append(line)

        # Pull-quote after FINDING headings
        if re.match(r"^## \[FINDING:", stripped) and pq_idx < len(pull_quotes):
            result.append("\n" + pull_quotes[pq_idx])
            pq_idx += 1

    # Minimum guarantee: inject remaining pool images at section headings if under minimum
    if images_injected < _settings.blog_min_images and pool:
        heading_positions = [
            i for i, l in enumerate(result)
            if l.startswith("## ") and i > 0
        ]
        insert_positions = heading_positions[:_settings.blog_min_images - images_injected]
        for offset, pos in enumerate(insert_positions):
            if not pool:
                break
            img = pool.pop(0)
            url = _img_url(img, assets.run_id)
            insert_at = pos + offset + 1
            result.insert(insert_at, f"\n![{img['alt']}]({url})\n*{img['caption']}*\n\n")
            images_injected += 1

    # Append citations or LLM callout
    if assets.is_llm_only:
        result.append("\n\n---\n\n" + _llm_callout_md())
    else:
        citations = _build_citations_md(assets.evidence)
        if citations:
            result.append("\n\n---\n\n" + citations)

    # Social CTA
    result.append(
        f"\n**Follow us on Instagram for daily bite-sized insights: "
        f"[{_settings.instagram_handle}]({_settings.instagram_url})**\n\n"
        f"📖 [Read more articles on Blogger]({_settings.blogger_url}) &nbsp;|&nbsp; "
        f"📝 [Long reads on Medium]({_settings.medium_url})\n"
    )

    assembled = "".join(result)

    # ── Safety cleanup pass ───────────────────────────────────────────────────
    # Remove any residual image tokens that survived (pool exhausted, or LLM used
    # a slightly different format like {IMAGE} or {{IMAGE}}).
    _stale_token_re = re.compile(
        r"^\s*(\{IMAGE\}|\{\{IMAGE\}\}|\[IMAGE_HERE\]|\{image\})\s*$",
        re.IGNORECASE | re.MULTILINE,
    )
    cleaned = _stale_token_re.sub("", assembled)

    # ── Post-generation validator ─────────────────────────────────────────────
    remaining = _stale_token_re.findall(assembled)
    if remaining:
        logger.warning(
            "blog_image_tokens_not_replaced",
            count=len(remaining),
            run_id=assets.run_id,
        )

    return cleaned



def _markdown_to_html(md: str, topic: str, tags: list[str]) -> str:
    import markdown as md_lib
    body_html = md_lib.markdown(md, extensions=["extra", "tables", "toc"])
    template = _jinja_env.get_template("blog_post.html.j2")
    return template.render(title=topic, body_html=body_html)


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

    response = await LLMFactory.get_client_with_retry(
        lambda llm: llm.generate(
            prompt=user_prompt,
            system_prompt=get_system_prompt("content"),
        )
    )
    prose = response.content

    section_images = _build_image_pool(assets)

    # Validate URLs — filter out dead CDN/DDG links before injecting
    section_images = await _filter_live_images(section_images, assets.run_id)

    markdown_str = _assemble_markdown(prose, assets, section_images)

    # Get hashtags from first angle's carousel.json
    tags: list[str] = []
    carousel_path = (
        assets.outputs_root / assets.run_id / "content" / "angle_0" / "carousel.json"
    )
    if carousel_path.exists():
        carousel_data = json.loads(carousel_path.read_text())
        tags = carousel_data.get("hashtags", [])

    # Append tags and footer to Markdown (so the raw .md has them too)
    if tags:
        # Prefix with zero-width space to prevent Markdown treating #tag as heading
        tags_line = " ".join(f"\\#{t}" for t in tags[:12])
        markdown_str += f"\n\n---\n\n{tags_line}\n"
    markdown_str += (
        f"\n*Originally produced by [{_settings.instagram_handle}]({_settings.instagram_url}) · "
        f"[Blogger]({_settings.blogger_url}) · "
        f"[Medium]({_settings.medium_url})*\n"
    )

    html_str = _markdown_to_html(markdown_str, assets.topic, tags)
    return markdown_str, html_str
