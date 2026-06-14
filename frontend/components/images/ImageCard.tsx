"use client";
import { Check, Camera, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import type { PexelsPhoto, DDGSImage } from "@/lib/api";

function getBentoSpan(width?: number, height?: number, index: number = 0) {
  if (!width || !height) return { rowSpan: 1, colSpan: 1 };
  const ratio = width / height;
  if (ratio > 1.5) return { rowSpan: 1, colSpan: 2 };
  if (ratio < 0.8) return { rowSpan: 2, colSpan: 1 };
  if (ratio >= 0.8 && ratio <= 1.5 && index % 5 === 0) return { rowSpan: 2, colSpan: 2 };
  return { rowSpan: 1, colSpan: 1 };
}

interface PexelsCardProps {
  photo: PexelsPhoto;
  index: number;
  isSelected: boolean;
  inSelectMode: boolean;
  onToggle: (i: number) => void;
}

export function PexelsCard({ photo, index, isSelected, inSelectMode, onToggle }: PexelsCardProps) {
  const { rowSpan, colSpan } = getBentoSpan(photo.width, photo.height, index);
  return (
    <motion.div
      key={photo.id}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`group relative rounded-3xl overflow-hidden bg-zinc-900 border shadow-lg cursor-pointer transition-all ${
        isSelected ? "border-violet-500 shadow-violet-500/20" : "border-zinc-800/50"
      }`}
      style={{
        gridRowEnd: `span ${rowSpan}`,
        gridColumnEnd: colSpan === 2 ? "span 2" : undefined,
      }}
      onClick={() => onToggle(index)}
    >
      <img
        src={photo.src.large2x || photo.src.large || photo.src.medium}
        alt={photo.photographer}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <SelectOverlay isSelected={isSelected} inSelectMode={inSelectMode} />
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity p-5 flex flex-col justify-end gap-1.5 pointer-events-none">
        <p className="text-[10px] font-black text-white uppercase tracking-widest">{photo.photographer}</p>
        <a
          href={photo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[9px] font-black text-violet-400 uppercase tracking-widest hover:text-white transition-colors pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <Camera size={10} />
          Pexels
        </a>
      </div>
    </motion.div>
  );
}

interface DDGSCardProps {
  img: DDGSImage;
  index: number;
  isSelected: boolean;
  inSelectMode: boolean;
  onToggle: (i: number) => void;
}

export function DDGSCard({ img, index, isSelected, inSelectMode, onToggle }: DDGSCardProps) {
  const { rowSpan, colSpan } = getBentoSpan(img.width, img.height, index);
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`group relative rounded-3xl overflow-hidden bg-zinc-900 border shadow-lg cursor-pointer transition-all ${
        isSelected ? "border-violet-500 shadow-violet-500/20" : "border-zinc-800/50"
      }`}
      style={{
        gridRowEnd: `span ${rowSpan}`,
        gridColumnEnd: colSpan === 2 ? "span 2" : undefined,
      }}
      onClick={() => onToggle(index)}
    >
      <img
        src={img.image}
        alt={img.title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <SelectOverlay isSelected={isSelected} inSelectMode={inSelectMode} />
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity p-5 flex flex-col justify-end gap-1.5 pointer-events-none">
        <p className="text-[10px] font-black text-white uppercase tracking-widest truncate">{img.title}</p>
        {img.url && (
          <a
            href={img.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[9px] font-black text-violet-400 uppercase tracking-widest hover:text-white transition-colors pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={10} />
            Source
          </a>
        )}
      </div>
    </motion.div>
  );
}

function SelectOverlay({ isSelected, inSelectMode }: { isSelected: boolean; inSelectMode: boolean }) {
  return (
    <div className={`absolute top-3 left-3 w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${
      isSelected
        ? "bg-violet-600 border-violet-600 shadow-lg shadow-violet-600/40"
        : "bg-black/40 border-white/30 opacity-0 group-hover:opacity-100"
    } ${inSelectMode ? "opacity-100!" : ""}`}>
      {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
    </div>
  );
}
