import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from langgraph.checkpoint.memory import MemorySaver
from configs.settings import get_settings
from core.graphs.research_graph import build_research_graph
from core.orchestration.contracts import (
    ResearchRequest,
    ResearchResponse,
    RoutePlan,
    RunStatus,
)
from core.schemas.workflow_state import ResearchGraphState
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_OUTPUTS_ROOT_DIR = Path(__file__).parents[3] / _settings.research_output_dirs

def _topic_slug(topic: str) -> str:
    """Convert topic to a file-system safe slug, max 40 chars"""
    topic = topic.lower()
    slug = re.sub(r"[^a-z0-9\s]", "", topic)
    slug = re.sub(r"\s+", "_", slug.strip())
    return slug[:40]

async def save_research_output(state: ResearchGraphState, status: str) -> str:
    """
    Save research output to: backend/outputs/<topic_slug>_<timestamp>/research/
    """
    request = state.get("request")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    folder_name = f"{_topic_slug(request.topic)}_{timestamp}"
    output_dir = _OUTPUTS_ROOT_DIR / folder_name / "research"
    output_dir.mkdir(parents=True, exist_ok=True)

    response_data = {
        "run_id": state.get("run_id"),
        "status": status,
        "topic": request.topic,
        "mode": request.mode,
        "route_plan": state.get("route_plan").model_dump() if state.get("route_plan") else {},
        "evidence_count": len(state.get("evidence", [])),
        "degraded_flags": state.get("degraded_flags", []),
        "errors": state.get("errors", []),
        "messages": state.get("messages", []),
        "output_path": str(output_dir),
    }

    if state.get("synthesis"): response_data["synthesis"] = state.get("synthesis").model_dump()
    if state.get("evaluation"): response_data["evaluation"] = state.get("evaluation").model_dump()

    (output_dir / "research_result.json").write_text(json.dumps(response_data, indent=2, default=str), encoding="utf-8")

    evidence_list = [e.model_dump() for e in state.get("evidence", [])]
    (output_dir / "evidence.json").write_text(json.dumps(evidence_list, indent=2, default=str), encoding="utf-8")

    synthesis = state.get("synthesis").model_dump() if state.get("synthesis") else {}
    if synthesis:
        md_lines = [
            f"# Research Synthesis: {request.topic}",
            f"**Run ID:** {state.get('run_id')}",
            f"**Status:** {status}",
            f"**Confidence:** {synthesis['confidence_score']:.2f}",
            "",
            "## Summary",
            synthesis["summary"],
            "",
            "## Key Points",
        ]

        for point in synthesis["key_points"]:
            md_lines.append(f"- {point}")

        if synthesis["contradictions"]:
            md_lines.append("")
            md_lines.append("## Contradictions")
            for contradiction in synthesis["contradictions"]:
                md_lines.append(f"- {contradiction}")

        if synthesis["implications"]:
            md_lines.append("")
            md_lines.append("## Implications")
            for implication in synthesis["implications"]:
                md_lines.append(f"- {implication}")

        if synthesis["gaps"]:
            md_lines.append("")
            md_lines.append("## Gaps")
            for gap in synthesis["gaps"]:
                md_lines.append(f"- {gap}")

        md_lines += [
            "",
            "## Sources",
            f"Total evidence items: {len(state.get('evidence', []))}",
        ]

        for evidence in (state.get("evidence") or [])[:10]:
            md_lines.append(f"- [{evidence.title}]({evidence.url}) ({evidence.source_type})")

        (output_dir / "synthesis.md").write_text("\n".join(md_lines), encoding="utf-8")
    
    logger.info("research_output_saved", path=str(output_dir), status=status)
    return str(output_dir)

class ResearchOrchestrator:
    def __init__(self):
        self._graph = None

    def _get_compiled_graph(self):
        if self._graph is None:
            self._graph = build_research_graph().compile(checkpointer=MemorySaver())
        return self._graph
    
    async def run(self, request: Any) -> ResearchResponse:
        parsed_request = ResearchRequest.model_validate(request)
        run_id = str(uuid.uuid4())

        logger.info(
            "research_orchestrator_started", 
            run_id=run_id, 
            topic=parsed_request.topic,
            mode=parsed_request.mode,
        )

        initial_state: ResearchGraphState = {
            "request": parsed_request,
            "run_id": run_id,
            "loop_count": 0,
            "raw_tool_outputs": {},
            "tool_traces": [],
            "skipped_tools": [],
            "evidence": [],
            "degraded_flags": [],
            "errors": [],
            "messages": [],
        }

        try:
            graph = self._get_compiled_graph()
            # Langgraph requires a config with thread_id for MemorySaver checkpointing, even if we don't use threads here
            config = {"configurable": {"thread_id": run_id}}
            final_state = await graph.ainvoke(initial_state, config=config)
        except Exception as e:
            logger.error("research_orchestrator_error", run_id=run_id, error=str(e))
            final_state = initial_state.copy()
            final_state["errors"].append(str(e))
            output_path = await save_research_output(final_state, status="failed")
            return ResearchResponse(
                run_id=run_id,
                status=RunStatus.FAILED,
                topic=parsed_request.topic,
                route_plan=final_state.get("route_plan", RoutePlan()),
                evidence=final_state.get("evidence", []),
                synthesis=final_state.get("synthesis"),
                evaluation=final_state.get("evaluation"),
                tool_traces=final_state.get("tool_traces", []),
                skipped_tools=final_state.get("skipped_tools", []),
                degraded_flags=final_state.get("degraded_flags", []),
                errors=final_state.get("errors", []),
                output_path=output_path,
            )
        
        # Determine status
        evaluation = final_state.get("evaluation")
        if final_state.get("errors"): status = RunStatus.FAILED
        elif evaluation and evaluation.passed: status = RunStatus.SUCCESS
        else: status = RunStatus.PARTIAL_SUCCESS

        return ResearchResponse(
            run_id=run_id,
            status=status,
            topic=parsed_request.topic,
            route_plan=final_state.get("route_plan", RoutePlan()),
            evidence=final_state.get("evidence", []),
            synthesis=final_state.get("synthesis"),
            evaluation=final_state.get("evaluation"),
            tool_traces=final_state.get("tool_traces", []),
            skipped_tools=final_state.get("skipped_tools", []),
            degraded_flags=final_state.get("degraded_flags", []),
            errors=final_state.get("errors", []),
            output_path=final_state.get("output_path", ""),
        )
