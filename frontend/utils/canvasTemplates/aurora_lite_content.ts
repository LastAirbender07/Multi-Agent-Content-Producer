/**
 * aurora_lite_content.ts — Aurora Lite family / body content slide
 *
 * Aurora Lite DNA: dark #090909 bg, Syne 64pt headline, aurora gradient accent,
 * glass card, Plus Jakarta Sans 28pt body — ONE idea per slide, NO bullets ever.
 *
 * This is the Instagram-readable version of aurora-extended content.
 * Difference from aurora_hook: same structure but content-focused
 *   (required body, topic tag reflects slide topic rather than "THREAD",
 *    slightly larger card padding for breathing room).
 *
 * Layout (1080×1080):
 *   Full-bleed dark background + gradient overlay
 *   Glass card — centred, width 900px, height auto-fit
 *     TOPIC TAG — 13pt Syne, aurora primary color
 *     HEADLINE  — Syne 64pt, white, ≤2 lines, one bold declarative statement
 *     BODY      — Plus Jakarta Sans 28pt, muted white, ≤15 words, one idea
 *   Brand bar at bottom
 *
 * Spec: maxChars title=60, body=80. Validator enforces ≤10 words title, ≤15 words body.
 */
import * as fabric from "fabric";
import { createBrandBar, createOverlay, createGlassCard, makeText, makeTitleText, loadCoverImage, setData } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";

const CANVAS_SIZE  = 1080;
const CARD_W       = 900;
const CARD_PH      = 56;   // horizontal padding inside card
const CARD_PV      = 68;   // vertical padding — more generous than hook for breathing room
const CARD_RX      = 24;
const LABEL_H      = 36;   // topic tag height + gap
const HEAD_FONT_SZ = 64;   // down from hook's 72 — gives body room without crowding
const BODY_FONT_SZ = 28;   // up from content's 23 — bigger, more readable
const HEAD_BODY_GAP = 20;  // gap between headline bottom and body text
const CARD_V_BIAS  = 0.52; // slightly above true centre

export async function buildAuroraLiteContent(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];
  const INNER_W = CARD_W - CARD_PH * 2;

  // 1. Background — blurred cover image or solid dark
  if (imageUrl) {
    const bg = await loadCoverImage(imageUrl, "bg_image");
    if (bg) objects.push(bg);
  }

  // 2. Gradient overlay — atmospheric depth
  objects.push(createOverlay("hook", t));  // same overlay as hook = correct aurora feel

  // ── Two-pass layout ───────────────────────────────────────────────────────

  // Topic tag (short, all-caps, aurora primary color)
  // Use first 3 words of title as the tag, or "INSIGHT" as fallback
  const tagWords = (slide.title || "").split(/\s+/).slice(0, 3).join(" ").toUpperCase() || "INSIGHT";
  const tagObj = makeText(tagWords, {
    role: "lite_tag",
    fontSize: 13, fontWeight: "700", fill: t.primary,
    charSpacing: 220,
    left: 0, top: 0,
    originX: "left" as const, originY: "top" as const,
  });
  setData(tagObj, { role: "lite_tag" });

  const headlineObj = makeTitleText(slide.title || "Your insight here", {
    t, role: "lite_headline",
    fontFamily: `${t.fontTitle}, sans-serif`,
    fontSize: HEAD_FONT_SZ, lineHeight: 1.1,
    width: INNER_W,
    left: 0, top: 0,
  });
  setData(headlineObj, { role: "lite_headline" });

  // Body — required, single supporting idea, no bullets
  const bodyText = slide.body || "";
  const bodyObj = bodyText
    ? makeText(bodyText, {
        role: "lite_body",
        fontSize: BODY_FONT_SZ, fill: t.muted, lineHeight: 1.5,
        width: INNER_W,
        left: 0, top: 0,
        originX: "left" as const, originY: "top" as const,
      })
    : null;
  if (bodyObj) setData(bodyObj, { role: "lite_body" });

  // Measure real heights
  const headlineH = headlineObj.calcTextHeight() + 8;
  const bodyH     = bodyObj ? bodyObj.calcTextHeight() : 0;

  const cardH =
    CARD_PV
    + LABEL_H
    + headlineH
    + (bodyH ? HEAD_BODY_GAP + bodyH : 0)
    + CARD_PV;

  const cardLeft = (CANVAS_SIZE - CARD_W) / 2;
  const cardTop  = Math.round(CANVAS_SIZE * 0.5 - cardH * CARD_V_BIAS);

  // 3. Glass card
  const glass = await createGlassCard(
    { left: cardLeft, top: cardTop, width: CARD_W, height: cardH },
    imageUrl, 16, t, CARD_RX,
  );
  objects.push(...glass);

  let cy = cardTop + CARD_PV;

  tagObj.set({ left: cardLeft + CARD_PH, top: cy });
  objects.push(tagObj);
  cy += LABEL_H;

  headlineObj.set({ left: cardLeft + CARD_PH, top: cy });
  objects.push(headlineObj);
  cy += headlineH;

  if (bodyObj) {
    cy += HEAD_BODY_GAP;
    bodyObj.set({ left: cardLeft + CARD_PH, top: cy });
    objects.push(bodyObj);
  }

  // 4. Brand bar
  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));

  return objects;
}
