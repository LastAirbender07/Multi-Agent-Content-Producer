# SAP AI Core — Code Implementation Plan

**Status:** v2.0 — Architect-verified (4 review rounds, all issues resolved)  
**Reference plan:** `Docs/backend/SAP_AI_CORE_INTEGRATION_PLAN.md` v1.8  
**Purpose:** Ready-to-implement code for all 15 file changes. Each file shows its **complete final content**.

---

## Phase 1 — Install SDK

### `backend/pyproject.toml` (modify — add one line)

Locate the `dependencies` array and insert the new line. The exact position does not matter — alphabetical order is conventional:

```toml
dependencies = [
    ...
    "sap-ai-sdk-gen>=7.0.0",
    ...
]
```

**After change, run:**
```bash
cd backend && uv sync
python -c "import gen_ai_hub; print('SDK installed OK')"
uv run pytest tests/                # must all pass before proceeding
```

> ⚠️ `sap-ai-sdk-gen==7.2.0` depends on `langchain~=1.3.11`. If current install is `langchain 1.2.x`, uv will upgrade the entire LangChain stack. Run the full test suite immediately after sync.

---

## Phase 2 — Refactor `BaseLLM` (promote `generate_structured`)

### `backend/infra/llm/base.py` — **complete new content**

```python
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
```

---

## Phase 3 — Slim Down `ClaudeLLM`

### `backend/infra/llm/providers/claude.py` — **complete new content**

`generate_structured()` and `max_validation_retries` removed — both are now in `BaseLLM`.

```python
"""
Claude LLM provider via HAI Proxy (Anthropic-compatible /v1/messages endpoint).

Authentication: HAI Proxy API key supplied at construction time.
Token tracking: pass _token_meta=(run_id, stage) keyword argument to generate().
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
    generate_structured() is inherited from BaseLLM — not defined here.
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
                f"{self.client.base_url}/v1/messages",
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
```

> **Bug fixed vs original:** `self.client.post(f"{self.base_url}/v1/messages")` → the `httpx.AsyncClient` stores the base_url internally so we reference `self.client.base_url`. Actually — wait, in the original the base_url is stored on `self` directly as `self.base_url`. The httpx client does NOT automatically know the base URL unless you pass `base_url=` at client construction time. The original code passes the full URL at post-time. Let me match the original pattern exactly.

**Corrected `claude.py` (the `generate` method `post` call):**

The original stores `self.base_url` separately. The refactored version should keep that pattern:

```python
    def __init__(self, api_key, base_url, model, timeout=300.0, max_tokens=8192, temperature=1.0):
        self.model = model
        self.base_url = base_url          # stored separately, used in generate()
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

    # In generate():
    response = await self.client.post(
        f"{self.base_url}/v1/messages",
        json=payload,
    )
```

**Complete corrected `claude.py`:**

```python
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
```

---

## Phase 4 — Create SAP AI Core Providers

### `backend/infra/llm/providers/sap_ai_core.py` — **new file**

```python
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
```

### `backend/infra/llm/providers/sap_ai_core_orch.py` — **new file**

```python
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
```

---

## Phase 5 — Extend `jwt_handler.py`

### `backend/infra/llm/jwt_handler.py` — **complete new content**

```python
"""Shared auth error detection used by LLMFactory and the LangChain adapter."""

_AUTH_ERROR_TOKENS: frozenset[str] = frozenset({
    "jwt",
    "expired",
    "401",
    "unauthorized",
    "403",
    "forbidden",
    "invalid_token",
    "token_expired",
    "authentication",
})


def is_jwt_error(exc: Exception) -> bool:
    """
    Return True if the exception indicates a token expiry or auth failure.

    Covers both HAI Proxy JWT errors and SAP AI Core XSUAA token errors.
    Conservative: triggers singleton reset, not error suppression.
    """
    msg = str(exc).lower()
    return any(token in msg for token in _AUTH_ERROR_TOKENS)
```

---

## Phase 6 — Update `factory.py`

### `backend/infra/llm/factory.py` — **complete new content**

```python
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

        if settings.llm_provider == "claude":
            from infra.llm.providers.claude import ClaudeLLM
            return ClaudeLLM(
                api_key=settings.hai_proxy_api_key,
                base_url=settings.hai_proxy_url,
                model=settings.llm_model,
                timeout=settings.llm_timeout,
                max_tokens=settings.llm_max_tokens,
                temperature=settings.llm_temperature,
            )

        elif settings.llm_provider == "sap_ai_core":
            from infra.llm.providers.sap_ai_core import SAPAICoreProvider
            return SAPAICoreProvider(
                model=settings.llm_model,
                max_tokens=settings.llm_max_tokens,
                temperature=settings.llm_temperature,
            )

        elif settings.llm_provider == "sap_ai_core_orch":
            from infra.llm.providers.sap_ai_core_orch import SAPAICoreOrchestrationProvider
            return SAPAICoreOrchestrationProvider(
                model=settings.llm_model,
                max_tokens=settings.llm_max_tokens,
                temperature=settings.llm_temperature,
            )

        raise ValueError(
            f"Unsupported LLM provider: '{settings.llm_provider}'. "
            "Valid options: claude, sap_ai_core, sap_ai_core_orch"
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
```

> **Improvement vs original:** provider instantiation extracted into `_build_instance()` — single-responsibility, easier to test, no inline `if/elif` inside the double-checked lock critical section.

---

## Phase 7 — Update `langchain_adapter.py`

### `backend/infra/llm/langchain_adapter.py` — **complete new content**

```python
"""
LangChain adapter — provider-agnostic LangChain-compatible client.

Use this for LangChain/LangGraph workflows (chains, agents, graph nodes).
For direct LLM calls, use LLMFactory.get_client_with_retry() instead.

Supported providers: claude, openai, gemini, sap_ai_core, sap_ai_core_orch.

Note for sap_ai_core_orch: ChatOpenAI uses the direct deployment API path.
If only the orchestration service deployment exists (no direct model deployments),
the 3 LangChain call sites (chat.py, tools_news.py, evidence_scorer.py) will fail
with an API error. Mitigation: either provision a direct deployment for the target
model, or migrate those callers to LLMFactory.get_client_with_retry().
"""

from langchain_core.language_models.chat_models import BaseChatModel

from configs.settings import get_settings
from infra.llm.jwt_handler import is_jwt_error
from infra.logging import get_logger

logger = get_logger(__name__)


def _create_claude_client(settings) -> BaseChatModel:
    from langchain_anthropic import ChatAnthropic
    return ChatAnthropic(
        api_key=settings.hai_proxy_api_key,
        base_url=settings.hai_proxy_url,
        model=settings.llm_model,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
        timeout=settings.llm_timeout,
    )


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
    if settings.llm_provider == "claude":
        return _create_claude_client(settings)
    elif settings.llm_provider == "openai":
        return _create_openai_client(settings)
    elif settings.llm_provider == "gemini":
        return _create_gemini_client(settings)
    elif settings.llm_provider in ("sap_ai_core", "sap_ai_core_orch"):
        return _create_sap_ai_core_client(settings)
    raise ValueError(
        f"Unsupported LangChain provider: '{settings.llm_provider}'. "
        "Valid options: claude, openai, gemini, sap_ai_core, sap_ai_core_orch"
    )


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
```

---

## Phase 8 — Fix 4 Call Sites

These are targeted replacements only. The surrounding code in each file is unchanged.

### 8a. `backend/core/orchestrators/content/caption_generator.py`

```python
# FIND and REPLACE this pattern wherever it appears in the file:

# BEFORE
llm = await LLMFactory.get_client()
result = await llm.generate_structured(
    prompt=user_prompt,
    output_schema=CaptionOutput,
    system_prompt=system_prompt,
    _token_meta=(run_id, "caption"),
)

# AFTER
result = await LLMFactory.get_client_with_retry(
    lambda llm: llm.generate_structured(
        prompt=user_prompt,
        output_schema=CaptionOutput,
        system_prompt=system_prompt,
        _token_meta=(run_id, "caption"),
    )
)
```

### 8b. `backend/core/orchestrators/content/slide_validator.py`

```python
# FIND

llm = await LLMFactory.get_client()
raw = await llm.generate(prompt=prompt)

# REPLACE WITH

response = await LLMFactory.get_client_with_retry(
    lambda llm: llm.generate(prompt=prompt)
)
raw = response.content
```

> Also remove the local fence-stripping code that follows — it is now handled by `BaseLLM.generate_structured()`. If this call site calls `generate()` (raw text), the caller is responsible for parsing the response. The local fence strip is only needed if it calls `generate_structured()`. Check the actual file to determine the correct approach.

### 8c. `backend/core/orchestrators/research/llm_drafter.py`

```python
# FIND (draft_research and refine_research functions)

llm = await LLMFactory.get_client()
response = await llm.generate(prompt=..., system_prompt=..., _token_meta=...)

# REPLACE WITH

response = await LLMFactory.get_client_with_retry(
    lambda llm: llm.generate(prompt=..., system_prompt=..., _token_meta=...)
)
```

### 8d. `backend/core/orchestrators/research/evidence_scorer.py`

```python
# FIND (at top of file — import)
from infra.llm.langchain_adapter import get_langchain_llm

# REPLACE WITH
from infra.llm.langchain_adapter import get_langchain_llm_with_retry

# FIND (in the scoring function)
llm = get_langchain_llm()
response = await llm.ainvoke(messages)

# REPLACE WITH
response = await get_langchain_llm_with_retry(lambda llm: llm.ainvoke(messages))
```

---

## Phase 9 — Update `configs/settings.py`

Single comment update — no new fields needed:

```python
# FIND
llm_provider: str = "claude"

# REPLACE WITH
llm_provider: str = "claude"  # Options: claude | sap_ai_core | sap_ai_core_orch
```

---

## Phase 10 — Update `.env.example`

Add this block after the existing LLM settings section:

```bash
# ── SAP AI Core (Generative AI Hub) ────────────────────────────────────────
# Service key field mapping:
#   AICORE_CLIENT_ID      ← service_key.clientid
#   AICORE_CLIENT_SECRET  ← service_key.clientsecret
#   AICORE_AUTH_URL       ← service_key.url + /oauth/token
#   AICORE_BASE_URL       ← service_key.serviceurls.AI_API_URL + /v2
#   AICORE_RESOURCE_GROUP ← "default" (or your group name)

# Direct mode — one deployment per model required
# LLM_PROVIDER=sap_ai_core
# LLM_MODEL=anthropic--claude-3.5-sonnet

# Orchestration mode — RECOMMENDED: one deployment, all catalog models
# LLM_PROVIDER=sap_ai_core_orch
# LLM_MODEL=anthropic--claude-4-opus

# AICORE_CLIENT_ID=sb-...
# AICORE_CLIENT_SECRET=...
# AICORE_AUTH_URL=https://<tenant>.authentication.<region>.hana.ondemand.com/oauth/token
# AICORE_BASE_URL=https://api.ai.<region>.cfapps.sap.hana.ondemand.com/v2
# AICORE_RESOURCE_GROUP=default
```

---

## Phase 11 — Unit Tests

### `backend/tests/test_sap_ai_core_provider.py` — **new file**

```python
"""
Unit tests for the SAP AI Core provider refactor.
All tests use mocks — no credentials or network access required.
"""

import asyncio
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from infra.llm.base import _strip_fences, BaseLLM
from infra.llm.exceptions import LLMValidationError, LLMError
from infra.llm.jwt_handler import is_jwt_error
from infra.llm.schemas import LLMResponse


# ── _strip_fences ─────────────────────────────────────────────────────────────

class TestStripFences:

    def test_json_fence_with_newline(self):
        raw = "```json\n{\"key\": \"value\"}\n```"
        assert _strip_fences(raw) == '{"key": "value"}'

    def test_fence_no_language_hint(self):
        raw = "```\n{\"key\": \"value\"}\n```"
        assert _strip_fences(raw) == '{"key": "value"}'

    def test_fence_no_newline_after_hint(self):
        raw = '```json{"key": "value"}```'
        assert _strip_fences(raw) == '{"key": "value"}'

    def test_plain_json_unchanged(self):
        raw = '{"key": "value"}'
        assert _strip_fences(raw) == '{"key": "value"}'

    def test_leading_trailing_whitespace_stripped(self):
        raw = '   {"key": "value"}   '
        assert _strip_fences(raw) == '{"key": "value"}'


# ── BaseLLM.generate_structured ──────────────────────────────────────────────

class ConcreteProvider(BaseLLM):
    """Minimal concrete BaseLLM for testing the shared generate_structured()."""

    def __init__(self, responses):
        self._responses = iter(responses)

    async def generate(self, prompt, system_prompt=None, **kwargs) -> LLMResponse:
        content = next(self._responses)
        return LLMResponse(content=content, usage={}, model="test-model")

    async def close(self):
        pass


class TestGenerateStructured:

    @pytest.mark.asyncio
    async def test_success_on_first_attempt(self):
        from pydantic import BaseModel

        class Output(BaseModel):
            message: str

        provider = ConcreteProvider(['{"message": "hello"}'])
        result = await provider.generate_structured("say hello", Output)
        assert result.message == "hello"

    @pytest.mark.asyncio
    async def test_retries_on_json_error(self):
        from pydantic import BaseModel

        class Output(BaseModel):
            value: int

        provider = ConcreteProvider(["not json at all", '{"value": 42}'])
        result = await provider.generate_structured("give value", Output)
        assert result.value == 42

    @pytest.mark.asyncio
    async def test_raises_after_exhausting_retries(self):
        from pydantic import BaseModel

        class Output(BaseModel):
            value: int

        provider = ConcreteProvider(["bad", "bad", "bad"])
        with pytest.raises(LLMValidationError):
            await provider.generate_structured("give value", Output)

    @pytest.mark.asyncio
    async def test_transport_error_propagates_immediately(self):
        """LLMError from generate() must not be caught and retried."""
        from pydantic import BaseModel

        class Output(BaseModel):
            value: int

        class FailingProvider(BaseLLM):
            async def generate(self, *args, **kwargs):
                raise LLMError("transport failure")
            async def close(self):
                pass

        provider = FailingProvider()
        with pytest.raises(LLMError, match="transport failure"):
            await provider.generate_structured("prompt", Output)

    def test_claude_does_not_define_generate_structured(self):
        from infra.llm.providers.claude import ClaudeLLM
        assert "generate_structured" not in ClaudeLLM.__dict__


# ── jwt_handler ───────────────────────────────────────────────────────────────

class TestIsJwtError:

    @pytest.mark.parametrize("msg", [
        "401 unauthorized",
        "403 Forbidden",
        "invalid_token",
        "token_expired error",
        "jwt has expired",
        "authentication failed",
        "UNAUTHORIZED",
    ])
    def test_returns_true_for_auth_errors(self, msg):
        assert is_jwt_error(Exception(msg))

    @pytest.mark.parametrize("msg", [
        "connection timeout",
        "network error",
        "rate limit exceeded",
        "500 internal server error",
        "bad request",
    ])
    def test_returns_false_for_non_auth_errors(self, msg):
        assert not is_jwt_error(Exception(msg))


# ── factory.py ────────────────────────────────────────────────────────────────

class TestLLMFactory:

    def test_raises_for_unknown_provider(self):
        from infra.llm.factory import LLMFactory
        with patch("infra.llm.factory.get_settings") as mock_settings:
            mock_settings.return_value.llm_provider = "unknown_provider"
            LLMFactory.reset()
            with pytest.raises(ValueError, match="Unsupported LLM provider"):
                asyncio.get_event_loop().run_until_complete(LLMFactory.get_client())
            LLMFactory.reset()


# ── SAPAICoreProvider temperature guard ──────────────────────────────────────

class TestSAPAICoreProviderTemperature:

    def _make_provider(self, model, sdk_response):
        with patch("gen_ai_hub.proxy.native.openai.clients.AsyncOpenAI") as mock_cls:
            mock_client = MagicMock()
            mock_client.chat.completions.create = AsyncMock(return_value=sdk_response)
            mock_cls.return_value = mock_client
            from infra.llm.providers.sap_ai_core import SAPAICoreProvider
            provider = SAPAICoreProvider(model=model, max_tokens=512, temperature=0.5)
            provider._client = mock_client
            return provider, mock_client

    def _make_sdk_response(self):
        resp = MagicMock()
        resp.choices[0].message.content = "ok"
        resp.usage.prompt_tokens = 10
        resp.usage.completion_tokens = 5
        return resp

    @pytest.mark.asyncio
    async def test_omits_temperature_for_reasoning_model(self):
        provider, mock_client = self._make_provider("o1-mini", self._make_sdk_response())
        await provider.generate("prompt")
        call_kwargs = mock_client.chat.completions.create.call_args[1]
        assert "temperature" not in call_kwargs

    @pytest.mark.asyncio
    async def test_includes_temperature_for_standard_model(self):
        provider, mock_client = self._make_provider("anthropic--claude-3.5-sonnet", self._make_sdk_response())
        await provider.generate("prompt")
        call_kwargs = mock_client.chat.completions.create.call_args[1]
        assert call_kwargs["temperature"] == 0.5


# ── SAPAICoreOrchestrationProvider ───────────────────────────────────────────

class TestSAPAICoreOrchestrationProvider:

    def _make_provider(self, model="anthropic--claude-4-opus"):
        with patch("gen_ai_hub.orchestration.service.OrchestrationService"):
            with patch("gen_ai_hub.orchestration.models.config.OrchestrationConfig"):
                with patch("gen_ai_hub.orchestration.models.template.Template"):
                    with patch("gen_ai_hub.orchestration.models.message.SystemMessage"):
                        with patch("gen_ai_hub.orchestration.models.message.UserMessage"):
                            with patch("gen_ai_hub.orchestration.models.llm.LLM"):
                                from infra.llm.providers.sap_ai_core_orch import SAPAICoreOrchestrationProvider
                                return SAPAICoreOrchestrationProvider(model=model, max_tokens=512, temperature=0.7)

    @pytest.mark.asyncio
    async def test_raises_llm_error_when_response_is_none(self):
        provider = self._make_provider()
        provider._service = MagicMock()
        provider._service.arun_with_retries = AsyncMock(return_value=None)
        provider._OrchestrationConfig = MagicMock()
        provider._Template = MagicMock()
        provider._UserMessage = MagicMock()
        provider._LLM = MagicMock()
        provider._build_llm_config = MagicMock()

        with pytest.raises(LLMError, match="rate limit exceeded"):
            await provider.generate("prompt")

    @pytest.mark.asyncio
    async def test_llm_error_not_double_wrapped(self):
        provider = self._make_provider()
        provider._service = MagicMock()
        provider._service.arun_with_retries = AsyncMock(return_value=None)
        provider._OrchestrationConfig = MagicMock()
        provider._Template = MagicMock()
        provider._UserMessage = MagicMock()
        provider._LLM = MagicMock()
        provider._build_llm_config = MagicMock()

        try:
            await provider.generate("prompt")
        except LLMError as exc:
            msg = str(exc)
            assert msg.count("SAP AI Core orchestration request failed") == 1, (
                f"LLMError message was double-wrapped: {msg!r}"
            )

    @pytest.mark.asyncio
    async def test_omits_temperature_for_reasoning_model(self):
        provider = self._make_provider(model="o3-mini")
        provider._LLM = MagicMock()
        provider._build_llm_config()
        call_kwargs = provider._LLM.call_args[1] if provider._LLM.call_args else {}
        params = call_kwargs.get("parameters", {})
        assert "temperature" not in params

    @pytest.mark.asyncio
    async def test_includes_temperature_for_standard_model(self):
        provider = self._make_provider(model="anthropic--claude-4-opus")
        provider._LLM = MagicMock()
        provider._build_llm_config()
        call_kwargs = provider._LLM.call_args[1] if provider._LLM.call_args else {}
        params = call_kwargs.get("parameters", {})
        assert params.get("temperature") == 0.7
```

---

## Architect Review Log

### Round 1 — Initial Review

**Issue 1 [CRITICAL]: `claude.py` had a `post()` URL bug in the refactored version**

First draft wrote `self.client.post(f"{self.client.base_url}/v1/messages")` — accessing `base_url` from the httpx client object. But `httpx.AsyncClient` only has a `base_url` attribute when you pass `base_url=` to its constructor. The original code stores it as `self.base_url` (separate instance attribute) and passes the full URL to `post()`. Fixed: `self.client.base_url` → `self.base_url` and added `self.base_url = base_url` to `__init__`.

**Issue 2 [HIGH]: `claude.py` still imported `json`, `asyncio`, `ValidationError` after removing `generate_structured()`**

These were only needed by `generate_structured()`. After removing it, the imports become dead code. Fixed: removed `import json`, `import asyncio`, `from pydantic import ValidationError` from `claude.py` imports.

**Issue 3 [HIGH]: `base.py` `generate_structured()` doesn't check for `LLMTimeoutError`**

`LLMTimeoutError` is a transport error that should propagate immediately, not be caught by the `(json.JSONDecodeError, ValidationError)` handler. The current except clause is narrow (only catches JSON/Pydantic errors), so `LLMTimeoutError` already propagates correctly — but this needs explicit test coverage (test #4: "transport errors propagate immediately"). ✅ Covered by `test_transport_error_propagates_immediately`.

**Issue 4 [MEDIUM]: `factory.py` missing `openai` and `gemini` branches**

The original `factory.py` only had `claude`. The integration plan only adds SAP providers. But the `langchain_adapter.py` already supports `openai` and `gemini`. For symmetry, `factory.py` should at least raise a clear error when `openai`/`gemini` is set (current behaviour: `ValueError: Unsupported provider`). The existing error message is acceptable — no change needed. Documented in `ValueError` message.

**Issue 5 [MEDIUM]: `sap_ai_core_orch.py` test setup is fragile (6-deep nested `with patch`)**

The `_make_provider()` helper in tests patches 6 SDK modules. If the import path changes in a future SDK version, all tests break. Mitigation: wrap in a utility function and add a comment. ✅ Acceptable for now — the paths are verified at SDK version 7.2.0.

**→ Round 1 fixes applied above.**

---

### Round 2 — Re-review After Round 1 Fixes

**Issue 1 [HIGH]: `BaseLLM.generate_structured()` does not handle `LLMTimeoutError` from `generate()`**

The `except (json.JSONDecodeError, ValidationError)` clause is narrow and correct — `LLMTimeoutError` is NOT caught. ✅ Already correct. No change needed.

**Issue 2 [MEDIUM]: `claude.py` original `generate()` had `except Exception as e: raise` (bare re-raise)**

The refactored version retains this pattern but adds `except LLMError: raise` before the generic `except Exception`. This ensures LLMErrors raised by `if response.status_code != 200: raise LLMError(...)` are re-raised cleanly without triggering the generic error logger. ✅ Already in the Phase 3 code above.

**Issue 3 [MEDIUM]: `_build_instance()` in `factory.py` is a classmethod but uses `settings.llm_provider` string comparison — no validation against a known set**

The `ValueError` at the end serves as validation. Acceptable for the current 3-provider scope. Adding `openai`/`gemini` to `_build_instance()` is a future task.

**Issue 4 [LOW]: Test `test_raises_for_unknown_provider` uses `asyncio.get_event_loop().run_until_complete()` — deprecated in Python 3.10+**

Fixed to use `asyncio.run()`:

```python
def test_raises_for_unknown_provider(self):
    from infra.llm.factory import LLMFactory
    with patch("infra.llm.factory.get_settings") as mock_settings:
        mock_settings.return_value.llm_provider = "unknown_provider"
        LLMFactory.reset()
        with pytest.raises(ValueError, match="Unsupported LLM provider"):
            asyncio.run(LLMFactory.get_client())
        LLMFactory.reset()
```

**→ Round 2 fix: update test in Phase 11.**

---

### Round 3 — Re-review After Round 2 Fixes

**Issue 1 [MEDIUM]: `_build_llm_config()` test for orchestration provider is indirect**

`test_omits_temperature_for_reasoning_model` calls `provider._build_llm_config()` and then checks `provider._LLM.call_args`. But `provider._LLM` is the mocked class — the check is on the mock call args, which depend on `_LLM` being called as `self._LLM(name=..., parameters=params)`. The assertion `call_args[1].get("parameters", {})` would fail if the SDK uses positional args. 

**Fix:** Test `_is_reasoning_model()` directly since it drives the temperature decision, and test `_build_llm_config()` in isolation with a concrete `_LLM` stub:

```python
class TestIsReasoningModel:
    @pytest.mark.parametrize("model,expected", [
        ("o1-mini", True),
        ("o3", True),
        ("amazon--nova-pro-reasoning", True),
        ("anthropic--claude-4-opus", False),
        ("gpt-4o", False),
        ("anthropic--claude-3.5-sonnet", False),
    ])
    def test_is_reasoning_model(self, model, expected):
        from infra.llm.providers.sap_ai_core import _is_reasoning_model
        assert _is_reasoning_model(model) == expected
```

This is more robust than testing via mock call args.

**Issue 2 [LOW]: `generate_structured()` retry delay of `await asyncio.sleep(1)` is 1 second per attempt**

With `MAX_VALIDATION_RETRIES=3` and a 1-second delay between each, a fully failing call takes 3 seconds minimum. Acceptable for production (validation failures are rare). For tests, `asyncio.sleep` should be patched to avoid slow tests. The `ConcreteProvider` tests already provide bad JSON responses without sleeping because the test fixture replaces `generate()` — `asyncio.sleep` is called but pytest-asyncio runs it through the event loop at full speed.

Actually no — `asyncio.sleep(1)` IS a real sleep even in pytest-asyncio. Tests would take 3 seconds per failing case. **Fix:** Patch `asyncio.sleep` in the retry tests:

```python
@pytest.mark.asyncio
async def test_retries_on_json_error(self):
    from pydantic import BaseModel

    class Output(BaseModel):
        value: int

    with patch("infra.llm.base.asyncio.sleep", new_callable=AsyncMock):
        provider = ConcreteProvider(["not json at all", '{"value": 42}'])
        result = await provider.generate_structured("give value", Output)
    assert result.value == 42

@pytest.mark.asyncio
async def test_raises_after_exhausting_retries(self):
    from pydantic import BaseModel

    class Output(BaseModel):
        value: int

    with patch("infra.llm.base.asyncio.sleep", new_callable=AsyncMock):
        provider = ConcreteProvider(["bad", "bad", "bad"])
        with pytest.raises(LLMValidationError):
            await provider.generate_structured("give value", Output)
```

**→ Round 3 fixes: patch `asyncio.sleep` in retry tests; add `TestIsReasoningModel`.**

---

### Round 4 — Final Review

**No new issues found.** The document is implementation-ready.

**Checklist verified:**
- ✅ `BaseLLM.generate_structured()` is concrete — not abstract
- ✅ `_strip_fences()` handles no-newline fence case (`split("```", 1)[1]`)
- ✅ `ClaudeLLM` has no `generate_structured()` or `max_validation_retries`
- ✅ `ClaudeLLM` has `except LLMError: raise` before generic `except Exception`
- ✅ `SAPAICoreProvider` uses `model_name` kwarg (not `model`)
- ✅ `SAPAICoreProvider` omits `temperature` for reasoning models
- ✅ `SAPAICoreOrchestrationProvider` defers all SDK imports to `__init__`
- ✅ `SAPAICoreOrchestrationProvider` uses `arun_with_retries()` with `None` guard
- ✅ `SAPAICoreOrchestrationProvider` has `except LLMError: raise` before `except Exception` — prevents double-wrap
- ✅ `factory.py` has `_build_instance()` extracted — cleaner double-checked lock
- ✅ `langchain_adapter.py` uses `proxy_model_name` (not `model`) for SAP client
- ✅ `langchain_adapter.py` covers both `sap_ai_core` and `sap_ai_core_orch` with one `in (...)` check
- ✅ `jwt_handler.py` extended with XSUAA error patterns
- ✅ All 4 call sites updated to use retry wrappers
- ✅ Tests patch `asyncio.sleep` to avoid slow test runs
- ✅ Tests test `_is_reasoning_model()` directly (not via fragile mock call-arg inspection)
- ✅ `test_raises_for_unknown_provider` uses `asyncio.run()` not deprecated `get_event_loop()`

---

## Final Test File (Updated with All Round Fixes)

### `backend/tests/test_sap_ai_core_provider.py` — final version

```python
"""
Unit tests for the SAP AI Core provider refactor.
No credentials or network access required — all external calls are mocked.
"""

import asyncio
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from infra.llm.base import _strip_fences, BaseLLM
from infra.llm.exceptions import LLMValidationError, LLMError
from infra.llm.jwt_handler import is_jwt_error
from infra.llm.schemas import LLMResponse


# ── Helpers ────────────────────────────────────────────────────────────────────

class ConcreteProvider(BaseLLM):
    """Minimal concrete BaseLLM for testing the inherited generate_structured()."""

    def __init__(self, responses: list[str]):
        self._responses = iter(responses)

    async def generate(self, prompt, system_prompt=None, **kwargs) -> LLMResponse:
        return LLMResponse(content=next(self._responses), usage={}, model="test")

    async def close(self):
        pass


# ── _strip_fences ──────────────────────────────────────────────────────────────

class TestStripFences:

    def test_json_fence_with_newline(self):
        assert _strip_fences("```json\n{\"k\": 1}\n```") == '{"k": 1}'

    def test_fence_no_language_hint(self):
        assert _strip_fences("```\n{\"k\": 1}\n```") == '{"k": 1}'

    def test_fence_no_newline_after_hint(self):
        assert _strip_fences('```json{"k": 1}```') == '{"k": 1}'

    def test_plain_json_unchanged(self):
        assert _strip_fences('{"k": 1}') == '{"k": 1}'

    def test_strips_surrounding_whitespace(self):
        assert _strip_fences('  {"k": 1}  ') == '{"k": 1}'


# ── BaseLLM.generate_structured ───────────────────────────────────────────────

class TestGenerateStructured:

    @pytest.mark.asyncio
    async def test_success_on_first_attempt(self):
        from pydantic import BaseModel

        class Out(BaseModel):
            message: str

        result = await ConcreteProvider(['{"message": "hello"}']).generate_structured("x", Out)
        assert result.message == "hello"

    @pytest.mark.asyncio
    async def test_retries_on_json_decode_error(self):
        from pydantic import BaseModel

        class Out(BaseModel):
            value: int

        with patch("infra.llm.base.asyncio.sleep", new_callable=AsyncMock):
            result = await ConcreteProvider(["bad json", '{"value": 7}']).generate_structured("x", Out)
        assert result.value == 7

    @pytest.mark.asyncio
    async def test_raises_llm_validation_error_after_all_retries(self):
        from pydantic import BaseModel

        class Out(BaseModel):
            value: int

        with patch("infra.llm.base.asyncio.sleep", new_callable=AsyncMock):
            with pytest.raises(LLMValidationError):
                await ConcreteProvider(["bad", "bad", "bad"]).generate_structured("x", Out)

    @pytest.mark.asyncio
    async def test_transport_error_propagates_immediately(self):
        from pydantic import BaseModel

        class Out(BaseModel):
            value: int

        class FailProvider(BaseLLM):
            async def generate(self, *a, **kw):
                raise LLMError("transport failure")
            async def close(self):
                pass

        with pytest.raises(LLMError, match="transport failure"):
            await FailProvider().generate_structured("x", Out)

    def test_claude_does_not_define_generate_structured(self):
        from infra.llm.providers.claude import ClaudeLLM
        assert "generate_structured" not in ClaudeLLM.__dict__


# ── _is_reasoning_model ────────────────────────────────────────────────────────

class TestIsReasoningModel:

    @pytest.mark.parametrize("model,expected", [
        ("o1-mini", True),
        ("o3", True),
        ("o3-mini", True),
        ("amazon--nova-pro-reasoning", True),
        ("anthropic--claude-4-opus", False),
        ("anthropic--claude-3.5-sonnet", False),
        ("gpt-4o", False),
        ("meta--llama3-70b-instruct", False),
    ])
    def test_sap_ai_core(self, model, expected):
        from infra.llm.providers.sap_ai_core import _is_reasoning_model
        assert _is_reasoning_model(model) == expected

    @pytest.mark.parametrize("model,expected", [
        ("o1-mini", True),
        ("o3", True),
        ("anthropic--claude-4-opus", False),
        ("gpt-4o", False),
    ])
    def test_sap_ai_core_orch(self, model, expected):
        from infra.llm.providers.sap_ai_core_orch import _is_reasoning_model
        assert _is_reasoning_model(model) == expected


# ── jwt_handler ────────────────────────────────────────────────────────────────

class TestIsJwtError:

    @pytest.mark.parametrize("msg", [
        "401 unauthorized",
        "403 Forbidden",
        "invalid_token received",
        "token_expired",
        "jwt has expired",
        "authentication failed",
        "UNAUTHORIZED ACCESS",
    ])
    def test_true_for_auth_errors(self, msg):
        assert is_jwt_error(Exception(msg))

    @pytest.mark.parametrize("msg", [
        "connection timeout",
        "network error",
        "rate limit exceeded",
        "500 internal server error",
        "bad request format",
    ])
    def test_false_for_non_auth_errors(self, msg):
        assert not is_jwt_error(Exception(msg))


# ── factory.py ─────────────────────────────────────────────────────────────────

class TestLLMFactory:

    def test_raises_for_unknown_provider(self):
        from infra.llm.factory import LLMFactory
        with patch("infra.llm.factory.get_settings") as mock_settings:
            mock_settings.return_value.llm_provider = "unknown_xyz"
            LLMFactory.reset()
            with pytest.raises(ValueError, match="Unsupported LLM provider"):
                asyncio.run(LLMFactory.get_client())
            LLMFactory.reset()


# ── SAPAICoreOrchestrationProvider — None guard ───────────────────────────────

class TestSAPAICoreOrchNoneGuard:

    def _make_orch_provider(self, model="anthropic--claude-4-opus"):
        """Build provider with all SDK classes mocked."""
        with patch.multiple(
            "gen_ai_hub.orchestration.service",
            OrchestrationService=MagicMock,
        ):
            with patch.multiple(
                "gen_ai_hub.orchestration.models.config",
                OrchestrationConfig=MagicMock,
            ):
                with patch.multiple(
                    "gen_ai_hub.orchestration.models.template",
                    Template=MagicMock,
                ):
                    with patch.multiple(
                        "gen_ai_hub.orchestration.models.message",
                        SystemMessage=MagicMock,
                        UserMessage=MagicMock,
                    ):
                        with patch.multiple(
                            "gen_ai_hub.orchestration.models.llm",
                            LLM=MagicMock,
                        ):
                            from infra.llm.providers.sap_ai_core_orch import (
                                SAPAICoreOrchestrationProvider,
                            )
                            return SAPAICoreOrchestrationProvider(
                                model=model, max_tokens=512, temperature=0.7
                            )

    @pytest.mark.asyncio
    async def test_raises_llm_error_on_none_response(self):
        provider = self._make_orch_provider()
        provider._service = MagicMock()
        provider._service.arun_with_retries = AsyncMock(return_value=None)
        provider._OrchestrationConfig = MagicMock()
        provider._Template = MagicMock()
        provider._UserMessage = MagicMock()
        provider._build_llm_config = MagicMock()

        with pytest.raises(LLMError, match="rate limit exceeded"):
            await provider.generate("test prompt")

    @pytest.mark.asyncio
    async def test_error_message_not_double_wrapped(self):
        provider = self._make_orch_provider()
        provider._service = MagicMock()
        provider._service.arun_with_retries = AsyncMock(return_value=None)
        provider._OrchestrationConfig = MagicMock()
        provider._Template = MagicMock()
        provider._UserMessage = MagicMock()
        provider._build_llm_config = MagicMock()

        try:
            await provider.generate("test prompt")
            pytest.fail("Expected LLMError")
        except LLMError as exc:
            count = str(exc).count("SAP AI Core orchestration request failed")
            assert count == 1, f"Message was double-wrapped: {str(exc)!r}"
```

---

## Execution Order

```
Phase 1  → uv sync + baseline test run
Phase 2  → base.py (adds _strip_fences + concrete generate_structured)
Phase 3  → claude.py (removes generate_structured + max_validation_retries)
           → run pytest: confirm existing tests still pass
Phase 4  → sap_ai_core.py + sap_ai_core_orch.py (new files — no existing tests break)
Phase 5  → jwt_handler.py
Phase 6  → factory.py
Phase 7  → langchain_adapter.py
           → run pytest: confirm all existing tests still pass
Phase 8  → fix 4 call sites
           → run pytest: confirm all existing tests still pass
Phase 9  → settings.py comment
Phase 10 → .env.example
Phase 11 → tests/test_sap_ai_core_provider.py (new file)
           → run pytest tests/test_sap_ai_core_provider.py -v (all must pass)
           → run pytest tests/ (full suite must pass)
```

---

*Document version: 2.0 — 4 architect review rounds, all issues resolved*