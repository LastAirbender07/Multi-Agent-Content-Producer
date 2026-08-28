import type * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import {
  makeMetallicGradient,
  makeWhiteCardWithStraddlingTitle,
  makeDisplayHeadline,
  makeBodyText,
  makeTiltedPhoneMockup,
  makeItalicCtaLine,
} from "./shared/cover";

// ── Canvas geometry (1080×1080 square) ───────────────────────────────────────
const W = 1080, H = 1080;
const CARD_X = 54,  CARD_Y = 54;
const CARD_W = W - CARD_X * 2;   // 972
const CARD_H = H - CARD_Y * 2;   // 972

// ── Slide shape ───────────────────────────────────────────────────────────────
interface CoverHeroMeta {
  category_pill:     string;
  headline:          string;
  body_text:         string;
  cta_line?:         string;
  screen_image_url?: string;
}

function getMeta(slide: SlideData & { canvas_template?: string }): CoverHeroMeta {
  const m = (slide as unknown as Record<string, unknown>).cover_hero as CoverHeroMeta | undefined;
  return {
    category_pill:   m?.category_pill   ?? "VIRAL REEL",
    headline:        m?.headline        ?? "FAKE POST",
    body_text:       m?.body_text       ?? "",
    cta_line:        m?.cta_line,
    screen_image_url: m?.screen_image_url,
  };
}

/**
 * aurora-carousel-cover-hero-phone  (1080×1080)
 *
 * Layout:
 *   Outer metallic-peach gradient (full bleed)
 *   White square card
 *   Thin-border chip straddling card top, centred
 *   Large Inter-Black display headline (full card width)
 *   Phone mockup  (left ~36% of card, below headline)
 *   Body copy Textbox (right ~54% of card)
 *   Italic CTA line (bottom-right)
 */
export async function buildAuroraCarouselCoverHeroPhone(
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
    chipWidthRatio: 0.24,
  }));

  // ── 3. Display headline ──────────────────────────────────────────────────────
  objects.push(makeDisplayHeadline({
    text:      m.headline,
    x:         CARD_X + 40,
    y:         CARD_Y + 68,
    width:     CARD_W - 80,
    fontSize:  115,
    lineHeight: 1.0,
    align:     "center",
  }));

  // ── 4. Phone mockup (left column) ────────────────────────────────────────────
  // Variant B: tilt=-3° (very slight left lean, nearly upright), PHONE_X=96, PHONE_Y=254
  const PHONE_W = Math.round(CARD_W * 0.33);   // ≈ 321
  const PHONE_H = Math.round(PHONE_W / 0.52);  // ≈ 617
  const PHONE_X = CARD_X + 42;                 // = 96
  const PHONE_Y = CARD_Y + 200;                // = 254

  const screenUrl = m.screen_image_url ?? imageUrl ?? undefined;
  const phoneGroup = await makeTiltedPhoneMockup({
    screenImageUrl: screenUrl,
    tilt: -3,
    width:  PHONE_W,
    height: PHONE_H,
    x: PHONE_X,
    y: PHONE_Y,
  });
  objects.push(phoneGroup);

  // ── 5. Body text (right column) ──────────────────────────────────────────────
  // Body Y is dynamic: always starts below the headline, regardless of line count.
  const BODY_X = CARD_X + Math.round(CARD_W * 0.42);
  const BODY_W = Math.round(CARD_W * 0.54);
  const headlineLines = m.headline.split('\n').length;
  const BODY_Y = CARD_Y + 68 + headlineLines * 115 + 28;
  objects.push(makeBodyText({
    text:     m.body_text,
    x:        BODY_X,
    y:        BODY_Y,
    width:    BODY_W,
    fontSize: 32,
  }));

  // ── 6. CTA line ───────────────────────────────────────────────────────────────
  if (m.cta_line) {
    objects.push(makeItalicCtaLine({
      text:     m.cta_line,
      x:        BODY_X,
      y:        CARD_Y + CARD_H - 80,
      maxWidth: BODY_W,
      align:    "center",
      fontSize: 28,
    }));
  }

  return objects;
}
