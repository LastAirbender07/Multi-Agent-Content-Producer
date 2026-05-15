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


def _resolve_preferred_source(
    generic_query: str,
    specific_query: str,
    image_source: str,
) -> str:
    """
    Returns 'pexels' or 'ddgs' as the preferred source for this query.
    - forced pexels/ddgs: honour user choice directly
    - auto: LLM's own judgment — if it generated a DDGS-specific query that
      differs from the generic stock query, the slide needs a real web image.
    """
    if image_source == "pexels":
        return "pexels"
    if image_source == "ddgs":
        return "ddgs"
    # auto: trust the LLM's dual-query signal
    if specific_query and specific_query.strip().lower() != generic_query.strip().lower():
        return "ddgs"
    return "pexels"


def _score_image(img: dict, preferred_source: str) -> float:
    """Score an image candidate. preferred_source strongly biases the ranking."""
    source = img["source"]

    # Base score: strongly prefer the resolved source, allow the other as fallback
    if source == preferred_source:
        score = 20.0
    else:
        score = 5.0  # still usable as fallback if preferred source returns nothing

    w = img.get("width", 0)
    h = img.get("height", 0)
    if w < 600 or h < 600:
        score -= 6.0
    if w > 0 and h > 0:
        ratio = w / h
        if 0.75 <= ratio <= 1.33:  # roughly square
            score += 3.0
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


async def fetch_images_node(state: ContentGraphState) -> dict:
    request = ContentRequest.model_validate(state["request"])
    slides = state.get("slides", [])
    run_id = state.get("run_id")
    angle_index = state.get("angle_index", 0)

    image_source = request.image_source       # "auto", "pexels", "ddgs"

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
        generic_query = slide.get("image_query") or f"{request.topic} professional"
        specific_query = slide.get("image_query_ddgs") or generic_query

        if slide.get("type") in _NO_IMAGE_TYPES:
            image_assets.append(ImageAsset(
                slide_number=slide_num,
                source="colour",
            ).model_dump())
            continue

        preferred = _resolve_preferred_source(generic_query, specific_query, image_source)

        # Use the entity-specific query when pulling from DDGS, stock query for Pexels
        ddgs_query = specific_query if preferred == "ddgs" else generic_query
        pexels_query = generic_query

        # Fetch: in forced mode only call the required source; in auto call both
        if image_source == "pexels":
            pexels_results = await _search_pexels(pexels_query, per_page=15)
            ddgs_results = []
        elif image_source == "ddgs":
            ddgs_results = await _search_ddgs(ddgs_query, max_results=15)
            pexels_results = []
        else:
            # auto: run both in parallel with their respective queries
            pexels_results, ddgs_results = await asyncio.gather(
                _search_pexels(pexels_query, per_page=15),
                _search_ddgs(ddgs_query, max_results=15),
            )

        all_results = pexels_results + ddgs_results
        if not all_results:
            image_assets.append(ImageAsset(slide_number=slide_num, source="colour").model_dump())
            continue

        ranked = sorted(all_results, key=lambda img: _score_image(img, preferred), reverse=True)
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
            preferred=preferred,
            mode=image_source,
            query=ddgs_query if best["source"] == "ddgs" else pexels_query,
        )

    return {
        "image_assets": image_assets,
        "messages": state.get("messages", []) + [f"Images fetched for {len(image_assets)} slides"],
    }
