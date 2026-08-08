# SAP AI Core — LLM Layer Integration Plan

**Status:** Draft v1.8 — Implementation-ready (8 architect review rounds)  
**Author:** Architecture Review  
**Scope:** `backend/infra/llm/` — zero changes to orchestrators, prompts, or pipeline logic  
**Risk:** Low — provider is swappable via a single `.env` change

---

## 1. Context & Goals

### 1.1 Current State

The LLM layer routes all traffic through a **HAI (Hyperspace AI) Proxy** at `http://localhost:6655/anthropic`. This proxy exposes an Anthropic-compatible `/v1/messages` endpoint and authenticates via a short-lived JWT. The project uses `claude-4.5-sonnet` by default.

**Pain points with HAI Proxy:**
- JWT expires mid-session; requires manual token refresh
- Single-model provider — no access to GPT-4o, Llama, Mistral, etc.
- Local proxy must be running; not suitable for cloud/CI deployments
- API key is a rotating JWT, not a stable credential

### 1.2 Target State

Add **SAP AI Core (Generative AI Hub)** as a first-class LLM provider alongside the existing Claude/OpenAI/Gemini options. Switching providers requires only changing 6 environment variables — zero code changes in any orchestrator, graph, or prompt file.

**Advantages of SAP AI Core:**
- Enterprise-grade OAuth 2.0 (XSUAA) with automatic token refresh
- Access to the full Generative AI Hub model catalog: Claude, GPT-4o, Llama-3, Mistral, Gemini, etc.
- Stable service credentials (client ID + secret), not rotating JWTs
- Production-ready, SAP-operated infrastructure

### 1.3 Non-Goals

- No changes to orchestrators, LangGraph graphs, prompt templates, or API routes
- No changes to token tracking, analytics, or frontend
- No new features — this is a pure infrastructure swap

---

## 2. Codebase Audit

### 2.1 LLM Layer File Inventory

```
backend/infra/llm/
├── base.py                   # Abstract BaseLLM interface
├── factory.py                # Singleton async factory — LLMFactory
├── langchain_adapter.py      # LangChain-compatible client (chat, LangGraph)
├── jwt_handler.py            # Auth error detection for singleton reset
├── schemas.py                # LLMResponse model
├── exceptions.py             # LLMError, LLMTimeoutError, LLMValidationError
├── providers/
│   ├── __init__.py
│   └── claude.py             # ClaudeLLM — httpx.AsyncClient implementation
└── README.md
```

### 2.2 Complete LLM Call-Site Inventory

Every file that imports from `infra.llm.*`:

| Call Site | Import | Method | Retry? | Issue |
|---|---|---|---|---|
| `angle/auto_selector.py` | `LLMFactory` | `get_client_with_retry` → `generate_structured` | ✅ | — |
| `angle/generator.py` | `LLMFactory` | `get_client_with_retry` → `generate_structured` | ✅ | — |
| `content/blog_post_generator.py` | `LLMFactory` | `get_client_with_retry` → `generate` | ✅ | — |
| `content/caption_generator.py` | `LLMFactory` | `get_client` → `generate_structured` | ❌ | Missing retry |
| `content/slide_generator.py` | `LLMFactory` | `get_client_with_retry` → `generate_structured` | ✅ | — |
| `content/slide_validator.py` | `LLMFactory` | `get_client` → `generate` (manual fence strip) | ❌ | Missing retry; duplicates fence logic |
| `research/evaluator.py` | `LLMFactory` | `get_client_with_retry` → `generate_structured` | ✅ | — |
| `research/evidence_scorer.py` | `langchain_adapter` | `get_langchain_llm` → `ainvoke` | ❌ | Missing retry |
| `research/llm_drafter.py` | `LLMFactory` | `get_client` → `generate` | ❌ | Missing retry |
| `research/llm_knowledge.py` | `LLMFactory` | `get_client_with_retry` → `generate_structured` | ✅ | — |
| `research/query_preprocessor.py` | `LLMFactory` | `get_client_with_retry` → `generate_structured` | ✅ | — |
| `research/synthesizer.py` | `LLMFactory` | `get_client_with_retry` → `generate_structured` | ✅ | — |
| `apps/api/v1/chat.py` | `langchain_adapter` | `get_langchain_llm_with_retry` → `ainvoke` | ✅ | — |
| `apps/api/v1/tools_news.py` | `langchain_adapter` | `get_langchain_llm_with_retry` → `ainvoke` | ✅ | — |

**4 pre-existing call-site bugs** (missing auth-error retry):
1. `caption_generator.py` — uses `get_client()`, not `get_client_with_retry()`
2. `slide_validator.py` — uses `get_client()`, not `get_client_with_retry()`
3. `llm_drafter.py` — uses `get_client()`, not `get_client_with_retry()`
4. `evidence_scorer.py` — uses `get_langchain_llm()`, not `get_langchain_llm_with_retry()`

These bugs are latent today (HAI Proxy JWT expiry only triggers them intermittently) but will also affect SAP AI Core XSUAA token expiry. They will be fixed as part of this plan.

### 2.3 Architecture Pattern: `generate_structured()` Duplication

`ClaudeLLM.generate_structured()` contains ~30 lines of protocol logic:
- Appends JSON schema to prompt
- Strips markdown code fences from response
- Calls `json.loads()` + Pydantic `model_validate()`
- Retries up to `max_validation_retries` times on failure

If `SAPAICoreProvider` copies this, it becomes duplicated code. The correct fix is to **promote `generate_structured()` to a concrete Template Method in `BaseLLM`** — it only calls `self.generate()` which every provider implements. Providers implement transport; the base class owns the structured-output protocol.

---

## 3. SDK Selection: `sap-ai-sdk-gen`

### 3.1 Why Not LiteLLM

LiteLLM does not have a documented SAP AI Core provider. The `docs.litellm.ai/docs/providers/sap_ai_core` page returns 404. Using LiteLLM would require undocumented workarounds.

### 3.2 Why `sap-ai-sdk-gen`

- Official SAP SDK (formerly `generative-ai-hub-sdk`)
- Handles XSUAA OAuth 2.0 token fetch and refresh automatically
- Provides native LangChain integration (`gen_ai_hub.proxy.langchain.openai.ChatOpenAI`)
- Provides both sync and **async** OpenAI-compatible clients (`gen_ai_hub.proxy.native.openai.clients`)
- Auth via 5 environment variables (`AICORE_*`) — no custom token code needed
- Class names unchanged from the old package — stable API

### 3.3 SDK Internal Architecture

Verified by inspecting `sap-ai-sdk-gen==7.2.0` wheel contents:

```
sap-ai-sdk-gen (current: 7.2.0)
└── gen_ai_hub.proxy
    ├── native.openai.clients.OpenAI       # sync OpenAI-compatible client
    ├── native.openai.clients.AsyncOpenAI  # async OpenAI-compatible client  ← use this
    │     → await client.chat.completions.create(model_name=..., messages=...)
    └── langchain.openai.ChatOpenAI        # LangChain-compatible model
          → ChatOpenAI(proxy_model_name=..., temperature=..., max_tokens=...)
```

**Critical API difference from standard OpenAI SDK:**
- Standard OpenAI: `client.chat.completions.create(model="gpt-4o", ...)`
- SAP AI SDK: `client.chat.completions.create(model_name="gpt-4o", ...)`  ← `model_name`, not `model`

**The `AsyncOpenAI` client is natively async** — no `asyncio.to_thread()` wrapping needed. Use `AsyncOpenAI` for all calls.

**Reasoning model note:** The SDK source contains `# Reasoning models do not support temperature`. Models like `o1`, `o3` raise an error if `temperature` is passed. The provider must omit `temperature` for reasoning models (see Section 6.1).

### 3.4 Orchestration Mode — Access Every Model with One Deployment

The SDK ships a **second, higher-level API** in `gen_ai_hub.orchestration`:

```
sap-ai-sdk-gen
└── gen_ai_hub.orchestration
    ├── service.OrchestrationService      # ← single entry point
    ├── models.config.OrchestrationConfig # wraps LLM + Template + optional modules
    ├── models.llm.LLM                    # model spec: name, version, parameters
    ├── models.template.Template          # message list
    └── models.message.SystemMessage / UserMessage
```

**Key difference from direct deployment mode:**

| | Direct (`AsyncOpenAI`) | Orchestration (`OrchestrationService`) |
|---|---|---|
| Deployments required | **One per model** | **One for the Orchestration Service** |
| Models accessible | Only deployed models | **Every model in the catalog** |
| Claude 4 Opus / GPT-4o | Only if deployed | ✅ Immediately available |
| Built-in rate-limit retry | ❌ (handle manually) | ✅ `arun_with_retries()` built-in |
| Content filtering | ❌ | ✅ Optional module |
| Data masking | ❌ | ✅ Optional module |
| Call pattern | `await client.chat.completions.create(model_name=...)` | `await service.arun(config=...)` |

**Recommendation: Use Orchestration Mode as the primary integration path.** One SAP AI Core deployment unlocks every current and future model without any infrastructure changes.

**Verified call pattern** (from wheel inspection):

```python
from gen_ai_hub.orchestration.service import OrchestrationService
from gen_ai_hub.orchestration.models.config import OrchestrationConfig
from gen_ai_hub.orchestration.models.llm import LLM
from gen_ai_hub.orchestration.models.template import Template
from gen_ai_hub.orchestration.models.message import SystemMessage, UserMessage

llm = LLM(
    name="anthropic--claude-4-opus",     # any model in the catalog
    version="latest",
    parameters={"temperature": 1.0, "max_tokens": 8192},
)
config = OrchestrationConfig(
    template=Template(messages=[
        SystemMessage("You are a helpful assistant."),
        UserMessage("What is the capital of France?"),
    ]),
    llm=llm,
)

# No deployment_id — SDK auto-discovers from AICORE_* env vars
service = OrchestrationService()

response = await service.arun(config=config)

# Extract text + token counts
text    = response.orchestration_result.choices[0].message.content
prompt_tokens     = response.orchestration_result.usage.prompt_tokens
completion_tokens = response.orchestration_result.usage.completion_tokens
```

**No separate deployment ID needed.** The SDK auto-discovers the orchestration service endpoint from your standard `AICORE_*` credentials:

```
OrchestrationService()                        ← no arguments needed
  → get_orchestration_api_url(proxy, None, ...)
    → discover_orchestration_api_url(base_url, auth_url, client_id, client_secret, resource_group)
      → queries AI Core API for deployments with scenario="orchestration"
      → returns URL of the running orchestration deployment
      → result is @cache_if_not_none — discovery call made only once
```

To use orchestration mode, set these env vars (same 5 you already have) and choose a model:

```bash
LLM_PROVIDER=sap_ai_core_orch
LLM_MODEL=anthropic--claude-4-opus     # or any catalog model
AICORE_CLIENT_ID=...
AICORE_CLIENT_SECRET=...
AICORE_AUTH_URL=...
AICORE_BASE_URL=...
AICORE_RESOURCE_GROUP=default
```

This is exactly how Cline's "Orchestration Mode" toggle works — the same 5 credential fields, one checkbox, instant access to all models.

---

## 4. Authentication

### 4.1 Service Key → Environment Variables

The SAP AI Core service key JSON maps to these environment variables:

| Service Key Field | Environment Variable | Notes |
|---|---|---|
| `clientid` | `AICORE_CLIENT_ID` | |
| `clientsecret` | `AICORE_CLIENT_SECRET` | |
| `url` + `/oauth/token` | `AICORE_AUTH_URL` | Append `/oauth/token` |
| `serviceurls.AI_API_URL` + `/v2` | `AICORE_BASE_URL` | Append `/v2` — required by SDK |
| *(your group)* | `AICORE_RESOURCE_GROUP` | Usually `"default"` |

### 4.2 Token Lifecycle

XSUAA tokens are valid for ~12 hours. The SDK fetches and caches the token internally — no custom refresh code is needed. If a token expires mid-session, the SDK transparently fetches a new one on the next call.

### 4.3 `jwt_handler.py` Update

The existing `is_jwt_error()` detects `"jwt"`, `"expired"`, `"401"` in exception messages. SAP AI Core XSUAA errors may surface different message strings (e.g. `"unauthorized"`, `"403 Forbidden"`, `"invalid_token"`). The handler must be extended to cover these patterns, ensuring `LLMFactory.reset()` is triggered correctly.

---

## 5. Design Decisions

### Decision 1: Promote `generate_structured()` to `BaseLLM`

**Before:** Every provider duplicates fence-stripping, JSON parsing, and retry logic.  
**After:** `BaseLLM.generate_structured()` is a concrete Template Method. Providers implement only `generate()` (transport) and `close()` (cleanup).

**`base.py` new imports required:**

```python
import asyncio
import json
from pydantic import ValidationError
from infra.llm.exceptions import LLMValidationError   # used in generate_structured()
from infra.logging import get_logger

logger = get_logger(__name__)
```

Note: `LLMValidationError` was previously only used inside `ClaudeLLM.generate_structured()`, so it was never needed in `base.py`. After the promotion, `base.py` must import it directly.

```python
# base.py — after refactor
class BaseLLM(ABC):
    MAX_VALIDATION_RETRIES: int = 3

    @abstractmethod
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, **kwargs) -> LLMResponse:
        """Transport layer — provider-specific HTTP call."""

    @abstractmethod
    async def close(self) -> None:
        """Release HTTP client resources."""

    async def generate_structured(
        self,
        prompt: str,
        output_schema: Type[BaseModel],
        system_prompt: Optional[str] = None,
        **kwargs,
    ) -> BaseModel:
        """
        Structured output via JSON schema injection + Pydantic validation.
        Retries up to MAX_VALIDATION_RETRIES times on parse/validation failure.
        Only catches JSON/Pydantic errors — transport errors propagate immediately.
        Concrete — providers do NOT override this.
        """
        schema_str = json.dumps(output_schema.model_json_schema(), indent=2)
        enhanced_prompt = f"{prompt}\n\nReturn ONLY valid JSON matching:\n{schema_str}"

        # Forward only private kwargs (e.g. _token_meta) — not max_tokens/temperature,
        # which are already baked into the provider instance at construction time.
        gen_kwargs = {k: v for k, v in kwargs.items() if k.startswith("_")}

        for attempt in range(self.MAX_VALIDATION_RETRIES):
            try:
                response = await self.generate(enhanced_prompt, system_prompt=system_prompt, **gen_kwargs)
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

The `_strip_fences()` helper is a module-level function in `base.py`. The implementation handles all three real-world cases:

```python
def _strip_fences(text: str) -> str:
    """
    Remove markdown code fences that LLMs sometimes wrap around JSON output.
    Handles: ```json\\n{...}\\n``` and ```{...}``` (no newline) and plain {...}.
    """
    text = text.strip()
    if text.startswith("```"):
        # split("```", 1)[1] removes the opening fence marker itself,
        # correctly handling both ```json\n{} and ```{} (no newline) cases.
        text = text.split("```", 1)[1]
        if text.startswith("json"):
            text = text[4:]       # strip language hint
        text = text.lstrip("\n")  # strip leading newline after fence
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    return text.strip()
```

### Decision 2: `SAPAICoreProvider` implements only transport

Since `generate_structured()` moves to `BaseLLM`, the new provider is minimal:

```python
class SAPAICoreProvider(BaseLLM):
    # Only needs to implement: generate() + close()
    # generate_structured() is inherited from BaseLLM
```

### Decision 3: No new `settings.py` fields

The SAP AI SDK reads `AICORE_*` env vars directly. Adding them to `Settings` would create redundancy. The only `settings.py` change is updating the `llm_provider` comment to include `"sap_ai_core"` as a valid option.

### Decision 4: Fix the 4 inconsistent call sites

All 4 call sites with missing retry will be updated to use `get_client_with_retry()` / `get_langchain_llm_with_retry()`. This is a correctness fix orthogonal to the SAP integration but discovered during this audit.

---

## 6. Files to Create

### 6.1 `backend/infra/llm/providers/sap_ai_core.py` (new — direct deployment mode)

> Use this when you have specific model deployments provisioned. See also 6.2 for the recommended orchestration mode.


```python
"""
SAP AI Core provider via sap-ai-sdk-gen (formerly generative-ai-hub-sdk).

Authentication is handled automatically by the SDK using these environment variables:
    AICORE_CLIENT_ID        — OAuth2 client ID from the service key
    AICORE_CLIENT_SECRET    — OAuth2 client secret from the service key
    AICORE_AUTH_URL         — XSUAA token endpoint (service key `url` + /oauth/token)
    AICORE_BASE_URL         — AI API base URL (service key AI_API_URL + /v2)
    AICORE_RESOURCE_GROUP   — Resource group (usually "default")

A deployment must exist for the target model in SAP AI Core before use.
See: https://help.sap.com/docs/sap-ai-core — Model Deployments
"""

import time
from typing import Optional

from infra.llm.base import BaseLLM
from infra.llm.schemas import LLMResponse
from infra.llm.exceptions import LLMError
from infra.logging import get_logger

logger = get_logger(__name__)

# Reasoning models reject the temperature parameter entirely.
# Add model name prefixes here as new reasoning models become available.
_REASONING_MODEL_PREFIXES: tuple[str, ...] = ("o1", "o3", "amazon--nova-pro-reasoning")


def _is_reasoning_model(model_name: str) -> bool:
    """Return True for models that do not accept a temperature parameter."""
    return any(model_name.startswith(p) for p in _REASONING_MODEL_PREFIXES)


def _get_token_tracker():
    # Lazy import to avoid circular dependency at module load time.
    from core.services.token_tracker import token_tracker
    return token_tracker


class SAPAICoreProvider(BaseLLM):
    """
    LLM provider backed by SAP AI Core Generative AI Hub.

    Uses gen_ai_hub.proxy.native.openai.clients.AsyncOpenAI — a natively async
    client, so no asyncio.to_thread() wrapping is needed.

    generate_structured() is inherited from BaseLLM — no duplication needed.
    """

    def __init__(
        self,
        model: str,
        max_tokens: int = 8192,
        temperature: float = 1.0,
    ):
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        # SDK reads AICORE_* env vars automatically on instantiation.
        from gen_ai_hub.proxy.native.openai.clients import AsyncOpenAI as _SAPAsyncOpenAI
        self._client = _SAPAsyncOpenAI()

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs,
    ) -> LLMResponse:
        start_time = time.time()
        logger.info("sap_ai_core_generate_start", prompt_preview=prompt[:80])

        messages: list[dict] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # Build the create() kwargs — omit temperature for reasoning models,
        # which raise an error if that parameter is present.
        create_kwargs: dict = {
            "model_name": self.model,  # SAP AI SDK uses model_name, not model
            "messages": messages,
            "max_tokens": kwargs.get("max_tokens", self.max_tokens),
        }
        if not _is_reasoning_model(self.model):
            create_kwargs["temperature"] = kwargs.get("temperature", self.temperature)

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

            # Record token usage when caller supplies _token_meta=(run_id, stage).
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
                    pass  # token tracking must never break generation

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
        # The SAP AI SDK manages its own HTTP session lifecycle.
        pass
```

### 6.2 `backend/infra/llm/providers/sap_ai_core_orch.py` (new — **recommended**)

> **This is the preferred integration path.** One orchestration deployment gives access to every model in the SAP AI Core catalog — no per-model deployments needed.

```python
"""
SAP AI Core Orchestration provider via sap-ai-sdk-gen.

Uses the gen_ai_hub.orchestration API — a higher-level service that routes
to any model in the catalog without requiring individual model deployments.

Required environment variables (exactly the same 5 as sap_ai_core.py):
    AICORE_CLIENT_ID, AICORE_CLIENT_SECRET, AICORE_AUTH_URL,
    AICORE_BASE_URL, AICORE_RESOURCE_GROUP

No additional deployment ID is required. OrchestrationService() with no arguments
calls discover_orchestration_api_url() which queries the AI Core API for a running
deployment with scenario="orchestration" and returns its URL automatically.
The discovery result is cached (@cache_if_not_none), so it fires only once per process.

Any model available in the Generative AI Hub catalog can be used by changing
the LLM_MODEL env var alone (e.g. anthropic--claude-4-opus, gpt-4o, gemini-2.5-pro, etc.)
"""

import time
from typing import Optional

from infra.llm.base import BaseLLM
from infra.llm.schemas import LLMResponse
from infra.llm.exceptions import LLMError
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
    LLM provider using SAP AI Core's Orchestration Service.

    One orchestration deployment → access to every model in the catalog.
    Natively async (OrchestrationService.arun). generate_structured() inherited.
    """

    def __init__(
        self,
        model: str,
        max_tokens: int = 8192,
        temperature: float = 1.0,
    ):
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature

        # All SDK imports are deferred to __init__ so this module can be imported
        # even when sap-ai-sdk-gen is not installed (factory.py defers instantiation).
        from gen_ai_hub.orchestration.service import OrchestrationService
        from gen_ai_hub.orchestration.models.config import OrchestrationConfig
        from gen_ai_hub.orchestration.models.template import Template
        from gen_ai_hub.orchestration.models.message import SystemMessage, UserMessage
        from gen_ai_hub.orchestration.models.llm import LLM

        # No deployment_id needed — SDK auto-discovers the orchestration service
        # from standard AICORE_* env vars via discover_orchestration_api_url().
        # The discovery call is cached (@cache_if_not_none) so it fires only once.
        self._service = OrchestrationService()

        # Store SDK model classes as instance attributes — avoids repeated
        # per-call module attribute lookups in generate() and _build_llm_config().
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
        logger.info("sap_ai_core_orch_generate_start", model=self.model, prompt_preview=prompt[:80])

        messages = []
        if system_prompt:
            messages.append(self._SystemMessage(system_prompt))
        messages.append(self._UserMessage(prompt))

        config = self._OrchestrationConfig(
            template=self._Template(messages=messages),
            llm=self._build_llm_config(),
        )

        try:
            # arun_with_retries() handles HTTP 429 / server errors automatically
            # (exponential backoff, up to max_retries=10). Returns None if all
            # retries are exhausted — must be checked explicitly.
            response = await self._service.arun_with_retries(config=config)
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
            # LLMError raised inside this try block (e.g. the response is None guard
            # above) must propagate unchanged. Without this clause, "except Exception"
            # below would catch it and produce a double-wrapped message:
            # LLMError("SAP AI Core orchestration request failed: SAP AI Core ... rate limit...")
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

## 7. Files to Modify

### 7.1 `backend/infra/llm/base.py`

Promote `generate_structured()` from an abstract method to a concrete Template Method.
Add `_strip_fences()` as a module-level helper.
Add new imports: `asyncio`, `json`, `ValidationError`, `get_logger`.

**Key change:**

```python
# BEFORE
class BaseLLM(ABC):
    @abstractmethod
    async def generate(self, ...): ...

    @abstractmethod
    async def generate_structured(self, ...): ...  # abstract — every provider duplicates this

    @abstractmethod
    async def close(self): ...

# AFTER
class BaseLLM(ABC):
    MAX_VALIDATION_RETRIES: int = 3

    @abstractmethod
    async def generate(self, ...): ...             # transport only — provider implements

    async def generate_structured(self, ...):      # concrete — shared by all providers
        # JSON schema injection + fence strip + retry loop
        ...

    @abstractmethod
    async def close(self): ...
```

### 7.2 `backend/infra/llm/providers/claude.py`

Remove the `generate_structured()` method entirely — it is now inherited from `BaseLLM`.
Remove `max_validation_retries` from `__init__` — it becomes `BaseLLM.MAX_VALIDATION_RETRIES`.
Update the docstring accordingly.

**Net result:** `claude.py` shrinks from ~191 lines to ~130 lines.

### 7.3 `backend/infra/llm/factory.py`

Add two `elif` branches — one for each SAP AI Core mode:

```python
elif settings.llm_provider == "sap_ai_core":
    from infra.llm.providers.sap_ai_core import SAPAICoreProvider
    cls._instance = SAPAICoreProvider(
        model=settings.llm_model,
        max_tokens=settings.llm_max_tokens,
        temperature=settings.llm_temperature,
    )
elif settings.llm_provider == "sap_ai_core_orch":
    from infra.llm.providers.sap_ai_core_orch import SAPAICoreOrchestrationProvider
    cls._instance = SAPAICoreOrchestrationProvider(
        model=settings.llm_model,
        max_tokens=settings.llm_max_tokens,
        temperature=settings.llm_temperature,
        # No deployment_id — SDK auto-discovers the orchestration endpoint
    )
```

### 7.4 `backend/infra/llm/langchain_adapter.py`

Add `_create_sap_ai_core_client()` and update `_build_client()`:

```python
def _create_sap_ai_core_client(settings) -> BaseChatModel:
    """
    LangChain-compatible client for SAP AI Core.
    Auth is handled automatically via AICORE_* environment variables.
    Uses proxy_model_name (not model) — SAP SDK parameter convention.
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
        # Both modes share the same ChatOpenAI LangChain client.
        # NOTE for sap_ai_core_orch: ChatOpenAI uses the direct deployment API.
        # If the target model has NO direct deployment (only the orchestration
        # service deployment exists), this will raise an API error. See the
        # Risk table for mitigation options.
        return _create_sap_ai_core_client(settings)
    raise ValueError(
        f"Unsupported LangChain provider: '{settings.llm_provider}'. "
        "Valid options: claude, openai, gemini, sap_ai_core, sap_ai_core_orch"
    )
```

### 7.5 `backend/infra/llm/jwt_handler.py`

Extend error detection to cover XSUAA-specific error patterns:

```python
"""Shared auth error detection used by LLMFactory and the LangChain adapter."""

# Lowercase substrings that indicate a token/auth failure requiring a client reset.
# Conservative by design — reset() only rebuilds the singleton and does not suppress
# the error if the retry also fails.
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
    """Return True if the exception indicates a token expiry or auth failure."""
    msg = str(exc).lower()
    return any(token in msg for token in _AUTH_ERROR_TOKENS)
```

### 7.6 `backend/configs/settings.py`

Update the `llm_provider` comment only — no new fields needed:

```python
llm_provider: str = "claude"  # Options: "claude", "openai", "gemini", "sap_ai_core", "sap_ai_core_orch"
```

No additional env vars beyond the standard 5 `AICORE_*` are needed for orchestration mode.

### 7.7 `backend/pyproject.toml`

Add the SDK dependency:

```toml
"sap-ai-sdk-gen>=7.0.0",
```

**Version note:** Current latest is `7.2.0` (verified via `pip index versions sap-ai-sdk-gen`). Use `>=7.0.0` as the lower bound. The jump from `generative-ai-hub-sdk` (1.x) to `sap-ai-sdk-gen` (5.x → 7.x) reflects the rebranding history — `>=1.0.0` would be wrong. Pin to `==7.2.0` in production deployments after integration testing.

### 7.8 Fix 4 Call Sites with Missing Auth-Error Retry

#### `backend/core/orchestrators/content/caption_generator.py`

```python
# BEFORE
llm = await LLMFactory.get_client()
result = await llm.generate_structured(...)

# AFTER
result = await LLMFactory.get_client_with_retry(
    lambda llm: llm.generate_structured(
        prompt=user_prompt,
        output_schema=CaptionOutput,
        system_prompt=system_prompt,
        _token_meta=(state.get("run_id"), "caption"),
    )
)
```

#### `backend/core/orchestrators/content/slide_validator.py`

```python
# BEFORE
llm = await LLMFactory.get_client()
raw = await llm.generate(prompt=prompt)

# AFTER
response = await LLMFactory.get_client_with_retry(
    lambda llm: llm.generate(prompt=prompt)
)
raw = response.content
```

#### `backend/core/orchestrators/research/llm_drafter.py`

```python
# BEFORE
llm = await LLMFactory.get_client()
response = await llm.generate(...)

# AFTER
response = await LLMFactory.get_client_with_retry(
    lambda llm: llm.generate(...)
)
```

#### `backend/core/orchestrators/research/evidence_scorer.py`

```python
# BEFORE
from infra.llm.langchain_adapter import get_langchain_llm
llm = get_langchain_llm()
response = await llm.ainvoke(messages)

# AFTER
from infra.llm.langchain_adapter import get_langchain_llm_with_retry
response = await get_langchain_llm_with_retry(
    lambda llm: llm.ainvoke(messages)
)
```

### 7.9 `.env.example`

Add SAP AI Core block with both modes:

```bash
# ============================================
# SAP AI Core Settings (via Generative AI Hub)
# ============================================
# Obtain AICORE_* values from your SAP AI Core service key JSON.
# AICORE_AUTH_URL = service_key.url + /oauth/token
# AICORE_BASE_URL = service_key.serviceurls.AI_API_URL + /v2

# --- Direct deployment mode (one deployment per model) ---
# LLM_PROVIDER=sap_ai_core
# LLM_MODEL=anthropic--claude-3.5-sonnet
# AICORE_CLIENT_ID=sb-...
# AICORE_CLIENT_SECRET=...
# AICORE_AUTH_URL=https://{tenant}.authentication.{region}.hana.ondemand.com/oauth/token
# AICORE_BASE_URL=https://api.ai.{region}.cfapps.sap.hana.ondemand.com/v2
# AICORE_RESOURCE_GROUP=default

# --- Orchestration mode (RECOMMENDED: same 5 creds, every model, no extra deployment ID) ---
# LLM_PROVIDER=sap_ai_core_orch
# LLM_MODEL=anthropic--claude-4-opus    ← or any catalog model
# AICORE_CLIENT_ID=sb-...
# AICORE_CLIENT_SECRET=...
# AICORE_AUTH_URL=https://{tenant}.authentication.{region}.hana.ondemand.com/oauth/token
# AICORE_BASE_URL=https://api.ai.{region}.cfapps.sap.hana.ondemand.com/v2
# AICORE_RESOURCE_GROUP=default
# No AICORE_ORCHESTRATION_DEPLOYMENT_ID needed — SDK auto-discovers via AI Core API
```

### 7.10 `backend/infra/llm/README.md`

Add a section for SAP AI Core:
- Auth setup instructions with service key mapping
- Supported model names table
- Note on deployment prerequisite
- Updated provider comparison table

---

## 8. Implementation Order

Execute in this exact order to keep the codebase in a working state at every step:

| Step | Action | Verification |
|---|---|---|
| 1 | Add `sap-ai-sdk-gen>=7.0.0` to `pyproject.toml`, run `uv sync` | `python -c "import gen_ai_hub"` succeeds; **run full test suite** — SDK forces langchain to `~=1.3.11`, may upgrade from 1.2.x |
| 2 | Update `base.py` — add imports, `_strip_fences()`, promote `generate_structured()` | Existing unit tests pass |
| 3 | Update `providers/claude.py` — remove `generate_structured()`, remove `max_validation_retries` | Existing unit tests pass |
| 4a | Create `providers/sap_ai_core.py` | `python -c "from infra.llm.providers.sap_ai_core import SAPAICoreProvider"` |
| 4b | Create `providers/sap_ai_core_orch.py` | `python -c "from infra.llm.providers.sap_ai_core_orch import SAPAICoreOrchestrationProvider"` |
| 5 | Update `jwt_handler.py` — extend `_AUTH_ERROR_TOKENS` set | New unit tests for XSUAA patterns pass |
| 6 | Update `factory.py` — add `sap_ai_core` + `sap_ai_core_orch` branches | Both `LLM_PROVIDER` values load without error |
| 7 | Update `langchain_adapter.py` — add `_create_sap_ai_core_client()` | Module imports without error |
| 8 | Fix 4 call sites — add missing retry | All existing unit tests still pass |
| 9 | Update `.env.example` | — |
| 10 | Update `README.md` | — |
| 11a | Set `AICORE_*` env vars + `LLM_PROVIDER=sap_ai_core` — run integration tests (direct mode) | Integration + regression tests pass |
| 11b | Switch to `LLM_PROVIDER=sap_ai_core_orch` + target model — run integration tests (orchestration mode) | Same tests pass; confirm auto-discovery log appears |

---

## 9. Testing Strategy

### 9.1 Unit Tests (no SAP AI Core credentials needed)

All existing tests in `backend/tests/` must pass without modification.

New tests to add in `backend/tests/test_sap_ai_core_provider.py`:

```python
# 1. _strip_fences() correctly handles: ```json\n{}\n```, ```{}\n```, and plain {}
# 2. _strip_fences() handles no-newline fence: ```{}``` → {}
# 3. generate_structured() in BaseLLM validates schema on success
# 4. generate_structured() retries on JSONDecodeError up to MAX_VALIDATION_RETRIES
# 5. generate_structured() raises LLMValidationError after exhausting retries
# 6. generate_structured() does NOT catch LLMError (transport errors propagate immediately)
# 7. jwt_handler.is_jwt_error() → True for: "unauthorized", "403", "invalid_token", "forbidden"
# 8. jwt_handler.is_jwt_error() → False for: "timeout", "network error", "rate limit"
# 9. factory.py raises ValueError for unknown provider string
# 10. ClaudeLLM does NOT define generate_structured() — inherited from BaseLLM
# 11. SAPAICoreProvider does NOT pass temperature for reasoning model names (o1, o3)
# 12. SAPAICoreProvider DOES pass temperature for standard model names
# 13. SAPAICoreOrchestrationProvider.generate() raises LLMError when arun_with_retries() returns None
# 14. The LLMError from the None-guard propagates unchanged (not double-wrapped into LLMError("SAP AI Core ... SAP AI Core ..."))
# 15. SAPAICoreOrchestrationProvider does NOT pass temperature for reasoning model names (o1, o3)
# 16. SAPAICoreOrchestrationProvider DOES pass temperature for standard model names
```

### 9.2 Integration Test (requires credentials)

After setting `AICORE_*` env vars:

```bash
cd backend
python -c "
import asyncio
from pydantic import BaseModel
from infra.llm.factory import LLMFactory

class PingOut(BaseModel):
    message: str

async def test():
    llm = await LLMFactory.get_client()
    result = await llm.generate_structured(
        'Reply with JSON: {\"message\": \"pong\"}',
        PingOut,
    )
    assert result.message == 'pong', f'Got: {result.message}'
    print('SAP AI Core integration test PASSED')

asyncio.run(test())
"
```

### 9.3 Regression Test

Run the full pipeline end-to-end with a short topic:

```bash
cd backend && python apps/cli/run_workflow.py --topic "AI in enterprise software" --mode quick
```

Verify:
- Research stage completes (LLMFactory path — all 10 orchestrator call sites)
- Evidence scoring completes (LangChain path)
- Angles generated
- Slides generated
- Caption generated
- `token_usage.json` populated with per-stage costs

---

## 10. Environment Variable Reference

### `.env` for SAP AI Core

```bash
LLM_PROVIDER=sap_ai_core
LLM_MODEL=anthropic--claude-3.5-sonnet
LLM_TIMEOUT=300.0
LLM_MAX_TOKENS=8192
LLM_TEMPERATURE=1.0

AICORE_CLIENT_ID=sb-...
AICORE_CLIENT_SECRET=...
AICORE_AUTH_URL=https://{tenant}.authentication.{region}.hana.ondemand.com/oauth/token
AICORE_BASE_URL=https://api.ai.{region}.cfapps.sap.hana.ondemand.com/v2
AICORE_RESOURCE_GROUP=default
```

### Switching Back to HAI Proxy (rollback)

```bash
LLM_PROVIDER=claude
LLM_MODEL=anthropic--claude-4.5-sonnet
HAI_PROXY_URL=http://localhost:6655/anthropic
HAI_PROXY_API_KEY=your-key
# Remove or comment out AICORE_* vars
```

### Available Models on SAP AI Core Generative AI Hub

**With orchestration mode (`sap_ai_core_orch`):** All models below are available via a single orchestration deployment — no per-model provisioning required.

**With direct mode (`sap_ai_core`):** Each model requires its own deployment.

| Model Name (`LLM_MODEL`) | Provider | Notes |
|---|---|---|
| `anthropic--claude-4-opus` | Anthropic | Latest flagship — orchestration mode only |
| `anthropic--claude-4-sonnet` | Anthropic | Fast + capable |
| `anthropic--claude-3.5-sonnet` | Anthropic | Proven workhorse |
| `anthropic--claude-3-haiku` | Anthropic | Fast, low cost |
| `gpt-4o` | Azure OpenAI | Via SAP |
| `gpt-4-turbo` | Azure OpenAI | Via SAP |
| `meta--llama3-70b-instruct` | Meta | Open source |
| `mistralai--mixtral-8x7b-instruct` | Mistral | Open source |
| `amazon--nova-pro` | Amazon | Via AWS |
| `o1`, `o3` | Azure OpenAI | Reasoning — no temperature parameter |

**Orchestration mode recommendation:** Set `LLM_MODEL=anthropic--claude-4-opus` (or whichever current flagship) — no infrastructure change needed when SAP adds new models to the catalog.

---

## 11. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| SDK `gen_ai_hub` import path changes in future major version | Low | Verified stable at 7.2.0; pin in production after testing |
| `model_name` parameter renamed in future SDK version | Low | Isolated to `sap_ai_core.py`; one-line fix |
| XSUAA error messages not matched by `jwt_handler.py` | Medium | Extended `_AUTH_ERROR_TOKENS` covers known patterns; worst case: unhandled 401 raises to caller (not silent failure) |
| `AsyncOpenAI` event loop / aiohttp session closure mid-session | Low | SDK manages session lifecycle; `close()` is a deliberate no-op |
| Reasoning models (`o1`, `o3`) fail with temperature parameter | Medium | `_is_reasoning_model()` guard omits temperature for known reasoning prefixes |
| SAP AI Core deployment not provisioned for target model | Medium | Direct mode: operational error; Orchestration mode: not required for primary path |
| LangChain path fails if no direct deployment in orchestration mode | Low | `chat.py`, `tools_news.py`, `evidence_scorer.py` use `ChatOpenAI` (direct). If only orchestration deployment exists (no direct), these 3 call sites fail. Solution: refactor those callers to use `LLMFactory.get_client_with_retry()` instead of LangChain adapter. |
| `OrchestrationService()` init blocks event loop | Low | `discover_orchestration_api_url()` makes synchronous HTTP calls. Called during `LLMFactory.get_client()` (async singleton init). Acceptable for development use since init fires once; for production, pre-warm by calling `LLMFactory.get_client()` at server startup |
| `langchain` ecosystem force-upgrade | **High** | `sap-ai-sdk-gen==7.2.0` (verified from wheel) requires: `langchain~=1.3.11` (= `>=1.3.11, <1.4`), `langchain-openai~=1.3.3`, `langchain-community~=0.4.1`. If current installs are `langchain 1.2.x`, `uv sync` will upgrade the entire LangChain stack to `1.3.x`. **Mitigation:** run the full test suite immediately after Step 1; check langchain `1.2→1.3` changelog for breaking changes before merging. *(PEP 440 reminder: `~=X.Y.Z` means `>=X.Y.Z, <X.(Y+1)` — the patch-level compatibility clause, NOT `<(X+1).0`)* |

---

## 12. Summary of All File Changes

| File | Change Type | Reason |
|---|---|---|
| `infra/llm/base.py` | Modify | Promote `generate_structured()` to concrete Template Method; add `_strip_fences()` |
| `infra/llm/providers/claude.py` | Modify | Remove now-inherited `generate_structured()`; remove `max_validation_retries` |
| `infra/llm/providers/sap_ai_core.py` | **Create** | Direct deployment provider (AsyncOpenAI) |
| `infra/llm/providers/sap_ai_core_orch.py` | **Create** | **Recommended** — Orchestration Service provider (all models, one deployment) |
| `infra/llm/factory.py` | Modify | Add `sap_ai_core` + `sap_ai_core_orch` branches |
| `infra/llm/langchain_adapter.py` | Modify | Add `_create_sap_ai_core_client()` with temperature + max_tokens |
| `infra/llm/jwt_handler.py` | Modify | Extend `_AUTH_ERROR_TOKENS` for XSUAA error patterns |
| `infra/llm/README.md` | Modify | Document both SAP AI Core providers, service key mapping, deployment note |
| `configs/settings.py` | Modify | Update `llm_provider` comment to include both SAP options |
| `pyproject.toml` | Modify | Add `sap-ai-sdk-gen>=7.0.0` |
| `.env.example` | Modify | Add `AICORE_*` blocks for both direct and orchestration modes |
| `core/orchestrators/content/caption_generator.py` | Modify | Fix: use `get_client_with_retry()` |
| `core/orchestrators/content/slide_validator.py` | Modify | Fix: use `get_client_with_retry()` |
| `core/orchestrators/research/llm_drafter.py` | Modify | Fix: use `get_client_with_retry()` |
| `core/orchestrators/research/evidence_scorer.py` | Modify | Fix: use `get_langchain_llm_with_retry()` |

**Total files: 15 (2 new, 13 modified)**  
**Zero changes to orchestrators' business logic, prompt templates, API routes, or frontend.**

---

## 13. Architect Review Log

| Round | Issues Found | Status |
|---|---|---|
| Round 1 | 7 issues | ✅ Fixed in v1.1 |
| Round 2 | 1 issue | ✅ Fixed in v1.2 |
| Round 3 | Orchestration mode research + integration | ✅ Added in v1.3 |
| Round 4 | Deployment ID not needed — SDK auto-discovers | ✅ Fixed in v1.4 |
| Round 5 | 5 bugs — LangChain gap, stale examples, blocking init | ✅ Fixed in v1.5 |
| Round 6 | 3 bugs — arun_with_retries, lazy imports, overconfident comment | ✅ Fixed in v1.6 |
| Round 7 | 4 bugs — LLMError double-wrap, langchain version wrong+misinterpreted, missing impl steps, missing tests | ✅ Fixed in v1.7 |
| Round 8 | Final review — no high-severity issues; added 2 minor tests for orch temperature guard | ✅ v1.8 — implementation-ready |

### Round 1 Issues Fixed

1. **[CRITICAL] Used sync `OpenAI` instead of `AsyncOpenAI`** — SDK provides `AsyncOpenAI` natively (confirmed in wheel inspection). Using sync client with `asyncio.to_thread()` was unnecessary overhead. Fixed to use `AsyncOpenAI` directly; `import asyncio` removed from `sap_ai_core.py`.

2. **[CRITICAL] Wrong version lower bound `>=1.0.0`** — Current latest is `7.2.0` (verified via `pip index versions`). The `generative-ai-hub-sdk` (1.x) was a different package name. Fixed to `>=7.0.0`.

3. **[MEDIUM] `langchain_adapter.py` SAP client missing `temperature` and `max_tokens`** — All other provider factory functions pass these settings. Fixed to include both params in `_create_sap_ai_core_client()`.

4. **[MEDIUM] `base.py` missing new imports** — `generate_structured()` in `BaseLLM` needs `asyncio`, `json`, `ValidationError`, and a logger. Explicit import list added to Section 5 Decision 1.

5. **[MEDIUM] `_strip_fences()` bug for no-newline fences** — `"```{...}```".split("\n", 1)[-1]` returns the whole string unchanged (no newline found). Fixed to `split("```", 1)[1]` which correctly strips the opening fence in all cases.

6. **[MEDIUM] Reasoning models don't support `temperature`** — Confirmed by SDK source comment. Added `_is_reasoning_model()` guard and `_REASONING_MODEL_PREFIXES` constant to `SAPAICoreProvider.generate()`.

7. **[MINOR] `asyncio` import not needed in `sap_ai_core.py`** — Using `AsyncOpenAI` eliminates `asyncio.to_thread()`. Removed unnecessary import.

### Round 2 Issues Fixed

1. **[MEDIUM] `base.py` import list missing `LLMValidationError`** — `generate_structured()` raises `LLMValidationError` after exhausting retries. Previously this was only used inside `ClaudeLLM`, so `base.py` never imported it. After promoting the method to `BaseLLM`, `base.py` must import it from `infra.llm.exceptions`. Added to Section 5 Decision 1 import list.

---

### Round 3 — Orchestration Mode

**Finding:** `sap-ai-sdk-gen` ships a full `gen_ai_hub.orchestration` module alongside the native OpenAI client. The Orchestration Service is a meta-deployment in SAP AI Core that routes to **any model in the catalog** without requiring per-model deployments.

**Verified in wheel:**
- `OrchestrationService.arun(config=...)` is natively async ✅
- Response path: `response.orchestration_result.choices[0].message.content` ✅
- Token counts: `response.orchestration_result.usage.prompt_tokens` / `.completion_tokens` ✅
- `arun_with_retries()` built-in with exponential backoff ✅
- `SystemMessage` / `UserMessage` constructors exist ✅
- `LLM(name=model, version="latest", parameters={...})` is the model spec ✅

**Actions taken:**
- Added Section 3.4 explaining Orchestration Mode with comparison table
- Added `SAPAICoreOrchestrationProvider` as Section 6.2 (new file `sap_ai_core_orch.py`)
- Updated `factory.py` section to include `sap_ai_core_orch` branch
- Updated `.env.example` with separate blocks for direct vs orchestration mode
- Updated model catalog table — all models accessible via orchestration mode
- **Recommendation changed:** `sap_ai_core_orch` is now the preferred integration path

---

### Round 4 — Deployment ID Correction

**Finding:** The plan in v1.3 incorrectly required `AICORE_ORCHESTRATION_DEPLOYMENT_ID`. User confirmed via Cline's SAP AI Core settings UI that Orchestration Mode works with just the standard 5 `AICORE_*` credentials — no extra deployment ID field exists.

**Root cause (confirmed in wheel):** `get_orchestration_api_url()` has a fallback path when `deployment_id=None`:
```python
url = discover_orchestration_api_url(
    **proxy_client.model_dump(exclude='ai_core_client'),  # uses the 5 AICORE_* creds
    config_name=None, config_id=None
)
```
`discover_orchestration_api_url()` queries the AI Core deployments API for a deployment with `scenario="orchestration"` and `executable_id="orchestration"`, returns its URL. Decorated with `@cache_if_not_none` — discovery fires only once per process.

**Actions taken:**
- `SAPAICoreOrchestrationProvider.__init__()` simplified: removed `deployment_id` param; `OrchestrationService()` called with no arguments
- `.env.example` orchestration block: removed `AICORE_ORCHESTRATION_DEPLOYMENT_ID` line
- Section 3.4 "Getting the deployment ID" replaced with auto-discovery flow diagram
- Section 7.3 factory.py: removed `deployment_id` comment

---

### Round 5 — Architect Review

**Issues found and fixed:**

1. **[CRITICAL] `langchain_adapter.py` missing `sap_ai_core_orch` case** — `_build_client()` only handled `sap_ai_core`, not `sap_ai_core_orch`. When using orchestration mode, `get_langchain_llm()` raised `ValueError`, breaking `evidence_scorer.py`, `chat.py`, and `tools_news.py`. Fixed: `elif settings.llm_provider in ("sap_ai_core", "sap_ai_core_orch")` maps both to `_create_sap_ai_core_client()`. Caveat documented in Risk table: if only orchestration deployment exists (no direct deployment), these 3 LangChain call sites will fail — refactor to `LLMFactory.get_client_with_retry()` in that case.

2. **[HIGH] Stale `deployment_id="d..."` in Section 3.4 example** — The "Verified call pattern" still showed `OrchestrationService(deployment_id="d...", config=config)` from the pre-auto-discovery version. Fixed to `OrchestrationService()` with `arun(config=config)`.

3. **[MEDIUM] Stale settings.py comment in Section 7.6** — Mentioned `AICORE_ORCHESTRATION_DEPLOYMENT_ID` being "read from environment" — incorrect since v1.4 removed that requirement. Replaced with correct note.

4. **[MEDIUM] Implementation Step 11** — Only listed `sap_ai_core` for integration testing. Split into 11a (direct mode) and 11b (orchestration mode) so both are tested explicitly.

5. **[MINOR] `OrchestrationService()` blocking init in async context** — `discover_orchestration_api_url()` is synchronous and makes HTTP calls. Documented in Risk table with the production mitigation (pre-warm at server startup).

---

### Round 6 — Architect Review

**Issues found and fixed:**

1. **[HIGH] `arun()` vs `arun_with_retries()` inconsistency** — Section 3.4 comparison table listed "✅ `arun_with_retries()` built-in" as an orchestration advantage, but Section 6.2 code used `arun()`. Inconsistency corrected by updating provider code to use `arun_with_retries()`. Critical subtlety: `arun_with_retries()` returns `OrchestrationResponseWithRetries | None` — it returns `None` (not an exception) when all retries are exhausted. Added `if response is None: raise LLMError(...)` guard. Return type is a subclass of `OrchestrationResponse` so the `.orchestration_result` path is unchanged.

2. **[MEDIUM] SDK model class imports inside `generate()` and `_build_llm_config()` called on every LLM invocation** — `from gen_ai_hub.orchestration.models.config import OrchestrationConfig` etc. were inside the method body, executed on every call. Moved all SDK imports to `__init__()` alongside `OrchestrationService`. Stored as instance attributes (`self._OrchestrationConfig`, etc.) so `generate()` just calls `self._OrchestrationConfig(...)` — no per-call module lookups. Pattern is consistent: all SDK imports deferred to init (not module-level) so the file remains importable when `sap-ai-sdk-gen` is not installed.

3. **[MEDIUM] `langchain_adapter.py` comment overconfident** — Previous wording implied direct deployments always exist alongside orchestration deployments ("which is normal for SAP AI Core instances that have the orchestration service enabled"). This is not guaranteed — some users may have ONLY the orchestration service deployment. Comment updated to state the caveat clearly and point to the Risk table.

---

### Round 7 — Architect Review

**Issues found and fixed:**

1. **[HIGH] `LLMError` double-wrap in `sap_ai_core_orch.py`** — The `if response is None: raise LLMError(...)` guard is inside the `try` block. Without a guard, `except Exception as exc: raise LLMError(str(exc))` would catch it and produce: `LLMError("SAP AI Core orchestration request failed: SAP AI Core orchestration request failed: rate limit exceeded after all retries")`. Fixed by adding `except LLMError: raise` as the first exception clause — LLMErrors pass through directly; only non-LLMErrors are wrapped.

2. **[HIGH] Wrong langchain version in Risk table** — Plan stated `langchain~=1.2.6` (and misinterpreted `~=X.Y.Z` as `>=X.Y.Z, <(X+1).0`). Actual wheel (`sap-ai-sdk-gen==7.2.0`) requires: `langchain~=1.3.11` (= `>=1.3.11, <1.4`), `langchain-openai~=1.3.3`, `langchain-community~=0.4.1`. Risk severity upgraded to **High** — `uv sync` may force the entire LangChain stack from 1.2.x → 1.3.x. PEP 440 note added: `~=X.Y.Z` means `>=X.Y.Z, <X.(Y+1)`.

3. **[MEDIUM] Implementation table missing `sap_ai_core_orch.py` creation step** — Step 4 only covered `sap_ai_core.py`. Split into 4a + 4b. Step 6 description updated from "add `sap_ai_core` branch" to "add both branches". Step 1 verification updated to include running the full test suite after the langchain upgrade.

4. **[MINOR] Missing tests for `arun_with_retries()` None path** — Added test #13 (raises `LLMError` on `None`) and test #14 (message not double-wrapped).

---

### Round 8 — Final Architect Review

**No high-severity issues found.**

**Minor gap addressed:**
- Tests #11–12 covered temperature-guard logic for `SAPAICoreProvider` but not `SAPAICoreOrchestrationProvider`. Added tests #15–16 to complete coverage. Both providers share the same `_is_reasoning_model()` pattern, so the logic is identical — but independent tests make regressions visible if one file diverges.

**Other observations (no changes required):**
- `_is_reasoning_model()` and `_get_token_tracker()` are defined identically in both provider files. Minor duplication acceptable for this plan; can be extracted to `providers/utils.py` post-merge as a cleanup task.
- `_strip_fences()` does not handle uppercase `JSON` hint. Acceptable — LLMs prompted for JSON always output lowercase `json` or no hint.
- Section 3.4 "Verified call pattern" uses `service.arun()` (raw SDK API) while our provider uses `arun_with_retries()`. Intentional — the example documents the SDK interface; our code documents the production practice.

**Verdict:** Plan is implementation-ready.

---

*Document version: 1.8 — Round 8 final review, implementation-ready*
