import json
import asyncio
import httpx
import time
from typing import Optional, Type
from pydantic import BaseModel, ValidationError

from infra.llm.base import BaseLLM
from infra.llm.schemas import LLMResponse
from infra.llm.exceptions import LLMError, LLMTimeoutError, LLMValidationError
from infra.logging import get_logger

logger = get_logger(__name__)


class ClaudeLLM(BaseLLM):

    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        timeout: float = 300.0,
        max_tokens: int = 8192,
        temperature: float = 1.0,
        max_retries: int = 3
    ):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.timeout = timeout
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.max_retries = max_retries

        self.client = httpx.AsyncClient(
            timeout=timeout,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            }
        )

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, **kwargs):
        start_time = time.time()
        print(f"Generating response for prompt: {prompt[:50]}...")

        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": kwargs.get("max_tokens", self.max_tokens),
            "temperature": kwargs.get("temperature", self.temperature)
        }

        if system_prompt:
            payload["system"] = system_prompt

        try:
            response = await self.client.post(
                f"{self.base_url}/v1/messages",
                json=payload
            )

            elapsed_time = time.time() - start_time

            if response.status_code != 200:
                logger.error(
                    "llm_api_error",
                    status_code=response.status_code,
                    error=response.text,
                    elapsed_time=elapsed_time
                )
                raise LLMError(response.text)

            data = response.json()

            return LLMResponse(
                content=data["content"][0]["text"],
                usage=data.get("usage", {}),
                model=data.get("model", self.model),
                raw_response=data
            )

        except httpx.TimeoutException as e:
            elapsed_time = time.time() - start_time
            logger.error(
                "llm_timeout",
                elapsed_time=elapsed_time,
                timeout=self.timeout
            )
            raise LLMTimeoutError("Timeout")

        except Exception as e:
            elapsed_time = time.time() - start_time
            logger.error(
                "llm_unexpected_error",
                error=str(e),
                error_type=type(e).__name__,
                elapsed_time=elapsed_time
            )
            raise

    async def generate_structured(
        self,
        prompt: str,
        output_schema: Type[BaseModel],
        system_prompt: Optional[str] = None,
        **kwargs
    ):
        schema_json = output_schema.model_json_schema()
        schema_name = output_schema.__name__

        enhanced_prompt = f"""{prompt}

Return ONLY valid JSON matching:
{json.dumps(schema_json, indent=2)}"""

        for attempt in range(self.max_retries):
            try:
                response = await self.generate(
                    enhanced_prompt,
                    system_prompt=system_prompt
                )

                content = response.content.strip().strip("```json").strip("```")
                data = json.loads(content)

                validated = output_schema.model_validate(data)

                return validated

            except (json.JSONDecodeError, ValidationError) as e:
                logger.warning(
                    "llm_generate_structured_retry",
                    schema_name=schema_name,
                    attempt=attempt + 1,
                    max_retries=self.max_retries,
                    error_type=type(e).__name__
                )
                await asyncio.sleep(1)

        logger.error(
            "llm_generate_structured_failed",
            schema_name=schema_name,
            max_retries=self.max_retries
        )
        raise LLMValidationError("Failed structured output")

    async def close(self):
        await self.client.aclose()