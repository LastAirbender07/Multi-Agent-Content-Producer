from pathlib import Path

from configs.settings import get_settings
from core.orchestration.contracts import (
    ContentRequest, PostFormat, TemplateFamily, COMPACT_FORMATS,
)
from core.orchestrators.content.format_selector import select_format
from core.orchestrators.content.orchestrator import ContentOrchestrator
from core.schemas.workflow_state import ContentWorkflowState
from infra.logging import get_logger
from infra.output_manager import RunOutputManager

logger = get_logger(__name__)
_settings = get_settings()
_orchestrator = ContentOrchestrator()
_BACKEND_ROOT = Path(__file__).parents[2]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir


async def content_node(state: ContentWorkflowState) -> dict:
    topic          = state["topic"]
    run_id         = state.get("run_id")
    selected_angles = state.get("selected_angles", [])
    research_data  = state.get("research_data", {})
    angle_mode     = state.get("angle_mode", "manual")  # "auto" or "manual"

    logger.info("content_node_start", topic=topic, run_id=run_id,
                angles=len(selected_angles), angle_mode=angle_mode)

    if not selected_angles:
        return {
            "errors":   state.get("errors", [])   + ["content_node: no selected_angles in state"],
            "messages": state.get("messages", []) + ["Content skipped — no angles selected"],
        }

    # ── Phase 3.5: Format + Family selection ────────────────────────────────────
    # Priority 1: user explicitly selected a family → LLM cannot override.
    # Checks both the workflow state (set by the pipeline caller) and the
    # ContentRequest field (set by direct API calls).
    user_family = state.get("selected_family")

    if user_family:
        # User explicitly chose a family — skip format_selection_node entirely.
        # Pick a sensible default post_format so carousel routing tables have matching keys:
        #   compact-clean → FACTS (richest COMPACT_ROUTING coverage)
        #   aurora-lite   → OPINION (AURORA_LITE_ROUTING is format-agnostic)
        template_family = user_family
        if user_family == "compact-clean":
            post_format = PostFormat.facts
        else:
            post_format = PostFormat.opinion
        logger.info("content_node_user_family_override", run_id=run_id, family=user_family,
                    default_format=post_format.value)

    elif angle_mode == "auto":
        # LLM classifies — returns aurora-lite or compact-clean, NEVER aurora-extended
        fmt_output = await select_format(
            run_id=run_id,
            topic=topic,
            research_summary=research_data.get("summary", ""),
        )
        # Persist for GET /content/{run_id}/format-selection endpoint
        manager = RunOutputManager(run_id=run_id, outputs_root=_OUTPUTS_ROOT)
        manager.save_json("format_selection", "format_selection.json", fmt_output.model_dump())
        post_format     = fmt_output.recommended_format
        template_family = fmt_output.template_family.value

    else:
        # Manual mode, no family selected: aurora-lite (readable dark default)
        post_format     = PostFormat.opinion
        template_family = TemplateFamily.aurora_lite.value

    logger.info("content_node_format_selected", run_id=run_id,
                post_format=post_format.value, template_family=template_family,
                auto_mode=(angle_mode == "auto"))

    try:
        # post_format is put ON the request — orchestrator reads it from request.post_format.
        # ContentOrchestrator.run() signature is UNCHANGED (no extra params needed).
        request = ContentRequest(
            run_id=run_id,
            topic=topic,
            selected_angles=selected_angles,
            research_summary=research_data.get("summary", ""),
            key_points=research_data.get("key_points", []),
            max_slides=_settings.content_max_slides,
            min_slides=_settings.content_min_slides,
            image_source=state.get("image_source", "auto"),
            post_format=post_format,      # orchestrator reads this and injects into ContentGraphState
            selected_family=user_family,  # Phase 3.5: propagate user-pinned family so orchestrator
                                          # honours it (skips its own format derivation logic).
        )

        result = await _orchestrator.run(request)   # same call as before — no signature change

        logger.info("content_node_complete", run_id=run_id,
                    angles_processed=len(result.angles_processed), status=result.status)

        return {
            "post_format":    post_format.value,
            "template_family": template_family,
            "messages": state.get("messages", []) + [
                f"Content generated for {len(result.angles_processed)} angles "
                f"(format={post_format.value}, family={template_family})"
            ],
            "errors": state.get("errors", []) + result.errors,
        }

    except Exception as e:
        logger.error("content_node_error", topic=topic, error=str(e))
        return {
            "errors":   state.get("errors", [])   + [f"Content generation failed: {str(e)}"],
            "messages": state.get("messages", []) + [f"Content generation failed: {str(e)}"],
        }
