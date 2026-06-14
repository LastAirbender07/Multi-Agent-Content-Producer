"use client";
import { useState } from "react";
import { Clock, ArrowUpRight, User } from "lucide-react";
import { motion } from "framer-motion";
import { PremiumCard } from "@/components/ui/PremiumCard";
import type { NewsArticle } from "@/lib/api";

function formatDate(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return null;
  }
}

interface Props {
  article: NewsArticle;
  index: number;
}

export function NewsCard({ article, index }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <PremiumCard className="p-0 overflow-hidden group">
        <div className="flex flex-col md:flex-row h-full">
          {article.url_to_image && (
            <div className="md:w-64 h-48 md:h-auto overflow-hidden shrink-0 border-b md:border-b-0 md:border-r border-zinc-900/50">
              <img
                src={article.url_to_image}
                alt={article.title || ""}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
            </div>
          )}
          <div className="flex-1 p-8 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {article.source_name && (
                    <span className="px-3 py-1 bg-zinc-950 border border-zinc-900 rounded-full text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                      {article.source_name}
                    </span>
                  )}
                  {article.published_at && (
                    <div className="flex items-center gap-1.5 text-zinc-600">
                      <Clock size={10} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{formatDate(article.published_at)}</span>
                    </div>
                  )}
                </div>
                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-2xl bg-zinc-950 border border-zinc-900 flex items-center justify-center text-zinc-600 hover:text-violet-400 hover:border-violet-400/20 transition-all"
                  >
                    <ArrowUpRight size={18} />
                  </a>
                )}
              </div>

              <h3 className="text-xl font-black text-white tracking-tight leading-tight group-hover:text-violet-400 transition-colors">
                {article.title}
              </h3>

              {article.description && (
                <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                  {expanded ? article.description : article.description.slice(0, 180) + (article.description.length > 180 ? "..." : "")}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-900/50">
              <div className="flex items-center gap-4">
                {article.author && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-600">
                      <User size={12} />
                    </div>
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest truncate max-w-[120px]">
                      {article.author}
                    </span>
                  </div>
                )}
              </div>
              {article.content && article.content.length > 180 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-[10px] font-black text-violet-500 uppercase tracking-widest hover:text-violet-400 transition-colors"
                >
                  {expanded ? "[ Collapse ]" : "[ Read Brief ]"}
                </button>
              )}
            </div>
          </div>
        </div>
      </PremiumCard>
    </motion.div>
  );
}
