"""
DDGS (DuckDuckGo Search) Tool

A search tool using the DDGS library for web, news, and image search.
"""

from datetime import datetime, timezone
from typing import Optional, List
import asyncio
from ddgs import DDGS
from core.tools.base import BaseTool
from core.tools.schemas.ddgs_search_schema import (
    DDGSSearchInput,
    DDGSSearchOutput,
    DDGSNewsOutput,
    DDGSImageOutput,
    SearchResult,
    NewsResult,
    ImageResult,
)
from infra.logging import get_logger

logger = get_logger(__name__)


class DDGSSearch(BaseTool):
    """
    Web search tool using DDGS (DuckDuckGo Search) library.

    Features:
    - Text search with multiple backends (DuckDuckGo, Bing, Google, Brave)
    - News search with time filtering
    - Image search
    - No API keys required
    - No rate limiting issues
    """

    def __init__(self, timeout: int = 10):
        super().__init__()
        self.timeout = timeout

    def _error_output(self, error_message: str) -> DDGSSearchOutput:
        logger.error(f"Search failed: {error_message}")
        return DDGSSearchOutput(
            success=False,
            results=[],
            total_results=0,
            error=error_message
        )

    def _news_error_output(self, error_message: str) -> DDGSNewsOutput:
        logger.error(f"News search failed: {error_message}")
        return DDGSNewsOutput(
            success=False,
            results=[],
            total_results=0,
            error=error_message
        )

    def _image_error_output(self, error_message: str) -> DDGSImageOutput:
        logger.error(f"Image search failed: {error_message}")
        return DDGSImageOutput(
            success=False,
            results=[],
            total_results=0,
            error=error_message
        )

    async def execute(
        self,
        query: str,
        max_results: int = 10,
        region: str = "us-en",
        safesearch: str = "moderate",
        timelimit: Optional[str] = None,
        backend: str = "auto"
    ) -> DDGSSearchOutput:
        
        start_time = datetime.now(timezone.utc)

        try:
            search_input = DDGSSearchInput(
                query=query,
                max_results=max_results,
                region=region,
                safesearch=safesearch,
                timelimit=timelimit,
                backend=backend
            )
        except Exception as e:
            return self._error_output(f"Input validation error: {e}")

        try:
            ddgs = DDGS(timeout=self.timeout)

            raw_results = await asyncio.to_thread(
                lambda: list(ddgs.text(
                    query=search_input.query,
                    region=search_input.region,
                    safesearch=search_input.safesearch,
                    timelimit=search_input.timelimit,
                    max_results=search_input.max_results,
                    backend=search_input.backend
                ))
            )

            results = []
            for item in raw_results:
                try:
                    result = SearchResult(
                        title=item.get("title", ""),
                        url=item.get("href", ""),
                        body=item.get("body")
                    )
                    results.append(result)
                except Exception as e:
                    logger.warning(f"Skipping invalid result: {e}")
                    continue

            response_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            logger.info(f"Successfully searched for '{query}' with {backend} results: {len(results)}")

            return DDGSSearchOutput(
                success=True,
                results=results,
                total_results=len(results),
                query=search_input.query,
                error=None,
                metadata={
                    "response_time": response_time,
                    "backend": backend,
                    "region": region,
                    "timelimit": timelimit
                }
            )

        except Exception as e:
            logger.exception(f"Search failed for query: {query}")
            return self._error_output(f"Search error: {str(e)}")

    async def search_news(
        self,
        query: str,
        max_results: int = 10,
        region: str = "us-en",
        safesearch: str = "moderate",
        timelimit: Optional[str] = "w",
        backend: str = "auto"
    ) -> DDGSNewsOutput:

        start_time = datetime.now(timezone.utc)

        try:
            ddgs = DDGS(timeout=self.timeout)

            raw_results = await asyncio.to_thread(
                lambda: list(ddgs.news(
                    query=query,
                    region=region,
                    safesearch=safesearch,
                    timelimit=timelimit,
                    max_results=max_results,
                    backend=backend
                ))
            )

            results = []
            for item in raw_results:
                try:
                    pub_date = None
                    if item.get("date"):
                        try:
                            pub_date = datetime.fromisoformat(item["date"].replace("Z", "+00:00"))
                        except:
                            pass

                    result = NewsResult(
                        title=item.get("title", ""),
                        url=item.get("url", ""),
                        body=item.get("body"),
                        source=item.get("source"),
                        date=pub_date,
                        image=item.get("image")
                    )
                    results.append(result)
                except Exception as e:
                    logger.warning(f"Skipping invalid news result: {e}")
                    continue

            response_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            logger.info(f"Successfully searched news for '{query}' with {backend} results: {len(results)}")

            return DDGSNewsOutput(
                success=True,
                results=results,
                total_results=len(results),
                query=query,
                error=None,
                metadata={
                    "response_time": response_time,
                    "backend": backend,
                    "timelimit": timelimit
                }
            )

        except Exception as e:
            logger.exception(f"News search failed for query: {query}")
            return self._news_error_output(f"News search error: {str(e)}")

    async def search_images(
        self,
        query: str,
        max_results: int = 10,
        region: str = "us-en",
        safesearch: str = "moderate",
        backend: str = "auto"
    ) -> DDGSImageOutput:

        start_time = datetime.now(timezone.utc)

        try:
            ddgs = DDGS(timeout=self.timeout)

            raw_results = await asyncio.to_thread(
                lambda: list(ddgs.images(
                    query=query,
                    region=region,
                    safesearch=safesearch,
                    max_results=max_results,
                    backend=backend
                ))
            )

            results = []
            for item in raw_results:
                try:
                    result = ImageResult(
                        title=item.get("title", ""),
                        image=item.get("image", ""),
                        thumbnail=item.get("thumbnail"),
                        url=item.get("url"),
                        height=item.get("height"),
                        width=item.get("width"),
                        source=item.get("source")
                    )
                    results.append(result)
                except Exception as e:
                    logger.warning(f"Skipping invalid image result: {e}")
                    continue

            response_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            logger.info(f"Successfully searched images for '{query}' with {backend} results: {len(results)}")

            return DDGSImageOutput(
                success=True,
                results=results,
                total_results=len(results),
                query=query,
                error=None,
                metadata={
                    "response_time": response_time,
                    "backend": backend
                }
            )

        except Exception as e:
            logger.exception(f"Image search failed for query: {query}")
            return self._image_error_output(f"Image search error: {str(e)}")
