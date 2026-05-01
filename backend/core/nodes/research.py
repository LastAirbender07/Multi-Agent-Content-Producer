from configs.settings import get_settings
from core.orchestrators.research.orchestrator import ResearchOrchestrator
from core.schemas.workflow_state import ContentWorkflowState
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()

async def research_node(state: ContentWorkflowState) -> dict:
    topic = state["topic"]
    logger.info("research_node_start", topic=topic)

    try:
        orchestrator = ResearchOrchestrator()
        result = await orchestrator.run({
            "topic": topic,
            "mode": _settings.research_default_mode,
            "freshness": _settings.research_default_freshness,
            "explicit_urls": [],
        })

        summary = result.synthesis.summary if result.synthesis else "No synthesis available"
        key_points = result.synthesis.key_points if result.synthesis else []

        logger.info(
            "research_node_complete", 
            topic=topic,
            key_points_count=len(key_points),
            output_path=result.output_path,
        )

        return {
            "research_data": {
                "summary": summary,
                "key_points": key_points,
                "evidence": [evidence.model_dump() for evidence in result.evidence],
                "status": result.status.value,
                "output_path": result.output_path
            },
            "research_summary": summary,
            "messages": [f"Research completed: {result.status.value} - {len(result.evidence)} sources"]
        }
    
    except Exception as e:
        logger.error("research_node_error", topic=topic, error=str(e))
        return {
            "errors": [f"Research failed: {str(e)}"],
            "messages": [f"Research failed: {str(e)}"]
        }
