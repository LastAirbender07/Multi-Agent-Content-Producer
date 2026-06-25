"use client";
import { Image as ImageIcon } from "lucide-react";

interface ImageTabProps {
  onOpenImageModal: () => void;
}

export function ImageTab({ onOpenImageModal }: ImageTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        <ImageIcon size={28} className="text-zinc-600" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-zinc-300 mb-1">Change slide image</p>
        <p className="text-xs text-zinc-600">Search Pexels, upload a file, or paste a URL</p>
      </div>
      <button onClick={onOpenImageModal}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-all">
        <ImageIcon size={14} /> Open Image Picker
      </button>
      <p className="text-[10px] text-zinc-700">Tip: you can also click on the image in the slide preview</p>
    </div>
  );
}
