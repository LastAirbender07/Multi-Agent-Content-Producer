from typing import Literal, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from core.orchestrators.research.query_preprocessor import QueryPreprocessor, ProcessedQuery
from core.tools.Search.ddgs_search import DDGSSearch
from core.tools.News.news_api import GoogleNewsAPI, NewsAPI
from core.tools.schemas.ddgs_search_schema import ImageResult, NewsResult
from core.tools.schemas.news_api_schema import NewsArticle
from configs.settings import get_settings
from infra.logging import get_logger
import json
import httpx

logger = get_logger(__name__)
router = APIRouter(prefix="/tools", tags=["tools"])
_settings = get_settings()


# ── Query Refinement ─────────────────────────────────────────────────────────

class QueryRefineRequest(BaseModel):
    topic: str = Field(..., min_length=2)

@router.post("/query-refine", response_model=ProcessedQuery)
async def refine_query(request: QueryRefineRequest) -> ProcessedQuery:
    preprocessor = QueryPreprocessor()
    return await preprocessor.process(request.topic)


# ── Image Search ─────────────────────────────────────────────────────────────

class ImageSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    source: Literal["pexels", "ddgs"] = Field(default="pexels")
    max_results: int = Field(default=15, ge=1, le=50)

class PexelsPhoto(BaseModel):
    id: int
    url: str
    photographer: str
    photographer_url: str
    avg_color: str
    width: int
    height: int
    src: dict

class ImageSearchResponse(BaseModel):
    success: bool
    query: str
    source: str
    total_results: int
    pexels_photos: list[PexelsPhoto] = []
    ddgs_images: list[dict] = []
    error: Optional[str] = None


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
                resp = await client.get("https://api.pexels.com/v1/search", params=params,
                                        headers={"Authorization": api_key})
                resp.raise_for_status()
                data = resp.json()
            photos = [PexelsPhoto(**{
                "id": p["id"], "url": p["url"], "photographer": p["photographer"],
                "photographer_url": p["photographer_url"], "avg_color": p.get("avg_color", "#333"),
                "width": p["width"], "height": p["height"], "src": p.get("src", {}),
            }) for p in data.get("photos", [])]
            return ImageSearchResponse(success=True, query=request.query, source="pexels",
                                       total_results=data.get("total_results", len(photos)),
                                       pexels_photos=photos)
        except Exception as e:
            return ImageSearchResponse(success=False, query=request.query, source="pexels",
                                       total_results=0, error=str(e))

    else:  # ddgs
        tool = DDGSSearch()
        result = await tool.search_images(query=request.query, max_results=request.max_results)
        images = [r.model_dump() for r in result.results]
        return ImageSearchResponse(success=result.success, query=request.query, source="ddgs",
                                   total_results=result.total_results, ddgs_images=images,
                                   error=result.error)


# ── News Search ───────────────────────────────────────────────────────────────

class NewsSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    source: Literal["google", "newsapi", "ddgs"] = Field(default="google")
    max_results: int = Field(default=10, ge=1, le=30)
    when: Optional[str] = Field(default="1d", description="Google News time filter e.g. 1d, 7d, 1m")
    days_back: int = Field(default=7, description="NewsAPI days back")

class NewsArticleOut(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    url: Optional[str] = None
    source_name: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[str] = None
    url_to_image: Optional[str] = None

class NewsSearchResponse(BaseModel):
    success: bool
    query: str
    source: str
    total_results: int
    articles: list[NewsArticleOut] = []
    error: Optional[str] = None


def _article_to_out(a: NewsArticle) -> NewsArticleOut:
    return NewsArticleOut(
        title=a.title, description=a.description, content=a.content,
        url=str(a.url) if a.url else None, source_name=a.source_name,
        author=a.author,
        published_at=a.published_at.isoformat() if a.published_at else None,
        url_to_image=a.url_to_image,
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
        articles = [_article_to_out(a) for a in result.articles]
        return NewsSearchResponse(success=True, query=request.query, source="google",
                                  total_results=result.total_results, articles=articles)

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
        articles = [_article_to_out(a) for a in result.articles]
        return NewsSearchResponse(success=True, query=request.query, source="newsapi",
                                  total_results=result.total_results, articles=articles)

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
