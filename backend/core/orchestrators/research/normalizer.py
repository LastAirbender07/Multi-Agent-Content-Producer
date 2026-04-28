import hashlib
from datetime import datetime, timezone
from core.orchestration.contracts import Evidence
from core.schemas.workflow_state import ResearchGraphState
from infra.logging import get_logger

logger = get_logger(__name__)

def _make_evidence_id(url: str, title: str) -> str:
    unique_string = f"{url}|{title}".encode("utf-8")
    return hashlib.md5(unique_string).hexdigest()

async def normalize_evidence_node(state: ResearchGraphState) -> dict:
    raw_outputs = state.get("raw_tool_outputs", {})
    evidence: list[Evidence] = []
    seen_urls: set[str] = set()
    now = datetime.now(timezone.utc)

    # DDGS Search text results
    ddgs_text = raw_outputs.get("ddgs_text", [])
    if ddgs_text and getattr(ddgs_text, "success", False):
        for item in ddgs_text.results:
            if item.url in seen_urls:
                continue
            seen_urls.add(item.url)
            evidence.append(Evidence(
                id=_make_evidence_id(item.url, item.title),
                url=item.url,
                title=item.title,
                snippet=item.body,
                source="ddgs",
                retrieval_time=now,
                credibility_score=0.4,
                relevance_score=0.6,
            ))

    # DDGS Search news results
    ddgs_news = raw_outputs.get("ddgs_news", [])
    if ddgs_news and getattr(ddgs_news, "success", False):
        for item in ddgs_news.results:
            if item.url in seen_urls:
                continue
            seen_urls.add(item.url)
            evidence.append(Evidence(
                id=_make_evidence_id(item.url, item.title),
                url=item.url,
                title=item.title,
                snippet=item.body,
                source="ddgs_news",
                retrieval_time=now,
                credibility_score=0.6,
                relevance_score=0.75,
            ))

    # News API results
    news_api_results = raw_outputs.get("news_api", [])
    if news_api_results and getattr(news_api_results, "success", False):
        for item in news_api_results:
            if item.url in seen_urls:
                continue
            seen_urls.add(item.url)
            evidence.append(Evidence(
                id=_make_evidence_id(item.url, item.title),
                url=item.url,
                title=item.title,
                snippet=item.description,
                source="news_api",
                retrieval_time=now,
                credibility_score=0.8,
                relevance_score=0.85,
            ))

    # Crawl4AI results
    crawl4ai_results = raw_outputs.get("crawl4ai", [])
    for item in crawl4ai_results:
        if not getattr(item, "success", False) or not item.content:
            continue
        if item.content.url in seen_urls:
            continue
        seen_urls.add(item.content.url)
        evidence.append(Evidence(
            id=_make_evidence_id(item.content.url, item.content.title),
            url=item.content.url,
            title=item.content.title,
            snippet=item.content.markdown[:500] if item.content.markdown else None,
            source="crawl4ai",
            retrieval_time=now,
            credibility_score=0.7,
            relevance_score=0.8,
        ))

    evidence = sorted(evidence, key=lambda x: x.relevance_score, reverse=True)
    logger.info("Normalize_complted", run_id=state.run_id, evidence_count=len(evidence))

    return {
        "evidence": evidence,
        "messages": state.get("messages", []) + [f"Evidence normalization completed with {len(evidence)} items."]
    }