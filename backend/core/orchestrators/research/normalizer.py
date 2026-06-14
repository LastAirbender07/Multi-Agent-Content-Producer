from datetime import datetime, timezone
from configs.settings import get_settings
from core.orchestration.contracts import Evidence
from core.schemas.workflow_state import ResearchGraphState
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()

# Credibility scores by source type — reflect how reliably the source reports facts.
# Neutral relevance (0.5) is set here; score_evidence_node replaces it with LLM scores.
_CRED_WEB = 0.4
_CRED_DDGS_NEWS = 0.6
_CRED_CRAWL = 0.7
_CRED_NEWS_API = 0.8


async def normalize_evidence_node(state: ResearchGraphState) -> dict:
    """
    Deduplicates and accumulates raw tool outputs into Evidence items.
    relevance_score is set to a neutral 0.5 here — the score_evidence_node
    replaces it with LLM-judged semantic scores in the next step.
    credibility_score reflects source quality and is set here based on source type.
    """
    raw_outputs = state.get("raw_tool_outputs", {})
    existing_evidence: list[Evidence] = list(state.get("evidence", []))
    seen_urls: set[str] = {str(e.url) for e in existing_evidence}
    evidence: list[Evidence] = list(existing_evidence)
    now = datetime.now(timezone.utc)

    # DDGS text results
    ddgs_text = raw_outputs.get("ddgs_text")
    if ddgs_text and getattr(ddgs_text, "success", False):
        for item in ddgs_text.results:
            url = str(item.url)
            if url in seen_urls:
                continue
            seen_urls.add(url)
            evidence.append(Evidence(
                evidence=item.body or "",
                source_type="web_search",
                title=item.title,
                url=url,
                snippet=item.body,
                retrieval_time=now,
                credibility_score=_CRED_WEB,
                relevance_score=0.5,
            ))

    # DDGS news results
    ddgs_news = raw_outputs.get("ddgs_news")
    if ddgs_news and getattr(ddgs_news, "success", False):
        for item in ddgs_news.results:
            url = str(item.url)
            if url in seen_urls:
                continue
            seen_urls.add(url)
            evidence.append(Evidence(
                evidence=item.body or "",
                source_type="news",
                title=item.title,
                url=url,
                snippet=item.body,
                published_at=item.date,
                source_name=item.source,
                retrieval_time=now,
                credibility_score=_CRED_DDGS_NEWS,
                relevance_score=0.5,
            ))

    # News API results
    news_api_results = raw_outputs.get("news_api")
    if news_api_results and getattr(news_api_results, "success", False):
        for item in news_api_results.articles:
            url = str(item.url)
            if url in seen_urls:
                continue
            seen_urls.add(url)
            evidence.append(Evidence(
                evidence=item.content or item.description or "",
                source_type="news",
                title=item.title,
                url=url,
                snippet=item.description,
                extracted_content=item.content,
                published_at=item.published_at,
                source_name=item.source_name,
                retrieval_time=now,
                credibility_score=_CRED_NEWS_API,
                relevance_score=0.5,
            ))

    # Crawl4AI results
    for item in raw_outputs.get("crawl4ai", []):
        if not getattr(item, "success", False) or not item.content:
            continue
        url = str(item.content.url)
        if url in seen_urls:
            continue
        seen_urls.add(url)
        markdown = item.content.markdown or ""
        evidence.append(Evidence(
            evidence=markdown[:_settings.crawl_markdown_max_chars],
            source_type="crawl",
            title=item.content.title or url,
            url=url,
            snippet=markdown[:_settings.crawl_snippet_max_chars] if markdown else None,
            extracted_content=markdown,
            retrieval_time=now,
            credibility_score=_CRED_CRAWL,
            relevance_score=0.5,
        ))

    new_count = len(evidence) - len(existing_evidence)
    logger.info("normalize_completed", run_id=state.get("run_id"),
                evidence_count=len(evidence), new_items=new_count)

    return {
        "evidence": evidence,
        "messages": state.get("messages", []) + [
            f"Evidence normalization: {len(evidence)} total ({new_count} new this iteration)."
        ],
    }
