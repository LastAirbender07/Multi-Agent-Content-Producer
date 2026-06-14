"""Image search, tag extraction and download endpoints."""
import re

import httpx
from fastapi import APIRouter

from apps.api.v1.schemas import ImageTagsRequest, ImageTagsResponse
from configs.settings import get_settings
from core.tools.Image.image_downloader import download_images as _download_images
from core.tools.Search.ddgs_search import DDGSSearch
from core.tools.Search.multi_search import ddgs_multi_search
from core.tools.schemas.image_schema import (
    ImageDownloadRequest,
    ImageDownloadResponse,
    ImageSearchRequest,
    ImageSearchResponse,
    PexelsPhoto,
)
from infra.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()
_settings = get_settings()


# ── Image Tags ────────────────────────────────────────────────────────────────

def _extract_tags(query: str) -> list[str]:
    """Heuristic entity extraction — no LLM, instant response."""
    query = query.strip()
    if not query:
        return []
    stopwords = set(_settings.image_tag_stopwords)
    tokens = re.split(r"\s+", query)
    tags: list[str] = []
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        if tok and tok[0].isupper():
            group = [tok]
            j = i + 1
            while j < len(tokens) and tokens[j] and tokens[j][0].isupper():
                group.append(tokens[j])
                j += 1
            tags.append(" ".join(group))
            i = j
        else:
            if len(tok) > 3 and tok.lower() not in stopwords:
                tags.append(tok.lower())
            i += 1
    if not tags:
        tags = [query]
    return tags[:_settings.image_max_tags]


@router.post("/images/tags", response_model=ImageTagsResponse)
async def extract_image_tags(request: ImageTagsRequest) -> ImageTagsResponse:
    return ImageTagsResponse(tags=_extract_tags(request.query))


# ── Image Search ──────────────────────────────────────────────────────────────

@router.post("/images", response_model=ImageSearchResponse)
async def search_images(request: ImageSearchRequest) -> ImageSearchResponse:
    if request.source == "pexels":
        api_key = _settings.pexels_api_key
        if not api_key:
            return ImageSearchResponse(success=False, query=request.query, source="pexels",
                                       total_results=0, error="Pexels API key not configured")
        params = {"query": request.query, "per_page": min(request.max_results, 80),
                  "orientation": "square", "size": "large", "page": 1}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(f"{_settings.pexels_base_url}/search", params=params,
                                        headers={"Authorization": api_key})
                resp.raise_for_status()
                data = resp.json()
            photos = [PexelsPhoto(
                id=p["id"], url=p["url"], photographer=p["photographer"],
                photographer_url=p["photographer_url"], avg_color=p.get("avg_color", "#333"),
                width=p["width"], height=p["height"], src=p.get("src", {}),
            ) for p in data.get("photos", [])]
            return ImageSearchResponse(success=True, query=request.query, source="pexels",
                                       total_results=data.get("total_results", len(photos)),
                                       pexels_photos=photos)
        except Exception as e:
            return ImageSearchResponse(success=False, query=request.query, source="pexels",
                                       total_results=0, error=str(e))
    else:
        if request.queries and len(request.queries) > 1:
            images = await ddgs_multi_search(
                request.queries, request.max_results, request.query,
                relevance_threshold=_settings.image_relevance_threshold,
            )
            return ImageSearchResponse(success=True, query=request.query, source="ddgs",
                                       total_results=len(images), ddgs_images=images)
        else:
            tool = DDGSSearch()
            result = await tool.search_images(query=request.query, max_results=request.max_results)
            return ImageSearchResponse(
                success=result.success, query=request.query, source="ddgs",
                total_results=result.total_results,
                ddgs_images=[r.model_dump() for r in result.results],
                error=result.error,
            )


# ── Image Download ────────────────────────────────────────────────────────────

@router.post("/images/download", response_model=ImageDownloadResponse)
async def download_images(request: ImageDownloadRequest) -> ImageDownloadResponse:
    result = await _download_images(urls=request.urls, save_dir=request.save_dir)
    return ImageDownloadResponse(**result)
