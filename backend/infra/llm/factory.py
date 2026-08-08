"""
LLMFactory — async singleton for the active LLM provider.

Provider is selected by the LLM_PROVIDER environment variable.
Switching providers requires only a .env change — no code changes.

Usage:
    response = await LLMFactory.get_client_with_retry(
        lambda llm: llm.generate(prompt=p, system_prompt=s)
    )
"""

import asyncio
from typing import Optional

from infra.llm.base import BaseLLM
from infra.llm.providers.claude import ClaudeLLM
from infra.llm.providers.sap_ai_core import SAPAICoreProvider
from infra.llm.providers.sap_ai_core_orch import SAPAICoreOrchestrationProvider
from infra.llm.jwt_handler import is_jwt_error
from configs.settings import get_settings
from infra.logging import get_logger

logger = get_logger(__name__)


class LLMFactory:
    _instance: Optional[BaseLLM] = None
    _lock = asyncio.Lock()

    @classmethod
    async def get_client(cls) -> BaseLLM:
        """
        Get singleton LLM client (async-safe double-checked locking).
        Call reset() to force a fresh client on the next call (e.g. after token expiry).
        """
        if cls._instance is None:
            async with cls._lock:
                if cls._instance is None:
                    cls._instance = cls._build_instance()
        return cls._instance

    @classmethod
    def _build_instance(cls) -> BaseLLM:
        settings = get_settings()

        if settings.llm_provider in ("claude", "hai_proxy"):
            return ClaudeLLM(
                api_key=settings.hai_proxy_api_key,
                base_url=settings.hai_proxy_url,
                model=settings.llm_model,
                timeout=settings.llm_timeout,
                max_tokens=settings.llm_max_tokens,
                temperature=settings.llm_temperature,
            )

        elif settings.llm_provider == "sap_ai_core":
            return SAPAICoreProvider(
                model=settings.llm_model,
                max_tokens=settings.llm_max_tokens,
                temperature=settings.llm_temperature,
            )

        elif settings.llm_provider == "sap_ai_core_orch":
            return SAPAICoreOrchestrationProvider(
                model=settings.llm_model,
                max_tokens=settings.llm_max_tokens,
                temperature=settings.llm_temperature,
            )

        raise ValueError(
            f"Unsupported LLM provider: '{settings.llm_provider}'. "
            "Valid options: claude, hai_proxy, sap_ai_core, sap_ai_core_orch"
        )

    @classmethod
    def reset(cls) -> None:
        """Discard the singleton so the next get_client() call builds a fresh one."""
        cls._instance = None

    @classmethod
    async def get_client_with_retry(cls, call) -> BaseLLM:
        """
        Execute async callable call(llm) using the singleton client.
        On auth/token expiry error, resets the singleton and retries once.
        Any other error propagates immediately.

        Usage:
            result = await LLMFactory.get_client_with_retry(
                lambda llm: llm.generate_structured(prompt=p, output_schema=MyModel)
            )
        """
        llm = await cls.get_client()
        try:
            return await call(llm)
        except Exception as exc:
            if is_jwt_error(exc):
                logger.warning("llm_factory_auth_expired_retrying")
                cls.reset()
                llm = await cls.get_client()
                return await call(llm)
            raise

    @classmethod
    async def close_client(cls) -> None:
        """Close singleton client (call on application shutdown)."""
        if cls._instance:
            await cls._instance.close()
            cls._instance = None