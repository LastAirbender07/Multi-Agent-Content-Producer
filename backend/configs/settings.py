from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    Supports multiple LLM providers:
    - Claude (via HAI Proxy)
    - OpenAI
    - Google Gemini

    Set LLM_PROVIDER in .env to choose provider.
    """

    # === LLM Provider Selection ===
    llm_provider: str = "claude"  # Options: "claude", "openai", "gemini"

    # === Claude Settings (via HAI Proxy) ===
    hai_proxy_url: str = "http://localhost:6655/anthropic"
    hai_proxy_api_key: str

    # === OpenAI Settings ===
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None  # For custom endpoints

    # === Google Gemini Settings ===
    gemini_api_key: Optional[str] = None

    # === News API Settings ===
    newsapi_api_key: Optional[str] = None

    # === General LLM Settings ===
    llm_model: str = "anthropic--claude-4.5-sonnet"
    llm_timeout: float = 300.0
    llm_max_tokens: int = 8192
    llm_temperature: float = 1.0

    # === Logging Settings ===
    log_level: str = "INFO"
    environment: str = "development"

    # Research Orchestrator Settings
    research_default_mode: str = "standard"
    research_default_freshness: str = "recent"
    research_max_tool_calls: int = 6
    research_max_sources: int = 15
    research_max_crawl_urls: int = 5
    research_max_refinement_loops: int = 2
    research_quality_min_sources: int = 3
    research_quality_min_confidence: float = 0.72
    research_output_dirs: str = "outputs/runs"
    research_allowed_tools: list[str] = ["news_api", "ddgs_text", "ddgs_news", "crawl4ai"]

    # Angle Orchestrator Settings
    angle_min_angles: int = 3
    angle_default_mode: str = "manual"
    angle_default_max_to_select: int = 3

    # Content Orchestrator Settings
    pexels_api_key: Optional[str] = None
    image_download_path: str = "outputs/downloads/images"

    content_max_slides: int = 12
    content_min_slides: int = 4
    content_image_per_slide: int = 1
    content_output_dir: str = "outputs/runs"

    # Brand Settings
    brand_name: str = "TheOpinionBoard"
    brand_logo_path: str = "assets/brand/logo.png"
    instagram_url: str = "https://www.instagram.com/theopinionboard/"
    medium_url: str = "https://medium.com/@theOpinionBoard"

    # Server / API Settings
    backend_base_url: str = "http://localhost:8000"
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Images / Document Settings
    pexels_base_url: str = "https://api.pexels.com/v1"
    document_max_upload_bytes: int = 10 * 1024 * 1024  # 10 MB
    document_supported_formats: list[str] = [
        "pdf", "docx", "doc", "pptx", "ppt", "xlsx", "xls",
        "txt", "md", "markdown", "json", "csv", "xml", "html", "htm",
    ]
    image_relevance_threshold: float = 0.4
    image_max_tags: int = 5
    image_tag_stopwords: list[str] = ["with", "from", "that", "this", "about", "into", "over", "under"]

    # Discovery / News Settings
    discover_cache_ttl_seconds: int = 1800  # 30 minutes

    # Evidence Scoring Settings
    evidence_score_max_items: int = 25
    evidence_snippet_len: int = 200

    # Carousel Rendering Settings
    carousel_viewport_size: int = 1080   # Final PNG dimensions (square)
    carousel_scale_factor: int = 2       # Render at 2x then downscale for crisp text
    carousel_chart_render_wait_ms: int = 300  # Wait for Chart.js canvas flush

    # Normalizer / Evidence Settings
    crawl_markdown_max_chars: int = 2000
    crawl_snippet_max_chars: int = 500

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get singleton settings instance."""
    return Settings()
