/**
 * aurora_lite_quote.ts — Aurora Lite family / pull-quote slide
 *
 * Aurora Lite DNA: dark atmospheric bg, large italic quote at 50pt,
 * attribution below — NO "Key Insights" bullet section ever.
 *
 * Difference from aurora_quote: removes the entire insightObjs/hasBullets
 * section. Just quote + attribution. More air, more premium feel.
 *
 * Layout (1080×1080):
 *   Dark bg (blurred image if available) + gradient overlay
 *   Decorative large opening quote mark — aurora primary, 90pt, top area
 *   Quote text — Plus Jakarta Sans 50pt italic, white, centred
 *   Attribution — 26pt, muted white, centred below quote
 *   Brand bar at bottom
 */
import * as fabric from "fabric";
import { createBrandBar, createBgImage, createOverlay, makeText, setData } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { isDarkTheme } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";

const CS = 1080;

export async function buildAuroraLiteQuote(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];

  // 1. Background — blurred image for atmosphere, or solid dark
  if (imageUrl && isDarkTheme(t)) {
    const bg = await createBgImage(imageUrl, "blur-darken");
    if (bg) objects.push(bg);
  } else {
    const bg = new fabric.Rect({
      left: 0, top: 0, width: CS, height: CS, fill: t.bg,
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    });
    setData(bg, { role: "aurora_bg" });
    objects.push(bg);
  }

  // 2. Subtle overlay
  objects.push(createOverlay("quote", t));

  const INNER_X = 88;
  const INNER_W = CS - INNER_X * 2;

  const quoteText = slide.title || "Your quote text here";
  const attrText  = slide.body ? slide.body.replace(/^[-–—]\s*/, "") : "";

  // ── Two-pass layout ──────────────────────────────────────────────────────

  // Decorative opening quote mark — large, aurora primary, purely visual
  const DECO_FONT = 90;
  const decoMark = new fabric.Text("“", {
    left: INNER_X,
    top:  0,       // positioned after layout
    fontFamily: `${t.fontBody}, sans-serif`,
    fontStyle: "italic",
    fontWeight: "700",
    fontSize: DECO_FONT,
    fill: t.primary,
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  });
  setData(decoMark, { role: "lite_quote_deco" });

  // Quote text — 50pt italic (up from 40pt in aurora-quote), centred
  const quoteObj = makeText(quoteText, {
    role: "lite_quote_text",
    fontSize: 50, fontWeight: "600", fontStyle: "italic",
    fill: t.text, lineHeight: 1.35,
    width: INNER_W,
    left: INNER_X, top: 0,
    originX: "left" as const, originY: "top" as const,
  });
  (quoteObj as fabric.Textbox).set({ textAlign: "center" });
  setData(quoteObj, { role: "lite_quote_text" });

  // Attribution — muted, centred, below quote
  const attrObj = attrText
    ? makeText(`— ${attrText}`, {
        role: "lite_attribution",
        fontSize: 26, fill: t.muted, lineHeight: 1.4,
        width: INNER_W,
        left: INNER_X, top: 0,
        originX: "left" as const, originY: "top" as const,
      })
    : null;
  if (attrObj) {
    (attrObj as fabric.Textbox).set({ textAlign: "center" });
    setData(attrObj, { role: "lite_attribution" });
  }

  // Measure real heights
  const decoH  = Math.round(DECO_FONT * 0.6) + 12;  // optical height of deco mark
  const quoteH = quoteObj.calcTextHeight() + 20;
  const attrH  = attrObj ? attrObj.calcTextHeight() + 8 : 0;

  const CONTENT_H = CS - t.brandBarH;
  const totalH    = decoH + quoteH + attrH;
  let curY = Math.max(60, (CONTENT_H - totalH) / 2);

  // 3. Place elements
  decoMark.set({ top: curY });
  objects.push(decoMark);
  curY += decoH;

  quoteObj.set({ left: INNER_X, top: curY });
  objects.push(quoteObj);
  curY += quoteH;

  if (attrObj) {
    attrObj.set({ left: INNER_X, top: curY });
    objects.push(attrObj);
  }

  // 4. Brand bar
  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));

  return objects;
}
