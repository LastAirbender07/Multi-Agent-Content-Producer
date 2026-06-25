"use client";
import { Plus, X } from "lucide-react";
import type { SlideData } from "@/lib/api";
import type { SlideSnapshot } from "@/types/slideEditor";

interface ContentTabProps {
  snap: SlideSnapshot;
  slide: SlideData | null;
  setField: <K extends keyof SlideSnapshot>(key: K, val: SlideSnapshot[K], markDirty?: boolean) => void;
  Field: ({ label, children }: { label: string; children: React.ReactNode }) => React.ReactElement;
}

export function ContentTab({ snap, slide, setField, Field }: ContentTabProps) {
  return (
    <>
      <Field label="Title">
        <textarea id="slide-field-title" rows={2} value={snap.title}
          onChange={e => setField("title", e.target.value)}
          className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:border-violet-500/50 transition-all" />
      </Field>
      <Field label="Body">
        <textarea id="slide-field-body" rows={3} value={snap.body}
          onChange={e => setField("body", e.target.value)}
          className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:border-violet-500/50 transition-all" />
      </Field>
      <Field label="Bullets">
        <div id="slide-field-bullet" className="space-y-1.5">
          {snap.bullets.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-zinc-600 text-[10px] shrink-0">·</span>
              <input value={b} onChange={e => { const n = [...snap.bullets]; n[i] = e.target.value; setField("bullets", n); }}
                className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500/40" />
              <button onClick={() => setField("bullets", snap.bullets.filter((_, j) => j !== i))} className="text-zinc-700 hover:text-red-400 shrink-0"><X size={12} /></button>
            </div>
          ))}
          <button onClick={() => setField("bullets", [...snap.bullets, ""])} className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400"><Plus size={10} /> Add bullet</button>
        </div>
      </Field>
      {(slide?.type === "stat" || snap.statValue) && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stat Value"><input value={snap.statValue} onChange={e => setField("statValue", e.target.value)} placeholder="47%" className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500/50" /></Field>
          <Field label="Stat Label"><input value={snap.statLabel} onChange={e => setField("statLabel", e.target.value)} placeholder="of users" className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500/50" /></Field>
        </div>
      )}
    </>
  );
}
