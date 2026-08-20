import json
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any

from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from configs.settings import get_settings
from core.graphs.angle_graph import build_angle_graph
from core.orchestration.contracts import Angle, AngleRequest, AngleResponse, RunStatus
from core.orchestrators.angle.finalizer import finalize_angles_node
from core.schemas.workflow_state import AngleGraphState
from infra.logging import get_logger

logger = get_logger(__name__)

_settings = get_settings()
_checkpointer = MemorySaver()

# Directory for sidecar JSON files that survive server restarts.
# These are written when the graph pauses for human approval and deleted
# after a successful resume.
_PENDING_DIR = Path(__file__).parents[3] / "outputs" / "angle_pending"


# ---------------------------------------------------------------------------
# Disk-based pending-state helpers
# ---------------------------------------------------------------------------

def _save_pending_state(run_id: str, result: dict, angles: list[Angle]) -> None:
    """Persist paused graph state to disk so resume() survives a server restart."""
    try:
        _PENDING_DIR.mkdir(parents=True, exist_ok=True)
        payload = {
            "run_id": run_id,
            "request": result.get("request", {}),
            "angles": [a.model_dump() for a in angles],
            "evaluation": result.get("evaluation"),
            "errors": result.get("errors", []),
        }
        (_PENDING_DIR / f"{run_id}.json").write_text(json.dumps(payload, indent=2))
        logger.debug("angle_pending_state_saved", run_id=run_id)
    except Exception as e:
        # Non-fatal — if we can't write the sidecar, the fast path still works.
        logger.warning("angle_pending_state_save_failed", run_id=run_id, error=str(e))


def _load_pending_state(run_id: str) -> dict | None:
    """Load a previously saved pending state, or None if it doesn't exist."""
    p = _PENDING_DIR / f"{run_id}.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text())
    except Exception as e:
        logger.warning("angle_pending_state_load_failed", run_id=run_id, error=str(e))
        return None


def _clear_pending_state(run_id: str) -> None:
    """Delete the sidecar file after a successful resume (cleanup)."""
    try:
        (_PENDING_DIR / f"{run_id}.json").unlink(missing_ok=True)
    except Exception:
        pass  # best-effort cleanup


# ---------------------------------------------------------------------------
# LangGraph compiled graph (cached per process)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _get_compiled_graph():
    return build_angle_graph().compile(checkpointer=_checkpointer)


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

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
            # Manual mode — paused waiting for human selection.
            # Save state to disk so resume() works even after a server restart.
            angles = [Angle.model_validate(a) for a in result.get("angles", [])]
            _save_pending_state(run_id, result, angles)
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

        Fast path: uses the in-memory LangGraph checkpoint (works when the server
                   has not been restarted since the initial run).
        Fallback path: if the checkpoint was lost (e.g. server hot-reload), loads
                       the sidecar JSON written by run() and calls finalize_angles_node
                       directly with the reconstructed state.
        """
        logger.info("angle_orchestrator_resuming", run_id=run_id, selected_indices=selected_indices)

        # ------------------------------------------------------------------
        # Fast path — LangGraph checkpoint still in memory
        # ------------------------------------------------------------------
        checkpoint_lost = False
        try:
            graph = _get_compiled_graph()
            config = {"configurable": {"thread_id": run_id}}
            result = await graph.ainvoke(Command(resume=selected_indices), config=config)
            _clear_pending_state(run_id)
            return self._build_response(run_id, result)
        except KeyError:
            # Checkpoint was lost (server restarted) — fall through to disk fallback.
            logger.warning("angle_orchestrator_checkpoint_lost", run_id=run_id)
            checkpoint_lost = True
        except Exception as e:
            logger.error("angle_orchestrator_resume_error", run_id=run_id, error=str(e))
            return AngleResponse(
                run_id=run_id,
                status=RunStatus.FAILED,
                errors=[str(e)],
            )

        if not checkpoint_lost:
            # Should be unreachable, but be safe.
            return AngleResponse(run_id=run_id, status=RunStatus.FAILED, errors=["Unexpected resume state."])

        # ------------------------------------------------------------------
        # Fallback path — restore from disk sidecar
        # ------------------------------------------------------------------
        logger.info("angle_orchestrator_resuming_from_disk", run_id=run_id)
        saved = _load_pending_state(run_id)
        if saved is None:
            logger.error("angle_orchestrator_pending_state_not_found", run_id=run_id)
            return AngleResponse(
                run_id=run_id,
                status=RunStatus.FAILED,
                errors=[
                    "Angle session not found. The server was restarted and the session "
                    "could not be recovered. Please re-run angle generation."
                ],
            )

        angles_raw: list[dict] = saved["angles"]
        selected_raw = [angles_raw[i] for i in selected_indices if i < len(angles_raw)]

        if not selected_raw:
            return AngleResponse(
                run_id=run_id,
                status=RunStatus.FAILED,
                errors=["No valid angles matched the provided indices."],
            )

        fallback_state: AngleGraphState = {
            "request": saved["request"],
            "run_id": run_id,
            "angles": angles_raw,
            "selected_angles": selected_raw,
            "selection_reasoning": "Manual selection (recovered after server restart)",
            "evaluation": saved.get("evaluation"),
            "errors": [],
            "messages": [],
        }

        try:
            finalize_result = await finalize_angles_node(fallback_state)
        except Exception as e:
            logger.error("angle_orchestrator_fallback_finalize_error", run_id=run_id, error=str(e))
            return AngleResponse(
                run_id=run_id,
                status=RunStatus.FAILED,
                errors=[str(e)],
            )

        _clear_pending_state(run_id)
        return self._build_response(run_id, {**fallback_state, **finalize_result})

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