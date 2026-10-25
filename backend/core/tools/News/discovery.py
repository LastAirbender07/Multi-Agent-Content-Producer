"""
News topic discovery service — fetches articles across categories for the Discover drawer.

Extracts the multi-source fetch logic from the API layer so it can be
reused, tested, and maintained independently.
"""
import asyncio
import time

from apps.api.v1.schemas import DiscoverArticle, DiscoverResponse
from core.tools.News.news_api import GoogleNewsAPI
from core.tools.Search.ddgs_search import DDGSSearch
from core.utils.time_utils import age_label
from infra.logging import get_logger

logger = get_logger(__name__)

# Category keyword → display label mapping
# Broad global queries — India represented but not exclusively.
DISCOVER_CATEGORIES: list[tuple[str, str]] = [
    # ── Tech & AI ─────────────────────────────────────────────────────────────
    ("artificial intelligence machine learning",       "AI"),
    ("technology product launch software",             "tech"),
    ("cybersecurity data privacy hack",                "cybersecurity"),
    # ── Finance & Markets ─────────────────────────────────────────────────────
    ("stock market investing Wall Street",             "stocks"),
    ("personal finance money tips",                    "personal-finance"),
    ("cryptocurrency bitcoin blockchain",              "crypto"),
    ("India stock market NSE BSE Sensex Nifty",       "india-stocks"),
    # ── Business & Startups ───────────────────────────────────────────────────
    ("global business economy",                        "business"),
    ("India startup funding VC",                       "india-startups"),
    ("startup founder entrepreneur",                   "startups"),
    # ── Science & Health ──────────────────────────────────────────────────────
    ("science research discovery breakthrough",        "science"),
    ("health medicine nutrition fitness",              "health"),
    ("mental health psychology wellbeing",             "mental-health"),
    ("space exploration NASA SpaceX astronomy",        "space"),
    # ── Education & Learning ──────────────────────────────────────────────────
    ("education learning schools universities",        "education"),
    ("online learning edtech skills",                  "edtech"),
    # ── World & Politics ──────────────────────────────────────────────────────
    ("world news geopolitics international",           "world"),
    ("US politics White House policy",                 "us-politics"),
    ("Europe news EU policy",                          "europe"),
    ("India politics government",                      "india-politics"),
    # ── Sports ────────────────────────────────────────────────────────────────
    ("cricket IPL India sports",                       "cricket"),
    ("football soccer Premier League FIFA",            "football"),
    ("sports highlights results",                      "sports"),
    # ── Entertainment & Pop Culture ───────────────────────────────────────────
    ("Hollywood movies film reviews",                  "movies"),
    ("Bollywood India film music",                     "bollywood"),
    ("Netflix Amazon Prime streaming series",          "streaming"),
    ("music album artist tour",                        "music"),
    # ── Comics, Anime & Geek Culture ─────────────────────────────────────────
    ("Marvel DC comics superhero movie",               "marvel-dc"),
    ("anime manga Japan animation",                    "anime"),
    ("cartoon animation studio Pixar Disney",          "cartoons"),
    ("video games gaming console release",             "gaming"),
    # ── Mythology, History & Ancient Worlds ──────────────────────────────────
    ("mythology myths legends ancient gods",           "mythology"),
    ("Hindu mythology Ramayana Mahabharata",           "hindu-mythology"),
    ("Greek Roman Norse mythology stories",            "world-mythology"),
    ("ancient history civilizations archaeology",      "ancient-history"),
    ("folklore legends supernatural stories",          "folklore"),
    # ── Environment & Society ─────────────────────────────────────────────────
    ("climate change environment sustainability",      "climate"),
    ("social media trends viral",                      "social"),
    ("food culture travel lifestyle",                  "lifestyle"),
]

# Simple in-memory cache: {data, expires_at}
_cache: dict = {"data": None, "expires_at": 0.0}


async def fetch_category(keyword: str, category: str) -> list[DiscoverArticle]:
    """Fetch up to 8 articles for one discover category. Falls back to DDGS if Google fails."""
    articles: list[DiscoverArticle] = []

    try:
        tool = GoogleNewsAPI()
        result = await asyncio.wait_for(
            tool.execute(query=keyword, max_results=6, when="2d"),
            timeout=8.0,
        )
        for a in result.articles:
            if not a.title or not a.url:
                continue
            articles.append(DiscoverArticle(
                title=a.title,
                snippet=(a.content or a.description or "").strip(),
                url=a.url,
                source_name=a.source_name or "",
                category=category,
                age_label=age_label(a.published_at),
                published_at=a.published_at.isoformat() if a.published_at else None,
            ))
    except Exception as e:
        logger.warning("discover_google_failed", category=category, error=str(e)[:80])

    if not articles:
        try:
            ddgs = DDGSSearch(timeout=6)
            result = await asyncio.wait_for(
                ddgs.search_news(query=keyword, max_results=5), timeout=8.0,
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
                        age_label=age_label(r.date),
                        published_at=r.date.isoformat() if r.date else None,
                    ))
        except Exception as e:
            logger.warning("discover_ddgs_failed", category=category, error=str(e)[:80])

    return articles


async def discover_topics(bust: bool = False, ttl_seconds: int = 1800) -> DiscoverResponse:
    """
    Return latest news across all categories.
    Results are cached for `ttl_seconds`. Pass bust=True to force refresh.
    """
    now = time.time()
    if not bust and _cache["data"] and now < _cache["expires_at"]:
        return DiscoverResponse(articles=_cache["data"], cached=True)

    results = await asyncio.gather(
        *[fetch_category(kw, cat) for kw, cat in DISCOVER_CATEGORIES],
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
    articles = articles[:150]
    _cache["data"] = articles
    _cache["expires_at"] = now + ttl_seconds

    return DiscoverResponse(articles=articles, cached=False)
