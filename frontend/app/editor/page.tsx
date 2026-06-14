"use client";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { PencilRuler, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { FileBrowser } from "@/components/editor/FileBrowser";
import { SlideEditor } from "@/components/editor/SlideEditor";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { api } from "@/lib/api";

function EditorContent() {
  const params = useSearchParams();
  const router = useRouter();

  const runId = params.get("run") ?? null;
  const view = (params.get("view") ?? null) as "slide" | "blog" | null;
  const angleParam = params.get("angle");
  const slideParam = params.get("slide");
  const topicParam = params.get("topic") ?? "";

  const [selectedAngle, setSelectedAngle] = useState<number | null>(angleParam ? Number(angleParam) : null);
  const [selectedSlide, setSelectedSlide] = useState<number | null>(slideParam ? Number(slideParam) : null);
  const [selectedView, setSelectedView] = useState<"slide" | "blog" | null>(view);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(runId);
  const [topic, setTopic] = useState(topicParam);
  const [browserCollapsed, setBrowserCollapsed] = useState(false);

  // Sync URL → state when params change
  useEffect(() => {
    setSelectedRunId(runId);
    setSelectedView(view);
    if (angleParam) setSelectedAngle(Number(angleParam));
    if (slideParam) setSelectedSlide(Number(slideParam));
    if (topicParam) setTopic(topicParam);
  }, [runId, view, angleParam, slideParam, topicParam]);

  function navigateTo(rid: string, v: "slide" | "blog", angle?: number, slide?: number) {
    const p = new URLSearchParams();
    p.set("run", rid);
    p.set("view", v);
    if (v === "slide" && angle !== undefined && slide !== undefined) {
      p.set("angle", String(angle));
      p.set("slide", String(slide));
    }
    router.push(`/editor?${p.toString()}`);
  }

  async function onSelectSlide(rid: string, angle: number, slide: number) {
    setSelectedRunId(rid);
    setSelectedAngle(angle);
    setSelectedSlide(slide);
    setSelectedView("slide");
    if (!topic && rid) {
      try {
        const m = await api.getRunManifest(rid);
        setTopic(m.topic);
      } catch {}
    }
    navigateTo(rid, "slide", angle, slide);
  }

  async function onSelectBlog(rid: string) {
    setSelectedRunId(rid);
    setSelectedView("blog");
    if (!topic && rid) {
      try {
        const m = await api.getRunManifest(rid);
        setTopic(m.topic);
      } catch {}
    }
    navigateTo(rid, "blog");
  }

  const showIdle = !selectedRunId || !selectedView;
  const showSlideEditor = selectedView === "slide" && selectedRunId && selectedAngle !== null && selectedSlide !== null;
  const showBlogEditor = selectedView === "blog" && selectedRunId;

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* File browser — collapsible */}
      <motion.div
        animate={{ width: browserCollapsed ? 40 : 260 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="shrink-0 overflow-hidden"
      >
        <FileBrowser
          selectedRunId={selectedRunId}
          selectedAngle={selectedAngle}
          selectedSlide={selectedSlide}
          selectedView={selectedView}
          onSelectSlide={onSelectSlide}
          onSelectBlog={onSelectBlog}
          collapsed={browserCollapsed}
          onToggleCollapse={() => setBrowserCollapsed(c => !c)}
        />
      </motion.div>

      {/* Editor area */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Editor header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800/40 bg-zinc-950 shrink-0">
          <PencilRuler size={16} className="text-violet-400" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-zinc-200 truncate">
              {topic || (showIdle ? "Content Editor" : selectedRunId?.slice(0, 12) + "…")}
            </h1>
            <p className="text-[10px] text-zinc-600">
              {showSlideEditor && `Angle ${(selectedAngle ?? 0) + 1} · Slide ${selectedSlide}`}
              {showBlogEditor && "Blog Post"}
              {showIdle && "Select a file to start editing"}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {showIdle && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
                <Zap size={28} className="text-zinc-700" />
              </div>
              <h2 className="text-lg font-black text-white tracking-tight mb-2">Select a file</h2>
              <p className="text-zinc-600 text-sm max-w-xs leading-relaxed">
                Browse your runs in the panel on the left, then click a slide or blog post to edit it.
              </p>
            </div>
          )}

          {showSlideEditor && (
            <SlideEditor
              runId={selectedRunId!}
              angleIndex={selectedAngle!}
              slideNumber={selectedSlide!}
            />
          )}

          {showBlogEditor && (
            <MarkdownEditor
              runId={selectedRunId!}
              topic={topic}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense>
      <EditorContent />
    </Suspense>
  );
}
