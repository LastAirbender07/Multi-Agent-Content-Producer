"use client";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface SectionHeaderProps {
  id: "search" | "run" | "uploads";
  label: string;
  count?: number;
  openSection: "search" | "run" | "uploads";
  onToggle: (id: "search" | "run" | "uploads") => void;
}

export function SectionHeader({ id, label, count, openSection, onToggle }: SectionHeaderProps) {
  return (
    <button
      onClick={() => onToggle(id)}
      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/30 transition-colors"
    >
      {openSection === id
        ? <ChevronDown size={11} className="text-zinc-500 shrink-0" />
        : <ChevronRight size={11} className="text-zinc-600 shrink-0" />
      }
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      {count !== undefined && (
        <span className="ml-auto text-[9px] text-zinc-600">{count}</span>
      )}
    </button>
  );
}
