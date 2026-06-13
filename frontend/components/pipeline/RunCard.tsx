"use client";
import { useState } from "react";
import { Clock, Sparkles } from "lucide-react";

const TOPIC_PREVIEW = 90;

interface RunCardProps {
  run: { runId: string; topic: string; timestamp: string };
  onLoad: () => void;
}

export function RunCard({ run, onLoad }: RunCardProps) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = run.topic.length > TOPIC_PREVIEW;
  const visibleTopic = expanded || !needsTruncation ? run.topic : run.topic.slice(0, TOPIC_PREVIEW);

  return (
    <button
      onClick={onLoad}
      className="flex items-start justify-between px-4 py-3 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl hover:border-violet-500/30 hover:bg-zinc-900/70 transition-colors text-left group w-full"
    >
      <div className="min-w-0 flex-1 pr-3">
        <p className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors wrap-break-word">
          {visibleTopic}
          {needsTruncation && !expanded && (
            <span
              className="text-zinc-500 font-semibold cursor-pointer hover:text-violet-400 ml-0.5"
              onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            >
              {" …more"}
            </span>
          )}
          {needsTruncation && expanded && (
            <span
              className="text-zinc-500 font-semibold cursor-pointer hover:text-violet-400 ml-1"
              onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
            >
              {" less"}
            </span>
          )}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Clock size={9} className="text-zinc-600" />
          <p className="text-[10px] text-zinc-600">
            {new Date(run.timestamp).toLocaleDateString()}
          </p>
        </div>
      </div>
      <Sparkles size={12} className="text-zinc-700 group-hover:text-violet-400 shrink-0 mt-0.5 transition-colors" />
    </button>
  );
}
