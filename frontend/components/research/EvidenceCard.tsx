"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "./ConfidenceBar";
import type { Evidence } from "@/lib/api";

const SOURCE_COLORS: Record<string, string> = {
  news: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  web_search: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  crawl: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

interface Props {
  evidence: Evidence;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function EvidenceCard({ evidence: ev, index, isExpanded, onToggle }: Props) {
  return (
    <motion.div
      initial={false}
      className={`rounded-[2rem] border transition-all duration-300 ${
        isExpanded ? "bg-zinc-900/50 border-zinc-700" : "bg-zinc-950 border-zinc-900 hover:border-zinc-800"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          <Badge
            text={ev.source_type}
            color={SOURCE_COLORS[ev.source_type] || "bg-zinc-800 text-zinc-500 border-zinc-700"}
          />
          <span className="text-sm font-bold text-zinc-200 truncate">{ev.title}</span>
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-4">
          <div className="text-right">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Relevance</p>
            <p className="text-xs font-black text-white">{Math.round(ev.relevance_score * 100)}%</p>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isExpanded ? "bg-violet-600 text-white" : "bg-zinc-900 text-zinc-500"
          }`}>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-8 pb-8 pt-2 space-y-6">
              <div className="p-6 bg-black/40 rounded-2xl border border-zinc-800/50">
                <p className="text-sm text-zinc-400 leading-relaxed italic">{ev.evidence}</p>
              </div>
              {ev.url && (
                <a
                  href={ev.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <ExternalLink size={12} />
                  Visit Source: {ev.source_name || "Direct Link"}
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
