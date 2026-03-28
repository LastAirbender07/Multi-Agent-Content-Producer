import os
from infra.llm.providers.claude import ClaudeLLM


class LLMFactory:

    @staticmethod
    def create():
        provider = os.getenv("LLM_PROVIDER", "claude")

        if provider == "claude":
            return ClaudeLLM(
                api_key=os.getenv("HAI_PROXY_API_KEY"),
                base_url=os.getenv("HAI_PROXY_URL", "http://localhost:6655/anthropic"),
                model=os.getenv("LLM_MODEL", "anthropic--claude-4.5-sonnet")
            )

        raise ValueError(f"Unsupported provider: {provider}")