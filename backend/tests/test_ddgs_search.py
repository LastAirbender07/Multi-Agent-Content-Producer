"""
Test DDGS Search Tool

Test the DDGS search tool implementation.
"""

import asyncio
from core.tools.Search.ddgs_search import DDGSSearch


async def test_ddgs_search_tool():
    """Test the DDGS search tool."""

    print("="*70)
    print("DDGS Search Tool Test")
    print("="*70)

    # Increase timeout to 30 seconds due to network latency
    search = DDGSSearch(timeout=30)

    # Test 1: Basic text search
    print("\n" + "="*70)
    print("TEST 1: Text Search")
    print("="*70)

    result = await search.execute(
        query="Python programming tutorials",
        max_results=10,
        backend="auto"
    )
    text_result = result  # capture for summary

    if result.success:
        print(f"✅ Success!")
        print(f"   Query: {result.query}")
        print(f"   Results: {result.total_results}")
        print(f"   Response time: {result.metadata.get('response_time', 0):.2f}s")
        print(f"\n   Top 3 results:")
        for i, r in enumerate(result.results[:3], 1):
            print(f"   [{i}] {r.title[:60]}...")
            print(f"       {r.url}")
    else:
        print(f"❌ Failed: {result.error}")

    # Test 2: News search
    print("\n" + "="*70)
    print("TEST 2: News Search")
    print("="*70)

    news_result = await search.search_news(
        query="artificial intelligence",
        max_results=5,
        timelimit="w"
    )

    if news_result.success:
        print(f"✅ Success!")
        print(f"   Query: {news_result.query}")
        print(f"   Results: {news_result.total_results}")
        print(f"\n   Top 3 news:")
        for i, r in enumerate(news_result.results[:3], 1):
            print(f"   [{i}] {r.title[:60]}...")
            print(f"       Source: {r.source}")
            print(f"       Date: {r.date}")
    else:
        print(f"❌ Failed: {news_result.error}")

    # Test 3: Image search
    print("\n" + "="*70)
    print("TEST 3: Image Search")
    print("="*70)

    image_result = await search.search_images(
        query="Python programming",
        max_results=5
    )

    if image_result.success:
        print(f"✅ Success!")
        print(f"   Query: {image_result.query}")
        print(f"   Results: {image_result.total_results}")
        print(f"\n   Top 3 images:")
        for i, r in enumerate(image_result.results[:3], 1):
            print(f"   [{i}] {r.title[:60]}...")
            print(f"       {r.image[:80]}...")
    else:
        print(f"❌ Failed: {image_result.error}")

    # Test 4: Different backends
    print("\n" + "="*70)
    print("TEST 4: Different Backends")
    print("="*70)

    # Valid backends for text() according to DDGS docs:
    # bing, brave, duckduckgo, google, grokipedia, mojeek, yandex, yahoo, wikipedia
    backends = ["duckduckgo", "google", "brave"]
    for backend in backends:
        result = await search.execute(
            query="machine learning",
            max_results=3,
            backend=backend
        )
        status = "✅" if result.success else "❌"
        count = result.total_results if result.success else 0
        print(f"   {backend:15s}: {status} ({count} results)")

    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)

    total_results = (
        text_result.total_results +
        news_result.total_results +
        image_result.total_results
    )

    print(f"   Total results: {total_results}")
    print(f"   - Text: {text_result.total_results}")
    print(f"   - News: {news_result.total_results}")
    print(f"   - Images: {image_result.total_results}")

    if total_results > 15:
        print(f"\n✅ ALL TESTS PASSED!")
        print(f"   DDGS Search Tool is working perfectly!")
    else:
        print(f"\n⚠️  Some issues detected")

    print("\n" + "="*70)


if __name__ == "__main__":
    asyncio.run(test_ddgs_search_tool())
