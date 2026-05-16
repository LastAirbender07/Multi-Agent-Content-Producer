"use client";
import { useState } from "react";
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Bookmark, 
  MoreHorizontal, 
  ChevronLeft, 
  ChevronRight,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BACKEND = "http://localhost:8000";

function slideImageUrl(path: string): string {
  return `${BACKEND}/${path.replace(/^\//, "")}`;
}

export function InstagramPost({
  slides,
  caption,
  hashtags,
  angleStatement,
}: {
  slides: string[];
  caption: string;
  hashtags: string[];
  angleStatement: string;
}) {
  const [idx, setIdx] = useState(0);
  const total = slides.length;

  return (
    <div className="flex flex-col gap-4 w-[380px]">
      {/* Angle context header */}
      <div className="flex items-center gap-2 px-1">
        <Sparkles size={14} className="text-violet-400" />
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate">
          {angleStatement}
        </p>
      </div>

      <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]">
              <div className="w-full h-full rounded-full bg-white p-[2px]">
                <div className="w-full h-full rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900 text-xs font-black">
                  CS
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900 tracking-tight">content_studio</p>
              <p className="text-[10px] text-zinc-400 font-medium">Original Audio</p>
            </div>
          </div>
          <MoreHorizontal size={18} className="text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer" />
        </div>

        {/* Slide viewer */}
        <div className="relative aspect-square bg-zinc-50 overflow-hidden group">
          <AnimatePresence mode="wait">
            <motion.img
              key={idx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              src={slideImageUrl(slides[idx])}
              alt={`Slide ${idx + 1}`}
              className="w-full h-full object-contain"
            />
          </AnimatePresence>

          {/* Navigation arrows */}
          {total > 1 && (
            <>
              <button
                onClick={() => setIdx(Math.max(0, idx - 1))}
                disabled={idx === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur shadow-lg rounded-full flex items-center justify-center disabled:opacity-0 hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft size={16} className="text-zinc-900" />
              </button>
              <button
                onClick={() => setIdx(Math.min(total - 1, idx + 1))}
                disabled={idx === total - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur shadow-lg rounded-full flex items-center justify-center disabled:opacity-0 hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronRight size={16} className="text-zinc-900" />
              </button>

              {/* Page Indicator Bubble */}
              <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur rounded-full text-[10px] font-bold text-white tracking-wider">
                {idx + 1}/{total}
              </div>
            </>
          )}

          {/* Dots */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-2 bg-white/10 backdrop-blur-md rounded-full">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === idx ? "bg-white scale-125 w-3" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <Heart size={24} className="text-zinc-900 hover:text-red-500 transition-colors cursor-pointer" />
              <MessageCircle size={24} className="text-zinc-900 hover:text-zinc-500 transition-colors cursor-pointer" />
              <Send size={24} className="text-zinc-900 hover:text-zinc-500 transition-colors cursor-pointer" />
            </div>
            <Bookmark size={24} className="text-zinc-900 hover:text-zinc-500 transition-colors cursor-pointer" />
          </div>
          <div className="flex -space-x-2 mb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-zinc-200" />
            ))}
            <span className="text-[11px] font-bold text-zinc-900 ml-4">
              Liked by <span className="font-black">alex_dev</span> and <span className="font-black">others</span>
            </span>
          </div>
        </div>

        {/* Caption */}
        <div className="px-5 pb-6 space-y-2">
          <p className="text-xs text-zinc-900 leading-snug">
            <span className="font-black">content_studio </span>
            {caption}
          </p>
          {hashtags.length > 0 && (
            <p className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer">
              {hashtags.map((h) => `#${h}`).join(" ")}
            </p>
          )}
          <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest pt-2 border-t border-zinc-100">
            Produced by Content Studio AI
          </p>
        </div>
      </div>
    </div>
  );
}
