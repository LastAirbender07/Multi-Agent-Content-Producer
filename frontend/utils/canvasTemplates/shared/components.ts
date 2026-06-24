import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { setData, supportsCtxFilter } from "./types";
import { createBlurredRegion } from "./backgrounds";

// ── COMPONENT: Accent line ────────────────────────────────────────────────────

export function createAccentLine(t: CanvasTokens, width = 52, left = 0, top = 0): fabric.Rect {
  const rect = new fabric.Rect({
    left, top, width, height: 5, rx: 3,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: width, y2: 0 },
      colorStops: [
        { offset: 0,    color: t.primary },
        { offset: 0.55, color: t.secondary },
        { offset: 1,    color: t.secondary + "BB" },
      ],
    }),
    shadow: new fabric.Shadow({ color: t.primary + "80", blur: 8, offsetX: 0, offsetY: 2 }),
    originX: "left" as const, originY: "top" as const,
  });
  setData(rect, { role: "accent_line" });
  return rect;
}

// ── COMPONENT: Glass card (hook + quote) ─────────────────────────────────────
// rx:32 for extra smoothness

export async function createGlassCard(
  region: { left: number; top: number; width: number; height: number },
  imageUrl: string | null,
  blurRadius = 16,
  t: CanvasTokens,
  rx = 32,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];

  if (imageUrl) {
    try {
      const blurred = await createBlurredRegion(imageUrl, region, blurRadius);
      // Round the blurred region with a clip path matching rx
      const blurClip = new fabric.Rect({
        left: region.left, top: region.top, width: region.width, height: region.height, rx,
        absolutePositioned: true, originX: "left" as const, originY: "top" as const,
      });
      blurred.clipPath = blurClip;
      setData(blurred, { role: "glass_blur" });
      objects.push(blurred);
    } catch { /* fallthrough */ }
  }

  // Dark overlay
  const overlay = new fabric.Rect({
    left: region.left, top: region.top, width: region.width, height: region.height,
    fill: "#0d0d0d",
    opacity: imageUrl && supportsCtxFilter() ? 0.82 : 0.96,
    rx, selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  });
  setData(overlay, { role: "glass_overlay" });
  objects.push(overlay);

  // Inner top highlight
  const highlightH = Math.round(region.height * 0.08);
  const highlight = new fabric.Rect({
    left: region.left + 1, top: region.top + 1,
    width: region.width - 2, height: highlightH, rx,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: 0, y2: highlightH },
      colorStops: [{ offset: 0, color: "rgba(255,255,255,0.07)" }, { offset: 1, color: "rgba(255,255,255,0)" }],
    }),
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  });
  setData(highlight, { role: "card_highlight" });
  objects.push(highlight);

  return objects;
}

// ── COMPONENT: Bullet item ────────────────────────────────────────────────────

export function createBulletItem(
  text:   string,
  index:  number,
  t:      CanvasTokens,
  fontSize = 20,
  left = 0,
  top  = 0,
  width = 940,
): fabric.Group {
  const C = 28;  // circle diameter
  const circle = new fabric.Circle({
    radius: C / 2, left: 0, top: 2,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: C, y2: 0 },
      colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
    }),
    originX: "left" as const, originY: "top" as const,
  });
  const num = new fabric.Text(String(index + 1), {
    left: C / 2, top: 7, fontSize: 12, fontWeight: "700", fill: "#fff",
    fontFamily: t.fontBody, originX: "center" as const, originY: "top" as const,
  });
  const label = new fabric.Textbox(text, {
    left: C + 12, top: 0, width: width - C - 12,
    fontSize, fontWeight: "400", fill: "rgba(250,250,250,0.82)",
    fontFamily: t.fontBody, lineHeight: 1.45,
    originX: "left" as const, originY: "top" as const,
  });
  const g = new fabric.Group([circle, num, label], {
    left, top, originX: "left" as const, originY: "top" as const,
  });
  setData(g, { role: "bullet_item", index });
  return g;
}

// ── COMPONENT: Insight item (quote slide) ────────────────────────────────────

export function createInsightItem(text: string, t: CanvasTokens, left = 0, top = 0, width = 930): fabric.Group {
  const dot = new fabric.Circle({
    radius: 5, left: 0, top: 9, fill: t.primary,
    originX: "left" as const, originY: "top" as const,
  });
  const label = new fabric.Textbox(text, {
    left: 22, top: 0, width: width - 22,
    fontSize: 21, fontWeight: "400", fill: "rgba(250,250,250,0.80)",
    fontFamily: t.fontBody, lineHeight: 1.5,
    originX: "left" as const, originY: "top" as const,
  });
  const g = new fabric.Group([dot, label], {
    left, top, originX: "left" as const, originY: "top" as const,
  });
  setData(g, { role: "insight_item" });
  return g;
}
