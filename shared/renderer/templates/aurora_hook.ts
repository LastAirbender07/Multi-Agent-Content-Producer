import * as fabric from "fabric";
import { createBrandBar, createOverlay, createGlassCard, makeText, makeTitleText, loadCoverImage, setData } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { isDarkTheme } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";

// ── Layout constants ──────────────────────────────────────────────────────────

const CANVAS_SIZE   = 1080;
const CARD_W        = 880;
const CARD_PH       = 52;    // card horizontal padding (left + right)
const CARD_PV       = 56;    // card vertical padding (top + bottom)
const CARD_RX       = 24;    // card border radius
const LABEL_H       = 34;    // "THREAD" label height + gap below (fontSize 13 + 21px gap)
const HEAD_FONT_SZ  = 72;
const BODY_FONT_SZ  = 24;
const HEAD_BODY_GAP = 16;    // gap between headline bottom and body text
const CARD_V_BIAS   = 0.55;  // card vertical centre bias (slightly above true centre)

export async function buildAuroraHook(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];
  const INNER_W = CARD_W - CARD_PH * 2;

  // 1. Background image — full-bleed cover for both themes; overlay provides the tint.
  if (imageUrl) {
    const bg = await loadCoverImage(imageUrl, "bg_image");
    if (bg) objects.push(bg);
  }

  // 2. Gradient overlay (darkens image for Aurora, subtle tint for Lumina)
  objects.push(createOverlay("hook", t));

  // ── Two-pass layout ──────────────────────────────────────────────────────
  // Pass 1: create text objects and read real Fabric-measured heights.
  // This avoids character-width estimation, which produced oversized or
  // undersized cards depending on how the title wrapped.

  const labelObj = makeText("THREAD", {
    role: "hook_label",
    fontSize: 13, fontWeight: "700", fill: t.primary,
    charSpacing: 220,
    left: 0, top: 0,
    originX: "left" as const, originY: "top" as const,
  });

  const headlineObj = makeTitleText(slide.title || "Your headline here", {
    t, role: "hook_headline",
    fontFamily: `${t.fontTitle}, sans-serif`,
    fontSize: HEAD_FONT_SZ, lineHeight: 1.1,
    width: INNER_W,
    left: 0, top: 0,
  });

  const bodyObj = slide.body
    ? makeText(slide.body, {
        role: "hook_sub",
        fontSize: BODY_FONT_SZ, fill: t.muted, lineHeight: 1.5,
        width: INNER_W,
        left: 0, top: 0,
        originX: "left" as const, originY: "top" as const,
      })
    : null;

  // Read real heights from Fabric's layout engine (requires fonts loaded)
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

  // 3. Pass 2: glass card + positioned text

  const glass = await createGlassCard(
    { left: cardLeft, top: cardTop, width: CARD_W, height: cardH },
    imageUrl, 16, t, CARD_RX,
  );
  objects.push(...glass);

  let cy = cardTop + CARD_PV;

  labelObj.set({ left: cardLeft + CARD_PH, top: cy });
  objects.push(labelObj);
  cy += LABEL_H;

  headlineObj.set({ left: cardLeft + CARD_PH, top: cy });
  objects.push(headlineObj);
  cy += headlineH;

  if (bodyObj) {
    bodyObj.set({ left: cardLeft + CARD_PH, top: cy + HEAD_BODY_GAP });
    objects.push(bodyObj);
  }

  // 4. Swipe hint pill — colours adapt to theme so it's visible on both Aurora (dark) and Lumina (light)
  const dark = isDarkTheme(t);
  const HINT_W      = 128, HINT_H = 30;
  const hintBgFill  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const hintStroke  = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const hintColor   = dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.40)";
  const hintBg = new fabric.Rect({
    left: 0, top: 0, width: HINT_W, height: HINT_H, rx: 15,
    fill: hintBgFill,
    stroke: hintStroke, strokeWidth: 1,
    originX: "left" as const, originY: "top" as const,
  });
  const hintText = new fabric.Text("Swipe to continue →", {
    left: HINT_W / 2, top: HINT_H / 2,
    fontSize: 11, fontWeight: "600", fill: hintColor,
    fontFamily: t.fontBody, charSpacing: 40,
    originX: "center" as const, originY: "center" as const,
  });
  const hintGroup = new fabric.Group([hintBg, hintText], {
    left: CANVAS_SIZE - 44 - HINT_W, top: CANVAS_SIZE - t.brandBarH - 50,
    originX: "left" as const, originY: "top" as const,
  });
  setData(hintGroup, { role: "swipe_hint" });
  objects.push(hintGroup);

  // 5. Brand bar
  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
