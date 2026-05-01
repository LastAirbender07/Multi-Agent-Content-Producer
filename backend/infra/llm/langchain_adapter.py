"""
LangChain adapter for LLM integration - Provider Agnostic.

Supports multiple LLM providers:
- Claude (Anthropic) via HAI Proxy
- OpenAI (GPT-4, etc.)
- Google Gemini

Use this when working with LangChain/LangGraph features:
- Chains
- Agents
- Tools
- Graph workflows

For direct LLM calls, use LLMFactory.get_client() instead.
"""

from functools import lru_cache
from typing import Union
from langchain_core.language_models.chat_models import BaseChatModel
from configs.settings import get_settings


def _create_claude_client(settings) -> BaseChatModel:
    """Create Anthropic Claude client via HAI Proxy."""
    from langchain_anthropic import ChatAnthropic

    return ChatAnthropic(
        api_key=settings.hai_proxy_api_key,
        base_url=settings.hai_proxy_url,
        model=settings.llm_model,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
        timeout=settings.llm_timeout
    )


def _create_openai_client(settings) -> BaseChatModel:
    """Create OpenAI client (GPT-4, etc.)."""
    from langchain_openai import ChatOpenAI

    kwargs = dict(
        api_key=settings.openai_api_key,
        model=settings.llm_model,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
        timeout=settings.llm_timeout,
    )
    if getattr(settings, "openai_base_url", None):
        kwargs["base_url"] = settings.openai_base_url

    return ChatOpenAI(**kwargs)


def _create_gemini_client(settings) -> BaseChatModel:
    """Create Google Gemini client."""
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        google_api_key=settings.gemini_api_key,
        model=settings.llm_model,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
        timeout=settings.llm_timeout
    )


@lru_cache()
def get_langchain_llm() -> BaseChatModel:
    """
    Get LangChain-compatible LLM client (singleton, provider-agnostic).

    Returns the appropriate LangChain client based on settings.llm_provider:
    - "claude" → ChatAnthropic
    - "openai" → ChatOpenAI
    - "gemini" → ChatGoogleGenerativeAI

    Cached for reuse across calls.

    Use this when:
    - Building LangChain chains
    - Using LangGraph workflows
    - Working with LangChain agents/tools

    Example:
        from infra.llm.langchain_adapter import get_langchain_llm

        llm = get_langchain_llm()  # Automatically uses provider from settings
        result = llm.invoke("What is LangGraph?")

    Raises:
        ValueError: If provider is not supported
    """
    settings = get_settings()

    if settings.llm_provider == "claude": return _create_claude_client(settings)
    elif settings.llm_provider == "openai": return _create_openai_client(settings)
    elif settings.llm_provider == "gemini": return _create_gemini_client(settings)
    else:
        raise ValueError(
            f"Unsupported LangChain provider: {settings.llm_provider}. "
            f"Supported: claude, openai, gemini"
        )


def create_langchain_llm(
    provider: str = None,
    model: str = None,
    temperature: float = None,
    max_tokens: int = None
) -> BaseChatModel:
    """
    Create a new LangChain LLM with custom parameters.

    Use this when you need different settings than the default,
    or want to use a different provider temporarily.

    Args:
        provider: Override provider ("claude", "openai", "gemini")
        model: Override model name
        temperature: Override temperature
        max_tokens: Override max tokens

    Example:
        # Use OpenAI for a specific task
        llm = create_langchain_llm(
            provider="openai",
            model="gpt-4",
            temperature=0.0
        )

        # Use different Claude model
        llm = create_langchain_llm(
            model="anthropic--claude-haiku-4.5",
            temperature=0.7
        )

    Raises:
        ValueError: If provider is not supported
    """
    settings = get_settings()

    # Use provided values or fall back to settings
    provider = provider or settings.llm_provider
    model = model or settings.llm_model
    temperature = temperature if temperature is not None else settings.llm_temperature
    max_tokens = max_tokens or settings.llm_max_tokens

    # Create settings-like object for factory functions
    class CustomSettings:
        def __init__(self):
            self.llm_provider = provider
            self.llm_model = model
            self.llm_temperature = temperature
            self.llm_max_tokens = max_tokens
            self.llm_timeout = settings.llm_timeout

            # Provider-specific keys
            self.hai_proxy_api_key = settings.hai_proxy_api_key
            self.hai_proxy_url = settings.hai_proxy_url
            self.openai_api_key = getattr(settings, 'openai_api_key', None)
            self.gemini_api_key = getattr(settings, 'gemini_api_key', None)

    custom_settings = CustomSettings()

    if provider == "claude":
        return _create_claude_client(custom_settings)
    elif provider == "openai":
        return _create_openai_client(custom_settings)
    elif provider == "gemini":
        return _create_gemini_client(custom_settings)
    else:
        raise ValueError(
            f"Unsupported LangChain provider: {provider}. "
            f"Supported: claude, openai, gemini"
        )
