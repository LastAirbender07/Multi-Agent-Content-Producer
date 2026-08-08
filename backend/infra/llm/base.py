"""
Abstract base class for all LLM providers.

Design: Template Method pattern.
- Providers implement only transport (generate, close).
- generate_structured() is a concrete shared method — providers do NOT override it.
"""

import asyncio
import json
from abc import ABC, abstractmethod
from typing import Optional, Type

from pydantic import BaseModel, ValidationError

from infra.llm.exceptions import LLMValidationError
from infra.llm.schemas import LLMResponse
from infra.logging import get_logger

logger = get_logger(__name__)


def _strip_fences(text: str) -> str:
    """
    Remove markdown code fences LLMs sometimes wrap around JSON output.

    Handles these real-world cases:
      ```json           ```json{...}```     plain {...}
      {...}
      ```
    """
    text = text.strip()
    if text.startswith("```"):
        # split("```", 1)[1] removes the opening fence marker and works
        # whether or not there is a newline after the fence token.
        text = text.split("```", 1)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.lstrip("\n")
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    return text.strip()


class BaseLLM(ABC):

    MAX_VALIDATION_RETRIES: int = 3

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs,
    ) -> LLMResponse:
        """Transport layer — provider-specific HTTP call. Must not do JSON parsing."""

    @abstractmethod
    async def close(self) -> None:
        """Release HTTP client resources (e.g. close aiohttp session)."""

    async def generate_structured(
        self,
        prompt: str,
        output_schema: Type[BaseModel],
        system_prompt: Optional[str] = None,
        **kwargs,
    ) -> BaseModel:
        """
        Structured output via JSON schema injection and Pydantic validation.

        Appends the output schema to the prompt, calls generate(), strips fences,
        parses JSON, and validates with Pydantic. Retries up to MAX_VALIDATION_RETRIES
        times on JSON/Pydantic failure. Transport errors (LLMError, LLMTimeoutError)
        propagate immediately without retry.

        Concrete — providers do NOT override this method.
        """
        schema_str = json.dumps(output_schema.model_json_schema(), indent=2)
        enhanced_prompt = f"{prompt}\n\nReturn ONLY valid JSON matching:\n{schema_str}"

        # Forward private kwargs only (e.g. _token_meta) — max_tokens and temperature
        # are baked into the provider at construction time, not repeated per-call.
        gen_kwargs = {k: v for k, v in kwargs.items() if k.startswith("_")}

        for attempt in range(self.MAX_VALIDATION_RETRIES):
            try:
                response = await self.generate(
                    enhanced_prompt,
                    system_prompt=system_prompt,
                    **gen_kwargs,
                )
                content = _strip_fences(response.content)
                return output_schema.model_validate(json.loads(content))

            except (json.JSONDecodeError, ValidationError) as exc:
                logger.warning(
                    "generate_structured_retry",
                    schema=output_schema.__name__,
                    attempt=attempt + 1,
                    max_retries=self.MAX_VALIDATION_RETRIES,
                    error_type=type(exc).__name__,
                )
                await asyncio.sleep(1)

        raise LLMValidationError(
            f"Structured output failed after {self.MAX_VALIDATION_RETRIES} attempts "
            f"for schema '{output_schema.__name__}'"
        )
