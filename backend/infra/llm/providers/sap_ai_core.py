"""
SAP AI Core provider — direct deployment mode.

Uses gen_ai_hub.proxy.native.openai.clients.AsyncOpenAI.
One deployment per model must exist in SAP AI Core before use.

For access to all catalog models without per-model deployments,
use sap_ai_core_orch instead (recommended).

Authentication (all read automatically from environment by the SDK):
    AICORE_CLIENT_ID        — OAuth2 client ID from the service key
    AICORE_CLIENT_SECRET    — OAuth2 client secret
    AICORE_AUTH_URL         — XSUAA endpoint  (service key `url` + /oauth/token)
    AICORE_BASE_URL         — AI API base URL (service key AI_API_URL + /v2)
    AICORE_RESOURCE_GROUP   — Resource group (usually "default")
"""

import time
from typing import Optional

from infra.llm.base import BaseLLM
from infra.llm.exceptions import LLMError
from infra.llm.schemas import LLMResponse
from infra.logging import get_logger

logger = get_logger(__name__)

_REASONING_MODEL_PREFIXES: tuple[str, ...] = ("o1", "o3", "amazon--nova-pro-reasoning")


def _is_reasoning_model(model_name: str) -> bool:
    """Return True for models that reject the temperature parameter."""
    return any(model_name.startswith(p) for p in _REASONING_MODEL_PREFIXES)


def _get_token_tracker():
    from core.services.token_tracker import token_tracker
    return token_tracker


class SAPAICoreProvider(BaseLLM):
    """
    SAP AI Core — direct deployment mode.

    Uses the natively async AsyncOpenAI client from sap-ai-sdk-gen.
    generate_structured() is inherited from BaseLLM.
    """

    def __init__(
        self,
        model: str,
        max_tokens: int = 8192,
        temperature: float = 1.0,
    ) -> None:
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        # Deferred import: allows this file to be imported even when
        # sap-ai-sdk-gen is not installed (factory.py guards instantiation).
        from gen_ai_hub.proxy.native.openai.clients import AsyncOpenAI as _SAPAsyncOpenAI
        self._client = _SAPAsyncOpenAI()

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs,
    ) -> LLMResponse:
        start_time = time.time()
        logger.info("sap_ai_core_generate_start", model=self.model, prompt_preview=prompt[:80])

        messages: list[dict] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        create_kwargs: dict = {
            "model_name": self.model,   # SAP SDK uses model_name, not model
            "messages": messages,
            "max_tokens": self.max_tokens,
        }
        if not _is_reasoning_model(self.model):
            create_kwargs["temperature"] = self.temperature

        try:
            response = await self._client.chat.completions.create(**create_kwargs)
            elapsed_ms = int((time.time() - start_time) * 1000)

            usage = {
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens,
            }
            llm_response = LLMResponse(
                content=response.choices[0].message.content,
                usage=usage,
                model=self.model,
            )

            token_meta = kwargs.get("_token_meta")
            if token_meta:
                run_id, stage = token_meta
                try:
                    _get_token_tracker().record(
                        run_id=run_id,
                        stage=stage,
                        model=self.model,
                        input_tokens=usage["input_tokens"],
                        output_tokens=usage["output_tokens"],
                        duration_ms=elapsed_ms,
                    )
                except Exception:
                    pass

            logger.info(
                "sap_ai_core_generate_complete",
                elapsed_ms=elapsed_ms,
                input_tokens=usage["input_tokens"],
                output_tokens=usage["output_tokens"],
            )
            return llm_response

        except Exception as exc:
            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.error(
                "sap_ai_core_generate_error",
                error=str(exc),
                error_type=type(exc).__name__,
                elapsed_ms=elapsed_ms,
            )
            raise LLMError(str(exc)) from exc

    async def close(self) -> None:
        pass