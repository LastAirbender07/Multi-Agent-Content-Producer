from fastapi import APIRouter
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
import httpx

logger = get_logger(__name__)
router = APIRouter(prefix="/tools", tags=["tools"])
_settings = get_settings()
_PEXELS_BASE = "https://api.pexels.com/v1"


# ── Query Refinement ──────────────────────────────────────────────────────────

@router.post("/query-refine", response_model=ProcessedQuery)
async def refine_query(request: QueryRefineRequest) -> ProcessedQuery:
    return await QueryPreprocessor().process(request.topic)


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
