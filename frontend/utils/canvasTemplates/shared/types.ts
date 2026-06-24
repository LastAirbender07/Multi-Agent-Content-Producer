import * as fabric from "fabric";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FabricAny = fabric.FabricObject & { data?: any };

export function setData(obj: fabric.FabricObject, data: Record<string, unknown>): fabric.FabricObject {
  (obj as FabricAny).data = data;
  return obj;
}

// ── ctx.filter support detection ─────────────────────────────────────────────

let _ctxFilterSupported: boolean | null = null;
export function supportsCtxFilter(): boolean {
  if (_ctxFilterSupported !== null) return _ctxFilterSupported;
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.filter = "blur(1px)";
  _ctxFilterSupported = ctx.filter !== "none" && ctx.filter !== "";
  return _ctxFilterSupported;
}

export interface GlowDef {
  rx:      number;   // ellipse x-radius
  ry:      number;   // ellipse y-radius
  left:    number;
  top:     number;
  color:   string;
  opacity: number;
}

export interface PillButtonOptions {
  label:    string;
  style:    "gradient" | "ghost" | "frosted-glow" | "solid-white" | "dark-pill" | "dark-gradient" | "glass";
  width?:   number;
  height?:  number;
  fontSize?: number;
  left?:    number;
  top?:     number;
  role?:    string;
}
