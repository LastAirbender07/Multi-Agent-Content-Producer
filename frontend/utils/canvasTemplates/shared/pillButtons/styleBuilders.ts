/**
 * Pill button style builders — each returns the FabricObject[] items array.
 * Imported and dispatched by createPillButton() in ../buttons.ts.
 *
 * Shared types: FabricFill, createShimmer — defined in this file.
 */

import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FabricFill = string | fabric.Gradient<any, any> | fabric.Pattern;

export function createShimmer(W: number, H: number, R: number, heightRatio: number, topAlpha: number): fabric.Rect {
  const shimmerH = H * heightRatio;
  return new fabric.Rect({
    left: 3, top: 2, width: W - 6, height: shimmerH, rx: R,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: 0, y2: shimmerH },
      colorStops: [{ offset: 0, color: `rgba(255,255,255,${topAlpha})` }, { offset: 1, color: "rgba(255,255,255,0)" }],
    }),
    originX: "left" as const, originY: "top" as const,
  });
}

// ── Gradient — filled aurora gradient, white text ─────────────────────────────
export function buildGradientStyle(t: CanvasTokens, W: number, H: number, R: number, FS: number, label: string): fabric.FabricObject[] {
  return [
    new fabric.Rect({ left: 0, top: 0, width: W, height: H, rx: R,
      fill: new fabric.Gradient({ type: "linear", coords: { x1: 0, y1: 0, x2: W, y2: 0 },
        colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }] }),
      originX: "left" as const, originY: "top" as const }),
    new fabric.Rect({ left: 4, top: 2, width: W - 8, height: H * 0.38, rx: R,
      fill: new fabric.Gradient({ type: "linear", coords: { x1: 0, y1: 0, x2: 0, y2: H * 0.38 },
        colorStops: [{ offset: 0, color: "rgba(255,255,255,0.18)" }, { offset: 1, color: "rgba(255,255,255,0)" }] }),
      originX: "left" as const, originY: "top" as const }),
    new fabric.Text(label, { left: W / 2, top: H / 2, fontSize: FS, fontWeight: "700", fill: "#fff",
      fontFamily: `${t.fontTitle}, sans-serif`, charSpacing: 40,
      originX: "center" as const, originY: "center" as const }),
  ];
}

// ── Ghost — transparent, white border + white text ────────────────────────────
export function buildGhostStyle(t: CanvasTokens, W: number, H: number, R: number, FS: number, label: string): fabric.FabricObject[] {
  return [
    new fabric.Rect({ left: 0, top: 0, width: W, height: H, rx: R,
      fill: "transparent", stroke: "rgba(255,255,255,0.80)", strokeWidth: 2,
      originX: "left" as const, originY: "top" as const }),
    new fabric.Text(label, { left: W / 2, top: H / 2, fontSize: FS, fontWeight: "700", fill: "#ffffff",
      fontFamily: `${t.fontTitle}, sans-serif`, charSpacing: 40,
      originX: "center" as const, originY: "center" as const }),
  ];
}

// ── Frosted glow — translucent white + border + glow shadow ───────────────────
export function buildFrostedGlowStyle(t: CanvasTokens, W: number, H: number, R: number, FS: number, label: string): fabric.FabricObject[] {
  return [
    new fabric.Rect({ left: 0, top: 0, width: W, height: H, rx: R,
      fill: "rgba(255,255,255,0.12)", stroke: "rgba(255,255,255,0.55)", strokeWidth: 1.5,
      shadow: new fabric.Shadow({ color: t.primary + "66", blur: 22, offsetX: 0, offsetY: 4 }),
      originX: "left" as const, originY: "top" as const }),
    createShimmer(W, H, R, 0.32, 0.20),
    new fabric.Text(label, { left: W / 2, top: H / 2, fontSize: FS, fontWeight: "700", fill: "#ffffff",
      fontFamily: t.fontBody, charSpacing: 30,
      originX: "center" as const, originY: "center" as const }),
  ];
}

// ── Solid white — white fill, gradient text ───────────────────────────────────
export function buildSolidWhiteStyle(t: CanvasTokens, W: number, H: number, R: number, FS: number, label: string): fabric.FabricObject[] {
  return [
    new fabric.Rect({ left: 0, top: 0, width: W, height: H, rx: R, fill: "#FFFFFF",
      originX: "left" as const, originY: "top" as const }),
    new fabric.Text(label, { left: W / 2, top: H / 2, fontSize: FS, fontWeight: "700",
      fill: new fabric.Gradient({ type: "linear", coords: { x1: 0, y1: 0, x2: W * 0.8, y2: 0 },
        colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }] }) as FabricFill,
      fontFamily: `${t.fontTitle}, sans-serif`, charSpacing: 40,
      originX: "center" as const, originY: "center" as const }),
  ];
}

// ── Dark pill — semi-opaque dark fill, white border + shimmer ─────────────────
export function buildDarkPillStyle(t: CanvasTokens, W: number, H: number, R: number, FS: number, label: string): fabric.FabricObject[] {
  void t;
  return [
    new fabric.Rect({ left: 0, top: 0, width: W, height: H, rx: R,
      fill: "rgba(9,9,9,0.55)", stroke: "rgba(255,255,255,0.70)", strokeWidth: 1.5,
      originX: "left" as const, originY: "top" as const }),
    createShimmer(W, H, R, 0.30, 0.10),
    new fabric.Text(label, { left: W / 2, top: H / 2, fontSize: FS, fontWeight: "700", fill: "#ffffff",
      fontFamily: t.fontBody, charSpacing: 30,
      originX: "center" as const, originY: "center" as const }),
  ];
}

// ── Dark + gradient text — solid dark fill, lighter gradient text ─────────────
export function buildDarkGradientStyle(t: CanvasTokens, W: number, H: number, R: number, FS: number, label: string): fabric.FabricObject[] {
  return [
    new fabric.Rect({ left: 0, top: 0, width: W, height: H, rx: R, fill: "rgba(9,9,9,0.70)",
      originX: "left" as const, originY: "top" as const }),
    new fabric.Text(label, { left: W / 2, top: H / 2, fontSize: FS, fontWeight: "700",
      fill: new fabric.Gradient({ type: "linear", coords: { x1: 0, y1: 0, x2: W * 0.85, y2: 0 },
        colorStops: [{ offset: 0, color: "#A78BFA" }, { offset: 1, color: "#5EEAD4" }] }) as FabricFill,
      fontFamily: `${t.fontTitle}, sans-serif`, charSpacing: 40,
      originX: "center" as const, originY: "center" as const }),
  ];
}
