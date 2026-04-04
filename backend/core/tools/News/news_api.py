import os
import requests
import asyncio
from dotenv import load_dotenv
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from core.tools.base import BaseTool
from core.tools.schemas.news_api_schema import (
    NewsAPISearchInput,
    NewsAPISearchOutput,
    NewsArticle,
)
from infra.logging import get_logger

logger = get_logger(__name__)

NEWSAPI_BASE_URL = "https://newsapi.org/v2"
NEWSAPI_EVERYTHING_ENDPOINT = f"{NEWSAPI_BASE_URL}/everything"
NEWSAPI_TOP_HEADLINES_ENDPOINT = f"{NEWSAPI_BASE_URL}/top-headlines"
REQUEST_TIMEOUT_SECONDS = 10


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

    def _error_output(self, message: str) -> NewsAPISearchOutput:
        return NewsAPISearchOutput(success=False, error=message, articles=[], total_results=0)

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
    ) -> NewsAPISearchOutput:
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

        return NewsAPISearchOutput(
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
    ) -> NewsAPISearchOutput:
        params = {"pageSize": max_results}
        if country:
            params["country"] = country
        if category:
            params["category"] = category

        data, response_time, error = await self._request_newsapi(NEWSAPI_TOP_HEADLINES_ENDPOINT, params)
        if error:
            return self._error_output(error)

        articles = self._parse_articles(data)

        return NewsAPISearchOutput(
            success=True,
            articles=articles,
            total_results=data.get("totalResults", len(articles)),
            metadata={
                "query": {"country": country, "category": category, "max_results": max_results},
                "response_time": response_time,
                "date_retrieved": datetime.now().isoformat(),
            },
        )
