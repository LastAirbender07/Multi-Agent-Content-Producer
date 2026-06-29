"use client";
import { useState } from "react";
import { Eye, FileText, Globe, Send, Loader2, Check, AlertTriangle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface BlogExportBarProps {
  runId: string;
  topic: string;
}

type PublishState =
  | { status: "idle" }
  | { status: "publishing" }
  | { status: "success"; url: string }
  | { status: "error"; message: string };

// Maps raw error messages to human-readable explanations
function friendlyError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("credentials.json") || s.includes("not found"))
    return "OAuth credentials file (credentials.json) is missing from the server. Check Docs/publishing/BLOGGER_COMPLETE_RECORD.md for setup.";
  if (s.includes("invalid_grant") || s.includes("token has been expired"))
    return "Your Google auth token has expired (7-day Testing mode limit). Run re_auth.py on the server to refresh it.";
  if (s.includes("blogger_blog_id") || s.includes("not configured"))
    return "Blog ID is not configured. Set BLOGGER_BLOG_ID in backend/.env.";
  if (s.includes("403") || s.includes("forbidden"))
    return "Permission denied. Make sure your Google account is added as a Test User in the OAuth consent screen.";
  if (s.includes("401") || s.includes("unauthorized"))
    return "Authentication failed. The access token is invalid. Restart the backend to trigger a token refresh.";
  if (s.includes("503") || s.includes("service unavailable"))
    return "Google Blogger API is temporarily unavailable. Try again in a moment.";
  if (s.includes("fetch") || s.includes("networkerror") || s.includes("failed to fetch"))
    return "Cannot reach the backend. Make sure the server is running on port 8000.";
  if (s.includes("blog-post.html") || s.includes("blog post") || s.includes("404"))
    return "Blog post HTML not found for this run. The blog post may not have been generated yet.";
  return raw.length > 180 ? raw.slice(0, 180) + "…" : raw;
}

export function BlogExportBar({ runId, topic }: BlogExportBarProps) {
  const router = useRouter();
  const [publishState, setPublishState] = useState<PublishState>({ status: "idle" });

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

  async function publishToBlogger() {
    setPublishState({ status: "publishing" });
    try {
      // Fetch blog HTML and hashtags in parallel
      const [html, captionData] = await Promise.all([
        api.getBlogPostHtml(runId).catch(() => {
          throw new Error("blog post HTML not found for this run");
        }),
        // Angle 0 hashtags used as labels — silently falls back to [] if unavailable
        api.getCaption(runId, 0).catch(() => null),
      ]);

      // Strip outer <html>/<head>/<body> wrapper — Blogger wants inner body only
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const innerHtml = bodyMatch ? bodyMatch[1].trim() : html;

      // Extract the real blog title from the HTML.
      // Priority 1 — first <h1> (the crafted headline, not the raw user query)
      // Priority 2 — <title> tag in <head>
      // Fallback   — raw topic prop
      const extractTitle = (rawHtml: string): string => {
        const h1 = rawHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (h1) {
          const text = h1[1].replace(/<[^>]+>/g, "").trim();
          if (text) return text;
        }
        const titleTag = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleTag) {
          const text = titleTag[1].trim();
          if (text) return text;
        }
        return topic;
      };
      const postTitle = extractTitle(html);

      // Use hashtags as labels, stripping the # prefix. Blogger allows max 20 labels.
      const labels: string[] = captionData?.hashtags?.length
        ? captionData.hashtags.map((h: string) => h.replace(/^#/, "")).slice(0, 20)
        : [];

      const result = await api.publishToBlogger({
        title: postTitle,
        html_content: innerHtml,
        labels,
        is_draft: false,
      });

      setPublishState({ status: "success", url: result.url });
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      setPublishState({ status: "error", message: friendlyError(raw) });
    }
  }

  return (
    <div className="space-y-2 pt-2 border-t border-zinc-800/40 mt-2">
      {/* Action row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-1">
          Blog Post
        </span>

        <button
          onClick={() => router.push(`/editor?run=${runId}&view=blog&topic=${encodeURIComponent(topic)}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-500/40 bg-violet-500/5 text-violet-400 text-[11px] font-semibold hover:bg-violet-500/10 hover:border-violet-400 transition-all"
        >
          <Eye size={12} /> Edit &amp; Preview
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

        {/* Publish to Blogger */}
        {publishState.status === "idle" && (
          <button
            onClick={publishToBlogger}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/5 text-amber-400 text-[11px] font-semibold hover:bg-amber-500/10 hover:border-amber-400 transition-all"
          >
            <Send size={12} /> Publish to Blogger
          </button>
        )}

        {publishState.status === "publishing" && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-400 text-[11px] font-semibold">
            <Loader2 size={12} className="animate-spin" /> Publishing…
          </span>
        )}

        {publishState.status === "success" && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/5 text-emerald-400 text-[11px] font-semibold">
              <Check size={12} /> Published!
            </span>
            {publishState.url && (
              <a
                href={publishState.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-400/70 hover:text-emerald-400 underline underline-offset-2 transition-colors"
              >
                View post ↗
              </a>
            )}
            <button
              onClick={() => setPublishState({ status: "idle" })}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
              title="Dismiss"
            >
              <X size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Error banner — shown below the action row so it doesn't push buttons around */}
      {publishState.status === "error" && (
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-red-500/30 bg-red-500/5">
          <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-red-400 mb-0.5">Failed to publish to Blogger</p>
            <p className="text-[10px] text-red-400/70 leading-relaxed">{publishState.message}</p>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              onClick={publishToBlogger}
              className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => setPublishState({ status: "idle" })}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
