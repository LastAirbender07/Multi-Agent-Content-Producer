import asyncio
from core.tools.Crawl4ai.crawl4ai_scraper import Crawl4AIScraper


async def test_crawl4ai_scraper():
    """Test the Crawl4AI scraper with a simple URL."""
    scraper = Crawl4AIScraper(verbose=True)

    url = "https://docs.crawl4ai.com/"  # Simple, reliable test URL

    print(f"\n{'='*60}")
    print(f"Testing Crawl4AI Scraper")
    print(f"URL: {url}")
    print(f"{'='*60}\n")

    result = await scraper.execute(url=url)

    if not result.success:
        print(f"❌ Scraping failed with error: {result.error}")
        return

    if result.content:
        print(f"✅ Successfully scraped content from {url}\n")
        print(f"Title: {result.content.title}")
        print(f"Status Code: {result.content.status_code}")
        print(f"Markdown length: {len(result.content.markdown)} chars")
        print(f"Internal links: {len(result.content.internal_links)}")
        print(f"External links: {len(result.content.external_links)}")
        print(f"Images: {len(result.content.images)}")
        print(f"\nFirst 300 chars of markdown:")
        print("-" * 60)
        print(result.content.markdown[:300])
        print("-" * 60)

        # Show some links if available
        if result.content.internal_links:
            print(f"\nSample internal links (first 3):")
            for link in result.content.internal_links[:3]:
                print(f"  - {link.text or 'No text'}: {link.href}")

        if result.content.external_links:
            print(f"\nSample external links (first 3):")
            for link in result.content.external_links[:3]:
                print(f"  - {link.text or 'No text'}: {link.href}")

        print(f"\n{'='*60}")
        print(f"Response time: {result.metadata.get('response_time', 0):.2f}s")
        print(f"{'='*60}\n")
    else:
        print("❌ No content was scraped.")


if __name__ == "__main__":
    asyncio.run(test_crawl4ai_scraper())