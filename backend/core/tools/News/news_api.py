import os
import re
import requests
import asyncio
from dotenv import load_dotenv
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from email.utils import parsedate_to_datetime
import trafilatura
from html import unescape
from core.tools.base import BaseTool
from core.tools.schemas.news_api_schema import (
    GoogleNewsAPISearchInput,
    NewsAPISearchInput,
    NewsSearchOutput,
    NewsArticle,
)
from google_news_api import AsyncGoogleNewsClient
from google_news_api.exceptions import (
    ConfigurationError,
    ValidationError,
    HTTPError,
    RateLimitError,
    ParsingError
)
from infra.logging import get_logger

logger = get_logger(__name__)

NEWSAPI_BASE_URL = "https://newsapi.org/v2"
NEWSAPI_EVERYTHING_ENDPOINT = f"{NEWSAPI_BASE_URL}/everything"
NEWSAPI_TOP_HEADLINES_ENDPOINT = f"{NEWSAPI_BASE_URL}/top-headlines"
REQUEST_TIMEOUT_SECONDS = 10

GOOGLE_NEWS_VALID_TOPICS = ["WORLD", "NATION", "BUSINESS", "TECHNOLOGY", "ENTERTAINMENT", "SPORTS", "SCIENCE", "HEALTH"]

async def fetch_article_content(url: str, timeout: int = 10) -> Optional[str]:
    """
    Fetch and extract article content from URL using trafilatura.
    Processed sequentially to avoid connection pool issues.
    """
    try:
        def _fetch():
            downloaded = trafilatura.fetch_url(url)
            if not downloaded:
                return None

            content = trafilatura.extract(
                downloaded,
                include_comments=False,
                include_tables=False,
                no_fallback=False
            )
            return content

        content = await asyncio.wait_for(asyncio.to_thread(_fetch), timeout=timeout)
        return content.strip() if content else None

    except asyncio.TimeoutError:
        logger.debug(f"Timeout fetching article: {url}")
        return None

    except Exception as e:
        logger.debug(f"Failed to fetch article from {url}: {str(e)}")
        return None                                                                                 
                                                                                                      
                                                                                                      
def clean_html(text: str) -> str:                                                                                                                           
    if not text: return ""                                                                                   
                                                                                                                                                                         
    text = unescape(text)                                                                           
    text = re.sub(r'<[^>]+>', '', text)                                                             
    text = ' '.join(text.split())                                                                   
                                                                                                      
    return text.strip()

class GoogleNewsAPI(BaseTool):
    def __init__(
        self, 
        language: str = "en",
        country: str = "us",
        requests_per_minute: int = 60,
        cache_ttl: int = 300
    ):
        super().__init__()
        self.language = language
        self.country = country
        self.requests_per_minute = requests_per_minute
        self.cache_ttl = cache_ttl
        self.client = None

    def _error_output(self, message: str) -> NewsSearchOutput:
        return NewsSearchOutput(success=False, error=message, articles=[], total_results=0)
    
    async def convert_to_pydantic_article(self, article_dict: dict) -> NewsArticle:
        """Convert article dict to NewsArticle, fetching full content from URL."""
        published_at = parsedate_to_datetime(article_dict.get("published"))
        summary = clean_html(article_dict.get("summary", ""))
        content = summary

        # Get Google News redirect URL
        google_news_url = article_dict.get("link")
        real_url = None

        if google_news_url:
            # Step 1: Decode Google News URL to get real article URL
            try:
                if self.client:
                    real_url = await self.client.decode_url(str(google_news_url))
                else:
                    logger.warning("Client not initialized; cannot decode URL")

                if real_url:
                    logger.info(f"  → Decoded to: {real_url}")

                    # Step 2: Fetch full content from real article URL
                    full_content = await fetch_article_content(real_url)

                    if full_content and len(full_content) > len(summary):
                        content = full_content
                        logger.info(f"  ✓ Fetched full content ({len(full_content)} chars)")
                    else:
                        logger.info(f"  ✗ Content fetch failed, using summary ({len(summary)} chars)")
                else:
                    logger.warning(f"  ✗ Could not decode URL: {google_news_url}")
                    logger.info(f"  → Using summary ({len(summary)} chars)")

            except Exception as e:
                logger.warning(f"  ✗ Error decoding/fetching: {str(e)}", exc_info=True)

        return NewsArticle(
            title=article_dict.get("title"),
            description=summary,
            content=content,
            url=real_url or google_news_url,
            source_name=article_dict.get("source"),
            author=None,
            published_at=published_at,
            url_to_image=None,
            relevance_score=None
        )



    async def execute(
        self,
        query: Optional[str] = None,
        topic: Optional[str] = None,
        max_results: int = 10,
        language: Optional[str] = None,
        country: Optional[str] = None,
        when: Optional[str] = None,
        after: Optional[str] = None,
        before: Optional[str] = None,
    ) -> GoogleNewsAPISearchInput:
        
        try:
            search_input = GoogleNewsAPISearchInput(
                query=query,
                topic=topic,
                max_results=max_results,
                language=language,
                country=country,
                when=when,
                after=after,
                before=before
            )
        except Exception as e:
            return self._error_output(str(e))
        
        if not search_input.query and search_input.topic and search_input.topic.upper() not in GOOGLE_NEWS_VALID_TOPICS:
            return self._error_output(f"Invalid topic '{search_input.topic}'. Valid topics are: {', '.join(GOOGLE_NEWS_VALID_TOPICS)}")
        
        try:
            async with AsyncGoogleNewsClient(
                language=search_input.language or self.language,
                country=search_input.country or self.country,
                requests_per_minute=self.requests_per_minute,
                cache_ttl=self.cache_ttl
            ) as client:
                self.client = client

                search_kwargs = {
                    "when": search_input.when,
                    "after": search_input.after,
                    "before": search_input.before,
                    "max_results": search_input.max_results
                }

                if search_input.query:
                    raw_articles = await client.search(query=search_input.query, **search_kwargs)
                elif search_input.topic:
                    raw_articles = await client.search(topic=search_input.topic.upper(), **search_kwargs)
                else:
                    # Top stories if no query or topic provided
                    raw_articles = await client.search(**search_kwargs)

                # Process articles sequentially (reliable, no connection pool warnings)
                articles = []
                total = len(raw_articles)

                logger.info(f"Processing {total} articles sequentially...")

                for idx, article_dict in enumerate(raw_articles, 1):
                    article_title = article_dict.get('title', 'Unknown')[:60]
                    logger.info(f"[{idx}/{total}] Processing: {article_title}...")

                    article = await self.convert_to_pydantic_article(article_dict)
                    articles.append(article)

                logger.info(f"✓ Successfully processed {len(articles)} articles")

                metadata = {
                    "query": search_input.dict(),
                    "topic": search_input.topic,
                    "response_time": None,
                    "language": search_input.language,
                    "country": search_input.country,
                    "when": search_input.when,
                    "after": search_input.after.isoformat() if search_input.after else None,
                    "before": search_input.before.isoformat() if search_input.before else None,
                    "cache_ttl": self.cache_ttl,
                    "retrived_at": datetime.now().isoformat(),
                    "retrieval_method": "GoogleNewsAPI",
                }

                return NewsSearchOutput(
                    success=True,
                    articles=articles,
                    total_results=len(articles),
                    metadata=metadata
                )
            
        except RateLimitError as e:
            return self._error_output(f"Rate limit exceeded: {str(e)}")
        except HTTPError as e:
            return self._error_output(f"HTTP error: {str(e)}")
        except ValidationError as e:
            return self._error_output(f"Validation error: {str(e)}")
        except ParsingError as e:
            return self._error_output(f"Parsing error: {str(e)}")
        except ConfigurationError as e:
            return self._error_output(f"Configuration error: {str(e)}")
        except Exception as e:
            return self._error_output(f"An unexpected error occurred: {str(e)}")



class NewsAPI(BaseTool):
    def __init__(self):
        super().__init__()
        load_dotenv()
        self.api_key = os.getenv("NEWSAPI_API_KEY")

        if not self.api_key:
            raise ValueError("NEWSAPI_API_KEY is not set in the environment variables")

        self.headers = {
            "X-Api-Key": self.api_key,
            "User-Agent": "Multi-Agent-Content-Producer",
        }

    def _error_output(self, message: str) -> NewsSearchOutput:
        return NewsSearchOutput(success=False, error=message, articles=[], total_results=0)

    async def _request_newsapi(
        self, endpoint: str, params: Dict[str, Any]
    ) -> Tuple[Optional[Dict[str, Any]], Optional[float], Optional[str]]:
        try:
            response = await asyncio.to_thread(
                requests.get,
                endpoint,
                headers=self.headers,
                params=params,
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            data = response.json()
        except requests.exceptions.Timeout:
            return None, None, f"Request timed out after {REQUEST_TIMEOUT_SECONDS} seconds"
        except requests.exceptions.HTTPError as e:
            return None, None, f"HTTP error occurred: {str(e)}"
        except Exception as e:
            return None, None, f"An error occurred: {str(e)}"

        if data.get("status") != "ok":
            return None, None, f"API error: {data.get('message', 'Unknown error')}"

        return data, response.elapsed.total_seconds(), None

    def _parse_article(self, item: Dict[str, Any]) -> Optional[NewsArticle]:
        try:
            published_at_raw = item.get("publishedAt")
            published_at = None
            if published_at_raw:
                published_at = datetime.fromisoformat(published_at_raw.replace("Z", "+00:00"))

            return NewsArticle(
                title=item.get("title"),
                description=item.get("description"),
                content=item.get("content"),
                url=item.get("url"),
                source_name=item.get("source", {}).get("name"),
                author=item.get("author"),
                published_at=published_at,
                url_to_image=item.get("urlToImage"),
            )
        except Exception as e:
            logger.warning(f"Skipping article due to parsing error: {str(e)}")
            return None

    def _parse_articles(self, data: Dict[str, Any]) -> List[NewsArticle]:
        articles: List[NewsArticle] = []
        for item in data.get("articles", []):
            article = self._parse_article(item)
            if article:
                articles.append(article)
        return articles

    async def execute(
        self,
        query: str,
        max_results: int = 10,
        language: Optional[str] = "en",
        sort_by: str = "relevancy",
        days_back: int = 7,
        sources: Optional[List[str]] = None,
        domains: Optional[List[str]] = None,
    ) -> NewsSearchOutput:
        try:
            search_input = NewsAPISearchInput(
                query=query,
                max_results=max_results,
                language=language,
                sort_by=sort_by,
                days_back=days_back,
                sources=sources,
                domains=domains,
            )
        except Exception as e:
            return self._error_output(str(e))

        to_date = datetime.now()
        from_date = to_date - timedelta(days=search_input.days_back)

        params = {
            "q": search_input.query,
            "from": from_date.strftime("%Y-%m-%d"),
            "to": to_date.strftime("%Y-%m-%d"),
            "sortBy": search_input.sort_by,
            "pageSize": search_input.max_results,
        }

        if search_input.language:
            params["language"] = search_input.language
        if search_input.sources:
            params["sources"] = ",".join(search_input.sources)
        if search_input.domains:
            params["domains"] = ",".join(search_input.domains)

        data, response_time, error = await self._request_newsapi(NEWSAPI_EVERYTHING_ENDPOINT, params)
        if error:
            return self._error_output(error)

        articles = self._parse_articles(data)

        return NewsSearchOutput(
            success=True,
            articles=articles,
            total_results=data.get("totalResults", len(articles)),
            metadata={
                "query": search_input.dict(),
                "response_time": response_time,
                "date_range": {"from": from_date.isoformat(), "to": to_date.isoformat()},
                "language": search_input.language,
                "sort_by": search_input.sort_by,
                "sources": search_input.sources,
                "domains": search_input.domains,
            },
        )

    async def get_top_headlines(
        self,
        country: Optional[str] = None,
        category: Optional[str] = None,
        max_results: int = 20,
    ) -> NewsSearchOutput:
        params = {"pageSize": max_results}
        if country:
            params["country"] = country
        if category:
            params["category"] = category

        data, response_time, error = await self._request_newsapi(NEWSAPI_TOP_HEADLINES_ENDPOINT, params)
        if error:
            return self._error_output(error)

        articles = self._parse_articles(data)

        return NewsSearchOutput(
            success=True,
            articles=articles,
            total_results=data.get("totalResults", len(articles)),
            metadata={
                "query": {"country": country, "category": category, "max_results": max_results},
                "response_time": response_time,
                "date_retrieved": datetime.now().isoformat(),
            },
        )
