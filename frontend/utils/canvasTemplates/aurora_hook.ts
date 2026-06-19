import * as fabric from "fabric";
import { createBrandBar, createBgImage, createOverlay, createGlassCard, makeText, makeTitleText, loadCoverImage } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";

const CS = 1080;
const CARD_W = 880;
const CARD_PAD_H = 56;
const CARD_PAD_V = 64;

export async function buildAuroraHook(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];

  // 1. Background image
  if (imageUrl) {
    const bg = await loadCoverImage(imageUrl, "bg_image");
    if (bg) objects.push(bg);
  }

  // 2. Gradient overlay
  objects.push(createOverlay("hook", t));

  // 3. Build card content to estimate height first
  const headline = makeTitleText(slide.title || "Your headline here", {
    t, role: "hook_headline",
    fontFamily: `${t.fontTitle}, sans-serif`,
    fontSize: 72, lineHeight: 1.05, fill: t.text,
    width: CARD_W - CARD_PAD_V * 2,
    left: CARD_PAD_V, top: 0,  // top set after computing card position
  });

  const subItems: fabric.Textbox[] = [];
  if (slide.body) {
    subItems.push(makeText(slide.body, {
      role: "hook_sub", fontSize: 24, fill: t.muted, lineHeight: 1.5,
      width: CARD_W - CARD_PAD_V * 2,
      left: CARD_PAD_V, top: 0,
      originX: "left" as const, originY: "top" as const,
    }));
  }

  // Estimate card height
  const labelH = 14 + 24;   // THREAD label + gap
  const headlineH = Math.ceil((slide.title?.length ?? 20) / 20) * (72 * 1.05) + 32;
  const subH = slide.body ? Math.ceil(slide.body.length / 38) * (24 * 1.5) : 0;
  const cardH = CARD_PAD_H + labelH + headlineH + subH + CARD_PAD_H;

  const cardLeft = (CS - CARD_W) / 2;
  const cardTop  = CS * 0.5 - cardH * 0.55;

  // 4. Glass card layers
  const glassLayers = await createGlassCard(
    { left: cardLeft, top: cardTop, width: CARD_W, height: cardH },
    imageUrl, 16, t, 24,
  );
  objects.push(...glassLayers);

  // 5. Card content
  // THREAD label
  objects.push(makeText("THREAD", {
    role: "hook_label", fontSize: 14, fontWeight: "600", fill: t.primary,
    charSpacing: 200, left: cardLeft + CARD_PAD_V, top: cardTop + CARD_PAD_H,
    originX: "left" as const, originY: "top" as const,
  }));

  // Headline
  headline.set({ left: cardLeft + CARD_PAD_V, top: cardTop + CARD_PAD_H + labelH });
  objects.push(headline);

  // Sub-text
  if (subItems.length) {
    subItems[0].set({ left: cardLeft + CARD_PAD_V, top: cardTop + CARD_PAD_H + labelH + headlineH });
    objects.push(...subItems);
  }

  // 6. Swipe hint
  objects.push(makeText("Swipe →", {
    role: "swipe_hint", fontSize: 14, fill: t.muted, charSpacing: 120,
    left: 920, top: 926,
    originX: "left" as const, originY: "top" as const,
  }));

  // 7. Brand bar
  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));

  return objects;
}
