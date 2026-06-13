"use client";
import { Eye, FileText, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface BlogExportBarProps {
  runId: string;
  topic: string;
}

export function BlogExportBar({ runId, topic }: BlogExportBarProps) {
  const router = useRouter();

  async function downloadMd() {
    try {
      const md = await api.getBlogPostMd(runId);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
      a.download = `${topic.slice(0, 50).replace(/\s+/g, "_")}_blog.md`;
      a.click();
    } catch {}
  }

  async function downloadHtml() {
    try {
      const html = await api.getBlogPostHtml(runId);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      a.download = `${topic.slice(0, 50).replace(/\s+/g, "_")}_blog.html`;
      a.click();
    } catch {}
  }

  return (
    <div className="flex items-center gap-3 pt-2 border-t border-zinc-800/40 mt-2">
      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-1">
        Blog Post
      </span>
      <button
        onClick={() => router.push(`/blog-preview?run_id=${runId}&topic=${encodeURIComponent(topic)}`)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-500/40 bg-violet-500/5 text-violet-400 text-[11px] font-semibold hover:bg-violet-500/10 hover:border-violet-400 transition-all"
      >
        <Eye size={12} /> Preview
      </button>
      <button
        onClick={downloadMd}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700/60 text-zinc-400 text-[11px] font-semibold hover:border-violet-500/50 hover:text-violet-400 transition-all"
      >
        <FileText size={12} /> Markdown
      </button>
      <button
        onClick={downloadHtml}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700/60 text-zinc-400 text-[11px] font-semibold hover:border-violet-500/50 hover:text-violet-400 transition-all"
      >
        <Globe size={12} /> HTML
      </button>
    </div>
  );
}
