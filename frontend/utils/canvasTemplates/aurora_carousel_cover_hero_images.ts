import type * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import {
  makeMetallicGradient,
  makeWhiteCardWithStraddlingTitle,
  makeDisplayHeadline,
  makeBodyText,
  makeTiltedImagePair,
  makeItalicCtaLine,
} from "./shared/cover";

// ── Canvas geometry (1080×1080 square) ───────────────────────────────────────
const W = 1080, H = 1080;
const CARD_X = 54,  CARD_Y = 54;
const CARD_W = W - CARD_X * 2;   // 972
const CARD_H = H - CARD_Y * 2;   // 972

// ── Slide shape ───────────────────────────────────────────────────────────────
interface CoverHeroImagesMeta {
  category_pill: string;
  headline:      string;
  body_text:     string;
  cta_line?:     string;
  image_urls?:   [string, string];
}

function getMeta(slide: SlideData & { canvas_template?: string }): CoverHeroImagesMeta {
  const m = (slide as unknown as Record<string, unknown>).cover_hero as CoverHeroImagesMeta | undefined;
  return {
    category_pill: m?.category_pill ?? "VIRAL DESIGN",
    headline:      m?.headline      ?? "GOOGLE,\nWHERE AM I?",
    body_text:     m?.body_text     ?? "",
    cta_line:      m?.cta_line,
    image_urls:    m?.image_urls,
  };
}

/**
 * aurora-carousel-cover-hero-images  (1080×1080)
 *
 * Layout (split bottom half):
 *   Outer metallic-peach gradient (full bleed)
 *   White square card
 *   Chip straddling card top, centred
 *   Large Inter-Black display headline — centred
 *   Body copy (full-card-width, below headline)
 *   Bottom zone: CTA italic on LEFT | two tilted image cards on RIGHT
 */
export async function buildAuroraCarouselCoverHeroImages(
  slide:    SlideData & { canvas_template?: string },
  imageUrl: string | null,
  _tokens:  CanvasTokens,
  _meta:    SlideMeta,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];
  const m = getMeta(slide);

  // ── 1. Outer bg ──────────────────────────────────────────────────────────────
  objects.push(makeMetallicGradient(W, H));

  // ── 2. White card + chip ─────────────────────────────────────────────────────
  objects.push(makeWhiteCardWithStraddlingTitle({
    cardX: CARD_X, cardY: CARD_Y,
    cardWidth: CARD_W, cardHeight: CARD_H,
    chipText: m.category_pill,
    chipWidthRatio: 0.26,
  }));

  // ── 3. Display headline — centred ────────────────────────────────────────────
  // 2 lines × 100px = 200px. Starts at CARD_Y+68 → ends at ~322.
  objects.push(makeDisplayHeadline({
    text:       m.headline,
    x:          CARD_X + 40,
    y:          CARD_Y + 68,
    width:      CARD_W - 80,
    fontSize:   100,
    lineHeight: 1.0,
    align:      "center",
  }));

  // ── 4. Body copy ──────────────────────────────────────────────────────────────
  // Body Y is dynamic: always starts below the headline, regardless of line count.
  const headlineLines = m.headline.split('\n').length;
  const BODY_Y = CARD_Y + 68 + headlineLines * 100 + 40;
  objects.push(makeBodyText({
    text:     m.body_text,
    x:        CARD_X + 40,
    y:        BODY_Y,
    width:    Math.round(CARD_W * 0.78),
    fontSize: 30,
  }));

  // ── 5. Image pair (right column of bottom zone) ──────────────────────────────
  // Body text (~6 lines×43px from y=362) ends ~623. Images start at y=684, 61px clear.
  // DEV_W=340/DEV_H=255 (4:3 AR) — bigger. PAIR_X=410: right=410+595=1005 +13px tilt≈1018 ✓
  const DEV_Y  = CARD_Y + 630;                         // 684 — safely below body text
  const DEV_W  = Math.round(CARD_W * 0.35);            // ≈ 340
  const DEV_H  = Math.round(DEV_W * 0.75);             // ≈ 255  (4:3)
  const PAIR_X = CARD_X + Math.round(CARD_W * 0.325); // ≈ 370 — images well inside right frame

  const urls      = m.image_urls ?? [imageUrl ?? "", ""];
  const pairGroup = await makeTiltedImagePair({
    images: [
      { src: urls[0], tilt: -4, width: DEV_W, height: DEV_H, cornerRadius: 18 },
      { src: urls[1], tilt:  2, width: DEV_W, height: DEV_H, cornerRadius: 18 },
    ],
    overlapPct: 25,
    x: PAIR_X,
    y: DEV_Y,
  });
  objects.push(pairGroup);

  // ── 6. CTA — left of images, anchored at card bottom ─────────────────────────
  // Sits in the left column (x=94, width=296) at the very bottom of the white card.
  // Images end at ~939; CTA at y=961 leaves a 22px gap — no overlap.
  if (m.cta_line) {
    const CTA_COL_W = PAIR_X - (CARD_X + 40) - 20;    // ≈ 296
    const CTA_Y     = CARD_Y + CARD_H - 65;            // anchored to card bottom
    objects.push(makeItalicCtaLine({
      text:     m.cta_line,
      x:        CARD_X + 40,
      y:        CTA_Y,
      maxWidth: CTA_COL_W,
      align:    "center",
      fontSize: 24,
    }));
  }

  return objects;
}
