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


def _score_image(img: dict) -> float:
    """Higher = better. Pexels beats DDGS; wide images penalised."""
    score = 15.0 if img["source"] == "pexels" else 10.0
    w = img.get("width", 0)
    h = img.get("height", 0)
    if w < 800 or h < 800:
        score -= 8.0
    if w > 0 and h > 0:
        ratio = w / h
        if 0.8 <= ratio <= 1.25:
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
        query = slide.get("image_query") or f"{request.topic} professional"

        if slide.get("type") in ("stat", "cta", "engage"):
            image_assets.append(ImageAsset(
                slide_number=slide_num,
                source="colour",
            ).model_dump())
            continue

        pexels_results, ddgs_results = await asyncio.gather(
            _search_pexels(query, per_page=15),
            _search_ddgs(query, max_results=15),
        )

        all_results = pexels_results + ddgs_results
        if not all_results:
            image_assets.append(ImageAsset(slide_number=slide_num, source="colour").model_dump())
            continue

        ranked = sorted(all_results, key=_score_image, reverse=True)
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
            query=query,
        )

    return {
        "image_assets": image_assets,
        "messages": state.get("messages", []) + [f"Images fetched for {len(image_assets)} slides"],
    }
