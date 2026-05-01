import asyncio
from core.tools.News.news_api import NewsAPI, GoogleNewsAPI

async def test_news_api_search():
    try:
        news_api = NewsAPI()
    except ValueError as e:
        print(f"Skipping NewsAPI test: {e}")
        return

    result = await news_api.execute(                                                                    
          query="artificial intelligence",                                                            
          max_results=5,                                                                              
          days_back=7,                                                                                
          language="en",                                                                              
          sort_by="relevancy"                                                                         
      )
    
    if not result.success:
        print(f"Search failed with error: {result.error}")
        return

    for article in result.articles:
        print(f"Title: {article.title}")
        print(f"Description: {article.description}")
        print(f"URL: {article.url}")
        print(f"Published At: {article.published_at}")
        print("-" * 40)

async def test_google_news_api_search():
    google_news_api = GoogleNewsAPI()

    result = await google_news_api.execute(                                                                    
          query="artificial intelligence",                                                            
          max_results=5,                                                                              
          language="en",                                                                              
          country="US",                                                                              
          when="7d"                                                                                
      )
    
    if not result.success:
        print(f"Search failed with error: {result.error}")
        return

    for article in result.articles:
        print(f"Title: {article.title}")
        print(f"Description: {article.description}")
        print(f"content: {article.content}")
        print(f"URL: {article.url}")
        print(f"Published At: {article.published_at}")
        print(f"Source: {article.source_name}")
        print("-" * 40)

if __name__ == "__main__":    
    # asyncio.run(test_news_api_search())
    asyncio.run(test_google_news_api_search())