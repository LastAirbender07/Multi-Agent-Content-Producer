from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional
from datetime import datetime


class GoogleNewsAPISearchInput(BaseModel):
    query: Optional[str] = Field(
        default=None,
        description="Search query for news articles (e.g., 'AI', 'technology', 'sports')",
        min_length=2
    )

    topic: Optional[str] = Field(
        default=None,
        description="Optional topic to filter news articles (e.g., 'technology', 'sports', 'business')"
    )

    max_results: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Maximum number of news articles to return (1-50)"
    )

    language: Optional[str] = Field(
        default="en",
        description="Language code to filter news articles (e.g., 'en' for English, 'fr' for French)",
        pattern=r'^[a-z]{2}$'
    )

    country: Optional[str] = Field(
        default=None,
        description="Country code to filter news articles (e.g., 'us' for United States, 'gb' for United Kingdom)",
        pattern=r'^[A-Z]{2}$'
    )

    when: Optional[str] = Field(
        default=None,
        description="Optional time filter for news articles (e.g., '1d' for last 24 hours, '7d' for last 7 days, '1m' for last month)"
    )

    after: Optional[datetime] = Field(
        default=None,
        description="Optional start date to filter news articles in DD-MM-YYYY format (e.g., '01-01-2024')"
    )   

    before: Optional[datetime] = Field(
        default=None,
        description="Optional end date to filter news articles in DD-MM-YYYY format (e.g., '31-01-2024')"
    )

class NewsAPISearchInput(BaseModel):
    query: str = Field(
        ...,
        description="Search query for news articles (e.g., 'AI', 'technology', 'sports')",
        min_length=2
    )

    max_results: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Maximum number of news articles to return (1-50)"
    )

    language: Optional[str] = Field(
        default="en",
        description="Language code to filter news articles (e.g., 'en' for English, 'fr' for French)",
        pattern=r'^[a-z]{2}$'
    )

    sort_by: str = Field(
        default="relevancy",
        description="Sort articles by 'relevancy', 'popularity', or 'publishedAt'"
    )

    days_back: int = Field(
        default=7,
        ge=1,
        le=30,
        description="Number of days back to search for news articles (1-30)"
    )

    sources: Optional[List[str]] = Field(
        default=None,
        description="Optional list of news sources to filter by (e.g., ['bbc-news', 'cnn'])"
    )

    domains: Optional[List[str]] = Field(
        default=None,
        description="Optional list of domains to filter by (e.g., ['bbc.co.uk', 'cnn.com'])"
    )   


class NewsArticle(BaseModel):
    title: str = Field(..., description="Title of the news article")
    description: Optional[str] = Field(None, description="Short description of the news article")
    content: Optional[str] = Field(None, description="Full content of the news article")
    url: HttpUrl = Field(..., description="URL to the news article")
    source_name: str = Field(..., description="Source identifier (e.g., 'bbc-news')")
    author: Optional[str] = Field(None, description="Author of the news article")
    published_at: datetime = Field(..., description="Publication date and time of the news article")
    url_to_image: Optional[HttpUrl] = Field(None, description="URL to the image associated with the news article")
    relevance_score: Optional[float] = Field(None, description="Relevance score of the article based on the search query")

class NewsSearchOutput(BaseModel):
    success: bool = Field(..., description="Indicates if the search was successful")
    articles: List[NewsArticle] = Field(..., description="List of news articles matching the search criteria")
    total_results: int = Field(..., description="Total number of articles found for the search query")
    error: Optional[str] = Field(None, description="Error message if the search failed")
    metadata: Optional[dict] = Field(None, description="Additional metadata about the search results (e.g., API response time, query, date range)")

class NewsSource(BaseModel):
    id: Optional[str] = Field(None, description="Unique identifier for the news source")
    name: str = Field(..., description="Name of the news source")
    description: Optional[str] = Field(None, description="Description of the news source")
    url: Optional[HttpUrl] = Field(None, description="URL of the news source")
    category: Optional[str] = Field(None, description="Category of news covered by the source (e.g., 'technology', 'sports')")
    language: Optional[str] = Field(None, description="Language of the news source (e.g., 'en', 'fr')")
    country: Optional[str] = Field(None, description="Country of the news source (e.g., 'us', 'gb')")
