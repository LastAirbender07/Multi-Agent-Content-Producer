"use client";
import { Loader2, X, Trash2 } from "lucide-react";
import { ASSET_BASE } from "@/lib/api/client";
import type { ImageLibraryItem } from "@/lib/api";

export interface ImageThumbProps {
  item: ImageLibraryItem;
  deleteState: Record<string, "confirming" | "deleting" | "deleted">;
  onImageApply: (url: string) => void;
  onStartDelete: (item: ImageLibraryItem) => void;
  onConfirmDelete: (item: ImageLibraryItem) => void;
  onCancelDelete: (path: string) => void;
  onRightClick: (e: React.MouseEvent, item: ImageLibraryItem) => void;
}

export function ImageThumb({
  item,
  deleteState,
  onImageApply,
  onStartDelete,
  onConfirmDelete,
  onCancelDelete,
  onRightClick,
}: ImageThumbProps) {
  const dState = deleteState[item.path];
  const isGhost = dState === "deleted";
  return (
    <div
      className={`relative group rounded-lg overflow-hidden bg-zinc-900 aspect-square transition-all duration-300 ${isGhost ? "opacity-30" : ""}`}
      draggable
      onDragStart={e => e.dataTransfer.setData("imageUrl", `${ASSET_BASE}${item.url}`)}
      onContextMenu={e => onRightClick(e, item)}
    >
      <img
        src={`${ASSET_BASE}${item.url}`}
        alt={item.filename}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {/* Hover overlay */}
      {!dState && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
          <button
            onClick={() => onImageApply(`${ASSET_BASE}${item.url}`)}
            className="px-2 py-1 rounded bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-500 transition-all"
          >
            Apply
          </button>
          <button
            onClick={() => onStartDelete(item)}
            className="p-1 rounded bg-red-600/80 text-white hover:bg-red-500 transition-all"
          >
            <Trash2 size={10} />
          </button>
        </div>
      )}
      {/* Delete confirm chip */}
      {dState === "confirming" && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-1 p-1">
          <p className="text-[9px] text-white text-center font-semibold">Delete?</p>
          <div className="flex gap-1">
            <button onClick={() => onConfirmDelete(item)} className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold">Yes</button>
            <button onClick={() => onCancelDelete(item.path)} className="px-2 py-0.5 rounded bg-zinc-700 text-white text-[9px]">No</button>
          </div>
        </div>
      )}
      {dState === "deleting" && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <Loader2 size={14} className="text-zinc-400 animate-spin" />
        </div>
      )}
      {isGhost && (
        <div className="absolute inset-0 flex items-center justify-center">
          <X size={16} className="text-red-400" />
        </div>
      )}
    </div>
  );
}
