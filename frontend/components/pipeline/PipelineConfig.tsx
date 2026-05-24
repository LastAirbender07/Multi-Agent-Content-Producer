"use client";
import { Zap, Loader2, Settings2 } from "lucide-react";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setTopic,
  setMode,
  setFreshness,
  setAngleMode,
  setImageSource,
  setLlmResearchMode,
  resetPipeline,
  setStageStatus,
  setResearchResult,
  setErrors,
  setAngleResult,
  setContentResult,
} from "@/store/slices/pipelineSlice";
import { api } from "@/lib/api";

export function PipelineConfig() {
  const dispatch = useAppDispatch();
  const { topic, mode, freshness, angleMode, imageSource, llmResearchMode, stages, researchResult } =
    useAppSelector((state) => state.pipeline);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxTools, setMaxTools] = useState(6);
  const [maxSources, setMaxSources] = useState(15);
  const [maxLoops, setMaxLoops] = useState(2);
  const [maxSlides, setMaxSlides] = useState(12);

  const isRunning = Object.values(stages).some((s) => s.status === "running");

  async function runContent(research: any, angle: any, selectedAngles: any) {
    dispatch(setStageStatus({ stage: "content", status: "running" }));
    try {
      const contentRes = await api.runContent({
        run_id: angle.run_id,
        topic,
        selected_angles: selectedAngles,
        research_summary: research.synthesis?.summary || "",
        key_points: research.synthesis?.key_points || [],
        image_source: imageSource,
        max_slides: maxSlides,
        min_slides: 4,
      });
      dispatch(setContentResult(contentRes));
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
        max_angles_to_select: 3,
      });
      dispatch(setAngleResult(angleRes));
      dispatch(setStageStatus({ stage: "angle", status: "done" }));
      if (angleMode === "auto") {
        await runContent(research, angleRes, angleRes.selected_angles);
      }
    } catch (e: any) {
      dispatch(setErrors([`Angle generation failed: ${e.message}`]));
      dispatch(setStageStatus({ stage: "angle", status: "error" }));
    }
  }

  async function handleRun() {
    if (!topic.trim() || isRunning) return;
    dispatch(resetPipeline());
    dispatch(setErrors([]));
    dispatch(setStageStatus({ stage: "research", status: "running" }));

    if (llmResearchMode) {
      try {
        const res = await api.llmDraftResearch({ topic });
        dispatch(setResearchResult(res));
        dispatch(setStageStatus({ stage: "research", status: "done" }));
        // Stop here — user refines in Stage 1 card, then clicks "Generate Angles →"
      } catch (e: any) {
        dispatch(setErrors([`LLM research failed: ${e.message}`]));
        dispatch(setStageStatus({ stage: "research", status: "error" }));
      }
      return;
    }

    // Normal web research waterfall
    try {
      const researchRes = await api.runResearch({
        topic,
        mode,
        freshness,
        budget: {
          max_tool_calls: maxTools,
          max_sources: maxSources,
          max_refinement_loops: maxLoops,
        },
      });
      dispatch(setResearchResult(researchRes));
      dispatch(setStageStatus({ stage: "research", status: "done" }));

      if (!researchRes.synthesis) {
        dispatch(setErrors(["Research produced no synthesis"]));
        dispatch(setStageStatus({ stage: "research", status: "error" }));
        return;
      }

      await runAngleAndContent(researchRes);
    } catch (e: any) {
      dispatch(setErrors([`Pipeline failed: ${e.message}`]));
      dispatch(setStageStatus({ stage: "research", status: "error" }));
    }
  }

  async function handleGenerateAngles() {
    if (!researchResult?.synthesis || isRunning) return;
    await runAngleAndContent(researchResult);
  }

  return (
    <aside className="w-80 shrink-0 border-r border-zinc-800/50 flex flex-col p-6 gap-6 bg-zinc-950/50 backdrop-blur-md">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Zap size={18} className="text-white fill-white" />
          </div>
          Pipeline
        </h1>
        <p className="text-xs text-zinc-500 mt-2">
          Create premium carousel content with AI agents.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Target Topic
          </label>
          <textarea
            rows={3}
            placeholder="Enter topic for content production…"
            value={topic}
            onChange={(e) => dispatch(setTopic(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-inner"
          />
        </div>

        {/* Research Source toggle */}
        <div className="space-y-3">
          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Research Source
          </label>
          <div className="flex items-center justify-between px-1">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-zinc-300">LLM-only mode</span>
              {llmResearchMode && (
                <p className="text-[10px] text-zinc-500">
                  No web search — generated from LLM knowledge. Refine before proceeding.
                </p>
              )}
            </div>
            <button
              role="switch"
              aria-checked={llmResearchMode}
              aria-label="LLM-only mode"
              onClick={() => dispatch(setLlmResearchMode(!llmResearchMode))}
              className={`relative inline-flex shrink-0 h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                llmResearchMode ? "bg-violet-600" : "bg-zinc-700"
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition duration-200 ease-in-out ${
                  llmResearchMode ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mode — hidden in LLM mode (irrelevant) */}
        {!llmResearchMode && (
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Research Depth
            </label>
            <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800">
              {(["quick", "standard", "deep"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => dispatch(setMode(m))}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                    mode === m
                      ? "bg-zinc-800 text-white shadow-lg"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Angle mode */}
        <div className="space-y-3">
          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Angle Selection
          </label>
          <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800">
            {(["manual", "auto"] as const).map((a) => (
              <button
                key={a}
                onClick={() => dispatch(setAngleMode(a))}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                  angleMode === a
                    ? "bg-zinc-800 text-white shadow-lg"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {a === "manual" ? "Manual" : "Auto"}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced toggle — hidden in LLM mode */}
        {!llmResearchMode && (
          <>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <Settings2 size={14} />
              {showAdvanced ? "Hide" : "Show"} advanced settings
            </button>

            {showAdvanced && (
              <div className="space-y-4 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                {[
                  { label: "Max tool calls", value: maxTools, set: setMaxTools },
                  { label: "Max sources", value: maxSources, set: setMaxSources },
                  { label: "Max loops", value: maxLoops, set: setMaxLoops },
                  { label: "Max slides", value: maxSlides, set: setMaxSlides },
                ].map(({ label, value, set }) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-medium text-zinc-500">{label}</span>
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => set(Number(e.target.value))}
                      className="w-12 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-violet-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Max slides in LLM mode (still relevant) */}
        {llmResearchMode && (
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-medium text-zinc-500">Max slides</span>
            <input
              type="number"
              value={maxSlides}
              onChange={(e) => setMaxSlides(Number(e.target.value))}
              className="w-12 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-violet-500"
            />
          </div>
        )}

        <button
          onClick={handleRun}
          disabled={isRunning || !topic.trim()}
          className="group relative w-full overflow-hidden py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-all shadow-xl shadow-violet-500/20 active:scale-[0.98]"
        >
          <div className="flex items-center justify-center gap-2">
            {isRunning ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Zap size={18} className="group-hover:scale-110 transition-transform" />
            )}
            {isRunning
              ? "Generating..."
              : llmResearchMode
              ? "Draft Research"
              : "Produce Content"}
          </div>
        </button>

        {/* "Generate Angles" — only visible in LLM mode after research is done */}
        {llmResearchMode &&
          stages.research.status === "done" &&
          stages.angle.status === "idle" && (
            <button
              onClick={handleGenerateAngles}
              disabled={isRunning}
              className="w-full py-3 rounded-2xl border border-violet-500/60 text-violet-400 text-sm font-semibold hover:bg-violet-500/10 hover:border-violet-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isRunning ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Generating…
                </span>
              ) : (
                "Satisfied → Generate Angles"
              )}
            </button>
          )}
      </div>
    </aside>
  );
}

