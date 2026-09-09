/**
 * aurora_lite_hook.ts — Aurora Lite family / hook (opening) slide
 *
 * Design philosophy: Full-canvas layout — no floating glass card.
 * The glass card (aurora-extended hook) creates dead space when content is ≤15 words.
 * Aurora-lite hook uses the full 1080×1080 canvas: full-bleed image or dark bg,
 * gradient overlay darkening toward the bottom, text anchored to the lower half.
 *
 * This matches the aesthetic of high-performing Instagram carousels (Ali Abdaal,
 * Growth Daily) where the hook slide has one BIG statement that fills the frame.
 *
 * Layout (1080×1080):
 *   Full-bleed background image OR atmospheric dark gradient
 *   Dark gradient overlay (transparent top → 80% black bottom)
 *   Eyebrow label — aurora primary, 13pt, top-left (inside safe zone)
 *   HEADLINE — Syne 76pt, white, bottom-anchored, ≤10 words max 2 lines
 *   BODY — Plus Jakarta Sans 30pt, muted white, below headline, ≤15 words
 *   Swipe hint — bottom-right
 *   Brand bar at very bottom
 *
 * Audit result (aurora_hook reuse): 3/5 — glass card too small, dead space top/bottom.
 * This new builder targets 4–5/5.
 */
import * as fabric from "fabric";
import { createBrandBar, createOverlay, loadCoverImage, makeText, makeTitleText, setData } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { isDarkTheme } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";

const CS          = 1080;
const PAD_X       = 72;
const PAD_BOTTOM  = 130;   // space above brand bar
const HEAD_FS     = 80;    // bigger than extended (72) — fewer words, bolder presence
const BODY_FS     = 32;    // Instagram standard 26-32pt — bold for short copy
const HEAD_BODY_GAP = 22;
const EYEBROW_Y   = 72;    // eyebrow label top position

export async function buildAuroraLiteHook(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];

  // 1. Background image — full-bleed cover
  if (imageUrl) {
    const bg = await loadCoverImage(imageUrl, "bg_image");
    if (bg) objects.push(bg);
  } else {
    // Atmospheric dark gradient fallback when no image
    objects.push(new fabric.Rect({
      left: 0, top: 0, width: CS, height: CS,
      fill: new fabric.Gradient({
        type: "linear", gradientUnits: "percentage",
        coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
        colorStops: [
          { offset: 0,   color: "#0D0D1A" },
          { offset: 0.5, color: "#080812" },
          { offset: 1,   color: "#040408" },
        ],
      }),
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }));
    // Atmospheric glow — subtle, not distracting
    objects.push(new fabric.Ellipse({
      rx: 480, ry: 320,
      left: CS * 0.6, top: CS * 0.1,
      fill: new fabric.Gradient({
        type: "radial",
        coords: { x1: 480, y1: 320, r1: 0, x2: 480, y2: 320, r2: 480 },
        colorStops: [
          { offset: 0, color: t.primary + "1A" },
          { offset: 1, color: t.primary + "00" },
        ],
      }),
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }));
  }

  // 2. Gradient overlay — heavier at bottom so text on lower half is readable
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CS, height: CS,
    fill: new fabric.Gradient({
      type: "linear", gradientUnits: "percentage",
      coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
      colorStops: [
        { offset: 0,    color: "rgba(4,4,12,0.05)"  },
        { offset: 0.35, color: "rgba(4,4,12,0.30)"  },
        { offset: 0.65, color: "rgba(4,4,12,0.65)"  },
        { offset: 1,    color: "rgba(4,4,12,0.88)"  },
      ],
    }),
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  }));

  // 3. Eyebrow label — top-left
  const eyebrowText = (slide as SlideData & { eyebrow?: string }).eyebrow
    || "OPINION";
  const eyebrow = makeText(eyebrowText.toUpperCase(), {
    role: "hook_label",
    fontSize: 13, fontWeight: "700", fill: t.primary,
    charSpacing: 220,
    left: PAD_X, top: EYEBROW_Y,
    originX: "left" as const, originY: "top" as const,
  });
  setData(eyebrow, { role: "hook_eyebrow" });
  objects.push(eyebrow);

  // ── Two-pass layout: measure text then anchor to bottom ──────────────────

  // Pass 1: measure
  const INNER_W = CS - PAD_X * 2;
  const titleObj = makeTitleText(slide.title || "Your headline here", {
    t, role: "hook_headline",
    fontFamily: `${t.fontTitle}, sans-serif`,
    fontSize: HEAD_FS, lineHeight: 1.08,
    width: INNER_W,
    left: PAD_X, top: 0,
  });
  setData(titleObj, { role: "hook_headline" });

  const bodyObj = slide.body
    ? makeText(slide.body, {
        role: "hook_body",
        fontSize: BODY_FS, fill: t.muted, lineHeight: 1.5,
        width: INNER_W,
        left: PAD_X, top: 0,
        originX: "left" as const, originY: "top" as const,
      })
    : null;
  if (bodyObj) setData(bodyObj, { role: "hook_body" });

  const titleH = titleObj.calcTextHeight() + 6;
  const bodyH  = bodyObj ? bodyObj.calcTextHeight() : 0;
  const blockH = titleH + (bodyH ? HEAD_BODY_GAP + bodyH : 0);

  // Pass 2: anchor text block above brand bar
  const blockBottom = CS - PAD_BOTTOM;
  const titleTop    = blockBottom - blockH;

  titleObj.set({ left: PAD_X, top: titleTop });
  objects.push(titleObj);

  if (bodyObj) {
    bodyObj.set({ left: PAD_X, top: titleTop + titleH + HEAD_BODY_GAP });
    objects.push(bodyObj);
  }

  // 4. Swipe hint — bottom-right, above brand bar
  const dark = isDarkTheme(t);
  const HINT_W = 136, HINT_H = 30;
  const hintBg = new fabric.Rect({
    left: 0, top: 0, width: HINT_W, height: HINT_H, rx: 15,
    fill: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    stroke: dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)",
    strokeWidth: 1,
    originX: "left" as const, originY: "top" as const,
  });
  const hintText = new fabric.Text("Swipe to continue →", {
    left: HINT_W / 2, top: HINT_H / 2,
    fontSize: 11, fontWeight: "600",
    fill: dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.40)",
    fontFamily: t.fontBody, charSpacing: 40,
    originX: "center" as const, originY: "center" as const,
  });
  const hintGroup = new fabric.Group([hintBg, hintText], {
    left: CS - PAD_X - HINT_W,
    top:  CS - t.brandBarH - 50,
    originX: "left" as const, originY: "top" as const,
  });
  setData(hintGroup, { role: "swipe_hint" });
  objects.push(hintGroup);

  // 5. Brand bar
  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));

  return objects;
}
