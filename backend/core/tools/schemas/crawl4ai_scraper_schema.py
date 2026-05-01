from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone


class Crawl4AIScraperInput(BaseModel):
    """Input schema for Crawl4AI scraper tool."""
    url: HttpUrl = Field(..., description="The URL to scrape")
    timeout: int = Field(default=30, ge=5, le=120, description="Timeout in seconds")
    extract_links: bool = Field(default=True, description="Whether to extract links from the page")
    extract_images: bool = Field(default=True, description="Whether to extract images from the page")
    include_html: bool = Field(default=False, description="Whether to include raw HTML in output")


class LinkInfo(BaseModel):
    """Represents a single link extracted from the page."""
    href: str = Field(..., description="The URL of the link")
    text: Optional[str] = Field(None, description="Link text/anchor text")
    title: Optional[str] = Field(None, description="Link title attribute")


class ImageInfo(BaseModel):
    """Represents a single image extracted from the page."""
    src: str = Field(..., description="Image source URL")
    alt: Optional[str] = Field(None, description="Image alt text")
    desc: Optional[str] = Field(None, description="Image description")


class Crawl4AIScrapedContent(BaseModel):
    """Represents the scraped content from Crawl4AI."""
    url: str = Field(..., description="The URL that was scraped")
    title: Optional[str] = Field(None, description="The title of the page")
    markdown: str = Field(..., description="The scraped content in markdown format")
    html: Optional[str] = Field(None, description="The raw HTML content of the page")

    # Structured link data
    internal_links: List[LinkInfo] = Field(default_factory=list, description="Internal links found on the page")
    external_links: List[LinkInfo] = Field(default_factory=list, description="External links found on the page")

    # Structured image data
    images: List[ImageInfo] = Field(default_factory=list, description="Images found on the page")

    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata about the scraped content")
    scraped_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="The timestamp when the content was scraped")
    status_code: Optional[int] = Field(None, description="HTTP status code")


class Crawl4AIScraperOutput(BaseModel):
    """Output schema for Crawl4AI scraper tool."""
    success: bool = Field(..., description="Whether the scraping was successful")
    content: Optional[Crawl4AIScrapedContent] = Field(None, description="The scraped content if successful")
    error: Optional[str] = Field(None, description="Error message if scraping failed")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata about the scraping process")