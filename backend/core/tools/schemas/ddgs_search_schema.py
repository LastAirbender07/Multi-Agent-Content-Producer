"""
DDGS Search Tool Schemas

Pydantic models for DDGS (DuckDuckGo Search) tool.
"""

from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime


class DDGSSearchInput(BaseModel):
    """Input schema for DDGS search tool."""
    query: str = Field(..., min_length=2, description="Search query")

    max_results: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Maximum number of results to return (1-50)"
    )

    region: str = Field(
        default="us-en",
        description="Region code (e.g., 'us-en', 'uk-en', 'de-de')"
    )

    safesearch: str = Field(
        default="moderate",
        description="Safe search level: 'on', 'moderate', or 'off'"
    )

    timelimit: Optional[str] = Field(
        default=None,
        description="Time limit: 'd' (day), 'w' (week), 'm' (month), 'y' (year)"
    )

    backend: str = Field(
        default="auto",
        description="Search backend: 'auto', 'duckduckgo', 'bing', 'google', 'brave', etc."
    )


class SearchResult(BaseModel):
    """A single search result from DDGS."""
    title: str = Field(..., description="Result title")
    url: str = Field(..., description="Result URL")
    body: Optional[str] = Field(None, description="Result snippet/description")


class NewsResult(BaseModel):
    """A single news result from DDGS."""
    title: str = Field(..., description="News title")
    url: str = Field(..., description="News URL")
    body: Optional[str] = Field(None, description="News description")
    source: Optional[str] = Field(None, description="News source")
    date: Optional[datetime] = Field(None, description="Publication date")
    image: Optional[str] = Field(None, description="Article image URL")


class ImageResult(BaseModel):
    """A single image result from DDGS."""
    title: str = Field(..., description="Image title")
    image: str = Field(..., description="Full-size image URL")
    thumbnail: Optional[str] = Field(None, description="Thumbnail URL")
    url: Optional[str] = Field(None, description="Source page URL")
    height: Optional[int] = Field(None, description="Image height")
    width: Optional[int] = Field(None, description="Image width")
    source: Optional[str] = Field(None, description="Image source")

class VideoResult(BaseModel):
    """A single video result from DDGS."""
    title: str = Field(..., description="Video title")
    url: str = Field(..., description="Video URL")
    description: Optional[str] = Field(None, description="Video description")
    duration: Optional[int] = Field(None, description="Video duration in seconds")
    source: Optional[str] = Field(None, description="Video source")
    published: Optional[datetime] = Field(None, description="Publication date")
    uploader: Optional[str] = Field(None, description="Video uploader")
    thumbnail: Optional[str] = Field(None, description="Thumbnail URL")

class DDGSSearchOutput(BaseModel):
    """Output schema for DDGS search tool."""
    success: bool = Field(..., description="Whether search succeeded")

    results: List[SearchResult] = Field(
        default_factory=list,
        description="Search results"
    )

    total_results: int = Field(
        default=0,
        description="Number of results returned"
    )

    query: Optional[str] = Field(None, description="Original search query")

    error: Optional[str] = Field(None, description="Error message if failed")

    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata (response time, backend used, etc.)"
    )


class DDGSNewsOutput(BaseModel):
    """Output schema for DDGS news search."""
    success: bool = Field(..., description="Whether search succeeded")

    results: List[NewsResult] = Field(
        default_factory=list,
        description="News results"
    )

    total_results: int = Field(
        default=0,
        description="Number of results returned"
    )

    query: Optional[str] = Field(None, description="Original search query")

    error: Optional[str] = Field(None, description="Error message if failed")

    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata"
    )


class DDGSImageOutput(BaseModel):
    """Output schema for DDGS image search."""
    success: bool = Field(..., description="Whether search succeeded")

    results: List[ImageResult] = Field(
        default_factory=list,
        description="Image results"
    )

    total_results: int = Field(
        default=0,
        description="Number of results returned"
    )

    query: Optional[str] = Field(None, description="Original search query")

    error: Optional[str] = Field(None, description="Error message if failed")

    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata"
    )
