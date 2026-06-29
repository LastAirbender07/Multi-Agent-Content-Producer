from datetime import datetime, timezone
from typing import Optional

from core.orchestration.contracts import Evidence, LLMKnowledgeClaim, LLMKnowledgeOutput
from core.orchestrators.content.content_evidence_bundle import (
    CLAIM_TYPE_CREDIBILITY,
    HIGH_CONFIDENCE_CLAIM_TYPES,
)
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.schemas.workflow_state import ResearchGraphState
from core.utils.text_utils import make_llm_url
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)


async def llm_knowledge_node(state: ResearchGraphState) -> dict:
    """
    Injects LLM background knowledge as structured evidence items.
    Only runs on the first iteration (loop_count == 0).

    Uses generate_structured() with Pydantic validation + automatic retry (3 attempts)
    so malformed or incomplete LLM responses are handled gracefully.

    Each claim is classified by type and assigned an appropriate credibility score:
    - HISTORICAL_FACT / PUBLISHED_WORK → 0.85 / 0.80 (trusted from training data)
    - DIRECT_QUOTE                      → 0.60 (quote text should be independently confirmed)
    - RECENT_STATISTIC                  → 0.30 (training data may be stale)
    - CAUSAL_INFERENCE                  → 0.25 (always needs independent verification)

    Claim type and time period are encoded in source_name: "llm:{TYPE}[:{PERIOD}]"
    so downstream (evaluator, content_evidence_bundle) can extract them without
    a separate DB lookup.
    """
    if state.get("loop_count", 0) > 0:
        return {}

    request = state["request"]
    topic   = request.topic
    run_id  = state.get("run_id")

    try:
        system_prompt = get_system_prompt("research")
        user_prompt   = load_prompt("llm_knowledge", topic=topic)

        result: LLMKnowledgeOutput = await LLMFactory.get_client_with_retry(
            lambda llm: llm.generate_structured(
                prompt=user_prompt,
                output_schema=LLMKnowledgeOutput,
                system_prompt=system_prompt,
                _token_meta=(run_id, "research"),
            )
        )

        claims: list[LLMKnowledgeClaim] = result.claims
        if not claims:
            logger.warning("llm_knowledge_no_claims", run_id=run_id)
            return {}

        now        = datetime.now(timezone.utc)
        topic_slug = topic.replace(" ", "_")
        new_items: list[Evidence] = []

        for i, claim_obj in enumerate(claims):
            claim_text  = claim_obj.claim.strip()
            claim_type  = claim_obj.type          # guaranteed valid Literal by Pydantic
            time_period = claim_obj.time_period

            if not claim_text:
                continue

            credibility       = CLAIM_TYPE_CREDIBILITY.get(claim_type, 0.50)
            is_high_confidence = claim_type in HIGH_CONFIDENCE_CLAIM_TYPES

            # Encode claim type + optional period in source_name so downstream
            # can extract it without a separate field on the Evidence model.
            source_name = f"llm:{claim_type}"
            if time_period:
                source_name = f"{source_name}:{time_period}"

            item = Evidence(
                evidence=claim_text,
                source_type="llm_knowledge",
                title=(
                    f"LLM Knowledge ({claim_type}): {claim_text[:60]}…"
                    if len(claim_text) > 60
                    else f"LLM Knowledge ({claim_type}): {claim_text}"
                ),
                url=make_llm_url(f"{topic_slug}_{i}"),
                snippet=claim_text[:400],
                retrieval_time=now,
                credibility_score=credibility,
                relevance_score=0.85 if is_high_confidence else 0.50,
                source_name=source_name,
            )
            new_items.append(item)

        # Sort: high-confidence items first so synthesizer sees them early
        high_conf = [it for it in new_items if it.credibility_score >= 0.75]
        low_conf  = [it for it in new_items if it.credibility_score < 0.75]
        sorted_items = high_conf + low_conf

        existing: list[Evidence] = list(state.get("evidence", []))
        combined = sorted_items + existing

        logger.info(
            "llm_knowledge_node_completed",
            run_id=run_id,
            total_claims=len(new_items),
            high_confidence=len(high_conf),
            low_confidence=len(low_conf),
        )
        return {
            "evidence": combined,
            "messages": state.get("messages", []) + [
                f"LLM background knowledge: {len(high_conf)} high-confidence "
                f"+ {len(low_conf)} low-confidence claims injected."
            ],
        }

    except Exception as e:
        logger.exception("llm_knowledge_node_error", run_id=run_id, error=str(e))
        return {
            "errors":   state.get("errors", [])   + [f"LLM knowledge node error: {str(e)}"],
            "messages": state.get("messages", []) + ["LLM knowledge node failed; continuing without it."],
        }
