"use client";
import { motion } from "framer-motion";

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string; // tailwind classes for the icon box
}

export function KpiCard({ icon: Icon, label, value, sub, color }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6 space-y-3 backdrop-blur-sm hover:bg-zinc-900/60 transition-colors"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">{label}</p>
        <p className="text-4xl font-black text-white tracking-tighter mt-2 leading-none">{value}</p>
        {sub && <p className="text-xs text-zinc-600 font-semibold mt-1.5">{sub}</p>}
      </div>
    </motion.div>
  );
}
