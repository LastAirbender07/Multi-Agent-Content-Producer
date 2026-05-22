import asyncio
import json
import httpx
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from core.orchestration.contracts import ContentRequest, ImageAsset
from core.schemas.workflow_state import ContentGraphState
from core.tools.Search.ddgs_search import DDGSSearch
from configs.settings import get_settings
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[3]
_ddgs = DDGSSearch(timeout=15)

# Slide types that never need a real image — rendered as coloured cards
_NO_IMAGE_TYPES = {"stat", "cta", "engage"}


async def _search_pexels(query: str, per_page: int = 15) -> list[dict]:
    """Call Pexels MCP server, return list of photo dicts."""
    server_params = StdioServerParameters(
        command="python",
        args=["-m", "core.tools.mcp_servers.pexels_server"],
    )
    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                mcp_result = await session.call_tool(
                    "search_photos",
                    arguments={"query": query, "per_page": per_page, "orientation": "square"},
                )
                data = json.loads(mcp_result.content[0].text)
                if data.get("success"):
                    return [{"source": "pexels", **p} for p in data.get("photos", [])]
    except Exception as e:
        logger.warning("pexels_mcp_error", query=query, error=str(e))
    return []


async def _search_ddgs(query: str, max_results: int = 15) -> list[dict]:
    """Call DDGS image search, return normalised list."""
    try:
        output = await _ddgs.search_images(query=query, max_results=max_results)
        if output.success:
            return [
                {
                    "source": "ddgs",
                    "url": r.image,
                    "width": r.width or 0,
                    "height": r.height or 0,
                    "title": r.title,
                }
                for r in output.results
            ]
    except Exception as e:
        logger.warning("ddgs_image_error", query=query, error=str(e))
    return []


def _has_cjk(text: str) -> bool:
    return any(
        "一" <= c <= "鿿"   # CJK Unified Ideographs
        or "぀" <= c <= "ヿ"  # Hiragana + Katakana
        or "가" <= c <= "힯"  # Hangul
        for c in text
    )


def _score_image(img: dict, query: str = "") -> float:
    """Score an image candidate — bigger, squarer, query-relevant wins; CJK disqualifies."""
    title = img.get("title", "") or ""
    url = img.get("url", "") or ""

    if _has_cjk(title + url):
        return -99.0

    score = 10.0
    w = img.get("width", 0)
    h = img.get("height", 0)
    if w < 600 or h < 600:
        score -= 6.0
    if w > 0 and h > 0:
        ratio = w / h
        if 0.75 <= ratio <= 1.33:
            score += 3.0

    if query:
        query_words = {w.lower() for w in query.split() if len(w) > 2}
        title_lower = title.lower()
        hits = sum(1 for w in query_words if w in title_lower)
        score += min(hits * 1.5, 4.0)

    return score


async def _download_image(url: str, dest: Path, source: str, api_key: str = None) -> bool:
    headers = {}
    if source == "pexels" and api_key:
        headers["Authorization"] = api_key
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            dest.write_bytes(resp.content)
            return True
    except Exception as e:
        logger.warning("image_download_failed", url=url[:80], error=str(e))
        return False


def _effective_source(
    slide_preference: str | None,
    slide_type: str,
    global_override: str,
) -> str:
    """
    Resolve the final image source for a slide.

    Priority:
    1. Global user override (--image-source pexels / ddgs) — forces all slides
    2. Slide-level preference from the LLM (ddgs / pexels / none)
    3. Slide type default (stat/cta/engage → none)
    """
    if global_override in ("pexels", "ddgs"):
        return global_override
    if slide_type in _NO_IMAGE_TYPES:
        return "none"
    if slide_preference in ("ddgs", "pexels", "none"):
        return slide_preference
    # fallback: generic topic → pexels
    return "pexels"


async def fetch_images_node(state: ContentGraphState) -> dict:
    request = ContentRequest.model_validate(state["request"])
    slides = state.get("slides", [])
    run_id = state.get("run_id")
    angle_index = state.get("angle_index", 0)

    global_override = request.image_source   # "auto", "pexels", "ddgs"

    images_dir = (
        _BACKEND_ROOT / _settings.content_output_dir
        / run_id
        / "content"
        / f"angle_{angle_index}"
        / "images"
    )
    images_dir.mkdir(parents=True, exist_ok=True)

    image_assets: list[dict] = []

    for slide in slides:
        slide_num = slide["slide_number"]
        slide_type = slide.get("type", "content")
        query = slide.get("image_query") or f"{request.topic} professional"
        slide_pref = slide.get("image_source_preference")  # LLM's explicit choice

        source = _effective_source(slide_pref, slide_type, global_override)

        if source == "none":
            image_assets.append(ImageAsset(
                slide_number=slide_num,
                source="colour",
            ).model_dump())
            continue

        # Fetch from the chosen source only
        if source == "pexels":
            results = await _search_pexels(query, per_page=15)
        else:  # ddgs
            results = await _search_ddgs(query, max_results=15)

        # Fallback: if chosen source returns nothing, try the other
        if not results:
            logger.warning(
                "image_source_fallback",
                slide=slide_num,
                tried=source,
                query=query[:60],
            )
            if source == "pexels":
                results = await _search_ddgs(query, max_results=15)
                source = "ddgs"
            else:
                results = await _search_pexels(query, per_page=15)
                source = "pexels"

        if not results:
            image_assets.append(ImageAsset(slide_number=slide_num, source="colour").model_dump())
            continue

        ranked = sorted(results, key=lambda img: _score_image(img, query), reverse=True)
        best = ranked[0]

        download_url = best.get("src", {}).get("large2x") or best.get("url", "")
        if not download_url:
            image_assets.append(ImageAsset(slide_number=slide_num, source="colour").model_dump())
            continue

        dest = images_dir / f"slide_{slide_num:02d}.jpg"
        ok = await _download_image(
            download_url,
            dest,
            source=best["source"],
            api_key=_settings.pexels_api_key,
        )

        if ok:
            image_assets.append(ImageAsset(
                slide_number=slide_num,
                source=best["source"],
                original_url=download_url,
                local_raw_path=str(dest),
                processed_path=str(dest),
            ).model_dump())
        else:
            image_assets.append(ImageAsset(slide_number=slide_num, source="colour").model_dump())

        logger.info(
            "image_fetched",
            slide=slide_num,
            source=best["source"],
            tool_used=source,
            llm_preference=slide_pref,
            global_override=global_override,
            query=query[:80],
        )

    return {
        "image_assets": image_assets,
        "messages": state.get("messages", []) + [f"Images fetched for {len(image_assets)} slides"],
    }
