"use client";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, ChevronUp, ChevronDown, Copy, Trash2 } from "lucide-react";
import type { SelectedObjectInfo } from "@/components/editor/FabricCanvas";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any;

interface ContextToolbarProps {
  selectedObject: SelectedObjectInfo;
  canvas: FabricCanvas;
  onChanged: () => void;
  style: React.CSSProperties;
}

const FONT_SIZES = [14, 18, 24, 32, 48, 64, 80];

export function ContextToolbar({ selectedObject, canvas, onChanged, style }: ContextToolbarProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj: any = canvas?.getActiveObject();
  if (!obj) return null;

  function mutate(updates: Record<string, unknown>) {
    obj.set(updates);
    canvas.renderAll();
    onChanged();
  }

  const isText = selectedObject.type === "textbox";

  return (
    <div
      className="absolute z-30 flex items-center gap-0.5 bg-zinc-900/95 border border-zinc-700 rounded-xl px-2 py-1.5 shadow-xl backdrop-blur-sm flex-wrap"
      style={style}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Text-specific controls */}
      {isText && (
        <>
          <button onClick={() => mutate({ fontWeight: obj.fontWeight === "bold" ? "normal" : "bold" })} title="Bold"
            className={`p-1.5 rounded-lg transition-all ${obj.fontWeight === "bold" ? "bg-violet-600/30 text-violet-300" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"}`}>
            <Bold size={12} />
          </button>
          <button onClick={() => mutate({ fontStyle: obj.fontStyle === "italic" ? "normal" : "italic" })} title="Italic"
            className={`p-1.5 rounded-lg transition-all ${obj.fontStyle === "italic" ? "bg-violet-600/30 text-violet-300" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"}`}>
            <Italic size={12} />
          </button>

          <div className="w-px h-3 bg-zinc-700 mx-0.5" />

          {FONT_SIZES.map(sz => (
            <button key={sz} onClick={() => mutate({ fontSize: sz })} title={`${sz}px`}
              className={`px-1.5 py-1 rounded-md text-[10px] font-bold transition-all ${obj.fontSize === sz ? "bg-violet-600 text-white" : "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50"}`}>
              {sz}
            </button>
          ))}

          <div className="w-px h-3 bg-zinc-700 mx-0.5" />

          <div className="relative w-6 h-6 rounded-md overflow-hidden border border-zinc-700 cursor-pointer" title="Text color">
            <div className="absolute inset-0" style={{ background: obj.fill ?? "#ffffff" }} />
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              value={obj.fill ?? "#ffffff"}
              onChange={e => mutate({ fill: e.target.value })} />
          </div>

          <div className="w-px h-3 bg-zinc-700 mx-0.5" />

          <button onClick={() => mutate({ textAlign: "left" })} title="Align left"
            className={`p-1.5 rounded-lg transition-all ${obj.textAlign === "left" ? "bg-violet-600/30 text-violet-300" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"}`}>
            <AlignLeft size={12} />
          </button>
          <button onClick={() => mutate({ textAlign: "center" })} title="Center"
            className={`p-1.5 rounded-lg transition-all ${obj.textAlign === "center" ? "bg-violet-600/30 text-violet-300" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"}`}>
            <AlignCenter size={12} />
          </button>
          <button onClick={() => mutate({ textAlign: "right" })} title="Align right"
            className={`p-1.5 rounded-lg transition-all ${obj.textAlign === "right" ? "bg-violet-600/30 text-violet-300" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"}`}>
            <AlignRight size={12} />
          </button>

          <div className="w-px h-3 bg-zinc-700 mx-0.5" />
        </>
      )}

      {/* Universal controls */}
      <button onClick={() => { canvas.bringObjectForward(obj); canvas.renderAll(); onChanged(); }} title="Bring forward"
        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all">
        <ChevronUp size={12} />
      </button>
      <button onClick={() => { canvas.sendObjectBackwards(obj); canvas.renderAll(); onChanged(); }} title="Send backward"
        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all">
        <ChevronDown size={12} />
      </button>
      <button onClick={() => {
        obj.clone().then((cloned: Record<string, unknown> & { set: (o: Record<string, unknown>) => void; left?: number; top?: number }) => {
          cloned.set({ left: (obj.left ?? 0) + 20, top: (obj.top ?? 0) + 20 });
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
          canvas.renderAll();
          onChanged();
        });
      }} title="Duplicate" className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all">
        <Copy size={12} />
      </button>
      <button onClick={() => { canvas.remove(obj); canvas.renderAll(); onChanged(); }} title="Delete"
        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
        <Trash2 size={12} />
      </button>
    </div>
  );
}
