"use client";
import { X, Bot, User, Loader2, Send, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface ChatMsg { role: "user" | "assistant"; content: string; }

export interface AiPanelProps {
  aiOpen: boolean;
  onClose: () => void;
  aiMessages: ChatMsg[];
  aiInput: string;
  onInputChange: (value: string) => void;
  aiLoading: boolean;
  onSend: () => void;
}

export function AiPanel({
  aiOpen,
  onClose,
  aiMessages,
  aiInput,
  onInputChange,
  aiLoading,
  onSend,
}: AiPanelProps) {
  if (!aiOpen) return null;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 270, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="shrink-0 flex flex-col border-l border-zinc-800/50 bg-zinc-950 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-violet-400" />
          <p className="text-xs font-bold text-zinc-300">AI Rewrite</p>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400">
          <X size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar">
        {aiMessages.length === 0 && (
          <div className="text-center py-6 text-zinc-700">
            <Bot size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-[10px]">Tell me how to rewrite this slide.</p>
          </div>
        )}
        {aiMessages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-violet-600" : "bg-zinc-800 border border-zinc-700"}`}>
              {msg.role === "user" ? <User size={10} className="text-white" /> : <Bot size={10} className="text-violet-400" />}
            </div>
            <div className={`rounded-xl px-2.5 py-2 text-[11px] leading-relaxed max-w-[85%] ${msg.role === "user" ? "bg-violet-600 text-white rounded-tr-none" : "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none"}`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {aiLoading && (
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              <Bot size={10} className="text-violet-400" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl rounded-tl-none px-3 py-2 flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1 h-1 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="px-3 pb-3 pt-2 border-t border-zinc-800/50 shrink-0">
        <div className="flex gap-2">
          <textarea
            rows={2}
            value={aiInput}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="Make this punchier…"
            className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-2.5 py-2 text-[11px] text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-violet-500/40"
          />
          <button
            onClick={onSend}
            disabled={!aiInput.trim() || aiLoading}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white self-end transition-all"
          >
            {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
