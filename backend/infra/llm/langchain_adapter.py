"""
LangChain adapter for LLM integration - Provider Agnostic.

Supports multiple LLM providers:
- Claude (Anthropic) via HAI Proxy
- OpenAI (GPT-4, etc.)
- Google Gemini

Use this when working with LangChain/LangGraph features:
- Chains, Agents, Tools, Graph workflows

For direct LLM calls, use LLMFactory.get_client() instead.
"""

from langchain_core.language_models.chat_models import BaseChatModel
from configs.settings import get_settings


def _create_claude_client(settings) -> BaseChatModel:
    from langchain_anthropic import ChatAnthropic
    return ChatAnthropic(
        api_key=settings.hai_proxy_api_key,
        base_url=settings.hai_proxy_url,
        model=settings.llm_model,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
        timeout=settings.llm_timeout,
    )


def _create_openai_client(settings) -> BaseChatModel:
    from langchain_openai import ChatOpenAI
    kwargs = dict(
        api_key=settings.openai_api_key,
        model=settings.llm_model,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
        timeout=settings.llm_timeout,
    )
    if settings.openai_base_url:
        kwargs["base_url"] = settings.openai_base_url
    return ChatOpenAI(**kwargs)


def _create_gemini_client(settings) -> BaseChatModel:
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(
        google_api_key=settings.gemini_api_key,
        model=settings.llm_model,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
        timeout=settings.llm_timeout,
    )


def _build_client() -> BaseChatModel:
    settings = get_settings()
    if settings.llm_provider == "claude":
        return _create_claude_client(settings)
    elif settings.llm_provider == "openai":
        return _create_openai_client(settings)
    elif settings.llm_provider == "gemini":
        return _create_gemini_client(settings)
    raise ValueError(
        f"Unsupported LangChain provider: {settings.llm_provider}. "
        "Supported: claude, openai, gemini"
    )


# Resettable module-level cache — avoids @lru_cache() baking a stale JWT forever.
_cached_client: BaseChatModel | None = None


def get_langchain_llm() -> BaseChatModel:
    """
    Get LangChain-compatible LLM client (singleton, provider-agnostic).
    Call reset_langchain_llm() to force a fresh client (done automatically on JWT expiry).
    """
    global _cached_client
    if _cached_client is None:
        _cached_client = _build_client()
    return _cached_client


def reset_langchain_llm() -> None:
    """Discard the cached client so the next get_langchain_llm() call builds a fresh one."""
    global _cached_client
    _cached_client = None


def _is_jwt_error(exc: Exception) -> bool:
    return "jwt" in str(exc).lower() or "expired" in str(exc).lower() or "401" in str(exc)


async def get_langchain_llm_with_retry(call):
    """
    Execute an async callable `call(llm)` using the cached LangChain client.
    On JWT/auth error, resets the cache and retries once with a fresh client.

    Usage:
        result = await get_langchain_llm_with_retry(lambda llm: llm.ainvoke(messages))
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
