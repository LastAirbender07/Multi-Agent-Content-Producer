import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { isDarkTheme } from "@/utils/canvasTokens";
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
// Uses t.surface for fill: Aurora (#131313) gets a dark frosted card,
// Lumina (#FFFFFF) gets a light frosted card. Opacity is higher when there
// is no image (no blurred region to provide depth).

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
      const blurClip = new fabric.Rect({
        left: region.left, top: region.top, width: region.width, height: region.height, rx,
        absolutePositioned: true, originX: "left" as const, originY: "top" as const,
      });
      blurred.clipPath = blurClip;
      setData(blurred, { role: "glass_blur" });
      objects.push(blurred);
    } catch { /* fallthrough */ }
  }

  // Card fill with clip path to ensure rounded corners are clean — no edge bleed
  const cardClip = new fabric.Rect({
    left: region.left, top: region.top, width: region.width, height: region.height, rx,
    absolutePositioned: true, originX: "left" as const, originY: "top" as const,
  });
  const overlay = new fabric.Rect({
    left: region.left, top: region.top, width: region.width, height: region.height,
    fill: t.surface,
    opacity: imageUrl && supportsCtxFilter() ? 0.88 : 0.96,
    rx, selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
    clipPath: cardClip,
  });
  setData(overlay, { role: "glass_overlay" });
  objects.push(overlay);

  // Lumina: subtle primary→secondary diagonal tint + hairline border for a modern card feel
  // Aurora: no extra decoration — the dark surface + blurred image provide depth
  if (!isDarkTheme(t)) {
    // Diagonal gradient wash (5% opacity) — makes the white card feel alive
    const tintClip = new fabric.Rect({
      left: region.left, top: region.top, width: region.width, height: region.height, rx,
      absolutePositioned: true, originX: "left" as const, originY: "top" as const,
    });
    const tint = new fabric.Rect({
      left: region.left, top: region.top, width: region.width, height: region.height,
      fill: new fabric.Gradient({
        type: "linear",
        coords: { x1: 0, y1: 0, x2: region.width, y2: region.height },
        colorStops: [{ offset: 0, color: t.primary + "0D" }, { offset: 1, color: t.secondary + "08" }],
      }),
      rx, selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
      clipPath: tintClip,
    });
    setData(tint, { role: "card_tint" });
    objects.push(tint);

    // Hairline border using primary color at low opacity
    const border = new fabric.Rect({
      left: region.left, top: region.top, width: region.width, height: region.height,
      fill: "transparent",
      stroke: t.primary + "33",  // 20% opacity
      strokeWidth: 1.5,
      rx, selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    });
    setData(border, { role: "card_border" });
    objects.push(border);
  }

  // Removed the inner top highlight — it caused a visible white tinge at 2x scale

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
    fontSize, fontWeight: "400", fill: t.muted,
    fontFamily: t.fontBody, lineHeight: 1.55,  // matches Jinja2 .bullet-text { line-height: 1.55 }
    originX: "left" as const, originY: "top" as const,
  });
  const g = new fabric.Group([circle, num, label], {
    left, top, originX: "left" as const, originY: "top" as const,
  });
  setData(g, { role: "bullet_item", index });
  return g;
}

/**
 * Measures the rendered height of a bullet group created by createBulletItem.
 * Reads the inner Textbox height via calcTextHeight() — avoids duplicating this
 * traversal across every layout file that uses bullets.
 */
export function measureBulletHeight(g: fabric.Group, fallbackFontSize: number, gap: number): number {
  const label = g.getObjects().find(o => o instanceof fabric.Textbox) as fabric.Textbox | undefined;
  return (label?.calcTextHeight() ?? fallbackFontSize * 1.5) + gap;
}

// ── COMPONENT: Insight item (quote slide) ────────────────────────────────────

export function createInsightItem(text: string, t: CanvasTokens, left = 0, top = 0, width = 930): fabric.Group {
  const dot = new fabric.Circle({
    radius: 5, left: 0, top: 11, fill: t.primary,
    originX: "left" as const, originY: "top" as const,
  });
  const label = new fabric.Textbox(text, {
    left: 22, top: 0, width: width - 22,
    fontSize: 24, fontWeight: "400", fill: t.muted,
    fontFamily: t.fontBody, lineHeight: 1.5,
    originX: "left" as const, originY: "top" as const,
  });
  const g = new fabric.Group([dot, label], {
    left, top, originX: "left" as const, originY: "top" as const,
  });
  setData(g, { role: "insight_item" });
  return g;
}
