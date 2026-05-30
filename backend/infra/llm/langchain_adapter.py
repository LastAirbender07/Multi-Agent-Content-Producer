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


# Resettable module-level cache — avoids @lru_cache() baking a stale JWT forever.
_cached_client: BaseChatModel | None = None


def get_langchain_llm() -> BaseChatModel:
    """
    Get LangChain-compatible LLM client (singleton, provider-agnostic).

    Returns the appropriate LangChain client based on settings.llm_provider.
    Call reset_langchain_llm() to force a fresh client on the next call
    (done automatically by get_langchain_llm_with_retry on JWT expiry).
    """
    global _cached_client
    if _cached_client is None:
        _cached_client = _build_client()
    return _cached_client


def reset_langchain_llm() -> None:
    """Discard the cached client so the next get_langchain_llm() call builds a fresh one."""
    global _cached_client
    _cached_client = None


def _build_client() -> BaseChatModel:
    settings = get_settings()
    if settings.llm_provider == "claude":
        return _create_claude_client(settings)
    elif settings.llm_provider == "openai":
        return _create_openai_client(settings)
    elif settings.llm_provider == "gemini":
        return _create_gemini_client(settings)
    else:
        raise ValueError(
            f"Unsupported LangChain provider: {settings.llm_provider}. "
            f"Supported: claude, openai, gemini"
        )


def _is_jwt_error(exc: Exception) -> bool:
    return "jwt" in str(exc).lower() or "expired" in str(exc).lower() or "401" in str(exc)


async def get_langchain_llm_with_retry(call):
    """
    Execute an async callable `call(llm)` using the cached LangChain client.
    If the call raises a JWT/auth error, resets the cache and retries once with
    a fresh client. Any other error is re-raised immediately.

    Usage:
        result = await get_langchain_llm_with_retry(
            lambda llm: llm.ainvoke(messages)
        )
    """
    from infra.logging import get_logger
    logger = get_logger(__name__)

    llm = get_langchain_llm()
    try:
        return await call(llm)
    except Exception as e:
        if _is_jwt_error(e):
            logger.warning("langchain_jwt_expired_retrying")
            reset_langchain_llm()
            llm = get_langchain_llm()
            return await call(llm)
        raise


def create_langchain_llm(
    provider: str = None,
    model: str = None,
    temperature: float = None,
    max_tokens: int = None
) -> BaseChatModel:
    """
    Create a new LangChain LLM with custom parameters (always fresh, not cached).
    """
    settings = get_settings()

    provider = provider or settings.llm_provider
    model = model or settings.llm_model
    temperature = temperature if temperature is not None else settings.llm_temperature
    max_tokens = max_tokens or settings.llm_max_tokens

    class CustomSettings:
        def __init__(self):
            self.llm_provider = provider
            self.llm_model = model
            self.llm_temperature = temperature
            self.llm_max_tokens = max_tokens
            self.llm_timeout = settings.llm_timeout
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
