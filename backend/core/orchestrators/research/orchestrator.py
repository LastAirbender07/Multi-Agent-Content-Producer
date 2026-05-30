import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any
from configs.settings import get_settings
from core.graphs.research_graph import build_research_graph
from core.orchestration.contracts import (
    ResearchRequest,
    ResearchResponse,
    ResearchSynthesis,
    RoutePlan,
    RunStatus,
)
from core.schemas.workflow_state import ResearchGraphState
from infra.logging import get_logger
from infra.output_manager import RunOutputManager

logger = get_logger(__name__)
_settings = get_settings()
_OUTPUTS_ROOT_DIR = Path(__file__).parents[3] / _settings.research_output_dirs


def _pick_best_iteration(
    current_synthesis,
    current_evaluation,
    iteration_history: list[dict],
) -> tuple[dict | None, dict | None, int]:
    """Return (synthesis_dump, evaluation_dump, iteration_number) for highest combined_confidence."""
    candidates: list[tuple[float, int, dict | None, dict | None]] = []
    for entry in iteration_history:
        conf = (entry.get("evaluation") or {}).get("combined_confidence", 0.0)
        candidates.append((conf, entry["iteration"], entry.get("synthesis"), entry.get("evaluation")))

    current_iter_num = (iteration_history[-1]["iteration"] + 1) if iteration_history else 1
    current_conf = current_evaluation.combined_confidence if current_evaluation else 0.0
    candidates.append((
        current_conf,
        current_iter_num,
        current_synthesis.model_dump() if current_synthesis else None,
        current_evaluation.model_dump() if current_evaluation else None,
    ))

    best = max(candidates, key=lambda x: x[0])
    return best[2], best[3], best[1]


def _build_response_data(
    state: ResearchGraphState,
    status: str,
    iteration_history: list[dict],
) -> dict:
    request = state.get("request")
    current_synth = state.get("synthesis")
    current_eval = state.get("evaluation")

    best_synth_dump, best_eval_dump, best_iter = _pick_best_iteration(
        current_synth, current_eval, iteration_history
    )
    total_iterations = len(iteration_history) + (0 if status == "running" else 1)

    return {
        "run_id": state.get("run_id"),
        "status": status,
        "topic": request.topic if request else "",
        "mode": request.mode if request else "",
        "total_iterations": total_iterations,
        "best_iteration": best_iter,
        "synthesis": best_synth_dump,
        "evaluation": best_eval_dump,
        "evidence_count": len(state.get("evidence", [])),
        "iterations": iteration_history,
        "route_plan": state.get("route_plan").model_dump() if state.get("route_plan") else {},
        "degraded_flags": state.get("degraded_flags", []),
        "errors": state.get("errors", []),
        "messages": state.get("messages", []),
    }


def _write_synthesis_md(
    manager: RunOutputManager,
    request,
    run_id: str,
    status: str,
    best_synth_dump: dict | None,
    state: ResearchGraphState,
) -> None:
    if not best_synth_dump:
        return
    synthesis = best_synth_dump
    md_lines = [
        f"# Research Synthesis: {request.topic.title()}",
        f"**Run ID:** {run_id}",
        f"**Status:** {status}",
        f"**Confidence:** {synthesis.get('confidence_score', 0.0):.2f}",
        "",
        "## Summary",
        synthesis.get("summary", ""),
        "",
        "## Key Points",
    ]
    for point in synthesis.get("key_points", []):
        md_lines.append(f"- {point}")
    if synthesis.get("contradictions"):
        md_lines += ["", "## Contradictions"] + [f"- {c}" for c in synthesis["contradictions"]]
    if synthesis.get("implications"):
        md_lines += ["", "## Implications"] + [f"- {i}" for i in synthesis["implications"]]
    if synthesis.get("gaps"):
        md_lines += ["", "## Gaps"] + [f"- {g}" for g in synthesis["gaps"]]

    all_evidence = state.get("evidence") or []
    md_lines += ["", "## Sources", f"Total sources: {len(all_evidence)}"]
    for e in all_evidence:
        label = e.source_name or e.source_type
        md_lines.append(f"- [{e.title}]({e.url}) — {label}")

    manager.save_markdown("research", "synthesis.md", "\n".join(md_lines))


async def save_iteration_snapshot(
    state: ResearchGraphState,
    iteration_history: list[dict],
) -> None:
    """Write evidence.json + research_result.json after each refinement iteration (no synthesis.md)."""
    run_id = state.get("run_id")
    manager = RunOutputManager(run_id=run_id, outputs_root=_OUTPUTS_ROOT_DIR)

    response_data = _build_response_data(state, status="running", iteration_history=iteration_history)
    manager.save_json("research", "research_result.json", response_data)
    manager.save_json("research", "evidence.json", [e.model_dump() for e in state.get("evidence", [])])

    logger.info(
        "iteration_snapshot_saved",
        run_id=run_id,
        iteration=len(iteration_history),
        evidence_count=len(state.get("evidence", [])),
    )


async def save_research_output(
    state: ResearchGraphState,
    status: str,
    iteration_history: list[dict] | None = None,
) -> str:
    """Save final research output to: backend/outputs/<run_id>/research/"""
    run_id = state.get("run_id")
    request = state.get("request")
    iteration_history = iteration_history or []
    manager = RunOutputManager(run_id=run_id, outputs_root=_OUTPUTS_ROOT_DIR)

    response_data = _build_response_data(state, status=status, iteration_history=iteration_history)
    manager.save_json("research", "research_result.json", response_data)
    manager.save_json("research", "evidence.json", [e.model_dump() for e in state.get("evidence", [])])

    # synthesis.md written only at final save (not during iteration snapshots)
    best_synth_dump = response_data.get("synthesis")
    if best_synth_dump:
        _write_synthesis_md(manager, request, run_id, status, best_synth_dump, state)

    output_dir = str(manager.stage_dir("research"))
    logger.info(
        "research_output_saved",
        path=output_dir,
        status=status,
        total_iterations=response_data["total_iterations"],
        best_iteration=response_data["best_iteration"],
    )
    return output_dir


@lru_cache(maxsize=1)
def _get_compiled_graph():
    return build_research_graph().compile()


class ResearchOrchestrator:
    def __init__(self):
        pass

    async def run(self, request: Any, run_id: str | None = None) -> ResearchResponse:
        parsed_request = ResearchRequest.model_validate(request)
        run_id = run_id or parsed_request.run_id or str(uuid.uuid4())

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
            "iteration_history": [],
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

        # Pick best synthesis across all iterations
        iteration_history = final_state.get("iteration_history", [])
        best_synth_dump, _best_eval_dump, _best_iter = _pick_best_iteration(
            final_state.get("synthesis"),
            final_state.get("evaluation"),
            iteration_history,
        )
        best_synthesis = (
            ResearchSynthesis.model_validate(best_synth_dump)
            if best_synth_dump else final_state.get("synthesis")
        )

        evaluation = final_state.get("evaluation")
        if final_state.get("errors"):
            status = RunStatus.FAILED
        elif evaluation and evaluation.passed:
            status = RunStatus.SUCCESS
        else:
            status = RunStatus.PARTIAL_SUCCESS

        return ResearchResponse(
            run_id=run_id,
            status=status,
            topic=parsed_request.topic,
            route_plan=final_state.get("route_plan", RoutePlan()),
            evidence=final_state.get("evidence", []),
            synthesis=best_synthesis,
            evaluation=evaluation,
            tool_traces=final_state.get("tool_traces", []),
            skipped_tools=final_state.get("skipped_tools", []),
            degraded_flags=final_state.get("degraded_flags", []),
            errors=final_state.get("errors", []),
            output_path=final_state.get("output_path", ""),
        )
