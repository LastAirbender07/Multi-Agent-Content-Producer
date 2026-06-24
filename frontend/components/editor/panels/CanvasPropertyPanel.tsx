"use client";
import { Row } from "./Row";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

interface Props {
  canvas: AnyObj;
  onChanged: () => void;
}

export function CanvasPropertyPanel({ canvas, onChanged }: Props) {
  return (
    <div className="p-3 space-y-2.5">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Canvas</p>
      <Row label="Background">
        <div className="flex items-center gap-2">
          <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-zinc-700">
            <div className="absolute inset-0" style={{ background: (canvas?.backgroundColor as string) ?? "#111111" }} />
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              value={(canvas?.backgroundColor as string) ?? "#111111"}
              onChange={e => { canvas?.set("backgroundColor", e.target.value); canvas?.renderAll(); onChanged(); }} />
          </div>
          <input type="text" value={(canvas?.backgroundColor as string) ?? "#111111"}
            onChange={e => { canvas?.set("backgroundColor", e.target.value); canvas?.renderAll(); onChanged(); }}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500/50" />
        </div>
      </Row>
      <div className="flex-1 flex flex-col items-center justify-center pt-8 text-center">
        <p className="text-[10px] text-zinc-700">Select an object to edit its properties.</p>
      </div>
    </div>
  );
}
