import asyncio
from datetime import datetime, timedelta
from core.tools.News.news_api import NewsAPI

async def test_news_api_search():
    news_api = NewsAPI()

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

if __name__ == "__main__":    
    asyncio.run(test_news_api_search())