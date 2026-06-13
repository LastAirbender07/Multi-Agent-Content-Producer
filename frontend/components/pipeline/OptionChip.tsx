"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ChipOption<T> { value: T; label: string; description?: string }

interface Props<T extends string> {
  icon?: React.ReactNode;
  label: string;
  options: ChipOption<T>[];
  value: T;
  onChange: (v: T) => void;
}

export function OptionChip<T extends string>({ icon, label: chipLabel, options, value, onChange }: Props<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
          open
            ? "bg-violet-500/10 border-violet-500/30 text-violet-300"
            : "bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
        }`}
      >
        {icon && <span className="opacity-50">{icon}</span>}
        <span className="text-zinc-100 font-semibold">{current?.label ?? chipLabel}</span>
        <ChevronDown size={10} className={`opacity-40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute top-full left-0 mt-2 z-50 bg-zinc-900 border border-zinc-800/80 rounded-xl shadow-2xl shadow-black/70 overflow-hidden min-w-40"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-4 px-3.5 py-2.5 text-xs text-left transition-colors ${
                  opt.value === value ? "bg-violet-500/10 text-violet-300" : "text-zinc-300 hover:bg-zinc-800/60"
                }`}
              >
                <div>
                  <p className="font-semibold">{opt.label}</p>
                  {opt.description && <p className="text-[10px] text-zinc-600 mt-0.5">{opt.description}</p>}
                </div>
                {opt.value === value && <Check size={11} className="text-violet-400 shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
