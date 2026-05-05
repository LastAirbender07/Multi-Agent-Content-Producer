from mcp.server.fastmcp import FastMCP
from core.tools.Crawl4ai.crawl4ai_scraper import Crawl4AIScraper

mcp = FastMCP(
    name="Crawl4AI",
    instructions="Scrape any public URL and return its content as clear markdown. Use this when you need to read the full content of a web page."
)

_scraper = Crawl4AIScraper()

@mcp.tool()
async def scrape_url(
    url: str,
    timeout: int = 30,
    extract_links: bool = False,
    extract_images: bool = False,
    include_html: bool = False
) -> dict:
    """
    Scrape a web page and return its content as markdown.

    Args:
        url: The URL to scrape.
        timeout: Maximum seconds to wait (5-120). Default 30.
        extract_links: Include internal/external links. Default False.
        extract_images: Include image metadata. Default False.
        include_html: Include raw HTML. Default False.

    Returns:
        success (bool)       - whether scraping succeeded
        content.markdown     - clean markdown text of the page
        content.title        - page title
        content.url          - final URL after redirects
        content.status_code  - HTTP status code
        error                - error message if success=False
    """
    result = await _scraper.execute(
        url=url,
        timeout=timeout,
        extract_links=extract_links,
        extract_images=extract_images,
        include_html=include_html
    )
    return result.model_dump()

if __name__ == "__main__":
    mcp.run(transport="stdio")