"""
blog_post_generator.py — Generate a structured blog post using the LLM.

The LLM is asked to produce a BlogPostDocument JSON object.
Rendering to markdown and HTML is handled by blog_post_renderer.py.
"""

import json
import re
import httpx
from dataclasses import dataclass
from pathlib import Path

from core.orchestration.contracts import ResearchSynthesis
from core.orchestration.blog_post_schema import BlogPostDocument, ImageSlot
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.tools.metadata_helper import get_llm_metadata_block
from core.services.blog_post_renderer import inject_images, to_markdown, to_html
from core.utils.text_utils import strip_fences
from configs.settings import get_settings
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()


@dataclass
class BlogAssets:
    topic:            str
    synthesis:        ResearchSynthesis
    evidence:         list[dict]
    all_angle_slides: list[dict]   # [{"angle": {...}, "angle_index": int, "slides": [...], "image_assets": [...]}]
    run_id:           str
    outputs_root:     Path
    is_llm_only:      bool


_SLIDE_TYPE_PRIORITY = {"hook": 0, "content": 1, "quote": 2, "stat": 3, "engage": 9, "cta": 9}


def _build_image_pool(assets: BlogAssets, max_images: int = 8) -> list[dict]:
    """Collect real images across every angle, deduped by URL, sorted by slide priority."""
    seen_urls: set[str] = set()
    pool: list[dict] = []

    for item in assets.all_angle_slides:
        image_assets = item.get("image_assets", [])
        slides       = item.get("slides", [])
        angle_index  = item["angle_index"]
        slides_by_num = {s["slide_number"]: s for s in slides}

        for asset in image_assets:
            if asset.get("source") == "colour" or not asset.get("local_raw_path"):
                continue
            url = asset.get("original_url", "")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)

            slide      = slides_by_num.get(asset["slide_number"], {})
            slide_type = slide.get("type", "content")
            if slide_type in ("cta", "engage"):
                continue

            caption = "Photo via Pexels" if asset["source"] == "pexels" else "Photo via DuckDuckGo"
            pool.append({
                "url":          url,
                "local_url":    f"{_settings.backend_base_url}/outputs/{assets.run_id}/content/angle_{angle_index}/images/slide_{asset['slide_number']:02d}.jpg",
                "caption":      caption,
                "alt":          slide.get("title", assets.topic)[:80],
                "angle_index":  angle_index,
                "slide_number": asset["slide_number"],
                "_priority":    _SLIDE_TYPE_PRIORITY.get(slide_type, 5),
            })

    pool.sort(key=lambda x: x["_priority"])
    for img in pool:
        img.pop("_priority", None)
    return pool[:max_images]


async def _is_url_alive(url: str) -> bool:
    if url.startswith(_settings.backend_base_url):
        return True
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
            resp = await client.head(url, headers={"User-Agent": "Mozilla/5.0"})
            return resp.status_code < 400
    except Exception:
        return False


async def _filter_live_images(images: list[dict], run_id: str) -> list[dict]:
    import asyncio
    checks = await asyncio.gather(*[_is_url_alive(img["url"]) for img in images])
    live   = [img for img, ok in zip(images, checks) if ok]
    dead   = len(images) - len(live)
    if dead:
        logger.warning("blog_images_dead_urls_filtered", count=dead, total=len(images))
    return live


def _build_citations_section(evidence: list[dict]) -> str:
    real = [e for e in evidence if e.get("url") and not e["url"].startswith("llm://")]
    if not real:
        return ""
    lines = []
    for i, e in enumerate(real[:15], 1):
        title   = e.get("title") or "Source"
        url     = e["url"]
        snippet = (e.get("snippet") or "")[:100]
        lines.append(f"{i}. [{title}]({url}) — {snippet}")
    return "\n".join(lines)


def _slides_summary(slides: list[dict]) -> str:
    parts = []
    for s in slides:
        if s.get("type") in ("cta", "engage"):
            continue
        title   = s.get("title", "")
        body    = s.get("body", "")
        bullets = " | ".join(s.get("bullets", []))
        stat    = f" [{s['stat_value']}]" if s.get("stat_value") else ""
        parts.append(f"• {title}{stat}: {body} {bullets}".strip())
    return "\n".join(parts)


def _load_tags(assets: BlogAssets) -> list[str]:
    carousel_path = assets.outputs_root / assets.run_id / "content" / "angle_0" / "carousel.json"
    if carousel_path.exists():
        try:
            data = json.loads(carousel_path.read_text())
            return data.get("hashtags", [])
        except Exception:
            pass
    return []


async def generate_blog_post(assets: BlogAssets) -> BlogPostDocument:
    """Generate a structured blog post. Returns a validated BlogPostDocument.

    The caller is responsible for:
    - saving the JSON to disk (blog_post.json)
    - rendering to markdown and HTML via blog_post_renderer
    - saving those to disk (blog_post.md, blog_post.html)
    """
    if not assets.all_angle_slides:
        raise ValueError("No angle slides provided")

    synthesis      = assets.synthesis
    angles         = [item["angle"] for item in assets.all_angle_slides]
    slides_per_angle = [item.get("slides", []) for item in assets.all_angle_slides]

    def _get(lst, i, default=""):
        return lst[i] if i < len(lst) else default

    key_points_block    = "\n".join(f"- {p}" for p in synthesis.key_points)
    implications_block  = "\n".join(synthesis.implications)  if synthesis.implications  else "Not specified"
    contradictions_block= "\n".join(synthesis.contradictions) if synthesis.contradictions else "None identified"

    user_prompt = load_prompt(
        "blog_post",
        topic                = assets.topic,
        current_date         = get_llm_metadata_block(),
        primary_emotional_hook = angles[0].get("emotional_hook", "curiosity"),
        research_summary     = synthesis.summary,
        key_points_block     = key_points_block,
        contradictions_block = contradictions_block,
        implications_block   = implications_block,
        angle_1_statement    = _get(angles, 0, {}).get("statement", ""),
        angle_2_statement    = _get(angles, 1, {}).get("statement", ""),
        angle_3_statement    = _get(angles, 2, {}).get("statement", ""),
        angle_1_slides       = _slides_summary(_get(slides_per_angle, 0, [])),
        angle_2_slides       = _slides_summary(_get(slides_per_angle, 1, [])),
        angle_3_slides       = _slides_summary(_get(slides_per_angle, 2, [])),
    )

    response = await LLMFactory.get_client_with_retry(
        lambda llm: llm.generate(
            prompt=user_prompt,
            system_prompt=get_system_prompt("content"),
        )
    )

    raw = strip_fences(response.content)
    doc = BlogPostDocument.model_validate_json(raw)

    # Fill tags from carousel if not provided by the LLM
    if not doc.tags:
        doc = doc.model_copy(update={"tags": _load_tags(assets)[:8]})

    # Inject real image URLs into the LLM-declared image slots
    image_pool = _build_image_pool(assets)
    image_pool = await _filter_live_images(image_pool, assets.run_id)
    doc        = inject_images(doc, image_pool)

    # Append citations as a separate section so they appear in all formats
    citations = _build_citations_section(assets.evidence)
    if citations and not assets.is_llm_only:
        from core.orchestration.blog_post_schema import Section
        doc = doc.model_copy(update={
            "sections": list(doc.sections) + [
                Section(heading="References", paragraphs=[citations])
            ]
        })

    logger.info("blog_post_generated", run_id=assets.run_id, title=doc.title, sections=len(doc.sections))
    return doc
