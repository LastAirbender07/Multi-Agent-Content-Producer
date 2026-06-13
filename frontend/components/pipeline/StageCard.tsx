"use client";
import { useState, useEffect, useRef } from "react";
import { ChevronDown, CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { StageStatus } from "@/store/slices/pipelineSlice";

export { type StageStatus };

// ─── Status badge ──────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: StageStatus }) {
  if (status === "idle")
    return <span className="w-2 h-2 rounded-full bg-zinc-700 inline-block" />;
  if (status === "running")
    return <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse inline-block" />;
  if (status === "done")
    return <CheckCircle size={14} className="text-emerald-500" />;
  return <XCircle size={14} className="text-red-500" />;
}

export function statusLabel(s: StageStatus) {
  return s === "idle" ? "Waiting" : s === "running" ? "Running…" : s === "done" ? "Done" : "Error";
}

// ─── Stage timer ──────────────────────────────────────────────────────────────

export function useStageTimer(status: StageStatus): number | null {
  const [elapsed, setElapsed] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === "running") {
      startRef.current = Date.now() - (elapsed ?? 0) * 1000;
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current!) / 1000));
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (status === "idle") {
        setElapsed(null);
        startRef.current = null;
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [status]);

  return elapsed;
}

export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Stage card ───────────────────────────────────────────────────────────────

interface StageCardProps {
  number: number;
  icon: React.ReactNode;
  title: string;
  status: StageStatus;
  open: boolean;
  onToggle: () => void;
  elapsed?: number | null;
  children?: React.ReactNode;
}

export function StageCard({ number, icon, title, status, open, onToggle, elapsed, children }: StageCardProps) {
  const borderColor =
    status === "done"
      ? "border-emerald-500/20"
      : status === "running"
      ? "border-violet-500/30"
      : status === "error"
      ? "border-red-500/20"
      : "border-zinc-800/50";

  return (
    <div className={`rounded-3xl border ${borderColor} bg-zinc-900/40 overflow-hidden transition-colors duration-500`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-6 py-5 hover:bg-zinc-800/20 transition-colors"
      >
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black border ${
            status === "done"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : status === "running"
              ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
              : "bg-zinc-800 text-zinc-500 border-zinc-700"
          }`}
        >
          {number}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-zinc-500">{icon}</span>
          <h3 className="text-sm font-bold text-zinc-200 truncate">{title}</h3>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {elapsed != null && (
            <span className={`text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-lg ${
              status === "running"
                ? "bg-violet-500/10 text-violet-400"
                : status === "done"
                ? "bg-zinc-800 text-zinc-400"
                : "bg-zinc-800 text-red-400"
            }`}>
              {formatElapsed(elapsed)}
            </span>
          )}
          <span
            className={`text-[10px] font-black uppercase tracking-widest ${
              status === "done"
                ? "text-emerald-500"
                : status === "running"
                ? "text-violet-400"
                : status === "error"
                ? "text-red-400"
                : "text-zinc-600"
            }`}
          >
            {statusLabel(status)}
          </span>
          <StatusBadge status={status} />
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} className="text-zinc-600" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && children && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 border-t border-zinc-800/40">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
