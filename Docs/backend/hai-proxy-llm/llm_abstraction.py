"""
Production-grade LLM abstraction layer for multi-agent content generation.
Supports Claude via Hyperspace AI proxy (OpenAI-compatible endpoint).
"""

import json
import os
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from enum import Enum
import asyncio
from dataclasses import dataclass
import httpx
from pydantic import BaseModel, ValidationError


class LLMProvider(Enum):
    HAI_PROXY = "hai_proxy"  # Hyperspace AI proxy
    CLAUDE_API = "claude_api"  # Official Anthropic API (for future)


@dataclass
class LLMConfig:
    """Configuration for LLM provider."""
    provider: LLMProvider = LLMProvider.HAI_PROXY
    model: str = "anthropic--claude-4.5-sonnet"

    # HAI Proxy settings (from your proxy)
    base_url: str = "http://localhost:6655/anthropic"  # Anthropic-compatible endpoint
    api_key: str = "514e25ac-1227-41b2-a09c-772a1b547532"  # From HAI proxy

    # Generation settings
    max_tokens: int = 8192
    temperature: float = 1.0
    timeout: float = 300.0
    max_retries: int = 3


class LLMResponse(BaseModel):
    """Standardized response format."""
    content: str
    usage: Dict[str, int]
    model: str
    raw_response: Optional[Any] = None


class StructuredOutput(BaseModel):
    """Base class for structured outputs. Extend this for your use cases."""
    pass


class LLMError(Exception):
    """Base exception for LLM-related errors."""
    pass


class LLMTimeoutError(LLMError):
    """Raised when LLM request times out."""
    pass


class LLMValidationError(LLMError):
    """Raised when structured output validation fails."""
    pass


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers."""

    def __init__(self, config: LLMConfig):
        self.config = config

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> LLMResponse:
        """Generate text from prompt."""
        pass

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        output_schema: type[StructuredOutput],
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> StructuredOutput:
        """Generate structured output matching schema."""
        pass


class HAIProxyProvider(BaseLLMProvider):
    """Hyperspace AI Proxy provider (Anthropic API format via HAI proxy)."""

    def __init__(self, config: LLMConfig):
        super().__init__(config)
        self.base_url = config.base_url
        self.api_key = config.api_key

        # Create async HTTP client (using Anthropic headers)
        self.client = httpx.AsyncClient(
            timeout=config.timeout,
            headers={
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            }
        )

    async def _check_proxy_status(self) -> bool:
        """Check if HAI proxy is running."""
        try:
            response = await self.client.get(
                self.base_url.replace("/v1", "/health"),
                timeout=5.0
            )
            return response.status_code == 200
        except:
            return False

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> LLMResponse:
        """
        Generate text from Claude via HAI proxy.

        Args:
            prompt: User message/prompt
            system_prompt: Optional system instructions
            **kwargs: Additional parameters (temperature, max_tokens, etc.)

        Returns:
            LLMResponse with generated content

        Raises:
            LLMTimeoutError: If request times out
            LLMError: For other API errors
        """
        # Build messages (Anthropic format)
        messages = [{"role": "user", "content": prompt}]

        # Prepare request payload (Anthropic API format)
        payload = {
            "model": kwargs.get("model", self.config.model),
            "messages": messages,
            "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
        }

        # Add optional parameters
        if system_prompt:
            payload["system"] = system_prompt

        temp = kwargs.get("temperature", self.config.temperature)
        if temp is not None:
            payload["temperature"] = temp

        try:
            # Make request to HAI proxy (Anthropic messages endpoint)
            response = await self.client.post(
                f"{self.base_url}/v1/messages",
                json=payload
            )

            if response.status_code != 200:
                error_detail = response.text
                if response.status_code == 503:
                    raise LLMError(
                        "HAI proxy not available. Make sure you've run: hai proxy start"
                    )
                raise LLMError(
                    f"HAI proxy returned status {response.status_code}: {error_detail}"
                )

            data = response.json()

            # Extract content (Anthropic format)
            content = data["content"][0]["text"]
            usage = data.get("usage", {})

            return LLMResponse(
                content=content,
                usage={
                    "input_tokens": usage.get("input_tokens", 0),
                    "output_tokens": usage.get("output_tokens", 0)
                },
                model=data.get("model", self.config.model),
                raw_response=data
            )

        except httpx.TimeoutException as e:
            raise LLMTimeoutError(
                f"Request timed out after {self.config.timeout}s"
            ) from e
        except httpx.ConnectError as e:
            raise LLMError(
                "Cannot connect to HAI proxy. Make sure it's running: hai proxy start"
            ) from e
        except KeyError as e:
            raise LLMError(f"Unexpected response format from HAI proxy: {str(e)}") from e
        except Exception as e:
            raise LLMError(f"HAI proxy error: {str(e)}") from e

    async def generate_structured(
        self,
        prompt: str,
        output_schema: type[StructuredOutput],
        system_prompt: Optional[str] = None,
        max_retries: int = 3,
        **kwargs
    ) -> StructuredOutput:
        """
        Generate structured output matching Pydantic schema.

        Uses prompt engineering + JSON parsing with automatic retry on validation failure.

        Args:
            prompt: User message/prompt
            output_schema: Pydantic model class defining expected structure
            system_prompt: Optional system instructions
            max_retries: Number of retry attempts for malformed JSON
            **kwargs: Additional generation parameters

        Returns:
            Instance of output_schema with parsed data

        Raises:
            LLMValidationError: If output cannot be validated after retries
        """
        # Build enhanced system prompt with schema
        schema_json = output_schema.model_json_schema()
        enhanced_system = self._build_structured_system_prompt(
            schema_json,
            system_prompt
        )

        # Enhanced prompt to enforce JSON output
        enhanced_prompt = f"""{prompt}

You MUST respond with ONLY valid JSON matching this exact schema. No markdown, no explanation, just the JSON object:

{json.dumps(schema_json, indent=2)}"""

        last_error = None
        for attempt in range(max_retries):
            try:
                response = await self.generate(
                    prompt=enhanced_prompt,
                    system_prompt=enhanced_system,
                    **kwargs
                )

                # Extract JSON from response (handle markdown code blocks)
                content = response.content.strip()
                if content.startswith("```json"):
                    content = content.split("```json", 1)[1]
                if content.startswith("```"):
                    content = content.split("```", 1)[1]
                if content.endswith("```"):
                    content = content.rsplit("```", 1)[0]
                content = content.strip()

                # Parse and validate
                data = json.loads(content)
                return output_schema.model_validate(data)

            except (json.JSONDecodeError, ValidationError) as e:
                last_error = e
                if attempt < max_retries - 1:
                    # Retry with error feedback
                    enhanced_prompt = f"""{enhanced_prompt}

PREVIOUS ATTEMPT FAILED: {str(e)}
Please correct the JSON and ensure it's valid."""
                    await asyncio.sleep(1)
                continue

        raise LLMValidationError(
            f"Failed to generate valid structured output after {max_retries} attempts. "
            f"Last error: {str(last_error)}"
        )

    def _build_structured_system_prompt(
        self,
        schema: Dict[str, Any],
        base_system: Optional[str]
    ) -> str:
        """Build system prompt with JSON schema instructions."""
        schema_instruction = f"""You are an AI assistant that produces structured JSON output.

Your response must be valid JSON matching this schema exactly:
{json.dumps(schema, indent=2)}

Rules:
1. Output ONLY the JSON object, no other text
2. Do not wrap in markdown code blocks
3. Ensure all required fields are present
4. Match the exact types specified
5. Do not add extra fields not in the schema"""

        if base_system:
            return f"{base_system}\n\n{schema_instruction}"
        return schema_instruction

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()


class LLMFactory:
    """Factory for creating LLM provider instances."""

    @staticmethod
    def create(config: LLMConfig) -> BaseLLMProvider:
        """Create provider instance based on config."""
        if config.provider == LLMProvider.HAI_PROXY:
            return HAIProxyProvider(config)
        else:
            raise ValueError(f"Unsupported provider: {config.provider}")

    @staticmethod
    def from_env() -> BaseLLMProvider:
        """
        Create provider from environment variables.

        Expected env vars:
        - HAI_PROXY_URL (default: http://localhost:6655/anthropic)
        - HAI_PROXY_API_KEY (required - get from 'hai proxy start')
        """
        base_url = os.getenv("HAI_PROXY_URL", "http://localhost:6655/anthropic")
        api_key = os.getenv("HAI_PROXY_API_KEY")

        if not api_key:
            raise ValueError(
                "HAI_PROXY_API_KEY environment variable must be set. "
                "Get it from 'hai proxy start' output."
            )

        config = LLMConfig(
            provider=LLMProvider.HAI_PROXY,
            base_url=base_url,
            api_key=api_key
        )
        return LLMFactory.create(config)


# Usage Example
class ContentGenerationOutput(StructuredOutput):
    """Example structured output for content generation."""
    title: str
    summary: str
    sections: List[Dict[str, str]]
    metadata: Dict[str, Any]


async def example_usage():
    """Example usage of the LLM abstraction layer."""

    # Option 1: Manual configuration
    config = LLMConfig(
        provider=LLMProvider.HAI_PROXY,
        base_url="http://localhost:6655/v1",
        api_key="514e25ac-1227-41b2-a09c-772a1b547532",  # From hai proxy start
        model="claude-sonnet-4-6",
        max_tokens=4096,
        temperature=0.7
    )
    llm = LLMFactory.create(config)

    # Option 2: From environment variables
    # llm = LLMFactory.from_env()

    try:
        # Example 1: Simple text generation
        print("Example 1: Simple generation")
        response = await llm.generate(
            prompt="Explain quantum computing in simple terms.",
            system_prompt="You are a helpful technical writer."
        )
        print(f"Generated: {response.content[:200]}...")
        print(f"Tokens used: {response.usage}")
        print()

        # Example 2: Structured output
        print("Example 2: Structured output")
        structured_output = await llm.generate_structured(
            prompt="Create a technical article outline about microservices architecture",
            output_schema=ContentGenerationOutput,
            system_prompt="You are a technical content strategist."
        )
        print(f"Title: {structured_output.title}")
        print(f"Summary: {structured_output.summary}")
        print(f"Sections: {len(structured_output.sections)}")

    except LLMError as e:
        print(f"Error: {e}")
    finally:
        await llm.close()


if __name__ == "__main__":
    asyncio.run(example_usage())
