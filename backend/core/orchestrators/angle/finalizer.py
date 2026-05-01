from pathlib import Path
from configs.settings import get_settings
from core.orchestration.contracts import Angle, AngleEvaluation, AngleRequest
from core.schemas.workflow_state import AngleGraphState
from infra.logging import get_logger
from infra.output_manager import RunOutputManager

logger = get_logger(__name__)

_settings = get_settings()
_OUTPUTS_ROOT_DIR = Path(__file__).parents[3] / _settings.research_output_dirs


async def finalize_angles_node(state: AngleGraphState) -> dict:
    run_id = state.get("run_id")
    request = AngleRequest.model_validate(state["request"])
    angles = [Angle.model_validate(a) for a in state.get("angles", [])]
    selected_angles = [Angle.model_validate(a) for a in state.get("selected_angles", [])]
    selected_set = {a.statement for a in selected_angles}

    manager = RunOutputManager(run_id=run_id, outputs_root=_OUTPUTS_ROOT_DIR)

    manager.save_json("angles", "input.json", {
        "topic": request.topic,
        "synthesis_summary": request.synthesis.summary,
        "synthesis_key_points": request.synthesis.key_points,
    })

    evaluation = AngleEvaluation.model_validate(state["evaluation"]) if state.get("evaluation") else None
    manager.save_json("angles", "generated.json", {
        "run_id": run_id,
        "topic": request.topic,
        "angles": [a.model_dump() for a in angles],
        "evaluation": evaluation.model_dump() if evaluation else {},
    })

    manager.save_json("angles", "selection.json", {
        "run_id": run_id,
        "mode": request.mode,
        "selected_count": len(selected_angles),
        "selected_angles": [a.model_dump() for a in selected_angles],
        "selection_reasoning": state.get("selection_reasoning", ""),
    })

    md_lines = [
        f"# Angle Selection: {request.topic.title()}",
        f"**Run ID:** {run_id}",
        f"**Mode:** {request.mode}",
        "",
        "## Generated Angles",
    ]
    for i, angle in enumerate(angles):
        marker = " ✓ SELECTED" if angle.statement in selected_set else ""
        md_lines += [
            f"### Angle {i + 1}{marker}",
            f"**Statement:** {angle.statement}",
            f"**Hook:** {angle.emotional_hook}",
            f"**Evidence:** {angle.supporting_evidence}",
            "",
        ]

    if state.get("selection_reasoning"):
        md_lines += ["## Selection Reasoning", state["selection_reasoning"], ""]

    manager.save_markdown("angles", "angles.md", "\n".join(md_lines))

    output_path = str(manager.stage_dir("angles"))
    logger.info("finalize_angles_node_complete", run_id=run_id, output_path=output_path)
    return {
        "output_path": output_path,
        "messages": state.get("messages", []) + [f"Angles saved to {output_path}"],
    }


async def finalize_angles_partial_node(state: AngleGraphState) -> dict:
    """Called when evaluation fails — saves what was generated without a selection."""
    run_id = state.get("run_id")
    request = AngleRequest.model_validate(state["request"])
    angles = state.get("angles", [])

    manager = RunOutputManager(run_id=run_id, outputs_root=_OUTPUTS_ROOT_DIR)
    evaluation = state.get("evaluation") or {}

    manager.save_json("angles", "generated.json", {
        "run_id": run_id,
        "status": "partial",
        "topic": request.topic,
        "angles": angles,
        "evaluation": evaluation,
        "errors": state.get("errors", []),
    })

    output_path = str(manager.stage_dir("angles"))
    logger.info("finalize_angles_partial_node_complete", run_id=run_id, output_path=output_path)
    return {
        "output_path": output_path,
        "messages": state.get("messages", []) + [f"Partial angle output saved to {output_path}"],
    }
