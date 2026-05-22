from fastapi import APIRouter
from pydantic import BaseModel
from core.orchestrators.research.query_preprocessor import QueryPreprocessor, ProcessedQuery
from core.tools.Search.ddgs_search import DDGSSearch
from core.tools.News.news_api import GoogleNewsAPI, NewsAPI
from core.tools.schemas.news_api_schema import NewsArticle
from core.tools.schemas.image_schema import (
    ImageSearchRequest, ImageSearchResponse, PexelsPhoto,
    ImageDownloadRequest, ImageDownloadResponse,
)
from core.tools.Image.image_downloader import download_images as _download_images
from apps.api.v1.schemas import QueryRefineRequest, NewsSearchRequest, NewsArticleOut, NewsSearchResponse
from configs.settings import get_settings
from infra.logging import get_logger
from infra.llm.langchain_adapter import get_langchain_llm
from langchain_core.messages import HumanMessage
import httpx
import asyncio
import re

logger = get_logger(__name__)
router = APIRouter(prefix="/tools", tags=["tools"])
_settings = get_settings()
_PEXELS_BASE = "https://api.pexels.com/v1"


# ── Query Refinement ──────────────────────────────────────────────────────────

@router.post("/query-refine", response_model=ProcessedQuery)
async def refine_query(request: QueryRefineRequest) -> ProcessedQuery:
    return await QueryPreprocessor().process(request.topic)


# ── Image Tags ────────────────────────────────────────────────────────────────

class ImageTagsRequest(BaseModel):
    query: str


class ImageTagsResponse(BaseModel):
    tags: list[str]


def _extract_tags(query: str) -> list[str]:
    """Heuristic entity extraction — no LLM, instant response."""
    query = query.strip()
    if not query:
        return []

    tokens = re.split(r"\s+", query)
    tags: list[str] = []
    i = 0
    # Group consecutive tokens where each starts with a capital or is fully uppercase
    while i < len(tokens):
        tok = tokens[i]
        if tok and tok[0].isupper():
            # Accumulate consecutive title-cased tokens as one entity
            group = [tok]
            j = i + 1
            while j < len(tokens) and tokens[j] and tokens[j][0].isupper():
                group.append(tokens[j])
                j += 1
            tags.append(" ".join(group))
            i = j
        else:
            # Lowercase tokens become individual tags if non-trivial
            if len(tok) > 3 and tok.lower() not in {"with", "from", "that", "this", "about", "into", "over", "under"}:
                tags.append(tok.lower())
            i += 1

    # If no tags extracted (all lowercase), just return the whole query as one tag
    if not tags:
        tags = [query]

    return tags[:5]


@router.post("/images/tags", response_model=ImageTagsResponse)
async def extract_image_tags(request: ImageTagsRequest) -> ImageTagsResponse:
    tags = _extract_tags(request.query)
    return ImageTagsResponse(tags=tags)


# ── Image Search ──────────────────────────────────────────────────────────────

async def _ddgs_multi_search(
    queries: list[str],
    max_results: int,
    original_query: str,
) -> list[dict]:
    """Run multiple DDGS image queries in parallel, dedup, then LLM-filter."""
    tool = DDGSSearch()

    async def fetch(q: str) -> list:
        try:
            out = await tool.search_images(query=q, max_results=30)
            return [r.model_dump() for r in out.results] if out.success else []
        except Exception:
            return []

    batches = await asyncio.gather(*[fetch(q) for q in queries])

    # Merge + dedup by image URL
    seen: set[str] = set()
    merged: list[dict] = []
    for batch in batches:
        for item in batch:
            url = item.get("image", "")
            if url and url not in seen:
                seen.add(url)
                merged.append(item)

    if not merged:
        return merged

    # LLM relevance filter — drop obviously irrelevant results
    try:
        pairs = [{"title": m.get("title", ""), "url": m.get("image", "")} for m in merged[:60]]
        prompt = (
            f'Filter image search results for the query: "{original_query}".\n'
            "Return ONLY the URLs that are genuinely relevant (relevance ≥ 0.4).\n"
            f"Input JSON:\n{pairs}\n\n"
            "Output: a JSON array of relevant image URLs only, e.g. [\"url1\", \"url2\"]. "
            "Return an empty array [] if none are relevant. No explanation."
        )
        llm = get_langchain_llm()
        resp = await llm.ainvoke([HumanMessage(content=prompt)])
        raw = resp.content.strip()
        # Extract JSON array from response
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if match:
            import json
            relevant_urls: set[str] = set(json.loads(match.group()))
            merged = [m for m in merged if m.get("image", "") in relevant_urls] or merged
    except Exception as e:
        logger.warning("ddgs_llm_filter_failed", error=str(e))

    return merged[:max_results]


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
                resp = await client.get(f"{_PEXELS_BASE}/search", params=params,
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
            images = await _ddgs_multi_search(request.queries, request.max_results, request.query)
            return ImageSearchResponse(
                success=True, query=request.query, source="ddgs",
                total_results=len(images),
                ddgs_images=images,
            )
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


# ── News Search ───────────────────────────────────────────────────────────────

def _to_article_out(a: NewsArticle) -> NewsArticleOut:
    return NewsArticleOut(
        title=a.title, description=a.description, content=a.content,
        url=str(a.url) if a.url else None, source_name=a.source_name,
        author=a.author,
        published_at=a.published_at.isoformat() if a.published_at else None,
        url_to_image=str(a.url_to_image) if a.url_to_image else None,
    )


@router.post("/news", response_model=NewsSearchResponse)
async def search_news(request: NewsSearchRequest) -> NewsSearchResponse:
    if request.source == "google":
        tool = GoogleNewsAPI()
        result = await tool.execute(query=request.query, max_results=request.max_results,
                                    when=request.when)
        if not result.success:
            return NewsSearchResponse(success=False, query=request.query, source="google",
                                      total_results=0, error=result.error)
        return NewsSearchResponse(success=True, query=request.query, source="google",
                                  total_results=result.total_results,
                                  articles=[_to_article_out(a) for a in result.articles])

    elif request.source == "newsapi":
        try:
            tool = NewsAPI()
        except ValueError as e:
            return NewsSearchResponse(success=False, query=request.query, source="newsapi",
                                      total_results=0, error=str(e))
        result = await tool.execute(query=request.query, max_results=request.max_results,
                                    days_back=request.days_back)
        if not result.success:
            return NewsSearchResponse(success=False, query=request.query, source="newsapi",
                                      total_results=0, error=result.error)
        return NewsSearchResponse(success=True, query=request.query, source="newsapi",
                                  total_results=result.total_results,
                                  articles=[_to_article_out(a) for a in result.articles])

    else:  # ddgs
        tool = DDGSSearch()
        result = await tool.search_news(query=request.query, max_results=request.max_results)
        if not result.success:
            return NewsSearchResponse(success=False, query=request.query, source="ddgs",
                                      total_results=0, error=result.error)
        articles = [NewsArticleOut(
            title=r.title, description=r.body, url=r.url,
            source_name=r.source,
            published_at=r.date.isoformat() if r.date else None,
            url_to_image=r.image,
        ) for r in result.results]
        return NewsSearchResponse(success=True, query=request.query, source="ddgs",
                                  total_results=result.total_results, articles=articles)
