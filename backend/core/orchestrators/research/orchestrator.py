import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any
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
from infra.output_manager import RunOutputManager

logger = get_logger(__name__)
_settings = get_settings()
_OUTPUTS_ROOT_DIR = Path(__file__).parents[3] / _settings.research_output_dirs

async def save_research_output(state: ResearchGraphState, status: str) -> str:
    """Save research output to: backend/outputs/<run_id>/research/"""
    run_id = state.get("run_id")
    request = state.get("request")
    manager = RunOutputManager(run_id=run_id, outputs_root=_OUTPUTS_ROOT_DIR)

    response_data = {
        "run_id": run_id,
        "status": status,
        "topic": request.topic,
        "mode": request.mode,
        "route_plan": state.get("route_plan").model_dump() if state.get("route_plan") else {},
        "evidence_count": len(state.get("evidence", [])),
        "degraded_flags": state.get("degraded_flags", []),
        "errors": state.get("errors", []),
        "messages": state.get("messages", []),
    }
    if state.get("synthesis"): response_data["synthesis"] = state.get("synthesis").model_dump()
    if state.get("evaluation"): response_data["evaluation"] = state.get("evaluation").model_dump()

    manager.save_json("research", "research_result.json", response_data)
    manager.save_json("research", "evidence.json", [e.model_dump() for e in state.get("evidence", [])])

    synthesis = state.get("synthesis").model_dump() if state.get("synthesis") else {}
    if synthesis:
        md_lines = [
            f"# Research Synthesis: {request.topic.title()}",
            f"**Run ID:** {run_id}",
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
            md_lines += ["", "## Contradictions"] + [f"- {c}" for c in synthesis["contradictions"]]
        if synthesis["implications"]:
            md_lines += ["", "## Implications"] + [f"- {i}" for i in synthesis["implications"]]
        if synthesis["gaps"]:
            md_lines += ["", "## Gaps"] + [f"- {g}" for g in synthesis["gaps"]]

        all_evidence = state.get("evidence") or []
        md_lines += ["", "## Sources", f"Total sources: {len(all_evidence)}"]
        for e in all_evidence:
            label = e.source_name or e.source_type
            md_lines.append(f"- [{e.title}]({e.url}) — {label}")

        manager.save_markdown("research", "synthesis.md", "\n".join(md_lines))

    output_dir = str(manager.stage_dir("research"))
    logger.info("research_output_saved", path=output_dir, status=status)
    return output_dir

@lru_cache(maxsize=1)
def _get_compiled_graph():
    return build_research_graph().compile()


class ResearchOrchestrator:
    def __init__(self):
        pass

    async def run(self, request: Any, run_id: str | None = None) -> ResearchResponse:
        parsed_request = ResearchRequest.model_validate(request)
        run_id = run_id or str(uuid.uuid4())

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
            graph = _get_compiled_graph()
            final_state = await graph.ainvoke(initial_state)
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
