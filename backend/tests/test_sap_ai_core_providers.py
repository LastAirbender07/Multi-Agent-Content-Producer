"""
Tests for SAP AI Core LLM providers and factory routing.

All external SDK calls are mocked — no real AI Core credentials needed.
Run with: cd backend && python -m pytest tests/test_sap_ai_core_providers.py -v
"""

from __future__ import annotations

import sys
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from infra.llm.schemas import LLMResponse


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _llm_response(content: str, model: str = "test-model") -> LLMResponse:
    """Build a minimal valid LLMResponse for use in mock return values."""
    return LLMResponse(
        content=content,
        usage={"input_tokens": 10, "output_tokens": 20},
        model=model,
    )


def _fake_gen_ai_hub_modules() -> dict:
    """
    Return a dict of stub sys.modules entries covering every gen_ai_hub submodule
    imported inside SAPAICoreProvider.__init__ and SAPAICoreOrchestrationProvider.__init__.
    Injecting these before instantiation prevents real SDK network calls.
    """
    # Stubs for sap_ai_core direct provider
    mock_async_openai_cls = MagicMock()
    mock_async_openai_cls.return_value = AsyncMock()  # instance

    native_openai_clients = MagicMock()
    native_openai_clients.AsyncOpenAI = mock_async_openai_cls

    # Stubs for sap_ai_core_orch provider
    mock_orch_service_cls = MagicMock()
    mock_orch_service_cls.return_value = AsyncMock()

    orch_service_mod = MagicMock()
    orch_service_mod.OrchestrationService = mock_orch_service_cls

    return {
        "gen_ai_hub": MagicMock(),
        "gen_ai_hub.proxy": MagicMock(),
        "gen_ai_hub.proxy.native": MagicMock(),
        "gen_ai_hub.proxy.native.openai": MagicMock(),
        "gen_ai_hub.proxy.native.openai.clients": native_openai_clients,
        "gen_ai_hub.orchestration": MagicMock(),
        "gen_ai_hub.orchestration.service": orch_service_mod,
        "gen_ai_hub.orchestration.models": MagicMock(),
        "gen_ai_hub.orchestration.models.config": MagicMock(),
        "gen_ai_hub.orchestration.models.template": MagicMock(),
        "gen_ai_hub.orchestration.models.message": MagicMock(),
        "gen_ai_hub.orchestration.models.llm": MagicMock(),
    }


# ===========================================================================
# SAPAICoreProvider (direct deployment)
# ===========================================================================

class TestSAPAICoreProvider:
    """Tests for infra.llm.providers.sap_ai_core.SAPAICoreProvider."""

    @pytest.mark.asyncio
    async def test_generate_returns_llm_response(self):
        """generate() calls the SDK client and returns LLMResponse."""
        fakes = _fake_gen_ai_hub_modules()
        with patch.dict(sys.modules, fakes):
            from infra.llm.providers.sap_ai_core import SAPAICoreProvider

            llm = SAPAICoreProvider(model="my-deployment", max_tokens=256, temperature=0.0)

            # Replace the SDK client with a controlled async mock
            mock_client = AsyncMock()
            choice = MagicMock()
            choice.message.content = "Hello from SAP AI Core"
            mock_client.chat.completions.create = AsyncMock(
                return_value=MagicMock(choices=[choice])
            )
            llm._client = mock_client

            result = await llm.generate(prompt="Say hello")

        assert isinstance(result, LLMResponse)
        assert result.content == "Hello from SAP AI Core"
        assert result.model == "my-deployment"

    @pytest.mark.asyncio
    async def test_generate_structured_parses_json(self):
        """generate_structured() (inherited from BaseLLM) parses JSON into a Pydantic model."""
        from pydantic import BaseModel

        class _Schema(BaseModel):
            answer: str
            score: int

        fakes = _fake_gen_ai_hub_modules()
        with patch.dict(sys.modules, fakes):
            from infra.llm.providers.sap_ai_core import SAPAICoreProvider

            llm = SAPAICoreProvider(model="my-deployment", max_tokens=256, temperature=0.0)

            # Patch generate() so we don't need a real client
            with patch.object(
                llm,
                "generate",
                AsyncMock(return_value=_llm_response('{"answer": "42", "score": 10}')),
            ):
                result = await llm.generate_structured(
                    prompt="What is the answer?",
                    output_schema=_Schema,
                )

        assert isinstance(result, _Schema)
        assert result.answer == "42"
        assert result.score == 10

    @pytest.mark.asyncio
    async def test_generate_structured_retries_on_invalid_json(self):
        """generate_structured() retries when LLM returns invalid JSON."""
        from pydantic import BaseModel

        class _Strict(BaseModel):
            value: int

        fakes = _fake_gen_ai_hub_modules()
        with patch.dict(sys.modules, fakes):
            from infra.llm.providers.sap_ai_core import SAPAICoreProvider

            llm = SAPAICoreProvider(model="my-deployment", max_tokens=256, temperature=0.0)

            call_count = 0

            async def _generate(*args, **kwargs):
                nonlocal call_count
                call_count += 1
                if call_count < 2:
                    return _llm_response("not valid json at all")
                return _llm_response('{"value": 7}')

            with patch.object(llm, "generate", side_effect=_generate):
                result = await llm.generate_structured(
                    prompt="give me a value",
                    output_schema=_Strict,
                    max_retries=3,
                )

        assert result.value == 7
        assert call_count == 2

    @pytest.mark.asyncio
    async def test_reasoning_model_omits_temperature(self):
        """generate() must not pass temperature for reasoning-model deployments."""
        fakes = _fake_gen_ai_hub_modules()
        with patch.dict(sys.modules, fakes):
            from infra.llm.providers.sap_ai_core import SAPAICoreProvider

            llm = SAPAICoreProvider(
                model="o1-mini",  # matches _REASONING_MODEL_PREFIXES
                max_tokens=256,
                temperature=0.7,
            )

            mock_client = AsyncMock()
            choice = MagicMock()
            choice.message.content = "ok"
            mock_client.chat.completions.create = AsyncMock(
                return_value=MagicMock(choices=[choice])
            )
            llm._client = mock_client

            await llm.generate(prompt="test")

        call_kwargs = mock_client.chat.completions.create.call_args[1]
        assert "temperature" not in call_kwargs, "reasoning models must not receive temperature"


# ===========================================================================
# SAPAICoreOrchestrationProvider
# ===========================================================================

class TestSAPAICoreOrchestrationProvider:
    """Tests for infra.llm.providers.sap_ai_core_orch.SAPAICoreOrchestrationProvider."""

    @pytest.mark.asyncio
    async def test_generate_returns_llm_response(self):
        """generate() wraps OrchestrationService response into LLMResponse."""
        fakes = _fake_gen_ai_hub_modules()
        with patch.dict(sys.modules, fakes):
            from infra.llm.providers.sap_ai_core_orch import SAPAICoreOrchestrationProvider

            llm = SAPAICoreOrchestrationProvider(
                model="anthropic--claude-4.5-sonnet",
                max_tokens=256,
                temperature=0.0,
            )

            # Patch generate() directly — orch response parsing is tested separately
            with patch.object(
                llm,
                "generate",
                AsyncMock(return_value=_llm_response("Orchestrated reply", "anthropic--claude-4.5-sonnet")),
            ):
                result = await llm.generate(prompt="Test prompt")

        assert isinstance(result, LLMResponse)
        assert result.content == "Orchestrated reply"

    @pytest.mark.asyncio
    async def test_generate_structured_parses_json(self):
        """generate_structured() works end-to-end via mocked orchestration service."""
        from pydantic import BaseModel

        class _Out(BaseModel):
            summary: str

        fakes = _fake_gen_ai_hub_modules()
        with patch.dict(sys.modules, fakes):
            from infra.llm.providers.sap_ai_core_orch import SAPAICoreOrchestrationProvider

            llm = SAPAICoreOrchestrationProvider(
                model="anthropic--claude-4.5-sonnet",
                max_tokens=256,
                temperature=0.0,
            )

            with patch.object(
                llm,
                "generate",
                AsyncMock(return_value=_llm_response('{"summary": "SAP AI Core orch works"}')),
            ):
                result = await llm.generate_structured(
                    prompt="Summarise something",
                    output_schema=_Out,
                )

        assert isinstance(result, _Out)
        assert "SAP AI Core" in result.summary


# ===========================================================================
# LLMFactory routing
# ===========================================================================

class TestLLMFactoryRouting:
    """Tests that LLMFactory.get_client() routes to the correct provider class."""

    def setup_method(self):
        from infra.llm.factory import LLMFactory
        LLMFactory.reset()

    @pytest.mark.asyncio
    async def test_routes_to_sap_ai_core(self):
        from infra.llm.factory import LLMFactory

        mock_settings = MagicMock()
        mock_settings.llm_provider = "sap_ai_core"
        mock_settings.llm_model = "my-deployment"
        mock_settings.llm_timeout = 30.0
        mock_settings.llm_max_tokens = 512
        mock_settings.llm_temperature = 0.7

        fakes = _fake_gen_ai_hub_modules()
        with patch.dict(sys.modules, fakes):
            with patch("infra.llm.factory.get_settings", return_value=mock_settings):
                LLMFactory.reset()
                from infra.llm.providers.sap_ai_core import SAPAICoreProvider
                client = await LLMFactory.get_client()

        assert isinstance(client, SAPAICoreProvider)
        assert client.model == "my-deployment"

    @pytest.mark.asyncio
    async def test_routes_to_sap_ai_core_orch(self):
        from infra.llm.factory import LLMFactory

        mock_settings = MagicMock()
        mock_settings.llm_provider = "sap_ai_core_orch"
        mock_settings.llm_model = "anthropic--claude-4.5-sonnet"
        mock_settings.llm_timeout = 30.0
        mock_settings.llm_max_tokens = 512
        mock_settings.llm_temperature = 0.7

        fakes = _fake_gen_ai_hub_modules()
        with patch.dict(sys.modules, fakes):
            with patch("infra.llm.factory.get_settings", return_value=mock_settings):
                LLMFactory.reset()
                from infra.llm.providers.sap_ai_core_orch import SAPAICoreOrchestrationProvider
                client = await LLMFactory.get_client()

        assert isinstance(client, SAPAICoreOrchestrationProvider)

    @pytest.mark.asyncio
    async def test_raises_on_unknown_provider(self):
        from infra.llm.factory import LLMFactory

        mock_settings = MagicMock()
        mock_settings.llm_provider = "unknown_provider_xyz"
        mock_settings.llm_model = "some-model"
        mock_settings.llm_timeout = 30.0
        mock_settings.llm_max_tokens = 512
        mock_settings.llm_temperature = 0.7

        with patch("infra.llm.factory.get_settings", return_value=mock_settings):
            LLMFactory.reset()
            with pytest.raises(ValueError, match="Unsupported LLM provider"):
                await LLMFactory.get_client()

    @pytest.mark.asyncio
    async def test_singleton_reused_across_calls(self):
        """Two awaits of get_client() return the same instance."""
        from infra.llm.factory import LLMFactory

        mock_settings = MagicMock()
        mock_settings.llm_provider = "sap_ai_core"
        mock_settings.llm_model = "dep"
        mock_settings.llm_timeout = 30.0
        mock_settings.llm_max_tokens = 512
        mock_settings.llm_temperature = 0.7

        fakes = _fake_gen_ai_hub_modules()
        with patch.dict(sys.modules, fakes):
            with patch("infra.llm.factory.get_settings", return_value=mock_settings):
                LLMFactory.reset()
                a = await LLMFactory.get_client()
                b = await LLMFactory.get_client()

        assert a is b

    @pytest.mark.asyncio
    async def test_reset_clears_singleton(self):
        """After reset(), the next get_client() constructs a fresh instance."""
        from infra.llm.factory import LLMFactory

        mock_settings = MagicMock()
        mock_settings.llm_provider = "sap_ai_core"
        mock_settings.llm_model = "dep"
        mock_settings.llm_timeout = 30.0
        mock_settings.llm_max_tokens = 512
        mock_settings.llm_temperature = 0.7

        fakes = _fake_gen_ai_hub_modules()
        with patch.dict(sys.modules, fakes):
            with patch("infra.llm.factory.get_settings", return_value=mock_settings):
                LLMFactory.reset()
                a = await LLMFactory.get_client()
                LLMFactory.reset()
                b = await LLMFactory.get_client()

        assert a is not b


# ===========================================================================
# get_client_with_retry — auth error handling
# ===========================================================================

class TestGetClientWithRetry:
    """Tests for LLMFactory.get_client_with_retry()."""

    def setup_method(self):
        from infra.llm.factory import LLMFactory
        LLMFactory.reset()

    @pytest.mark.asyncio
    async def test_returns_result_on_success(self):
        from infra.llm.factory import LLMFactory

        expected = _llm_response("ok")
        mock_llm = AsyncMock()

        with patch.object(LLMFactory, "get_client", AsyncMock(return_value=mock_llm)):
            result = await LLMFactory.get_client_with_retry(
                lambda llm: asyncio_return(expected)
            )

        assert result.content == "ok"

    @pytest.mark.asyncio
    async def test_retries_once_on_jwt_error(self):
        """JWT/auth error → singleton reset → one retry."""
        from infra.llm.factory import LLMFactory

        call_count = 0
        good_response = _llm_response("retry worked")

        async def _call(llm):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("jwt expired: 401 Unauthorized")
            return good_response

        mock_llm = AsyncMock()

        with patch.object(LLMFactory, "get_client", AsyncMock(return_value=mock_llm)):
            result = await LLMFactory.get_client_with_retry(_call)

        assert result.content == "retry worked"
        assert call_count == 2

    @pytest.mark.asyncio
    async def test_raises_on_non_auth_error(self):
        """Non-auth errors are not retried and propagate immediately."""
        from infra.llm.factory import LLMFactory

        async def _call(llm):
            raise ValueError("model overloaded")

        mock_llm = AsyncMock()

        with patch.object(LLMFactory, "get_client", AsyncMock(return_value=mock_llm)):
            with pytest.raises(ValueError, match="model overloaded"):
                await LLMFactory.get_client_with_retry(_call)

    @pytest.mark.asyncio
    async def test_raises_if_retry_also_fails(self):
        """If the retry call also raises, the exception propagates."""
        from infra.llm.factory import LLMFactory

        async def _call(llm):
            raise Exception("jwt expired again")

        mock_llm = AsyncMock()

        with patch.object(LLMFactory, "get_client", AsyncMock(return_value=mock_llm)):
            with pytest.raises(Exception, match="jwt expired again"):
                await LLMFactory.get_client_with_retry(_call)


# ---------------------------------------------------------------------------
# tiny async helper used in test_returns_result_on_success
# ---------------------------------------------------------------------------

async def asyncio_return(val):
    return val