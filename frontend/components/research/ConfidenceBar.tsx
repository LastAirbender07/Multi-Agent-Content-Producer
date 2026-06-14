"use client";
import { motion } from "framer-motion";

export function ConfidenceBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
        <span>{label}</span>
        <span className={pct >= 70 ? "text-emerald-500" : "text-zinc-300"}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
    </div>
  );
}

export function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${color}`}>
      {text}
    </span>
  );
}
