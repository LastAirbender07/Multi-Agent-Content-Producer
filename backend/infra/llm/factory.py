import asyncio
from typing import Optional
from infra.llm.base import BaseLLM
from infra.llm.providers.claude import ClaudeLLM
from configs.settings import get_settings


class LLMFactory:
    _instance: Optional[BaseLLM] = None
    _lock = asyncio.Lock()

    @classmethod
    async def get_client(cls) -> BaseLLM:
        """
        Get singleton LLM client (thread-safe, reuses same instance).

        Use this for most cases to avoid creating multiple HTTP clients.
        Returns the same client instance across all calls.
        """
        if cls._instance is None:
            async with cls._lock:
                if cls._instance is None:  # Double-check locking
                    settings = get_settings()

                    if settings.llm_provider == "claude":
                        cls._instance = ClaudeLLM(
                            api_key=settings.hai_proxy_api_key,
                            base_url=settings.hai_proxy_url,
                            model=settings.llm_model,
                            timeout=settings.llm_timeout,
                            max_tokens=settings.llm_max_tokens,
                            temperature=settings.llm_temperature
                        )
                    else:
                        raise ValueError(f"Unsupported provider: {settings.llm_provider}")

        return cls._instance

    @classmethod
    async def close_client(cls):
        """
        Close singleton client (call on application shutdown).
        Should be called when your app shuts down (e.g., FastAPI shutdown event).
        """
        if cls._instance:
            await cls._instance.close()
            cls._instance = None
