import asyncio
from typing import List
from datetime import datetime, timezone
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
from core.tools.base import BaseTool
from core.tools.schemas.crawl4ai_scraper_schema import (
    Crawl4AIScraperInput,
    Crawl4AIScraperOutput,
    Crawl4AIScrapedContent,
    LinkInfo,
    ImageInfo
)
from infra.logging import get_logger

logger = get_logger(__name__)


class Crawl4AIScraper(BaseTool):
    def __init__(self, verbose: bool = False):
        super().__init__()
        self.verbose = verbose

    def _error_output(self, error_message: str) -> Crawl4AIScraperOutput:
        logger.error(f"Scraping failed: {error_message}")
        return Crawl4AIScraperOutput(
            success=False,
            content=None,
            error=error_message,
        )

    def _extract_links(self, links_dict: dict, max_links: int = 50) -> tuple[List[LinkInfo], List[LinkInfo]]:
        internal_links = []
        external_links = []

        try:
            # Process internal links
            for link in links_dict.get('internal', [])[:max_links]:
                internal_links.append(LinkInfo(
                    href=link.get('href', ''),
                    text=link.get('text'),
                    title=link.get('title')
                ))

            # Process external links
            for link in links_dict.get('external', [])[:max_links]:
                external_links.append(LinkInfo(
                    href=link.get('href', ''),
                    text=link.get('text'),
                    title=link.get('title')
                ))

        except Exception as e:
            logger.warning(f"Error extracting links: {e}")

        return internal_links, external_links

    def _extract_images(self, media_dict: dict, max_images: int = 30) -> List[ImageInfo]:
        images = []

        try:
            for img in media_dict.get('images', [])[:max_images]:
                images.append(ImageInfo(
                    src=img.get('src', ''),
                    alt=img.get('alt'),
                    desc=img.get('desc')
                ))
        except Exception as e:
            logger.warning(f"Error extracting images: {e}")

        return images

    def _extract_markdown(self, markdown_dict: dict) -> str:
        # Prefer fit_markdown (optimized), fallback to raw_markdown
        if isinstance(markdown_dict, dict):
            return (
                markdown_dict.get('fit_markdown') or
                markdown_dict.get('raw_markdown') or
                markdown_dict.get('markdown_with_citations') or
                ''
            )
        # If it's already a string, return it
        return str(markdown_dict) if markdown_dict else ''

    async def execute(
        self,
        url: str,
        timeout: int = 30,
        extract_links: bool = True,
        extract_images: bool = True,
        include_html: bool = False
    ) -> Crawl4AIScraperOutput:
        start_time = datetime.now(timezone.utc)

        try:
            scraper_input = Crawl4AIScraperInput(
                url=url,
                timeout=timeout,
                extract_links=extract_links,
                extract_images=extract_images,
                include_html=include_html
            )
        except Exception as e:
            return self._error_output(f"Input validation error: {e}")

        config = CrawlerRunConfig(
            verbose=self.verbose,
            cache_mode="bypass"  
        )

        try:
            async with AsyncWebCrawler() as crawler:
                result = await asyncio.wait_for(
                    crawler.arun(url=str(scraper_input.url), config=config),
                    timeout=scraper_input.timeout
                )

                if not result:
                    return self._error_output("No content was scraped from the URL")

                if hasattr(result, '__iter__') and not isinstance(result, str):
                    results_list = list(result)
                    if not results_list:
                        return self._error_output("Empty result from Crawl4AI")
                    page_result = results_list[0]
                else:
                    page_result = result

                if not page_result.success:
                    error_msg = page_result.error_message or "Unknown scraping error"
                    return self._error_output(f"Crawl4AI failed: {error_msg}")

                internal_links, external_links = [], []
                if scraper_input.extract_links and page_result.links:
                    internal_links, external_links = self._extract_links(page_result.links)

                images = []
                if scraper_input.extract_images and page_result.media:
                    images = self._extract_images(page_result.media)

                markdown = self._extract_markdown(page_result.markdown)

                metadata = page_result.metadata if page_result.metadata else {}
                metadata.update({
                    'status_code': page_result.status_code,
                    'redirected_url': page_result.redirected_url,
                    'cache_status': page_result.cache_status,
                })

                scraped_content = Crawl4AIScrapedContent(
                    url=str(scraper_input.url),
                    title=metadata.get("title", ""),
                    markdown=markdown,
                    html=page_result.html if scraper_input.include_html else None,
                    internal_links=internal_links,
                    external_links=external_links,
                    images=images,
                    metadata=metadata,
                    scraped_at=datetime.now(timezone.utc),
                    status_code=page_result.status_code
                )

                response_time = (datetime.now(timezone.utc) - start_time).total_seconds()
                logger.info(f"Successfully scraped {url} in {response_time:.2f}s")

                return Crawl4AIScraperOutput(
                    success=True,
                    content=scraped_content,
                    error=None,
                    metadata={
                        "response_time": response_time,
                        "url": str(scraper_input.url),
                        "status_code": page_result.status_code
                    }
                )

        except asyncio.TimeoutError:
            return self._error_output(f"Scraping operation timed out after {timeout} seconds")
        except Exception as e:
            logger.exception(f"Scraping failed for {url}")
            return self._error_output(f"Scraping error: {str(e)}")