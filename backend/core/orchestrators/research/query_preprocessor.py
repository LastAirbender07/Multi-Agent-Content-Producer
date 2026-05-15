import json
from datetime import date
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)

_TEMPLATE_PATH = Path(__file__).parents[3] / "core" / "prompts" / "templates" / "query_preprocessing.txt"


class ProcessedQuery(BaseModel):
    cleaned_topic: str = Field(..., description="Concise, neutral description of the core subject")
    entities: list[str] = Field(default_factory=list, description="Key named entities for anchoring searches")
    search_queries: list[str] = Field(..., min_length=1, max_length=10, description="Optimised queries for web/news search tools")
    freshness_hint: Literal["breaking", "recent", "evergreen"] = Field(
        default="recent", description="Inferred recency requirement for search tools"
    )
    content_intent: str = Field(..., description="The angle/message the carousel should communicate")


class QueryPreprocessor:
    """
    Transforms a raw user topic string into structured, search-optimised queries
    before handing off to the research orchestrator.
    """

    def __init__(self) -> None:
        self._template = _TEMPLATE_PATH.read_text(encoding="utf-8")

    async def process(self, raw_topic: str) -> ProcessedQuery:
        logger.info("query_preprocessor_start", raw_topic=raw_topic)

        today = date.today().isoformat()
        prompt = self._template.format(raw_topic=raw_topic, current_date=today)
        llm = await LLMFactory.get_client()
        response = await llm.generate(prompt)
        raw = response.content

        try:
            # Strip markdown fences if the model wraps output anyway
            text = raw.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            data = json.loads(text.strip())
            result = ProcessedQuery.model_validate(data)
        except Exception as e:
            logger.warning("query_preprocessor_parse_error", error=str(e), raw=raw[:200])
            # Graceful fallback: treat raw topic as a single search query
            result = ProcessedQuery(
                cleaned_topic=raw_topic,
                entities=[],
                search_queries=[raw_topic],
                freshness_hint="recent",
                content_intent=raw_topic,
            )

        logger.info(
            "query_preprocessor_complete",
            cleaned_topic=result.cleaned_topic,
            query_count=len(result.search_queries),
            freshness_hint=result.freshness_hint,
        )
        return result
