"use client";
import { useState, useEffect, useRef } from "react";
import { Save, Loader2, FileText, Globe, Send, Bot, User, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";

// Dynamic import — react-md-editor uses browser APIs
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

const BASE = "http://localhost:8000/api/v1";

interface MarkdownEditorProps {
  runId: string;
  topic: string;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export function MarkdownEditor({ runId, topic }: MarkdownEditorProps) {
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBlogPost();
  }, [runId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  async function loadBlogPost() {
    setLoading(true);
    try {
      const md = await api.getBlogPostMd(runId);
      setMarkdown(md);
    } catch {
      setMarkdown("# Blog post not yet generated\n\nRun the pipeline to generate a blog post.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await api.updateBlogPost(runId, markdown);
    } catch (e: any) {
      console.error("Save failed:", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function downloadFile(type: "md" | "html") {
    const url = `${BASE}/content/${runId}/blog-post${type === "html" ? ".html" : ""}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const text = await res.text();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: type === "html" ? "text/html" : "text/markdown" }));
    a.download = `${topic.slice(0, 50).replace(/\s+/g, "_")}_blog.${type}`;
    a.click();
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || chatLoading) return;

    const userMsg: ChatMsg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setChatLoading(true);

    try {
      const contextPrompt = `You are an expert content editor and journalist. The user is editing this blog post. Help them improve it — rewrite sections, add citations, adjust tone, or suggest structure changes.

CURRENT DOCUMENT:
---
${markdown}
---

USER REQUEST: ${text}`;

      const res = await api.chat({
        messages: [{ role: "user", content: contextPrompt }],
      });
      setMessages(prev => [...prev, { role: "assistant", content: res.reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  function applyToEditor(text: string) {
    setMarkdown(prev => prev + "\n\n" + text);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      {/* Left: Editor */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-800/50">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 shrink-0">
          <div>
            <p className="text-xs font-bold text-zinc-300 truncate max-w-sm">{topic}</p>
            <p className="text-[10px] text-zinc-600">Blog Post Editor</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => downloadFile("md")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700/60 text-zinc-400 text-[11px] font-semibold hover:border-violet-500/50 hover:text-violet-400 transition-all">
              <FileText size={11} /> .md
            </button>
            <button onClick={() => downloadFile("html")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700/60 text-zinc-400 text-[11px] font-semibold hover:border-violet-500/50 hover:text-violet-400 transition-all">
              <Globe size={11} /> .html
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-[11px] font-bold transition-all"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden" data-color-mode="dark">
          <MDEditor
            value={markdown}
            onChange={v => setMarkdown(v ?? "")}
            height="100%"
            preview="live"
            data-color-mode="dark"
            style={{ height: "100%", background: "transparent" }}
          />
        </div>
      </div>

      {/* Right: LLM assistant */}
      <div className="w-80 shrink-0 flex flex-col bg-zinc-950">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/50 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-violet-600/20 flex items-center justify-center">
            <Sparkles size={13} className="text-violet-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-300">LLM Assistant</p>
            <p className="text-[10px] text-zinc-600">Has full document in context</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar">
          {messages.length === 0 && (
            <div className="text-center py-8 text-zinc-700">
              <Bot size={28} className="mx-auto mb-2 opacity-50" />
              <p className="text-[11px]">Ask me to improve, rewrite, or expand any part of the blog post.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-violet-600" : "bg-zinc-800 border border-zinc-700"}`}>
                {msg.role === "user" ? <User size={12} className="text-white" /> : <Bot size={12} className="text-violet-400" />}
              </div>
              <div className={`rounded-2xl px-3 py-2 text-[11px] leading-relaxed max-w-[80%] ${msg.role === "user" ? "bg-violet-600 text-white rounded-tr-none" : "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none"}`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.role === "assistant" && (
                  <button onClick={() => applyToEditor(msg.content)} className="mt-1.5 text-[10px] text-violet-400 hover:text-violet-300 font-semibold">
                    ↗ Apply to editor
                  </button>
                )}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                <Bot size={12} className="text-violet-400" />
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none px-3 py-2 flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1 h-1 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 pb-3 pt-2 border-t border-zinc-800/50 shrink-0">
          <div className="flex gap-2">
            <textarea
              rows={2}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask me to improve the blog…"
              className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-2.5 py-2 text-[11px] text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-violet-500/40"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || chatLoading}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white transition-all self-end"
            >
              {chatLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
