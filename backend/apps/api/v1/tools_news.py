import asyncio
import json as _json
import re
import time
from datetime import datetime, timezone as _tz

from fastapi import APIRouter
from langchain_core.messages import HumanMessage

from apps.api.v1.schemas import (
    DiscoverArticle,
    DiscoverResponse,
    NewsSearchRequest,
    NewsArticleOut,
    NewsSearchResponse,
    TopicFromUrlRequest,
    TopicFromUrlResponse,
)
from core.prompts.prompt_loader import load_prompt
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

_discover_cache: dict = {"data": None, "expires_at": 0.0}

_DISCOVER_CATEGORIES = [
    ("technology AI", "technology"),
    ("India business economy", "business"),
    ("Indian politics", "politics"),
    ("cricket sports India", "sports"),
    ("science environment", "science"),
    ("Bollywood entertainment", "entertainment"),
    ("startup funding India", "startups"),
    ("world news today", "world"),
]


def _age_label(published_at: object | None) -> str:
    if not published_at:
        return "Recent"
    try:
        if isinstance(published_at, str):
            dt = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
        else:
            dt = published_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=_tz.utc)
        delta = datetime.now(_tz.utc) - dt
        secs = delta.total_seconds()
        if secs < 3600:
            return f"{int(secs // 60)}m ago"
        if secs < 86400:
            return f"{int(secs // 3600)}h ago"
        if secs < 172800:
            return "Yesterday"
        return f"{int(secs // 86400)}d ago"
    except Exception:
        return "Recent"


async def _fetch_category(keyword: str, category: str) -> list[DiscoverArticle]:
    articles = []
    try:
        tool = GoogleNewsAPI()
        result = await asyncio.wait_for(
            tool.execute(query=keyword, max_results=8, when="3d"),
            timeout=8.0,
        )
        for a in result.articles:
            if not a.title or not a.url:
                continue
            snippet = (a.content or a.description or "").strip()
            articles.append(DiscoverArticle(
                title=a.title, snippet=snippet, url=a.url,
                source_name=a.source_name or "", category=category,
                age_label=_age_label(a.published_at),
                published_at=a.published_at.isoformat() if a.published_at else None,
            ))
    except Exception as e:
        logger.warning("discover_google_failed", category=category, error=str(e)[:80])

    if not articles:
        try:
            ddgs_tool = DDGSSearch(timeout=6)
            result = await asyncio.wait_for(
                ddgs_tool.search_news(query=keyword, max_results=5), timeout=8.0,
            )
            if result.success:
                for r in result.results:
                    if not r.title or not r.url:
                        continue
                    articles.append(DiscoverArticle(
                        title=r.title, snippet=(r.body or "").strip(), url=r.url,
                        source_name=r.source or "", category=category,
                        age_label=_age_label(r.date),
                        published_at=r.date.isoformat() if r.date else None,
                    ))
        except Exception as e:
            logger.warning("discover_ddgs_failed", category=category, error=str(e)[:80])

    return articles


@router.get("/news/discover", response_model=DiscoverResponse)
async def discover_topics(bust: int = 0) -> DiscoverResponse:
    """
    Return latest news across categories for topic discovery.
    Cached 30 minutes. Pass ?bust=1 to force refresh.
    """
    now = time.time()
    if bust == 0 and _discover_cache["data"] and now < _discover_cache["expires_at"]:
        return DiscoverResponse(articles=_discover_cache["data"], cached=True)

    results = await asyncio.gather(
        *[_fetch_category(kw, cat) for kw, cat in _DISCOVER_CATEGORIES],
        return_exceptions=True,
    )

    seen_urls: set[str] = set()
    articles: list[DiscoverArticle] = []
    for batch in results:
        if isinstance(batch, Exception):
            continue
        for a in batch:
            if a.url not in seen_urls:
                seen_urls.add(a.url)
                articles.append(a)

    articles.sort(key=lambda a: a.published_at or "", reverse=True)
    articles = articles[:60]
    _discover_cache["data"] = articles
    _discover_cache["expires_at"] = now + _settings.discover_cache_ttl_seconds

    return DiscoverResponse(articles=articles, cached=False)


# ── Topic From URL ────────────────────────────────────────────────────────────

@router.post("/topic-from-url", response_model=TopicFromUrlResponse)
async def topic_from_url(request: TopicFromUrlRequest) -> TopicFromUrlResponse:
    """
    Use the article's full content (already fetched by the news API at discover time)
    to draft a rich research topic statement via LLM.
    """
    content_block = request.snippet.strip() if request.snippet else request.title
    prompt = load_prompt(
        "topic_from_url",
        title=request.title,
        content=content_block[:3000],
    )

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
