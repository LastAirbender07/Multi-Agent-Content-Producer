from datetime import datetime, timezone
from pathlib import Path
import json
import re
import uuid

from core.orchestration.contracts import (
    Evidence,
    EvaluationResult,
    ResearchResponse,
    ResearchSynthesis,
    RoutePlan,
    RunStatus,
)
from core.prompts.prompt_loader import load_prompt
from infra.llm.factory import LLMFactory
from infra.logging import get_logger
from infra.output_manager import RunOutputManager
from configs.settings import get_settings

_settings = get_settings()
_OUTPUTS_ROOT_DIR = Path(__file__).parents[3] / _settings.research_output_dirs
logger = get_logger(__name__)


def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text.rstrip())
    return text.strip()


def _evidence_from_dict(d: dict, now: datetime, index: int, topic_slug: str) -> Evidence:
    url = d.get("url") or f"llm://knowledge/{topic_slug}/{index}"
    evidence_text = d.get("evidence", "")
    return Evidence(
        evidence=evidence_text,
        source_type="llm_knowledge",
        title=d.get("title", f"LLM Knowledge Point {index}"),
        url=url,
        snippet=d.get("snippet") or evidence_text[:200],
        retrieval_time=now,
        credibility_score=float(d.get("credibility_score", 0.8)),
        relevance_score=float(d.get("relevance_score", 0.9)),
    )


def _build_response(
    run_id: str, topic: str, payload: dict, output_path: str, topic_slug: str
) -> ResearchResponse:
    now = datetime.now(timezone.utc)
    synthesis = ResearchSynthesis(**payload["synthesis"])
    evidence = [
        _evidence_from_dict(e, now, i + 1, topic_slug)
        for i, e in enumerate(payload.get("evidence", []))
    ]
    conf = synthesis.confidence_score
    return ResearchResponse(
        run_id=run_id,
        status=RunStatus.SUCCESS,
        topic=topic,
        route_plan=RoutePlan(
            selected_tools=["llm_knowledge"],
            rationale=["LLM-only research mode — no web search tools used."],
            selection_mode_used="manual",
        ),
        evidence=evidence,
        synthesis=synthesis,
        evaluation=EvaluationResult(
            passed=True,
            should_refine=False,
            reason="LLM-generated research — user-directed and refined.",
            source_count=len(evidence),
            coverage_score=conf,
            source_diversity_score=1.0,
            llm_content_score=conf,
            source_score=conf,
            combined_confidence=conf,
        ),
        output_path=output_path,
        errors=[],
    )


async def _save(run_id: str, response: ResearchResponse) -> str:
    manager = RunOutputManager(run_id=run_id, outputs_root=_OUTPUTS_ROOT_DIR)
    response_data = response.model_dump(mode="json")
    manager.save_json("research", "research_result.json", response_data)
    manager.save_json(
        "research",
        "evidence.json",
        [e.model_dump(mode="json") for e in response.evidence],
    )
    logger.info("llm_draft_saved", run_id=run_id, evidence_count=len(response.evidence))
    return str(_OUTPUTS_ROOT_DIR / run_id / "research")


async def draft_research(
    topic: str,
    context: str | None = None,
    run_id: str | None = None,
) -> ResearchResponse:
    run_id = run_id or str(uuid.uuid4())
    topic_slug = re.sub(r"[^a-z0-9]+", "_", topic.lower())[:40].strip("_")
    context_block = f"\nAdditional context from user:\n{context}\n" if context else ""

    prompt = load_prompt(
        "llm_research_draft",
        topic=topic,
        context_block=context_block,
        topic_slug=topic_slug,
    )
    llm = await LLMFactory.get_client()
    raw = await llm.generate(prompt=prompt)
    payload = json.loads(_strip_fences(raw.content))

    response = _build_response(run_id, topic, payload, "", topic_slug)
    output_path = await _save(run_id, response)
    response.output_path = output_path
    logger.info("llm_draft_completed", run_id=run_id, topic=topic)
    return response


async def refine_research(
    topic: str,
    current: ResearchResponse,
    feedback: str,
) -> ResearchResponse:
    run_id = current.run_id
    topic_slug = re.sub(r"[^a-z0-9]+", "_", topic.lower())[:40].strip("_")

    synthesis_json = json.dumps(
        current.synthesis.model_dump() if current.synthesis else {},
        ensure_ascii=False,
        indent=2,
    )
    evidence_summary = "\n".join(
        f"- {e.title}: {(e.snippet or e.evidence[:150])}"
        for e in current.evidence[:12]
    )

    prompt = load_prompt(
        "llm_research_refine",
        topic=topic,
        feedback=feedback,
        synthesis_json=synthesis_json,
        evidence_summary=evidence_summary,
        topic_slug=topic_slug,
    )
    llm = await LLMFactory.get_client()
    raw = await llm.generate(prompt=prompt)
    payload = json.loads(_strip_fences(raw.content))

    response = _build_response(run_id, topic, payload, "", topic_slug)
    output_path = await _save(run_id, response)
    response.output_path = output_path
    logger.info("llm_refine_completed", run_id=run_id, topic=topic)
    return response
