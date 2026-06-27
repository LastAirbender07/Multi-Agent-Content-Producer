/**
 * Shared card primitives reused across all analytics sections.
 */
"use client";
import { motion } from "framer-motion";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({
  icon: Icon,
  iconColor,
  label,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconColor}`}>
        <Icon size={15} />
      </div>
      <h2 className="text-sm font-black text-white tracking-tight">{label}</h2>
    </div>
  );
}

/** Horizontal percentage bar row — used in every distribution list. */
export function DistributionRow({
  label,
  count,
  total,
  colorClass,
  showPct = false,
}: {
  label: string;
  count: number;
  total: number;
  colorClass: string;
  showPct?: boolean;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-xs text-zinc-400 capitalize truncate shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-zinc-600 w-8 text-right shrink-0 tabular-nums">
        {showPct ? `${pct.toFixed(0)}%` : count}
      </span>
    </div>
  );
}
