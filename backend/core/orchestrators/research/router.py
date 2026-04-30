from configs.settings import get_settings
from core.orchestration.contracts import SkippedTool
from core.orchestration.policies.routing import DeterministicResearchRoutingPolicy
from core.schemas.workflow_state import ResearchGraphState
from infra.logging import get_logger

logger = get_logger(__name__)
_policy = DeterministicResearchRoutingPolicy()
_ALLOWED_TOOLS = set(get_settings().research_allowed_tools)

async def route_node(state: ResearchGraphState) -> dict:
    request = state["request"]
    errors = list(state.get("errors", []))
    skipped_tools = list(state.get("skipped_tools", []))

    # validate caller provided selected tools first
    invalid_tools = sorted(set(request.selected_tools) - _ALLOWED_TOOLS)
    valid_tools = [tool for tool in request.selected_tools if tool in _ALLOWED_TOOLS]

    if invalid_tools:
        for tool in invalid_tools:
            skipped_tools.append(SkippedTool(
                tool_name=tool,
                reason_type="invalid_selection",
                reason_message=["Tool is not supported by this orchestrator."],
                provided_context={
                    "selected_tools": request.selected_tools,
                    "allowed_tools": sorted(_ALLOWED_TOOLS),
                },
            ))

        if request.strict_tools:
            errors.append(f"Strict tool selection is enabled, but the following selected tools are invalid: {', '.join(invalid_tools)}.")

    # build deterministic base plan
    base_plan = _policy.create_plan(request)
    base_tools = list(base_plan.selected_tools)

    if request.tool_selection_mode == "manual":
        final_tools = valid_tools
        if not final_tools:
            errors.append("Tool selection mode is manual, but no valid tools were selected by the caller.")
        rationale = ["Manual mode: using only the valid tools selected by the caller."] if final_tools else []
    elif request.tool_selection_mode == "hybrid":
        merged  = list(base_tools)
        for tool in valid_tools:
            if tool not in merged:
                merged.append(tool)
        final_tools = merged
        rationale = list(base_plan.rationale) + (["Hybrid mode: merging valid caller-selected tools with the base plan tools."] if valid_tools else [])
    else:
        final_tools = base_tools
        rationale = list(base_plan.rationale) + ["Auto mode: using the base plan tools determined by the routing policy."]

    # crawl4ai requires URL context; skip or fail depending on strict mode
    if "crawl4ai" in final_tools and not request.explicit_urls:
        message = "crawl4ai requires explicit URLs to be provided in the request."
        if request.strict_tools:
            errors.append(message + " Strict tool selection is enabled, so this is treated as an error.")
            final_tools.remove("crawl4ai")
        else:
            skipped_tools.append(SkippedTool(
                tool_name="crawl4ai",
                reason_type="missing_context",
                reason_message=[message + " Strict tool selection is disabled, so skipping this tool."],
                provided_context={
                    "explicit_url_count": len(request.explicit_urls),
                    "explicit_urls": request.explicit_urls,
                },
            ))
            final_tools.remove("crawl4ai")

    plan = base_plan.model_copy(update={
        "selected_tools": final_tools,
        "rationale": rationale,
        "selection_mode_used": request.tool_selection_mode,
    })

    logger.info(
        "route_node_completed",
        run_id=state.get("run_id"),
        selected_tools=plan.selected_tools,
        selection_mode=plan.selection_mode_used,
        rationale=plan.rationale,
    )

    return {
        "route_plan": plan,
        "skipped_tools": skipped_tools,
        "errors": errors,
        "messages": state.get("messages", []) + [f"Route plan: {plan.selected_tools} based on mode: {plan.selection_mode_used}"],
    }
