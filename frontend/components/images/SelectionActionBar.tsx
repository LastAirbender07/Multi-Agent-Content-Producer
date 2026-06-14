"use client";
import { Check, Download, FolderOpen, Loader2, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type DownloadStatus = "idle" | "saving" | "done" | "error";

interface Props {
  selectedCount: number;
  downloadStatus: DownloadStatus;
  downloadSaveDir: string;
  downloadError: string | null;
  onDownload: () => void;
  onClear: () => void;
}

export function SelectionActionBar({ selectedCount, downloadStatus, downloadSaveDir, downloadError, onDownload, onClear }: Props) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 px-5 py-3.5 bg-zinc-900/95 backdrop-blur-2xl border border-zinc-700 rounded-4xl shadow-2xl shadow-black/60">
            <div className="px-3 py-1.5 bg-violet-600 rounded-xl text-xs font-black text-white">
              {selectedCount} selected
            </div>

            {downloadStatus === "done" && (
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <Check size={12} strokeWidth={3} />
                Saved to {downloadSaveDir}
              </span>
            )}
            {downloadStatus === "error" && downloadError && (
              <span className="text-[11px] font-bold text-red-400 flex items-center gap-1.5">
                <AlertCircle size={12} />
                {downloadError}
              </span>
            )}

            <div className="flex items-center gap-2 ml-1">
              <button
                onClick={onDownload}
                disabled={downloadStatus === "saving"}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-xs font-black text-white uppercase tracking-widest transition-all active:scale-95"
              >
                {downloadStatus === "saving" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : downloadStatus === "done" ? (
                  <FolderOpen size={13} />
                ) : (
                  <Download size={13} />
                )}
                {downloadStatus === "saving" ? "Saving…" : downloadStatus === "done" ? "Saved" : "Download"}
              </button>
              <button
                onClick={onClear}
                className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 hover:text-white transition-all"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
