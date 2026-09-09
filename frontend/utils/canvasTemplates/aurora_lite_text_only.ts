/**
 * aurora_lite_text_only.ts — Aurora Lite family / text-only content slide (no image)
 *
 * Used when aurora-lite-content-text is requested and no image is available.
 * Unlike the shared textOnly layout (48pt/23pt from aurora-extended), this version
 * uses much larger type to fill the canvas with intention — the breathing room
 * is a design choice, not dead space.
 *
 * Layout (1080×1080):
 *   Dark bg (#090909)
 *   Small gradient accent line (left-aligned, aurora primary→secondary)
 *   TITLE — Syne 68pt, white, vertically centered
 *   BODY  — Plus Jakarta Sans 28pt, muted white, below title
 *   Brand bar at bottom
 *
 * Audit finding: previous textOnly (48pt/23pt) left lower 40% empty and
 * felt "undersized". At 68pt/28pt with ≤15w body the text commands the space.
 */
import * as fabric from "fabric";
import { createBrandBar, makeText, makeTitleText, setData } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";

const CS          = 1080;
const PAD_X       = 72;
const INNER_W     = CS - PAD_X * 2;
const TITLE_FS    = 96;   // Instagram magazine-cover style — fill the canvas with type
const BODY_FS     = 32;   // large body — readable at phone distance
const ACCENT_W    = 56;
const ACCENT_H    = 3;
const ACCENT_GAP  = 24;   // gap below accent line before title
const TITLE_BODY_GAP = 24;

export async function buildAuroraLiteTextOnly(
  slide: SlideData,
  _imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];

  // 1. Dark background
  const bg = new fabric.Rect({
    left: 0, top: 0, width: CS, height: CS, fill: t.bg,
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  });
  setData(bg, { role: "lite_text_bg" });
  objects.push(bg);

  // ── Two-pass layout ──────────────────────────────────────────────────────
  // Pass 1: create text objects, measure heights
  const titleObj = makeTitleText(slide.title || "Your headline here", {
    t, role: "lite_text_title",
    fontFamily: `${t.fontTitle}, sans-serif`,
    fontSize: TITLE_FS, lineHeight: 1.1,
    width: INNER_W,
    left: PAD_X, top: 0,
  });
  setData(titleObj, { role: "lite_text_title" });

  const bodyObj = slide.body
    ? makeText(slide.body, {
        role: "lite_text_body",
        fontSize: BODY_FS, fill: t.muted, lineHeight: 1.55,
        width: INNER_W,
        left: PAD_X, top: 0,
        originX: "left" as const, originY: "top" as const,
      })
    : null;
  if (bodyObj) setData(bodyObj, { role: "lite_text_body" });

  const titleH    = titleObj.calcTextHeight() + 8;
  const bodyH     = bodyObj ? bodyObj.calcTextHeight() : 0;
  const totalH    = ACCENT_H + ACCENT_GAP + titleH + (bodyH ? TITLE_BODY_GAP + bodyH : 0);

  // Pass 2: vertically center the block
  // Bottom-anchor the content block above the brand bar.
  // This mirrors aurora-lite-hook's approach: text fills the lower half of the canvas
  // rather than floating in the center with dead space above and below.
  const PAD_BOTTOM  = 130;
  const blockBottom = CS - PAD_BOTTOM;
  let blockTop = blockBottom - totalH;

  // Ensure minimum 80px top padding so accent line doesn't clip the top
  if (blockTop < 80) blockTop = 80;

  let curY = blockTop;

  // Gradient accent line
  const accent = new fabric.Rect({
    left: PAD_X, top: curY, width: ACCENT_W, height: ACCENT_H, rx: 2,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: ACCENT_W, y2: 0 },
      colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
    }),
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  });
  setData(accent, { role: "lite_text_accent" });
  objects.push(accent);
  curY += ACCENT_H + ACCENT_GAP;

  // Title
  titleObj.set({ left: PAD_X, top: curY });
  objects.push(titleObj);
  curY += titleH;

  // Body
  if (bodyObj) {
    bodyObj.set({ left: PAD_X, top: curY + TITLE_BODY_GAP });
    objects.push(bodyObj);
  }

  // Brand bar
  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));

  return objects;
}
