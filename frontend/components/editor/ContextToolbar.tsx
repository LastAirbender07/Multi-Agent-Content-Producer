"use client";
import { useRef, useCallback } from "react";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, ChevronUp, ChevronDown, Copy, Trash2, Ungroup, ImageIcon } from "lucide-react";
import type { SelectedObjectInfo } from "@/components/editor/FabricCanvas";
import { fillImageSlot } from "@/components/editor/canvasDropHandlers";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any;

interface ContextToolbarProps {
  selectedObject: SelectedObjectInfo;
  canvas: FabricCanvas;
  onChanged: () => void;
  onUngroup?: () => void;
  onCommit?: (label: string) => void;
  style: React.CSSProperties;
}

const FONT_SIZES = [14, 18, 24, 32, 48, 64, 80];

/** Roles that support the "Replace Photo" slot-fill button */
const IMAGE_SLOT_ROLES = new Set(["phone_mockup", "image_pair", "polaroid_frame"]);

export function ContextToolbar({ selectedObject, canvas, onChanged, onUngroup, onCommit, style }: ContextToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Capture the active group BEFORE the file picker opens — opening the picker
  // blurs the canvas which clears canvas.getActiveObject(), so we must snapshot it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingSlotRef = useRef<any>(null);

  /** Opens OS file picker; captures active object first so blur doesn't lose it */
  const handleReplacePhoto = useCallback(() => {
    pendingSlotRef.current = canvas?.getActiveObject() ?? null;
    fileInputRef.current?.click();
  }, [canvas]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const targetGroup = pendingSlotRef.current;
    pendingSlotRef.current = null;
    if (!targetGroup) { console.warn("[ReplacePhoto] no pending slot — was canvas deselected?"); return; }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    await fillImageSlot(canvas, targetGroup, dataUrl);
    onChanged();
  }, [canvas, onChanged]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj: any = canvas?.getActiveObject();
  if (!obj) return null;

  const isImageSlot = IMAGE_SLOT_ROLES.has(selectedObject.role ?? "");

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
      {/* Hidden file input for Replace Photo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
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

      {/* Image-slot: Replace Photo button */}
      {isImageSlot && (
        <>
          <button
            onClick={handleReplacePhoto}
            title="Replace photo — opens file picker"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-violet-300 hover:text-white hover:bg-violet-600/40 transition-all"
          >
            <ImageIcon size={11} />
            Replace Photo
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
      {selectedObject.fabricType === "group" && onUngroup && (
        <button onClick={onUngroup} title="Ungroup — edit individual elements"
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all">
          <Ungroup size={12} />
        </button>
      )}
      <button onClick={() => {
        onCommit?.("duplicate");
        obj.clone().then((cloned: Record<string, unknown> & { set: (o: Record<string, unknown>) => void; left?: number; top?: number }) => {
          cloned.set({ left: (obj.left ?? 0) + 20, top: (obj.top ?? 0) + 20 });
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
          canvas.renderAll();
          onChanged();
        }).catch((err: unknown) => console.error("Duplicate failed:", err));
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
