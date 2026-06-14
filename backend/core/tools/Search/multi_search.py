"""
Multi-query DDGS image search with deduplication and LLM relevance filtering.

Extracted from the API layer so it can be reused by other tools.
"""
import asyncio
import json
import re

from langchain_core.messages import HumanMessage

from core.prompts.prompt_loader import load_prompt
from core.tools.Search.ddgs_search import DDGSSearch
from infra.llm.langchain_adapter import get_langchain_llm_with_retry
from infra.logging import get_logger

logger = get_logger(__name__)


async def ddgs_multi_search(
    queries: list[str],
    max_results: int,
    original_query: str,
    relevance_threshold: float = 0.4,
) -> list[dict]:
    """
    Run multiple DDGS image queries in parallel, deduplicate by URL,
    then use an LLM to filter out irrelevant results.

    Returns up to max_results image dicts.
    """
    tool = DDGSSearch()

    async def fetch(q: str) -> list:
        try:
            out = await tool.search_images(query=q, max_results=30)
            return [r.model_dump() for r in out.results] if out.success else []
        except Exception:
            return []

    batches = await asyncio.gather(*[fetch(q) for q in queries])

    seen: set[str] = set()
    merged: list[dict] = []
    for batch in batches:
        for item in batch:
            url = item.get("image", "")
            if url and url not in seen:
                seen.add(url)
                merged.append(item)

    if not merged:
        return merged

    try:
        pairs = [{"title": m.get("title", ""), "url": m.get("image", "")} for m in merged[:60]]
        prompt = load_prompt(
            "image_relevance_filter",
            query=original_query,
            threshold=relevance_threshold,
            pairs=pairs,
        )
        resp = await get_langchain_llm_with_retry(
            lambda llm: llm.ainvoke([HumanMessage(content=prompt)])
        )
        raw = resp.content.strip()
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if match:
            relevant_urls: set[str] = set(json.loads(match.group()))
            merged = [m for m in merged if m.get("image", "") in relevant_urls] or merged
    except Exception as e:
        logger.warning("ddgs_llm_filter_failed", error=str(e))

    return merged[:max_results]
