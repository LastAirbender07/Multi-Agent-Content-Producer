"use client";
import { useState, useEffect } from "react";
import { 
  Sparkles, 
  AlertCircle, 
  Image as ImageIcon,
  Zap,
  Clock,
  History
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setStageStatus } from "@/store/slices/pipelineSlice";
import { addRun } from "@/store/slices/historySlice";

// Components
import { PipelineConfig } from "@/components/pipeline/PipelineConfig";
import { PipelineProgress } from "@/components/pipeline/PipelineProgress";
import { ResearchSummary } from "@/components/pipeline/ResearchSummary";
import { AngleSelector } from "@/components/pipeline/AngleSelector";
import { InstagramPost } from "@/components/pipeline/InstagramPreview";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { motion, AnimatePresence } from "framer-motion";

export default function PipelinePage() {
  const dispatch = useAppDispatch();
  const { 
    stages, 
    researchResult, 
    angleResult, 
    contentResult, 
    errors,
    angleMode,
    runId,
    topic
  } = useAppSelector((state) => state.pipeline);
  const { runs } = useAppSelector((state) => state.history);

  const [showAngleModal, setShowAngleModal] = useState(false);

  // Sync with Angle Modal
  useEffect(() => {
    if (angleMode === "manual" && stages.angle.status === "done" && !contentResult) {
      setShowAngleModal(true);
    }
  }, [stages.angle.status, angleMode, contentResult]);

  // Save to history when complete
  useEffect(() => {
    if (stages.content.status === "done" && runId && researchResult) {
      dispatch(addRun({
        runId,
        topic,
        timestamp: new Date().toISOString(),
        researchResult,
        angleResult,
        contentResult
      }));
    }
  }, [stages.content.status, runId, researchResult, angleResult, contentResult, topic, dispatch]);

  const hasOutput = contentResult && contentResult.carousel_paths.length > 0;
  const isAnyStageRunning = Object.values(stages).some(s => s.status === "running");

  return (
    <div className="flex h-full min-h-screen bg-black">
      <PipelineConfig />

      <main className="flex-1 overflow-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto p-12 space-y-12">
          {/* Header */}
          <header className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h2 className="text-3xl font-black text-white tracking-tighter">Production Dashboard</h2>
              <p className="text-zinc-500 text-sm font-medium mt-1">Manage your multi-agent content workflow.</p>
            </motion.div>
            
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">System Online</span>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Progress & Status */}
            <div className="lg:col-span-4 space-y-8">
              <section className="space-y-4">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] px-1">Pipeline Status</h3>
                <PipelineProgress />
              </section>

              {errors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 bg-red-500/5 border border-red-500/20 rounded-[2rem] space-y-3"
                >
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle size={18} />
                    <span className="text-sm font-bold">Execution Errors</span>
                  </div>
                  <ul className="space-y-2">
                    {errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-400/80 leading-relaxed font-medium">
                        • {err}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* History Snippet */}
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Recent Activity</h3>
                  <History size={14} className="text-zinc-600" />
                </div>
                <div className="space-y-3">
                  {runs.slice(0, 3).map((run) => (
                    <div key={run.runId} className="p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl flex items-center justify-between group hover:border-zinc-700 transition-all cursor-pointer">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-200 truncate pr-4">{run.topic}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={10} className="text-zinc-600" />
                          <p className="text-[10px] text-zinc-500 font-medium">
                            {new Date(run.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-violet-600 group-hover:text-white transition-all">
                        <Zap size={14} />
                      </div>
                    </div>
                  ))}
                  {runs.length === 0 && (
                    <div className="py-8 text-center bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl">
                      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">No previous runs</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Dynamic Content */}
            <div className="lg:col-span-8 space-y-8">
              <AnimatePresence mode="wait">
                {stages.research.status === "idle" && !isAnyStageRunning && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col items-center justify-center py-32 text-center"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-zinc-900 flex items-center justify-center mb-6 border border-zinc-800 shadow-2xl">
                      <Zap size={40} className="text-zinc-700" />
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Ready for Production</h3>
                    <p className="text-zinc-500 text-sm mt-3 max-w-sm leading-relaxed">
                      Enter a topic on the left to start the multi-agent research and content generation pipeline.
                    </p>
                  </motion.div>
                )}

                {researchResult && (
                  <motion.div
                    key="research-result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <ResearchSummary />
                    
                    {hasOutput && stages.content.status === "done" && (
                      <div className="space-y-6 pt-4 border-t border-zinc-900">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-white">
                              <ImageIcon size={16} />
                            </div>
                            <h3 className="text-xl font-black text-white tracking-tight">Generated Carousels</h3>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-12 justify-center lg:justify-start">
                          {contentResult.carousel_paths.map((slides, angleIdx) => {
                            const angle = angleResult?.selected_angles[angleIdx];
                            const caption = contentResult.captions?.[angleIdx] || angle?.statement || "";
                            const hashtags = contentResult.hashtags_per_angle?.[angleIdx] || ["ai", "content"];
                            return (
                              <motion.div
                                key={angleIdx}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: angleIdx * 0.1 }}
                              >
                                <InstagramPost
                                  slides={slides}
                                  caption={caption}
                                  hashtags={hashtags}
                                  angleStatement={angle?.statement || ""}
                                />
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <AngleSelector 
          open={showAngleModal} 
          onClose={() => setShowAngleModal(false)} 
        />
      </main>
    </div>
  );
}
