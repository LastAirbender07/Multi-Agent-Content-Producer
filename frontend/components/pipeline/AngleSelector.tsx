"use client";
import { useState } from "react";
import { CheckCircle, Sparkles } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAngleResult, setStageStatus, setContentResult, setErrors } from "@/store/slices/pipelineSlice";
import { api, Angle } from "@/lib/api";
import { Modal } from "../ui/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AngleSelector({ open, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { angleResult, researchResult, topic, imageSource } = useAppSelector((state) => state.pipeline);
  const [selected, setSelected] = useState<number[]>([]);

  if (!angleResult) return null;

  function toggle(i: number) {
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  }

  async function handleConfirm() {
    if (!angleResult || !researchResult) return;
    onClose();

    // Mark content running immediately — prevents the pipeline page useEffect
    // from seeing angle=done + content=idle and reopening this modal.
    dispatch(setStageStatus({ stage: "content", status: "running" }));
    try {
      const resumedAngle = await api.selectAngles(angleResult.run_id, selected);
      dispatch(setAngleResult(resumedAngle));
      dispatch(setStageStatus({ stage: "angle", status: "done" }));
      const contentRes = await api.runContent({
        run_id: resumedAngle.run_id,
        topic,
        selected_angles: resumedAngle.selected_angles,
        research_summary: researchResult.synthesis?.summary || "",
        key_points: researchResult.synthesis?.key_points || [],
        image_source: imageSource,
        max_slides: 12,
        min_slides: 4,
      });
      dispatch(setContentResult(contentRes));
      dispatch(setStageStatus({ stage: "content", status: "done" }));
    } catch (e: any) {
      dispatch(setErrors([`Angle selection/Content generation failed: ${e.message}`]));
      dispatch(setStageStatus({ stage: "content", status: "error" }));
    }
  }

  const HOOK_COLORS: Record<string, string> = {
    curiosity: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    anger: "bg-red-500/10 text-red-400 border-red-500/20",
    hope: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    FOMO: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    default: "bg-zinc-800 text-zinc-400 border-zinc-700",
  };

  return (
    <Modal open={open} onClose={onClose} title="Choose Your Narrative" wide>
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-violet-500/5 rounded-2xl border border-violet-500/10">
          <Sparkles className="text-violet-400" size={20} />
          <p className="text-sm text-zinc-300 leading-relaxed">
            AI has generated several distinct angles from the research. Select the ones that best fit your brand voice.
          </p>
        </div>

        <div className="grid gap-4">
          {angleResult.angles.map((angle, i) => {
            const hookKey = Object.keys(HOOK_COLORS).find((k) =>
              angle.emotional_hook.toLowerCase().includes(k.toLowerCase())
            );
            const hookColor = HOOK_COLORS[hookKey || "default"];
            const isSelected = selected.includes(i);

            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={`w-full text-left p-6 rounded-3xl border transition-all duration-300 group ${
                  isSelected
                    ? "border-violet-500 bg-violet-500/5 shadow-lg shadow-violet-500/5"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      isSelected
                        ? "bg-violet-500 text-white scale-110"
                        : "bg-zinc-800 border border-zinc-700 text-transparent group-hover:border-zinc-600"
                    }`}
                  >
                    <CheckCircle size={14} />
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="text-base font-bold text-zinc-100 leading-snug">
                      {angle.statement}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${hookColor}`}
                      >
                        {angle.emotional_hook}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                      {angle.supporting_evidence}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleConfirm}
          disabled={selected.length === 0}
          className="w-full py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-all shadow-xl shadow-violet-500/20 active:scale-[0.98]"
        >
          Generate Content for {selected.length} Angle{selected.length !== 1 ? "s" : ""}
        </button>
      </div>
    </Modal>
  );
}
