"""
SAP AI Core Orchestration provider — recommended mode.

One orchestration deployment gives access to every model in the Generative
AI Hub catalog. Switch models by changing LLM_MODEL — no new deployments needed.

OrchestrationService() with no arguments discovers the orchestration endpoint
automatically by querying the AI Core deployments API using AICORE_* credentials.
Discovery result is cached (@cache_if_not_none) — only fires once per process.

arun_with_retries() handles HTTP 429 and server errors with exponential backoff.
Returns None when all retries are exhausted — checked explicitly below.

Authentication (same 5 env vars as sap_ai_core.py):
    AICORE_CLIENT_ID, AICORE_CLIENT_SECRET, AICORE_AUTH_URL,
    AICORE_BASE_URL, AICORE_RESOURCE_GROUP
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
    return any(model_name.startswith(p) for p in _REASONING_MODEL_PREFIXES)


def _get_token_tracker():
    from core.services.token_tracker import token_tracker
    return token_tracker


class SAPAICoreOrchestrationProvider(BaseLLM):
    """
    SAP AI Core — Orchestration Service mode.

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

        # All SDK imports are deferred to __init__ so this module can be imported
        # when sap-ai-sdk-gen is not installed. Stored as instance attributes to
        # avoid per-call module lookups inside generate().
        from gen_ai_hub.orchestration.service import OrchestrationService
        from gen_ai_hub.orchestration.models.config import OrchestrationConfig
        from gen_ai_hub.orchestration.models.template import Template
        from gen_ai_hub.orchestration.models.message import SystemMessage, UserMessage
        from gen_ai_hub.orchestration.models.llm import LLM

        # No deployment_id needed — SDK auto-discovers the orchestration service
        # endpoint from AICORE_* env vars via discover_orchestration_api_url().
        self._service = OrchestrationService()
        self._OrchestrationConfig = OrchestrationConfig
        self._Template = Template
        self._SystemMessage = SystemMessage
        self._UserMessage = UserMessage
        self._LLM = LLM

    def _build_llm_config(self):
        """Build the LLM spec; omit temperature for reasoning models."""
        params: dict = {"max_tokens": self.max_tokens}
        if not _is_reasoning_model(self.model):
            params["temperature"] = self.temperature
        return self._LLM(name=self.model, version="latest", parameters=params)

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs,
    ) -> LLMResponse:
        start_time = time.time()
        logger.info(
            "sap_ai_core_orch_generate_start",
            model=self.model,
            prompt_preview=prompt[:80],
        )

        messages = []
        if system_prompt:
            messages.append(self._SystemMessage(system_prompt))
        messages.append(self._UserMessage(prompt))

        config = self._OrchestrationConfig(
            template=self._Template(messages=messages),
            llm=self._build_llm_config(),
        )

        try:
            response = await self._service.arun_with_retries(config=config)

            # arun_with_retries() returns None when all retries are exhausted
            # rather than raising an exception.
            if response is None:
                raise LLMError(
                    "SAP AI Core orchestration request failed: "
                    "rate limit exceeded after all retries"
                )

            elapsed_ms = int((time.time() - start_time) * 1000)
            result = response.orchestration_result
            content = result.choices[0].message.content
            usage = {
                "input_tokens": result.usage.prompt_tokens,
                "output_tokens": result.usage.completion_tokens,
            }

            llm_response = LLMResponse(content=content, usage=usage, model=self.model)

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
                "sap_ai_core_orch_generate_complete",
                elapsed_ms=elapsed_ms,
                model=self.model,
                input_tokens=usage["input_tokens"],
                output_tokens=usage["output_tokens"],
            )
            return llm_response

        except LLMError:
            # LLMError raised inside this try block (e.g. the None-guard above)
            # must propagate unchanged. Without this clause, the except below
            # would catch it and double-wrap the message.
            raise

        except Exception as exc:
            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.error(
                "sap_ai_core_orch_generate_error",
                error=str(exc),
                error_type=type(exc).__name__,
                elapsed_ms=elapsed_ms,
            )
            raise LLMError(str(exc)) from exc

    async def close(self) -> None:
        pass