"use client";
import { Tag, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  tags: string[];
  source: "pexels" | "ddgs";
}

export function ImageTagChips({ tags, source }: Props) {
  return (
    <AnimatePresence>
      {tags.length > 0 && (
        <motion.div
          key="tags"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex flex-wrap gap-2 px-2"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            <Tag size={11} />
            Tags:
          </div>
          {tags.map((tag) => (
            <div key={tag} className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-bold text-zinc-400">
              {tag}
            </div>
          ))}
          {source === "ddgs" && (
            <div className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-[10px] font-bold text-violet-400">
              <Sparkles size={9} className="inline mr-1" />
              3-variant search + LLM filter
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
