/**
 * Pill button component factory.
 * Each visual style lives in ./pillButtons/styleBuilders.ts.
 * This file dispatches to the right builder and wraps the result in a fabric.Group.
 */

import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { setData } from "./types";
import type { PillButtonOptions } from "./types";
import {
  buildGradientStyle,
  buildGhostStyle,
  buildFrostedGlowStyle,
  buildSolidWhiteStyle,
  buildDarkPillStyle,
  buildDarkGradientStyle,
} from "./pillButtons/styleBuilders";

export function createPillButton(t: CanvasTokens, opts: PillButtonOptions): fabric.Group {
  const H     = opts.height   ?? 66;
  const FS    = opts.fontSize  ?? 20;
  const W     = opts.width    ?? Math.round(opts.label.length * (FS * 0.52) + 80);
  const R     = H / 2;
  // "glass" is a legacy alias for "frosted-glow"
  const style = opts.style === "glass" ? "frosted-glow" : opts.style;

  let items: fabric.FabricObject[];

  switch (style) {
    case "gradient":     items = buildGradientStyle(t, W, H, R, FS, opts.label);     break;
    case "ghost":        items = buildGhostStyle(t, W, H, R, FS, opts.label);        break;
    case "frosted-glow": items = buildFrostedGlowStyle(t, W, H, R, FS, opts.label); break;
    case "solid-white":  items = buildSolidWhiteStyle(t, W, H, R, FS, opts.label);  break;
    case "dark-pill":    items = buildDarkPillStyle(t, W, H, R, FS, opts.label);    break;
    case "dark-gradient":items = buildDarkGradientStyle(t, W, H, R, FS, opts.label);break;
    default:
      console.warn(`createPillButton: unknown style "${opts.style}", falling back to gradient`);
      items = buildGradientStyle(t, W, H, R, FS, opts.label);
  }

  const g = new fabric.Group(items, {
    left: opts.left ?? 0, top: opts.top ?? 0,
    originX: "left" as const, originY: "top" as const,
  });
  setData(g, { role: opts.role ?? "pill_button" });
  return g;
}

// ── Eyebrow pill (B3 frosted-glow, used above headings) ───────────────────────

export function createEyebrowPill(text: string, t: CanvasTokens, left: number, top: number): fabric.Group {
  const FS  = 13;
  const PH  = 34;
  const PW  = Math.round(text.length * (FS * 0.52) + 48);
  const PX  = left - PW / 2;
  const PR  = PH / 2;

  const bg = new fabric.Rect({
    left: 0, top: 0, width: PW, height: PH, rx: PR,
    fill: "rgba(255,255,255,0.14)",
    stroke: "rgba(255,255,255,0.72)", strokeWidth: 1.2,
    shadow: new fabric.Shadow({ color: "rgba(255,255,255,0.25)", blur: 12, offsetX: 0, offsetY: 2 }),
    originX: "left" as const, originY: "top" as const,
  });
  const shimmer = new fabric.Rect({
    left: 2, top: 1, width: PW - 4, height: PH * 0.35, rx: PR,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: 0, y2: PH * 0.35 },
      colorStops: [{ offset: 0, color: "rgba(255,255,255,0.22)" }, { offset: 1, color: "rgba(255,255,255,0)" }],
    }),
    originX: "left" as const, originY: "top" as const,
  });
  const label = new fabric.Text(text, {
    left: PW / 2, top: PH / 2,
    fontSize: FS, fontWeight: "700", fill: "#FFFFFF",
    fontFamily: t.fontBody, charSpacing: 80,
    originX: "center" as const, originY: "center" as const,
  });
  const g = new fabric.Group([bg, shimmer, label], {
    left: Math.max(0, PX), top,
    originX: "left" as const, originY: "top" as const,
  });
  setData(g, { role: "eyebrow_pill" });
  return g;
}
