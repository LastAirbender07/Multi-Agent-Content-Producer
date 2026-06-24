"use client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setRunId, resetPipeline, setStageStatus, setResearchResult,
  setAngleResult, setContentResult, setErrors,
} from "@/store/slices/pipelineSlice";
import { api } from "@/lib/api";
import { buildSeededEvidence } from "@/utils/pipelinePayloads";

export function usePipelineOrchestration() {
  const dispatch = useAppDispatch();
  const {
    topic, mode, freshness, angleMode, imageSource, llmResearchMode,
    stages, researchResult, preprocessedQueries, discoverUrl,
    discoveryArticle, attachedEvidence,
    maxTools, maxSources, maxLoops, maxSlides, minSlides, maxCrawlUrls,
    maxAnglesSelect, needsClaimVerification,
  } = useAppSelector((s) => s.pipeline);

  const isRunning = Object.values(stages).some((s) => s.status === "running");

  async function runContent(research: any, angle: any, selectedAngles: any) {
    dispatch(setStageStatus({ stage: "content", status: "running" }));
    try {
      const res = await api.runContent({
        run_id: angle.run_id,
        topic,
        selected_angles: selectedAngles,
        research_summary: research.synthesis?.summary || "",
        key_points: research.synthesis?.key_points || [],
        image_source: imageSource,
        max_slides: maxSlides,
        min_slides: minSlides,
      });
      dispatch(setContentResult(res));
      dispatch(setStageStatus({ stage: "content", status: "done" }));
    } catch (e: any) {
      dispatch(setErrors([`Content generation failed: ${e.message}`]));
      dispatch(setStageStatus({ stage: "content", status: "error" }));
    }
  }

  async function runAngleAndContent(research: any) {
    dispatch(setStageStatus({ stage: "angle", status: "running" }));
    try {
      const angleRes = await api.runAngle({
        topic,
        synthesis: research.synthesis,
        run_id: research.run_id,
        mode: angleMode,
        max_angles_to_select: maxAnglesSelect,
      });
      dispatch(setAngleResult(angleRes));
      dispatch(setStageStatus({ stage: "angle", status: "done" }));
      if (angleMode === "auto") await runContent(research, angleRes, angleRes.selected_angles);
    } catch (e: any) {
      dispatch(setErrors([`Angle generation failed: ${e.message}`]));
      dispatch(setStageStatus({ stage: "angle", status: "error" }));
    }
  }

  async function handleRun(topicLoading = false) {
    if (!topic.trim() || isRunning || topicLoading) return;
    const pendingRunId = crypto.randomUUID();
    dispatch(resetPipeline());
    dispatch(setRunId(pendingRunId));
    dispatch(setErrors([]));
    dispatch(setStageStatus({ stage: "research", status: "running" }));

    if (llmResearchMode) {
      try {
        const res = await api.llmDraftResearch({ topic });
        dispatch(setResearchResult(res));
        dispatch(setStageStatus({ stage: "research", status: "done" }));
      } catch (e: any) {
        dispatch(setErrors([`LLM research failed: ${e.message}`]));
        dispatch(setStageStatus({ stage: "research", status: "error" }));
      }
      return;
    }

    try {
      // Build seeded evidence: discover article snippet + any uploaded documents
      const seededEvidence = buildSeededEvidence(discoveryArticle, discoverUrl, attachedEvidence);

      const res = await api.runResearch({
        topic, mode, freshness, run_id: pendingRunId,
        needs_claim_verification: needsClaimVerification,
        explicit_urls: discoverUrl ? [discoverUrl] : undefined,
        preprocessed_queries: preprocessedQueries.length > 0 ? preprocessedQueries : undefined,
        seeded_evidence: seededEvidence.length > 0 ? seededEvidence : undefined,
        budget: {
          max_tool_calls: maxTools,
          max_sources: maxSources,
          max_refinement_loops: maxLoops,
          max_crawl_urls: maxCrawlUrls,
        },
      });
      dispatch(setResearchResult(res));
      dispatch(setStageStatus({ stage: "research", status: "done" }));
      if (!res.synthesis) {
        dispatch(setErrors(["Research produced no synthesis"]));
        dispatch(setStageStatus({ stage: "research", status: "error" }));
        return;
      }
      await runAngleAndContent(res);
    } catch (e: any) {
      dispatch(setErrors([`Pipeline failed: ${e.message}`]));
      dispatch(setStageStatus({ stage: "research", status: "error" }));
    }
  }

  async function handleGenerateAngles() {
    if (!researchResult?.synthesis || isRunning) return;
    await runAngleAndContent(researchResult);
  }

  return { isRunning, handleRun, handleGenerateAngles, stages, llmResearchMode, topic };
}
