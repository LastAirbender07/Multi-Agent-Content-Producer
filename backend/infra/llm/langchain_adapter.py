"""
LangChain adapter — provider-agnostic LangChain-compatible client.

Use this for LangChain/LangGraph workflows (chains, agents, graph nodes).
For direct LLM calls, use LLMFactory.get_client_with_retry() instead.

Supported providers: claude, openai, gemini, sap_ai_core, sap_ai_core_orch, hai_proxy.

Provider routing:
- claude / hai_proxy → LLMFactoryAdapter → ClaudeLLM (HAI Proxy, structured logs)
- openai             → ChatOpenAI   (native LangChain, supports structured output)
- gemini             → ChatGoogleGenerativeAI
- sap_ai_core        → gen_ai_hub ChatOpenAI (direct deployment, OpenAI-compat models)
- sap_ai_core_orch   → LLMFactoryAdapter → SAPAICoreOrchestrationProvider

LLMFactoryAdapter is a thin BaseChatModel wrapper around LLMFactory. It converts
LangChain messages → text prompt → calls the configured provider → returns AIMessage.
Benefits over native ChatAnthropic: routes through LLMFactory so provider-level
structured logs (llm_generate_start / llm_generate_complete) always fire, and JWT
retry logic is handled in one place (LLMFactory.get_client_with_retry).
"""

import asyncio
from typing import Any, Optional

from langchain_core.callbacks.manager import CallbackManagerForLLMRun, AsyncCallbackManagerForLLMRun
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.outputs import ChatGeneration, ChatResult

from configs.settings import get_settings
from infra.llm.jwt_handler import is_jwt_error
from infra.logging import get_logger

logger = get_logger(__name__)


# ── Provider-agnostic LangChain wrapper ──────────────────────────────────────

class LLMFactoryAdapter(BaseChatModel):
    """
    A thin BaseChatModel that delegates every call to LLMFactory.get_client_with_retry().

    This makes the LangChain adapter truly provider-agnostic: switching LLM_PROVIDER
    in .env transparently changes the underlying provider without touching any caller.

    Use for providers that lack native LangChain classes (e.g. sap_ai_core_orch),
    or as a universal fallback when native classes aren't installed.
    """

    @property
    def _llm_type(self) -> str:
        return "llm_factory_adapter"

    def _messages_to_prompt(self, messages: list[BaseMessage]) -> tuple[str | None, str]:
        """Convert a LangChain message list to (system_prompt, user_prompt)."""
        system_parts: list[str] = []
        conv_parts: list[str] = []
        for msg in messages:
            content = msg.content if isinstance(msg.content, str) else str(msg.content)
            if isinstance(msg, SystemMessage):
                system_parts.append(content)
            elif isinstance(msg, HumanMessage):
                conv_parts.append(f"Human: {content}")
            elif isinstance(msg, AIMessage):
                conv_parts.append(f"Assistant: {content}")
            else:
                conv_parts.append(content)
        system_prompt = "\n\n".join(system_parts) or None
        prompt = "\n".join(conv_parts)
        return system_prompt, prompt

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: Optional[list[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Sync variant — runs the async path in a new event loop."""
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None
        if loop and loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(asyncio.run, self._agenerate(messages, stop=stop, **kwargs))
                return future.result()
        return asyncio.run(self._agenerate(messages, stop=stop, **kwargs))

    async def _agenerate(
        self,
        messages: list[BaseMessage],
        stop: Optional[list[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Async variant — delegates to LLMFactory (handles JWT retry internally)."""
        from infra.llm.factory import LLMFactory  # local import avoids circular dep

        system_prompt, prompt = self._messages_to_prompt(messages)

        async def _call(llm):
            return await llm.generate(prompt=prompt, system_prompt=system_prompt)

        result = await LLMFactory.get_client_with_retry(_call)
        ai_message = AIMessage(content=result.content)
        return ChatResult(generations=[ChatGeneration(message=ai_message)])


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


def _create_sap_ai_core_client(settings) -> BaseChatModel:
    """
    LangChain-compatible client for SAP AI Core.
    Uses proxy_model_name (SAP SDK parameter convention, not 'model').
    Auth is handled automatically via AICORE_* environment variables.
    """
    from gen_ai_hub.proxy.langchain.openai import ChatOpenAI as _SAPChatOpenAI
    return _SAPChatOpenAI(
        proxy_model_name=settings.llm_model,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
    )


def _build_client() -> BaseChatModel:
    settings = get_settings()
    if settings.llm_provider in ("claude", "hai_proxy"):
        return LLMFactoryAdapter()
    elif settings.llm_provider == "openai":
        return _create_openai_client(settings)
    elif settings.llm_provider == "gemini":
        return _create_gemini_client(settings)
    elif settings.llm_provider == "sap_ai_core":
        # Direct model deployment — gen_ai_hub ChatOpenAI works for OpenAI-compatible models
        return _create_sap_ai_core_client(settings)
    elif settings.llm_provider == "sap_ai_core_orch":
        # Orchestration service — no native gen_ai_hub LangChain class for Anthropic/Claude.
        return LLMFactoryAdapter()
    raise ValueError(
        f"Unsupported LangChain provider: '{settings.llm_provider}'. "
        "Valid options: claude, hai_proxy, openai, gemini, sap_ai_core, sap_ai_core_orch"
    )


# Resettable module-level cache — avoids @lru_cache() baking a stale token forever.
_cached_client: BaseChatModel | None = None


def get_langchain_llm() -> BaseChatModel:
    """
    Get LangChain-compatible client (singleton, provider-agnostic).
    Call reset_langchain_llm() to force a fresh client on token expiry.
    """
    global _cached_client
    if _cached_client is None:
        _cached_client = _build_client()
    return _cached_client


def reset_langchain_llm() -> None:
    """Discard cached client so the next get_langchain_llm() builds a fresh one."""
    global _cached_client
    _cached_client = None


async def get_langchain_llm_with_retry(call):
    """
    Execute async callable call(llm) using the cached LangChain client.
    On auth/token expiry error, resets the cache and retries once.

    Usage:
        result = await get_langchain_llm_with_retry(lambda llm: llm.ainvoke(messages))
    """
    llm = get_langchain_llm()
    try:
        return await call(llm)
    except Exception as exc:
        if is_jwt_error(exc):
            logger.warning("langchain_auth_expired_retrying")
            reset_langchain_llm()
            llm = get_langchain_llm()
            return await call(llm)
        raise