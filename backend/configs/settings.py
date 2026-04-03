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

    # === General LLM Settings ===
    llm_model: str = "anthropic--claude-4.5-sonnet"
    llm_timeout: float = 300.0
    llm_max_tokens: int = 8192
    llm_temperature: float = 1.0

    # === Logging Settings ===
    log_level: str = "INFO"
    environment: str = "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get singleton settings instance."""
    return Settings()
