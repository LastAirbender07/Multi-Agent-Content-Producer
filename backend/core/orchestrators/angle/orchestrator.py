import uuid
from functools import lru_cache
from typing import Any

from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from configs.settings import get_settings
from core.graphs.angle_graph import build_angle_graph
from core.orchestration.contracts import Angle, AngleRequest, AngleResponse, RunStatus
from core.schemas.workflow_state import AngleGraphState
from infra.logging import get_logger

logger = get_logger(__name__)

_settings = get_settings()
_checkpointer = MemorySaver()


@lru_cache(maxsize=1)
def _get_compiled_graph():
    return build_angle_graph().compile(checkpointer=_checkpointer)


class AngleOrchestrator:
    def __init__(self):
        pass

    async def run(self, request: Any) -> AngleResponse:
        """
        Start angle generation.

        Auto mode: runs to completion and returns selected_angles.
        Manual mode: pauses after generation and returns status=PENDING with angles.
                     Caller must then call resume(run_id, selected_indices) to complete.
        """
        parsed_request = AngleRequest.model_validate(request)
        run_id = parsed_request.run_id or str(uuid.uuid4())
        parsed_request = parsed_request.model_copy(update={"run_id": run_id})

        logger.info(
            "angle_orchestrator_started",
            run_id=run_id,
            topic=parsed_request.topic,
            mode=parsed_request.mode,
        )

        initial_state: AngleGraphState = {
            "request": parsed_request.model_dump(),
            "run_id": run_id,
            "angles": [],
            "selected_angles": [],
            "errors": [],
            "messages": [],
        }

        try:
            graph = _get_compiled_graph()
            config = {"configurable": {"thread_id": run_id}}
            result = await graph.ainvoke(initial_state, config=config)
        except Exception as e:
            logger.error("angle_orchestrator_error", run_id=run_id, error=str(e))
            return AngleResponse(
                run_id=run_id,
                status=RunStatus.FAILED,
                errors=[str(e)],
            )

        if "__interrupt__" in result:
            # Manual mode — paused waiting for human selection
            angles = [Angle.model_validate(a) for a in result.get("angles", [])]
            logger.info("angle_orchestrator_waiting_for_selection", run_id=run_id, angles_count=len(angles))
            return AngleResponse(
                run_id=run_id,
                status=RunStatus.PENDING,
                angles=angles,
                errors=result.get("errors", []),
            )

        return self._build_response(run_id, result)

    async def resume(self, run_id: str, selected_indices: list[int]) -> AngleResponse:
        """
        Resume a paused manual-mode run with the human's angle selection.
        """
        logger.info("angle_orchestrator_resuming", run_id=run_id, selected_indices=selected_indices)

        try:
            graph = _get_compiled_graph()
            config = {"configurable": {"thread_id": run_id}}
            result = await graph.ainvoke(Command(resume=selected_indices), config=config)
        except Exception as e:
            logger.error("angle_orchestrator_resume_error", run_id=run_id, error=str(e))
            return AngleResponse(
                run_id=run_id,
                status=RunStatus.FAILED,
                errors=[str(e)],
            )

        return self._build_response(run_id, result)

    def _build_response(self, run_id: str, state: dict) -> AngleResponse:
        angles = [Angle.model_validate(a) for a in state.get("angles", [])]
        selected_angles = [Angle.model_validate(a) for a in state.get("selected_angles", [])]
        errors = state.get("errors", [])

        if errors:
            status = RunStatus.FAILED
        elif not selected_angles:
            status = RunStatus.PARTIAL_SUCCESS
        else:
            status = RunStatus.SUCCESS

        evaluation = state.get("evaluation")

        from core.orchestration.contracts import AngleEvaluation
        return AngleResponse(
            run_id=run_id,
            status=status,
            angles=angles,
            selected_angles=selected_angles,
            selection_reasoning=state.get("selection_reasoning", ""),
            evaluation=AngleEvaluation.model_validate(evaluation) if evaluation else None,
            errors=errors,
            output_path=state.get("output_path", ""),
        )
