"use client";
import { useAppSelector } from "@/store/hooks";
import { FlaskConical, Sparkles, Layers, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { StageStatus } from "@/store/slices/pipelineSlice";

function StageIndicator({
  num,
  label,
  status,
  icon: Icon,
}: {
  num: number;
  label: string;
  status: StageStatus;
  icon: any;
}) {
  const isDone = status === "done";
  const isRunning = status === "running";
  const isError = status === "error";

  return (
    <div className="flex items-center gap-4 group">
      <div className="relative">
        <motion.div
          animate={isRunning ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-500 border ${
            isDone
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              : isRunning
              ? "bg-violet-500/20 text-violet-400 border-violet-500/40 shadow-lg shadow-violet-500/20"
              : isError
              ? "bg-red-500/10 text-red-500 border-red-500/20"
              : "bg-zinc-900 text-zinc-500 border-zinc-800"
          }`}
        >
          {isRunning ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isDone ? (
            <CheckCircle size={18} />
          ) : isError ? (
            <AlertCircle size={18} />
          ) : (
            num
          )}
        </motion.div>
        {isRunning && (
          <motion.div
            layoutId="active-glow"
            className="absolute -inset-1 bg-violet-500/20 blur-lg rounded-2xl"
          />
        )}
      </div>
      <div className="flex-1">
        <div className={`text-sm font-bold transition-colors ${
          isRunning ? "text-violet-400" : isDone ? "text-emerald-500" : "text-zinc-400"
        }`}>
          {label}
        </div>
        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mt-0.5">
          {isRunning ? "In progress…" : isDone ? "Completed" : isError ? "Failed" : "Awaiting start"}
        </p>
      </div>
    </div>
  );
}

export function PipelineProgress() {
  const { stages, angleMode } = useAppSelector((state) => state.pipeline);

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8 backdrop-blur-xl">
      <div className="flex flex-col gap-6">
        <StageIndicator
          num={1}
          label="Research & Synthesis"
          status={stages.research.status}
          icon={FlaskConical}
        />
        <div className="ml-5 w-px h-8 bg-zinc-800/50" />
        <StageIndicator
          num={2}
          label={`Angle Generation ${angleMode === "manual" ? "(HITL)" : ""}`}
          status={stages.angle.status}
          icon={Sparkles}
        />
        <div className="ml-5 w-px h-8 bg-zinc-800/50" />
        <StageIndicator
          num={3}
          label="Visual Design & Layout"
          status={stages.content.status}
          icon={Layers}
        />
      </div>
    </div>
  );
}
