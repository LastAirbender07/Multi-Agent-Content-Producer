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
from apps.api.v1.schemas import (
    QueryRefineRequest, NewsSearchRequest, NewsArticleOut, NewsSearchResponse,
    ImageTagsRequest, ImageTagsResponse,
)
from configs.settings import get_settings
from infra.logging import get_logger
from infra.llm.langchain_adapter import get_langchain_llm_with_retry
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
        resp = await get_langchain_llm_with_retry(
            lambda llm: llm.ainvoke([HumanMessage(content=prompt)])
        )
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


# ── Discover Topics ───────────────────────────────────────────────────────────

from datetime import datetime, timezone as _tz
from apps.api.v1.schemas import DiscoverArticle, DiscoverResponse

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
            timeout=8.0,  # hard 8s per category — don't block the whole feed
        )
        for a in result.articles:
            if not a.title or not a.url:
                continue
            # Use full content — not truncated. The LLM needs this for topic drafting.
            snippet = (a.content or a.description or "").strip()
            articles.append(DiscoverArticle(
                title=a.title,
                snippet=snippet,
                url=a.url,
                source_name=a.source_name or "",
                category=category,
                age_label=_age_label(a.published_at),
                published_at=a.published_at.isoformat() if a.published_at else None,
            ))
    except Exception as e:
        logger.warning("discover_google_failed", category=category, error=str(e)[:80])

    # DDGS fallback if Google returned nothing
    if not articles:
        try:
            ddgs_tool = DDGSSearch(timeout=6)
            result = await asyncio.wait_for(
                ddgs_tool.search_news(query=keyword, max_results=5),
                timeout=8.0,
            )
            if result.success:
                for r in result.results:
                    if not r.title or not r.url:
                        continue
                    articles.append(DiscoverArticle(
                        title=r.title,
                        snippet=(r.body or "").strip(),
                        url=r.url,
                        source_name=r.source or "",
                        category=category,
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
    Results are cached for 30 minutes. Pass ?bust=1 to force refresh.
    Each category fetches independently with a timeout — partial results are
    returned immediately rather than waiting for all 8 categories.
    """
    import time
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
    _discover_cache["expires_at"] = now + 1800  # 30 minutes

    return DiscoverResponse(articles=articles, cached=False)

# ── Topic From URL ────────────────────────────────────────────────────────────

from apps.api.v1.schemas import TopicFromUrlRequest, TopicFromUrlResponse

_TOPIC_FROM_URL_PROMPT = """\
You are a content strategist for an Instagram carousel brand called TheOpinionBoard.

A journalist found this news article:
Title: {title}
Article content:
{content}

Draft ONE compelling research question or topic statement (15-25 words) that:
- Is specific and grounded in the article's actual subject matter
- Would make a great Instagram carousel (curiosity, emotion, or surprising angle)
- Is framed as a claim, question, or insight — NOT a search keyword list
- References real entities from the article

Also determine:
- freshness: "breaking" (last 24h), "recent" (last week), or "evergreen"
- entities: list of up to 5 key named entities (people, orgs, places)

Return ONLY valid JSON, no markdown, no explanation:
{{"topic": "...", "freshness": "...", "entities": ["..."]}}"""


@router.post("/topic-from-url", response_model=TopicFromUrlResponse)
async def topic_from_url(request: TopicFromUrlRequest) -> TopicFromUrlResponse:
    """
    Use the article's full content (already fetched by the news API at discover time)
    to draft a rich research topic statement via LLM. No additional crawling needed.
    """
    # Use the snippet field — it now carries the full article content from the news API
    content_block = request.snippet.strip() if request.snippet else request.title
    prompt = _TOPIC_FROM_URL_PROMPT.format(
        title=request.title,
        content=content_block[:3000],  # cap at 3k chars to keep prompt focused
    )

    try:
        resp = await get_langchain_llm_with_retry(
            lambda llm: llm.ainvoke([HumanMessage(content=prompt)])
        )
        raw = resp.content.strip()
        import json as _json
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
        topic=request.title,
        freshness="recent",
        entities=[],
        crawl_failed=True,
    )

