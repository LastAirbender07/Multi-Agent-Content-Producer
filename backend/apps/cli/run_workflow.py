"""
Manager Orchestrator CLI — runs the full content production pipeline.

Orchestrates individual orchestrators in sequence:
  1. Research Orchestrator      ← implemented
  2. Angle Orchestrator         ← implemented
  3. Image Retrieval/Generation ← planned
  4. Content Generation         ← planned
  5. Post Designer              ← planned

Usage:
    python -m apps.cli.run_workflow "your topic here"
    python -m apps.cli.run_workflow "AI in healthcare" --mode deep --freshness recent
"""
import argparse
import asyncio
import sys
import uuid
from core.nodes.angle import angle_node
from core.nodes.research import research_node
from core.schemas.workflow_state import ContentWorkflowState
from infra.logging import get_logger

logger = get_logger(__name__)


class ContentPipelineOrchestrator:
    """
    Manager orchestrator that runs all content production stages in sequence.
    Generates a single run_id and passes it to every stage so all outputs
    land under outputs/<run_id>/ regardless of which orchestrator produced them.
    """

    async def run(self, topic: str, mode: str = "standard", freshness: str = "recent", angle_mode: str = "auto") -> ContentWorkflowState:
        run_id = str(uuid.uuid4())
        state: ContentWorkflowState = {
            "topic": topic,
            "run_id": run_id,
            "angle_mode": angle_mode,
            "messages": [],
            "errors": [],
        }

        logger.info("pipeline_started", topic=topic, mode=mode, freshness=freshness, angle_mode=angle_mode, run_id=run_id)

        # Stage 1: Research
        state = await self._run_stage("research", research_node, state)
        if state.get("errors"):
            logger.error("pipeline_aborted_after_research", errors=state["errors"])
            return state

        # Stage 2: Angle generation (auto mode — no human interrupt in pipeline)
        state = await self._run_stage("angle", angle_node, state)
        if state.get("errors"):
            logger.error("pipeline_aborted_after_angle", errors=state["errors"])
            return state

        # Stage 3: Image retrieval/generation — planned
        # state = await self._run_stage("image", image_node, state)

        # Stage 4: Content generation — planned
        # state = await self._run_stage("content", content_node, state)

        # Stage 5: Post design — planned
        # state = await self._run_stage("post_design", post_design_node, state)

        logger.info("pipeline_completed", topic=topic, run_id=run_id, message_count=len(state.get("messages", [])))
        return state

    async def _run_stage(self, stage_name: str, node_fn, state: ContentWorkflowState) -> ContentWorkflowState:
        logger.info("pipeline_stage_started", stage=stage_name)
        try:
            updates = await node_fn(state)
            state = {**state, **updates}
            logger.info("pipeline_stage_completed", stage=stage_name)
        except Exception as e:
            logger.error("pipeline_stage_failed", stage=stage_name, error=str(e))
            state["errors"] = state.get("errors", []) + [f"{stage_name} failed: {str(e)}"]
        return state


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run the full content production pipeline for a topic."
    )
    parser.add_argument("topic", help="The topic to produce content for")
    parser.add_argument(
        "--mode",
        choices=["quick", "standard", "deep"],
        default="standard",
        help="Research depth (default: standard)",
    )
    parser.add_argument(
        "--freshness",
        choices=["breaking", "recent", "evergreen"],
        default="recent",
        help="Freshness of information (default: recent)",
    )
    parser.add_argument(
        "--angle-mode",
        choices=["auto", "manual"],
        default="auto",
        dest="angle_mode",
        help="Angle selection mode: auto = LLM picks, manual = human picks via API (default: auto)",
    )
    return parser


async def run(topic: str, mode: str, freshness: str, angle_mode: str) -> int:
    orchestrator = ContentPipelineOrchestrator()
    final_state = await orchestrator.run(topic=topic, mode=mode, freshness=freshness, angle_mode=angle_mode)

    if final_state.get("errors"):
        logger.error("pipeline_finished_with_errors", errors=final_state["errors"])
        return 1

    logger.info(
        "pipeline_finished",
        topic=topic,
        research_summary=final_state.get("research_summary", "")[:120],
        message_count=len(final_state.get("messages", [])),
    )
    return 0


def main():
    parser = _build_parser()
    args = parser.parse_args()
    sys.exit(asyncio.run(run(args.topic, args.mode, args.freshness, args.angle_mode)))


if __name__ == "__main__":
    main()
