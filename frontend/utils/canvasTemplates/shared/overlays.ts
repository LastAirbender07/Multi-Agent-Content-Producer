import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { isDarkTheme } from "@/utils/canvasTokens";
import { setData } from "./types";
import type { GlowDef } from "./types";

const CANVAS_SIZE = 1080;

// ── Utility ───────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const h = hex.replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  return `${parseInt(full.slice(0, 2), 16)},${parseInt(full.slice(2, 4), 16)},${parseInt(full.slice(4, 6), 16)}`;
}

// ── Overlay gradient ─────────────────────────────────────────────────────────
// Aurora (dark): heavy opacity to darken the background image for text legibility.
// Lumina (light): subtle opacity to keep image vibrant; the card provides contrast.

export function createOverlay(variant: "hook" | "content" | "quote", t: CanvasTokens): fabric.Rect {
  const bgRGB   = hexToRgb(t.bg);
  const pRGB    = hexToRgb(t.primary);
  const dark    = isDarkTheme(t);
  const opHigh  = dark ? 0.88 : 0.50;
  const opMid   = dark ? 0.65 : 0.32;
  const opLow   = dark ? 0.22 : 0.12;

  const stops = {
    hook:    [{ offset: 0, color: `rgba(${bgRGB},${opHigh})` }, { offset: 0.5, color: `rgba(${bgRGB},${opMid})` }, { offset: 1, color: `rgba(${pRGB},${opLow})` }],
    content: [{ offset: 0, color: `rgba(${bgRGB},${opHigh})` }, { offset: 1,   color: `rgba(${bgRGB},${opMid})` }],
    quote:   [{ offset: 0, color: `rgba(${bgRGB},${opMid})`  }, { offset: 1,   color: `rgba(${bgRGB},0.45)`     }],
  }[variant];

  const rect = new fabric.Rect({
    left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: new fabric.Gradient({ type: "linear", coords: { x1: 0, y1: 0, x2: CANVAS_SIZE, y2: CANVAS_SIZE }, colorStops: stops }),
    selectable: false, evented: false, originX: "left" as const, originY: "top" as const,
  });
  setData(rect, { role: "bg_overlay" });
  return rect;
}

// ── Gradient background (Engage) ─────────────────────────────────────────────
// Matches Jinja2: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)
// 135deg = top-left to bottom-right → x1=0,y1=0 to x2=width,y2=height

export function createGradientBg(t: CanvasTokens, height = CANVAS_SIZE - t.brandBarH): fabric.Rect {
  const rect = new fabric.Rect({
    left: 0, top: 0, width: CANVAS_SIZE, height,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: CANVAS_SIZE, y2: height },
      colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
    }),
    selectable: false, evented: false, originX: "left" as const, originY: "top" as const,
  });
  setData(rect, { role: "engage_bg" });
  return rect;
}

// ── Radial glow background ────────────────────────────────────────────────────

export function createGlowBg(glows: GlowDef[]): fabric.FabricObject[] {
  return glows.map((g, i) => {
    const el = new fabric.Ellipse({
      rx: g.rx, ry: g.ry, left: g.left, top: g.top,
      fill: new fabric.Gradient({
        type: "radial",
        coords: { x1: g.rx, y1: g.ry, r1: 0, x2: g.rx, y2: g.ry, r2: Math.max(g.rx, g.ry) },
        colorStops: [{ offset: 0, color: g.color }, { offset: 0.55, color: g.color + "55" }, { offset: 1, color: g.color.slice(0, 7) + "00" }],
      }),
      opacity: g.opacity, selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    });
    setData(el, { role: `bg_glow_${i}` });
    return el;
  });
}
