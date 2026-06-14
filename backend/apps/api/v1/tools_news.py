"""News search, discovery and topic-extraction endpoints."""
import json as _json
import re

from fastapi import APIRouter
from langchain_core.messages import HumanMessage

from apps.api.v1.schemas import (
    DiscoverResponse,
    NewsSearchRequest,
    NewsArticleOut,
    NewsSearchResponse,
    TopicFromUrlRequest,
    TopicFromUrlResponse,
)
from core.prompts.prompt_loader import load_prompt
from core.tools.News.discovery import discover_topics as svc_discover
from core.tools.News.news_api import GoogleNewsAPI, NewsAPI
from core.tools.Search.ddgs_search import DDGSSearch
from core.tools.schemas.news_api_schema import NewsArticle
from configs.settings import get_settings
from infra.llm.langchain_adapter import get_langchain_llm_with_retry
from infra.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()
_settings = get_settings()


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
        result = await tool.execute(query=request.query, max_results=request.max_results, when=request.when)
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


# ── Discover Topics ───────────────────────────────────────────────────────────

@router.get("/news/discover", response_model=DiscoverResponse)
async def discover_topics_endpoint(bust: int = 0) -> DiscoverResponse:
    """Return latest news across categories. Cached 30 min; pass ?bust=1 to refresh."""
    return await svc_discover(bust=bool(bust), ttl_seconds=_settings.discover_cache_ttl_seconds)


# ── Topic From URL ────────────────────────────────────────────────────────────

@router.post("/topic-from-url", response_model=TopicFromUrlResponse)
async def topic_from_url(request: TopicFromUrlRequest) -> TopicFromUrlResponse:
    """Draft a rich research topic statement from an article's full content via LLM."""
    content_block = request.snippet.strip() if request.snippet else request.title
    prompt = load_prompt("topic_from_url", title=request.title, content=content_block[:3000])

    try:
        resp = await get_langchain_llm_with_retry(
            lambda llm: llm.ainvoke([HumanMessage(content=prompt)])
        )
        raw = resp.content.strip()
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            parsed = _json.loads(match.group())
            return TopicFromUrlResponse(
                topic=parsed.get("topic", request.title),
                freshness=parsed.get("freshness", "recent"),
                entities=parsed.get("entities", []),
                crawl_failed=False,
            )
    except Exception as e:
        logger.warning("topic_from_url_llm_failed", error=str(e)[:80])

    return TopicFromUrlResponse(
        topic=request.title, freshness="recent", entities=[], crawl_failed=True,
    )
