"""
Claude LLM provider via HAI Proxy (Anthropic-compatible /v1/messages endpoint).

Authentication: HAI Proxy API key supplied at construction time.
Token tracking: pass _token_meta=(run_id, stage) keyword argument to generate().
generate_structured() is inherited from BaseLLM.
"""

import time
from typing import Optional

import httpx

from infra.llm.base import BaseLLM
from infra.llm.exceptions import LLMError, LLMTimeoutError
from infra.llm.schemas import LLMResponse
from infra.logging import get_logger

logger = get_logger(__name__)


def _get_token_tracker():
    from core.services.token_tracker import token_tracker
    return token_tracker


class ClaudeLLM(BaseLLM):
    """
    Anthropic Claude via HAI Proxy.
    generate_structured() is inherited from BaseLLM.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        timeout: float = 300.0,
        max_tokens: int = 8192,
        temperature: float = 1.0,
    ):
        self.base_url = base_url
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.client = httpx.AsyncClient(
            timeout=timeout,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
        )

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs,
    ) -> LLMResponse:
        start_time = time.time()
        logger.info("llm_generate_start", prompt_preview=prompt[:80])

        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": kwargs.get("max_tokens", self.max_tokens),
            "temperature": kwargs.get("temperature", self.temperature),
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            response = await self.client.post(
                f"{self.base_url}/v1/messages",
                json=payload,
            )
            elapsed_ms = int((time.time() - start_time) * 1000)

            if response.status_code != 200:
                logger.error(
                    "llm_api_error",
                    status_code=response.status_code,
                    error=response.text[:200],
                    elapsed_ms=elapsed_ms,
                )
                raise LLMError(response.text)

            data = response.json()
            llm_response = LLMResponse(
                content=data["content"][0]["text"],
                usage=data.get("usage", {}),
                model=data.get("model", self.model),
                raw_response=data,
            )

            token_meta = kwargs.get("_token_meta")
            if token_meta:
                run_id, stage = token_meta
                usage = llm_response.usage
                try:
                    _get_token_tracker().record(
                        run_id=run_id,
                        stage=stage,
                        model=llm_response.model,
                        input_tokens=int(usage.get("input_tokens", 0)),
                        output_tokens=int(usage.get("output_tokens", 0)),
                        duration_ms=elapsed_ms,
                    )
                except Exception:
                    pass

            logger.info(
                "llm_generate_complete",
                elapsed_ms=elapsed_ms,
                input_tokens=llm_response.usage.get("input_tokens", 0),
                output_tokens=llm_response.usage.get("output_tokens", 0),
            )
            return llm_response

        except httpx.TimeoutException:
            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.error("llm_timeout", elapsed_ms=elapsed_ms)
            raise LLMTimeoutError("Request timed out")

        except LLMError:
            raise

        except Exception as exc:
            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.error(
                "llm_unexpected_error",
                error=str(exc),
                error_type=type(exc).__name__,
                elapsed_ms=elapsed_ms,
            )
            raise

    async def close(self) -> None:
        await self.client.aclose()
