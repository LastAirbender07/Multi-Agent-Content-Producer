import asyncio
from typing import Optional
from infra.llm.base import BaseLLM
from infra.llm.providers.claude import ClaudeLLM
from configs.settings import get_settings
from infra.logging import get_logger

logger = get_logger(__name__)


def _is_jwt_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "jwt" in msg or "expired" in msg or "401" in msg


class LLMFactory:
    _instance: Optional[BaseLLM] = None
    _lock = asyncio.Lock()

    @classmethod
    async def get_client(cls) -> BaseLLM:
        """
        Get singleton LLM client (thread-safe, reuses same instance).
        Call reset() to force a fresh client on the next call (e.g. after JWT expiry).
        """
        if cls._instance is None:
            async with cls._lock:
                if cls._instance is None:
                    settings = get_settings()
                    if settings.llm_provider == "claude":
                        cls._instance = ClaudeLLM(
                            api_key=settings.hai_proxy_api_key,
                            base_url=settings.hai_proxy_url,
                            model=settings.llm_model,
                            timeout=settings.llm_timeout,
                            max_tokens=settings.llm_max_tokens,
                            temperature=settings.llm_temperature,
                        )
                    else:
                        raise ValueError(f"Unsupported provider: {settings.llm_provider}")
        return cls._instance

    @classmethod
    def reset(cls) -> None:
        """Discard the singleton so the next get_client() call builds a fresh one."""
        cls._instance = None

    @classmethod
    async def get_client_with_retry(cls, call):
        """
        Execute an async callable call(llm) using the singleton client.
        On JWT/401 error, resets the singleton and retries once with a fresh client.
        Any other error is re-raised immediately.

        Usage:
            response = await LLMFactory.get_client_with_retry(
                lambda llm: llm.generate(prompt=p, system_prompt=s)
            )
        """
        llm = await cls.get_client()
        try:
            return await call(llm)
        except Exception as e:
            if _is_jwt_error(e):
                logger.warning("llm_factory_jwt_expired_retrying")
                cls.reset()
                llm = await cls.get_client()
                return await call(llm)
            raise

    @classmethod
    async def close_client(cls):
        """Close singleton client (call on application shutdown)."""
        if cls._instance:
            await cls._instance.close()
            cls._instance = None
