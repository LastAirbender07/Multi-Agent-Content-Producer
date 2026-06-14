"use client";
import { useRef, useState } from "react";
import { Paperclip, X, Loader2, FileText, FileJson, File, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addAttachedEvidence, removeAttachedEvidence } from "@/store/slices/pipelineSlice";
import { api } from "@/lib/api";
import type { AttachedEvidence } from "@/lib/api";

const ACCEPT = ".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.txt,.md,.markdown,.json,.csv,.xml,.html,.htm";

const FILE_ICON: Record<string, React.ReactNode> = {
  pdf: <FileText size={13} className="text-red-400" />,
  json: <FileJson size={13} className="text-amber-400" />,
  md: <FileText size={13} className="text-violet-400" />,
  markdown: <FileText size={13} className="text-violet-400" />,
  txt: <FileText size={13} className="text-zinc-400" />,
};

function fileIcon(ext: string) {
  return FILE_ICON[ext.toLowerCase()] ?? <File size={13} className="text-zinc-400" />;
}

function formatChars(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k chars`;
  return `${n} chars`;
}

interface UploadingFile {
  name: string;
  error?: string;
}

export function AttachedSourcesPanel() {
  const dispatch = useAppDispatch();
  const attachedEvidence = useAppSelector((s) => s.pipeline.attachedEvidence);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  async function processFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;

    // Mark all as uploading
    setUploading(list.map(f => ({ name: f.name })));

    await Promise.all(list.map(async (file, idx) => {
      try {
        const result = await api.parseDoc(file);
        const ext = file.name.split(".").pop() ?? "";
        const item: AttachedEvidence = {
          id: `${Date.now()}-${idx}-${file.name}`,
          title: result.title,
          evidence: result.text,
          source_type: "document",
          fileName: file.name,
          charCount: result.char_count,
          fileType: result.file_type,
          credibility_score: 0.9,
        };
        dispatch(addAttachedEvidence(item));
        setUploading(prev => prev.filter(u => u.name !== file.name));
      } catch (e: any) {
        setUploading(prev => prev.map(u =>
          u.name === file.name ? { ...u, error: e.message ?? "Failed to parse" } : u
        ));
        // Auto-clear error after 4s
        setTimeout(() => setUploading(prev => prev.filter(u => u.name !== file.name)), 4000);
      }
    }));
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }

  const hasAnything = attachedEvidence.length > 0 || uploading.length > 0;

  return (
    <div className="border-t border-zinc-800/50">
      {/* Section header */}
      <div className="flex items-center gap-2 px-5 py-3">
        <Paperclip size={13} className="text-zinc-500" />
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
          Your Sources
        </span>
        {attachedEvidence.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-400 text-[10px] font-black tabular-nums">
            {attachedEvidence.length}
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={onInputChange}
          className="hidden"
        />
      </div>

      {/* Drop zone (when empty) */}
      {!hasAnything && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`mx-4 mb-4 rounded-xl border-2 border-dashed transition-all cursor-pointer py-5 flex flex-col items-center gap-1.5 ${
            dragOver
              ? "border-violet-500/50 bg-violet-500/5"
              : "border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-800/20"
          }`}
        >
          <Paperclip size={16} className="text-zinc-600" />
          <p className="text-[11px] text-zinc-600 font-medium">
            Drop files or click to attach
          </p>
          <p className="text-[10px] text-zinc-700">
            PDF, DOCX, TXT, MD, JSON, CSV…
          </p>
        </div>
      )}

      {/* File list */}
      {hasAnything && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`px-4 pb-4 space-y-1.5 transition-all ${dragOver ? "ring-2 ring-violet-500/30 ring-inset rounded-xl" : ""}`}
        >
          <AnimatePresence initial={false}>
            {attachedEvidence.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-800/30 border border-zinc-800/60 group">
                  <div className="shrink-0">{fileIcon(doc.fileType)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-zinc-200 truncate">{doc.fileName}</p>
                    <p className="text-[10px] text-zinc-600">{formatChars(doc.charCount)}</p>
                  </div>
                  <button
                    onClick={() => dispatch(removeAttachedEvidence(doc.id))}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              </motion.div>
            ))}

            {uploading.map((u) => (
              <motion.div
                key={u.name}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${
                  u.error
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-zinc-800/20 border-zinc-800/50"
                }`}>
                  <div className="shrink-0">
                    {u.error
                      ? <AlertCircle size={13} className="text-red-400" />
                      : <Loader2 size={13} className="text-violet-400 animate-spin" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-zinc-300 truncate">{u.name}</p>
                    <p className={`text-[10px] ${u.error ? "text-red-400" : "text-zinc-600"}`}>
                      {u.error ?? "Parsing…"}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add more — shown only when files already exist */}
          {attachedEvidence.length > 0 && (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors py-1 text-center"
            >
              + add more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
