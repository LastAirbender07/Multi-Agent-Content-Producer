from typing import Literal, Optional
from pydantic import BaseModel, Field


class QueryRefineRequest(BaseModel):
    topic: str = Field(..., min_length=2)


class NewsSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    source: Literal["google", "newsapi", "ddgs"] = Field(default="google")
    max_results: int = Field(default=10, ge=1, le=30)
    when: Optional[str] = Field(default="1d", description="Google News time filter e.g. 1d, 7d, 1m")
    days_back: int = Field(default=7, description="NewsAPI days back")


class NewsArticleOut(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    url: Optional[str] = None
    source_name: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[str] = None
    url_to_image: Optional[str] = None


class NewsSearchResponse(BaseModel):
    success: bool
    query: str
    source: str
    total_results: int
    articles: list[NewsArticleOut] = []
    error: Optional[str] = None


class LLMDraftRequest(BaseModel):
    topic: str
    context: str | None = None
    run_id: str | None = None


class LLMRefineRequest(BaseModel):
    topic: str
    current_result: dict
    feedback: str


class AngleSelectRequest(BaseModel):
    angle_indices: list[int]


class ChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)
    system: Optional[str] = Field(default=None, description="Ignored — metadata block is always used")


class ChatResponse(BaseModel):
    reply: str
    error: Optional[str] = None


class ImageTagsRequest(BaseModel):
    query: str


class ImageTagsResponse(BaseModel):
    tags: list[str]
