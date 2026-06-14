"use client";
import { useRef, useState, useEffect } from "react";
import { MessageSquare, Send, Loader2, Trash2, Sparkles, Bot, Command } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addMessage, setTyping, clearChat } from "@/store/slices/chatSlice";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { MessageBubble, TypingIndicator } from "@/components/chat/MessageBubble";

export default function ChatPage() {
  const dispatch = useAppDispatch();
  const { messages, isTyping } = useAppSelector((state) => state.chat);
  const [input, setInput] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isTyping) return;

    dispatch(addMessage({ role: "user", content: text }));
    setInput("");
    dispatch(setTyping(true));

    try {
      const res = await api.chat({
        messages: [...messages, { role: "user", content: text }],
      });

      dispatch(addMessage({ role: "assistant", content: res.reply || "No response" }));
    } catch (e: any) {
      dispatch(addMessage({ role: "assistant", content: `Error: ${e.message}` }));
    } finally {
      dispatch(setTyping(false));
      textareaRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">
      {/* Header */}
      <header className="glass-premium px-10 py-6 flex items-center justify-between shrink-0 z-10 border-b border-zinc-900/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
            <MessageSquare size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">AI Assistant</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Knowledge Base 2.0</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => dispatch(clearChat())}
          className="w-10 h-10 rounded-2xl flex items-center justify-center bg-zinc-950 border border-zinc-900 text-zinc-500 hover:text-red-500 hover:border-red-500/20 transition-all"
        >
          <Trash2 size={18} />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-10 py-10 space-y-10 custom-scrollbar">
        <AnimatePresence>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto"
            >
              <div className="w-24 h-24 rounded-[2.5rem] bg-zinc-950 flex items-center justify-center mb-8 border border-zinc-900 shadow-2xl relative">
                <Sparkles size={48} className="text-violet-500/20" />
                <Bot size={32} className="text-violet-500 absolute" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter mb-4">How can I assist your workflow?</h2>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed mb-12">
                Brainstorm hooks, refine research, or craft viral captions with our context-aware agent.
              </p>

              <div className="grid grid-cols-2 gap-4 w-full">
                {[
                  "Refine my healthcare research",
                  "Viral hooks for AI 2026",
                  "Draft Instagram captions",
                  "Summarize latest trends"
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                    className="flex items-center gap-3 p-5 rounded-3xl bg-zinc-950 border border-zinc-900 text-left hover:border-violet-500/50 hover:bg-zinc-900/50 transition-all group"
                  >
                    <Command size={14} className="text-zinc-600 group-hover:text-violet-500" />
                    <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200">{q}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} index={i} />
              ))}
              {isTyping && <TypingIndicator />}
            </>
          )}
        </AnimatePresence>
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input bar */}
      <div className="p-10 shrink-0">
        <div className="max-w-4xl mx-auto relative group">
          <div className="absolute -inset-1 bg-linear-to-r from-violet-600/20 to-fuchsia-600/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex gap-4 p-2 bg-zinc-900/50 backdrop-blur-2xl border border-zinc-800 rounded-[2.5rem] shadow-2xl">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Message your agent…"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1 bg-transparent px-6 py-4 text-sm font-medium text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none custom-scrollbar"
              style={{ minHeight: "56px" }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="w-14 h-14 flex items-center justify-center rounded-4xl bg-violet-600 hover:bg-violet-500 disabled:opacity-20 disabled:cursor-not-allowed text-white transition-all shadow-lg shadow-violet-600/20 active:scale-95 shrink-0"
            >
              {isTyping ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
