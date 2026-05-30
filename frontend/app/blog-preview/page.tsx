"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { FileText, Globe, ArrowLeft } from "lucide-react";

const BASE = "http://localhost:8000/api/v1";

function BlogPreviewContent() {
  const router = useRouter();
  const params = useSearchParams();
  const runId = params.get("run_id");
  const topic = params.get("topic") ?? "Blog Post";

  if (!runId) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-zinc-500 text-sm">
        No run_id provided.
      </div>
    );
  }

  async function download(type: "md" | "html") {
    const url = `${BASE}/content/${runId}/blog-post${type === "html" ? ".html" : ""}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const text = await res.text();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([text], { type: type === "html" ? "text/html" : "text/markdown" })
    );
    a.download = `${topic.slice(0, 50).replace(/\s+/g, "_")}_blog.${type}`;
    a.click();
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Blog Post</p>
            <p className="text-sm font-semibold text-zinc-200 truncate max-w-xl">{topic}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => download("md")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 text-[11px] font-semibold hover:text-violet-400 hover:border-violet-500/50 transition-all"
          >
            <FileText size={12} /> Markdown
          </button>
          <button
            onClick={() => download("html")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 text-[11px] font-semibold hover:text-violet-400 hover:border-violet-500/50 transition-all"
          >
            <Globe size={12} /> HTML
          </button>
        </div>
      </div>

      {/* Blog content in iframe */}
      <iframe
        src={`${BASE}/content/${runId}/blog-post.html`}
        className="flex-1 w-full border-0 bg-white"
        title="Blog Post Preview"
      />
    </div>
  );
}

export default function BlogPreviewPage() {
  return (
    <Suspense>
      <BlogPreviewContent />
    </Suspense>
  );
}
