from typing import Literal, Optional, Dict
from pydantic import BaseModel, Field


class QueryRefineRequest(BaseModel):
    topic: str = Field(..., min_length=2)


class NewsSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    source: Literal["google", "newsapi", "ddgs"] = Field(default="google")
    max_results: int = Field(default=10, ge=1, le=30)
    when: Literal["1d", "3d", "7d", "1w", "1m"] = Field(default="1d", description="Google News time filter")
    days_back: int = Field(default=7, ge=1, le=30, description="NewsAPI days back")


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


class DiscoverArticle(BaseModel):
    title: str
    snippet: str
    url: str
    source_name: str
    category: str
    age_label: str          # "2h ago", "Yesterday", "3 days ago"
    published_at: Optional[str] = None


class DiscoverResponse(BaseModel):
    articles: list[DiscoverArticle]
    cached: bool


class TopicFromUrlRequest(BaseModel):
    url: str
    title: str
    snippet: str = ""


class TopicFromUrlResponse(BaseModel):
    topic: str
    freshness: str                  # "breaking" | "recent" | "evergreen"
    entities: list[str] = []
    crawl_failed: bool = False      # True when article couldn't be fetched


class NewBlankRunRequest(BaseModel):
    topic: str


class SwapImageUrlRequest(BaseModel):
    url: str


class ParseDocResponse(BaseModel):
    title: str                  # filename stem (without extension)
    text: str                   # extracted markdown content
    char_count: int
    file_type: str              # "pdf", "docx", "txt", etc.


class SlideEditRequest(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    bullets: Optional[list[str]] = None
    stat_value: Optional[str] = None
    stat_label: Optional[str] = None
    chart_data: Optional[dict] = None
    chart_type: Optional[str] = None
    slide_overrides: Optional[Dict[str, str]] = None  # {"title_font_size": "52px", "accent_color": "#7c3aed"}
    template_type: Optional[str] = None      # change slide type: hook|content|stat|quote|cta|engage
    theme: Optional[str] = None              # "aurora" | "lumina"
    canvas_template: Optional[str] = None    # e.g. "aurora-content-2", "aurora-hook"


class SlideEditResponse(BaseModel):
    png_url: str
    updated_at: str


class BlogPostUpdateRequest(BaseModel):
    markdown: str


class ImageDeleteRequest(BaseModel):
    path: str  # must start with "outputs/runs/" or "assets/user_uploads/"


class CanvasSaveRequest(BaseModel):
    fabric_json: dict  # full fabric.Canvas.toJSON(["data"]) output
