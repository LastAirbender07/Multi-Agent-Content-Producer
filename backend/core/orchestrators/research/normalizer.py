import hashlib
from datetime import datetime, timezone
from core.orchestration.contracts import Evidence
from core.schemas.workflow_state import ResearchGraphState
from infra.logging import get_logger

logger = get_logger(__name__)

async def normalize_evidence_node(state: ResearchGraphState) -> dict:
    raw_outputs = state.get("raw_tool_outputs", {})
    evidence: list[Evidence] = []
    seen_urls: set[str] = set()
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
                credibility_score=0.4,
                relevance_score=0.6,
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
                credibility_score=0.6,
                relevance_score=0.75,
            ))

    # News API results (merged NewsSearchOutput from both NewsAPI + GoogleNewsAPI)
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
                credibility_score=0.8,
                relevance_score=0.85,
            ))

    # Crawl4AI results
    crawl4ai_results = raw_outputs.get("crawl4ai", [])
    for item in crawl4ai_results:
        if not getattr(item, "success", False) or not item.content:
            continue
        url = str(item.content.url)
        if url in seen_urls:
            continue
        seen_urls.add(url)
        markdown = item.content.markdown or ""
        evidence.append(Evidence(
            evidence=markdown[:2000],
            source_type="crawl",
            title=item.content.title or url,
            url=url,
            snippet=markdown[:500] if markdown else None,
            extracted_content=markdown,
            retrieval_time=now,
            credibility_score=0.7,
            relevance_score=0.8,
        ))

    evidence = sorted(evidence, key=lambda x: x.relevance_score, reverse=True)
    logger.info("normalize_completed", run_id=state.get("run_id"), evidence_count=len(evidence))

    return {
        "evidence": evidence,
        "messages": state.get("messages", []) + [f"Evidence normalization completed with {len(evidence)} items."]
    }
