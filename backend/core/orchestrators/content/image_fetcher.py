import asyncio
import json
import httpx
from io import BytesIO
from pathlib import Path

from PIL import Image as PILImage, UnidentifiedImageError
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from core.orchestration.contracts import ContentRequest, ImageAsset
from core.schemas.workflow_state import ContentGraphState
from core.tools.Search.ddgs_search import DDGSSearch
from core.utils.text_utils import has_cjk
from configs.settings import get_settings
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[3]
_ddgs = DDGSSearch(timeout=15)

# ── Constants ─────────────────────────────────────────────────────────────────

# Minimum score for a DDGS result to be considered (Pexels results are pre-curated)
_DDGS_MIN_SCORE: float = 5.0

# Minimum dimension for a usable image
_MIN_DIMENSION: int = 400

# How many candidates to attempt before giving up on a slide.
# Higher in the pipeline node (more search results available) than in the
# single-image utility (called interactively from the editor).
_MAX_CANDIDATE_ATTEMPTS_PIPELINE: int = 8
_MAX_CANDIDATE_ATTEMPTS_SINGLE: int = 5

# Patterns that reliably indicate non-photographic content (spreadsheets, text documents, etc.)
_JUNK_URL_PATTERNS = (
    ".xlsx", ".xls", ".csv", ".pdf", ".doc", ".docx",
    "spreadsheet", "excel", "document", "text-overlay",
    "thumbnail/small",
)

_JUNK_TITLE_PATTERNS = (
    "spreadsheet", "excel", "table", "chart data", "csv",
    "screenshot of", "file icon", "document icon",
)


# ── Search helpers ────────────────────────────────────────────────────────────

async def _search_pexels(query: str, per_page: int = 15) -> list[dict]:
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


# ── Scoring ───────────────────────────────────────────────────────────────────

def _score_image(img: dict, query: str = "") -> float:
    """
    Score an image candidate. Higher is better. Returns -99 to disqualify.

    Scoring breakdown:
    - Base: 10
    - CJK in title/URL: -99 (hard disqualify)
    - Junk URL/title patterns: -99 (spreadsheets, documents, icons)
    - Size too small (<400px): -6
    - Near-square ratio (0.75–1.33): +3
    - Query word hits in title: +1.5 per hit, capped at +4
    """
    title = (img.get("title", "") or "").lower()
    url   = (img.get("url", "") or "").lower()

    # Hard disqualifiers
    if has_cjk(title + url):
        return -99.0
    if any(p in url   for p in _JUNK_URL_PATTERNS):
        return -99.0
    if any(p in title for p in _JUNK_TITLE_PATTERNS):
        return -99.0

    score = 10.0
    w = img.get("width", 0)
    h = img.get("height", 0)
    if w > 0 and h > 0:
        if w < _MIN_DIMENSION or h < _MIN_DIMENSION:
            return -99.0  # known dimensions are below minimum — unusable in 1080px carousel
        ratio = w / h
        if 0.75 <= ratio <= 1.33:
            score += 3.0

    if query:
        query_words = {t.lower() for t in query.split() if len(t) > 2}
        hits = sum(1 for t in query_words if t in title)
        score += min(hits * 1.5, 4.0)

    return score


# ── Reachability + integrity check ───────────────────────────────────────────

async def _probe_url(url: str, api_key: str | None = None) -> bool:
    """
    HEAD request to verify URL is reachable and returns an image content-type.
    Falls back to GET with range if HEAD is not supported.
    Returns True only if the URL is live and claims to be an image.
    """
    headers: dict = {}
    if api_key and "pexels" in url:
        headers["Authorization"] = api_key
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.head(url, headers=headers)
            if resp.status_code == 405:
                # HEAD not supported — try partial GET
                resp = await client.get(url, headers={**headers, "Range": "bytes=0-1023"})
            if resp.status_code not in (200, 206):
                return False
            ct = resp.headers.get("content-type", "")
            return ct.startswith("image/")
    except Exception:
        return False


def _verify_image_bytes(data: bytes) -> bool:
    """
    Open image bytes with Pillow to confirm it is a valid, openable image.
    Returns False for corrupt files, text files, or zero-byte responses.
    """
    if len(data) < 1024:  # suspiciously small
        return False
    try:
        img = PILImage.open(BytesIO(data))
        img.verify()  # raises on corrupt data
        return True
    except (UnidentifiedImageError, Exception):
        return False


# ── Download ──────────────────────────────────────────────────────────────────

async def _download_and_verify(url: str, dest: Path, source: str, api_key: str | None = None) -> bool:
    """
    Download image to dest. After download, verify the file is a valid openable
    image with Pillow. Deletes the file and returns False if verification fails.
    """
    headers: dict = {}
    if source == "pexels" and api_key:
        headers["Authorization"] = api_key
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.content

        if not _verify_image_bytes(data):
            logger.warning("image_verify_failed", url=url[:80], size=len(data))
            return False

        dest.write_bytes(data)

        # Final sanity: confirm the written file can be opened
        try:
            with PILImage.open(dest) as im:
                im.load()
        except Exception:
            dest.unlink(missing_ok=True)
            logger.warning("image_file_corrupt_after_write", dest=str(dest))
            return False

        return True

    except Exception as e:
        logger.warning("image_download_failed", url=url[:80], error=str(e))
        dest.unlink(missing_ok=True)
        return False


# ── Utility used by editor swap-image ────────────────────────────────────────

async def fetch_and_download_single_image(
    query: str,
    source: str,
    dest_path: Path,
    api_key: str | None = None,
) -> bool:
    if source == "pexels":
        results = await _search_pexels(query, per_page=20)
        if not results:
            results = await _search_ddgs(query, max_results=20)
            source = "ddgs"
    else:
        results = await _search_ddgs(query, max_results=20)
        if not results:
            results = await _search_pexels(query, per_page=20)
            source = "pexels"

    if not results:
        return False

    # Score once, filter, sort — avoid calling _score_image twice per result
    with_scores = [(r, _score_image(r, query)) for r in results]
    ranked = [
        r for r, s in sorted(with_scores, key=lambda x: x[1], reverse=True)
        if s >= _DDGS_MIN_SCORE or r.get("source") == "pexels"
    ]

    for best in ranked[:_MAX_CANDIDATE_ATTEMPTS_SINGLE]:
        download_url = best.get("src", {}).get("large2x") or best.get("url", "")
        if not download_url:
            continue
        ok = await _download_and_verify(
            download_url, dest_path,
            source=best.get("source", source),
            api_key=api_key or _settings.pexels_api_key,
        )
        if ok:
            return True

    return False


def _effective_source(slide_preference: str | None, slide_type: str, global_override: str) -> str:
    if global_override in ("pexels", "ddgs"):
        return global_override
    if slide_type in set(_settings.content_no_image_slide_types):
        return "none"
    if slide_preference in ("ddgs", "pexels", "none"):
        return slide_preference
    return "pexels"


# ── Main pipeline node ────────────────────────────────────────────────────────

async def fetch_images_node(state: ContentGraphState) -> dict:
    request = ContentRequest.model_validate(state["request"])
    slides = state.get("slides", [])
    run_id = state.get("run_id")
    angle_index = state.get("angle_index", 0)
    global_override = request.image_source

    images_dir = (
        _BACKEND_ROOT / _settings.content_output_dir
        / run_id / "content" / f"angle_{angle_index}" / "images"
    )
    images_dir.mkdir(parents=True, exist_ok=True)

    image_assets: list[dict] = []
    used_urls: set[str] = set()

    for slide in slides:
        slide_num  = slide["slide_number"]
        slide_type = slide.get("type", "content")
        query      = slide.get("image_query") or f"{request.topic} professional"
        slide_pref = slide.get("image_source_preference")
        source     = _effective_source(slide_pref, slide_type, global_override)

        if source == "none":
            image_assets.append(ImageAsset(slide_number=slide_num, source="colour").model_dump())
            continue

        # Search
        if source == "pexels":
            results = await _search_pexels(query, per_page=20)
        else:
            results = await _search_ddgs(query, max_results=20)

        # Fallback if primary source returned nothing
        if not results:
            logger.warning("image_source_fallback", slide=slide_num, tried=source, query=query[:60])
            if source == "pexels":
                results = await _search_ddgs(query, max_results=20)
                source = "ddgs"
            else:
                results = await _search_pexels(query, per_page=20)
                source = "pexels"

        if not results:
            image_assets.append(ImageAsset(slide_number=slide_num, source="colour").model_dump())
            continue

        # Score once, then filter DDGS results below threshold.
        # Pexels results are pre-curated and exempt from the threshold.
        with_scores = [(r, _score_image(r, query)) for r in results]
        scored = [
            r for r, s in sorted(with_scores, key=lambda x: x[1], reverse=True)
            if s >= _DDGS_MIN_SCORE or r.get("source") == "pexels"
        ]

        if not scored:
            logger.warning("image_all_below_threshold", slide=slide_num, source=source, query=query[:60])
            image_assets.append(ImageAsset(slide_number=slide_num, source="colour").model_dump())
            continue

        # Pick first that hasn't been used already
        dest = images_dir / f"slide_{slide_num:02d}.jpg"
        downloaded = False

        for candidate in scored[:_MAX_CANDIDATE_ATTEMPTS_PIPELINE]:
            download_url = candidate.get("src", {}).get("large2x") or candidate.get("url", "")
            if not download_url or download_url in used_urls:
                continue

            # Verify URL is reachable before committing (DDGS URLs are often stale)
            if candidate.get("source") == "ddgs":
                reachable = await _probe_url(download_url)
                if not reachable:
                    logger.debug("image_url_unreachable", url=download_url[:80])
                    continue

            ok = await _download_and_verify(
                download_url, dest,
                source=candidate["source"],
                api_key=_settings.pexels_api_key,
            )
            if ok:
                used_urls.add(download_url)
                image_assets.append(ImageAsset(
                    slide_number=slide_num,
                    source=candidate["source"],
                    original_url=download_url,
                    local_raw_path=str(dest),
                    processed_path=str(dest),
                ).model_dump())
                logger.info(
                    "image_fetched",
                    slide=slide_num,
                    source=candidate["source"],
                    query=query[:80],
                    score=round(_score_image(candidate, query), 1),
                )
                downloaded = True
                break

        if not downloaded:
            logger.warning("image_no_valid_candidate", slide=slide_num, source=source, query=query[:60])
            image_assets.append(ImageAsset(slide_number=slide_num, source="colour").model_dump())

    return {
        "image_assets": image_assets,
        "messages": state.get("messages", []) + [f"Images fetched for {len(image_assets)} slides"],
    }
