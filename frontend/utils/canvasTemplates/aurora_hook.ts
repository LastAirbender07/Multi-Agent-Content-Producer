import * as fabric from "fabric";
import { createBrandBar, createOverlay, createGlassCard, makeText, makeTitleText, loadCoverImage } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";

const CS = 1080;
const CARD_W  = 880;
const CARD_PH = 52;   // card horizontal padding
const CARD_PV = 56;   // card vertical padding

export async function buildAuroraHook(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];

  // 1. Background image (full-bleed cover)
  if (imageUrl) {
    const bg = await loadCoverImage(imageUrl, "bg_image");
    if (bg) objects.push(bg);
  }

  // 2. Gradient overlay
  objects.push(createOverlay("hook", t));

  // 3. Estimate card height for vertical positioning.
  // Syne Bold at 72px: measured avg char width ≈ 0.52 × fontSize (HTML renders tighter than 0.62)
  const INNER_W   = CARD_W - CARD_PH * 2;
  const labelH    = 14 + 20;
  const HEAD_CPL  = Math.max(1, Math.floor(INNER_W / (72 * 0.52)));  // ~20 chars/line (measured)
  const headLines = Math.max(1, Math.ceil((slide.title?.length ?? 20) / HEAD_CPL));
  const headlineH = headLines * 72 * 1.1 + 28;   // 1.1 matches Syne Bold actual lineHeight
  // Plus Jakarta Sans at 24px: avg char width ≈ 0.50 × fontSize
  const SUB_CPL   = Math.max(1, Math.floor(INNER_W / (24 * 0.50)));  // ~65 chars/line
  const subLines  = slide.body ? Math.max(1, Math.ceil(slide.body.length / SUB_CPL)) : 0;
  const subH      = subLines * 24 * 1.5;
  const cardH     = CARD_PV + labelH + headlineH + (subH ? subH + 14 : 0) + CARD_PV;

  const cardLeft = (CS - CARD_W) / 2;
  const cardTop  = Math.round(CS * 0.5 - cardH * 0.55);

  // 4. Frosted glass card
  const glass = await createGlassCard(
    { left: cardLeft, top: cardTop, width: CARD_W, height: cardH },
    imageUrl, 16, t, 24,
  );
  objects.push(...glass);

  // 5. Content inside card
  let cy = cardTop + CARD_PV;

  // "THREAD" label
  objects.push(makeText("THREAD", {
    role: "hook_label",
    fontSize: 13, fontWeight: "700", fill: t.primary,
    charSpacing: 220,
    left: cardLeft + CARD_PH, top: cy,
    originX: "left" as const, originY: "top" as const,
  }));
  cy += labelH;

  // Headline (Syne Bold)
  objects.push(makeTitleText(slide.title || "Your headline here", {
    t, role: "hook_headline",
    fontFamily: `${t.fontTitle}, sans-serif`,
    fontSize: 72, lineHeight: 1.1,
    width: CARD_W - CARD_PH * 2,
    left: cardLeft + CARD_PH, top: cy,
  }));
  cy += headlineH;

  // Sub-text (body) — 16px gap below headline
  if (slide.body) {
    objects.push(makeText(slide.body, {
      role: "hook_sub", fontSize: 24, fill: t.muted, lineHeight: 1.5,
      width: CARD_W - CARD_PH * 2,
      left: cardLeft + CARD_PH, top: cy + 16,
      originX: "left" as const, originY: "top" as const,
    }));
  }

  // 6. Swipe hint — subtle modern pill
  const HINT_W = 128, HINT_H = 30;
  const hintBg = new fabric.Rect({
    left: 0, top: 0, width: HINT_W, height: HINT_H, rx: 15,
    fill: "rgba(255,255,255,0.07)",
    stroke: "rgba(255,255,255,0.12)", strokeWidth: 1,
    originX: "left" as const, originY: "top" as const,
  });
  const hintText = new fabric.Text("Swipe to continue →", {
    left: HINT_W / 2, top: HINT_H / 2,
    fontSize: 11, fontWeight: "600", fill: "rgba(255,255,255,0.45)",
    fontFamily: t.fontBody, charSpacing: 40,
    originX: "center" as const, originY: "center" as const,
  });
  const hintGroup = new fabric.Group([hintBg, hintText], {
    left: CS - 44 - HINT_W, top: CS - t.brandBarH - 50,
    originX: "left" as const, originY: "top" as const,
  });
  (hintGroup as fabric.Group & { data?: unknown }).data = { role: "swipe_hint" };
  objects.push(hintGroup);

  // 7. Brand bar
  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
