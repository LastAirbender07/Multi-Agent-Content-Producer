"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { ChatMsg, SlideSnapshot } from "@/types/slideEditor";

interface UseSlideAIProps {
  runId: string;
  angleIndex: number;
  slideNumber: number;
  snap: SlideSnapshot;
  setSnap: (updater: (prev: SlideSnapshot) => SlideSnapshot) => void;
}

interface UseSlideAIReturn {
  aiOpen: boolean;
  setAiOpen: React.Dispatch<React.SetStateAction<boolean>>;
  aiMessages: ChatMsg[];
  aiInput: string;
  setAiInput: React.Dispatch<React.SetStateAction<string>>;
  aiLoading: boolean;
  sendAiMessage: () => Promise<void>;
}

export function useSlideAI({
  runId, angleIndex, slideNumber, snap, setSnap,
}: UseSlideAIProps): UseSlideAIReturn {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<ChatMsg[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  async function sendAiMessage() {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    setAiMessages(prev => [...prev, { role: "user", content: text }]);
    setAiInput("");
    setAiLoading(true);
    try {
      const result = await api.aiRewriteSlide(runId, angleIndex, slideNumber, text);
      const s = result.slide;
      setSnap(prev => ({ ...prev, title: s.title, body: s.body, bullets: s.bullets ?? [] }));
      setAiMessages(prev => [...prev, { role: "assistant", content: `Rewrote: **${s.title}**` }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setAiMessages(prev => [...prev, { role: "assistant", content: `Error: ${msg}` }]);
    } finally { setAiLoading(false); }
  }

  return { aiOpen, setAiOpen, aiMessages, aiInput, setAiInput, aiLoading, sendAiMessage };
}
