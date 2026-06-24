import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { setData } from "./types";
import type { GlowDef } from "./types";

const CS = 1080;

// ── Overlay gradient ─────────────────────────────────────────────────────────

export function createOverlay(variant: "hook" | "content" | "quote", t: CanvasTokens): fabric.Rect {
  const hex2rgb = (h: string) => `${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)}`;
  const pRGB = hex2rgb(t.primary);
  const stops = {
    hook:    [{ offset: 0, color: "rgba(9,9,9,0.88)" }, { offset: 0.5, color: "rgba(9,9,9,0.65)" }, { offset: 1, color: `rgba(${pRGB},0.22)` }],
    content: [{ offset: 0, color: "rgba(9,9,9,0.93)" }, { offset: 1, color: "rgba(9,9,9,0.78)" }],
    quote:   [{ offset: 0, color: "rgba(9,9,9,0.78)" }, { offset: 1, color: "rgba(9,9,9,0.62)" }],
  }[variant];
  const rect = new fabric.Rect({
    left: 0, top: 0, width: CS, height: CS,
    fill: new fabric.Gradient({ type: "linear", coords: { x1: 0, y1: 0, x2: CS * 0.707, y2: CS * 0.707 }, colorStops: stops }),
    selectable: false, evented: false, originX: "left" as const, originY: "top" as const,
  });
  setData(rect, { role: "bg_overlay" });
  return rect;
}

// ── Gradient background (CTA / Engage) ───────────────────────────────────────

export function createGradientBg(t: CanvasTokens, height = CS - t.brandBarH): fabric.Rect {
  const rect = new fabric.Rect({
    left: 0, top: 0, width: CS, height,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: CS, y1: 0, x2: 0, y2: height },  // CSS 135deg
      colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
    }),
    selectable: false, evented: false, originX: "left" as const, originY: "top" as const,
  });
  setData(rect, { role: "engage_bg" });
  return rect;
}

// ── COMPONENT: Radial glow background ────────────────────────────────────────

export function createGlowBg(glows: GlowDef[]): fabric.FabricObject[] {
  return glows.map((g, i) => {
    const el = new fabric.Ellipse({
      rx: g.rx, ry: g.ry, left: g.left, top: g.top,
      fill: new fabric.Gradient({
        type: "radial",
        coords: { x1: g.rx, y1: g.ry, r1: 0, x2: g.rx, y2: g.ry, r2: Math.max(g.rx, g.ry) },
        colorStops: [{ offset: 0, color: g.color }, { offset: 0.55, color: g.color + "55" }, { offset: 1, color: "transparent" }],
      }),
      opacity: g.opacity, selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    });
    setData(el, { role: `bg_glow_${i}` });
    return el;
  });
}
