from configs.settings import get_settings
from core.orchestrators.research.orchestrator import ResearchOrchestrator
from core.schemas.workflow_state import ContentWorkflowState
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()

async def research_node(state: ContentWorkflowState) -> dict:
    topic = state["topic"]
    run_id = state.get("run_id")
    logger.info("research_node_start", topic=topic, run_id=run_id)

    try:
        orchestrator = ResearchOrchestrator()
        result = await orchestrator.run(
            {
                "topic": topic,
                "mode": _settings.research_default_mode,
                "freshness": _settings.research_default_freshness,
                "explicit_urls": [],
            },
            run_id=run_id,
        )

        summary = result.synthesis.summary if result.synthesis else "No synthesis available"
        key_points = result.synthesis.key_points if result.synthesis else []

        logger.info(
            "research_node_complete",
            topic=topic,
            run_id=result.run_id,
            key_points_count=len(key_points),
            output_path=result.output_path,
        )

        return {
            "run_id": result.run_id,
            "research_data": {
                "summary": summary,
                "key_points": key_points,
                "evidence": [e.model_dump() for e in result.evidence],
                "status": result.status.value,
                "output_path": result.output_path,
            },
            "research_summary": summary,
            "messages": state.get("messages", []) + [
                f"Research completed: {result.status.value} - {len(result.evidence)} sources"
            ],
        }

    except Exception as e:
        logger.error("research_node_error", topic=topic, error=str(e))
        return {
            "errors": state.get("errors", []) + [f"Research failed: {str(e)}"],
            "messages": state.get("messages", []) + [f"Research failed: {str(e)}"],
        }

