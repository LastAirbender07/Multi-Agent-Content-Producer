import * as fabric from "fabric";
import {
  makeMetallicGradient,
  METALLIC_PEACH_MID,
  makeWhiteCardWithStraddlingTitle,
  makeTiltedPhoneMockup,
  makeTiltedImagePair,
  makeItalicCtaLine,
} from "./shared/cover";

// ── Canvas constants ──────────────────────────────────────────────────────────
const CANVAS_W = 1080;
const CANVAS_H = 1350;

// ── Card geometry ─────────────────────────────────────────────────────────────
const CARD_X      = 54;
const CARD_Y      = 68;
const CARD_WIDTH  = CANVAS_W - CARD_X * 2;   // 972 px
const CARD_HEIGHT = CANVAS_H - CARD_Y - 68;  // 1214 px

// ── Opts type ─────────────────────────────────────────────────────────────────

export type CarouselCoverHeroOpts = {
  outerBg?: "metallic-peach" | "metallic-cream" | { stops: string[] };
  chipText: string;
  mockup:
    | {
        type: "phone-post";
        screenImageUrl: string;
        overlayCards?: Array<{ author: string; body: string; avatarColor: string }>;
      }
    | { type: "image-pair"; imageUrls: [string, string] }
    | { type: "none" };
  bodyText: string;
  ctaLine?: string;
};

// ── Main builder ──────────────────────────────────────────────────────────────

/**
 * Renders the aurora-carousel-cover-hero template onto `canvas`.
 *
 * Fonts must already be loaded by the caller (loadCanvasFonts or renderer_entry.ts).
 *
 * Composition (bottom → top):
 *  1. Warm-brown metallic-peach radial gradient (full bleed)
 *  2. White rounded card + straddling title chip
 *  3. Tilted phone mockup OR image pair (left ~40% of card, overflows)
 *  4. Right-column body Textbox  (44 px Inter Regular)
 *  5. Optional italic-serif CTA line
 */
export async function makeCarouselCoverHero(
  canvas: fabric.Canvas,
  opts: CarouselCoverHeroOpts,
): Promise<void> {
  // ── 1. Outer background ──────────────────────────────────────────────────────
  const bgStops =
    !opts.outerBg || opts.outerBg === "metallic-peach"
      ? undefined
      : opts.outerBg === "metallic-cream"
      ? ["#E8DBC8", "#EDE4D5", "#D8CCBA"]
      : opts.outerBg.stops;

  makeMetallicGradient(canvas, { stops: bgStops });

  // ── 2. White card + straddling chip ─────────────────────────────────────────
  const cardGroup = makeWhiteCardWithStraddlingTitle({
    cardX: CARD_X, cardY: CARD_Y,
    cardWidth: CARD_WIDTH, cardHeight: CARD_HEIGHT,
    chipText: opts.chipText,
    chipFillColor: METALLIC_PEACH_MID,
    chipWidthRatio: 0.2,
  });
  canvas.add(cardGroup);

  // ── 3. Mockup (left column, overflows card edge intentionally) ────────────────
  const MOCK_X = CARD_X + 20;          // close to left edge to encourage overflow
  const MOCK_Y = CARD_Y + 100;
  const MOCK_W = Math.round(CARD_WIDTH * 0.42);   // 408 px
  const MOCK_H = Math.round(CARD_HEIGHT * 0.66);  // 801 px

  if (opts.mockup.type === "phone-post") {
    const phoneGroup = await makeTiltedPhoneMockup({
      screenImageUrl: opts.mockup.screenImageUrl,
      overlayCards: opts.mockup.overlayCards ?? [],
      tilt: -6,
      width: MOCK_W,
      height: MOCK_H,
      x: MOCK_X,
      y: MOCK_Y,
    });
    canvas.add(phoneGroup);

  } else if (opts.mockup.type === "image-pair") {
    const pairW = Math.round(MOCK_W * 0.55);
    const img0H = Math.round(MOCK_H * 0.6);
    const img1H = Math.round(MOCK_H * 0.55);

    const pairGroup = await makeTiltedImagePair({
      images: [
        { src: opts.mockup.imageUrls[0], tilt: -6,  width: pairW, height: img0H, cornerRadius: 24 },
        { src: opts.mockup.imageUrls[1], tilt:  4,  width: pairW, height: img1H, cornerRadius: 24 },
      ],
      overlapPct: 18,
      x: MOCK_X,
      y: MOCK_Y + Math.round(MOCK_H * 0.3), // shift pair down — body text fills top
    });
    canvas.add(pairGroup);
  }
  // type "none": no mockup added

  // ── 4. Right-column body copy ─────────────────────────────────────────────────
  const BODY_X     = CARD_X + Math.round(CARD_WIDTH * 0.50);
  const BODY_Y     = CARD_Y + 170;
  const BODY_W     = Math.round(CARD_WIDTH * 0.42);
  const BODY_FONT  = 44;   // fixed per spec — do NOT scale up

  const bodyText = new fabric.Textbox(opts.bodyText, {
    left: BODY_X, top: BODY_Y,
    width: BODY_W,
    fontFamily: "Inter",
    fontWeight: "400",
    fontSize: BODY_FONT,
    fill: "#1B1B1B",
    textAlign: "left",
    lineHeight: 1.35,
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  });
  canvas.add(bodyText);

  // ── 5. Optional CTA line ──────────────────────────────────────────────────────
  if (opts.ctaLine) {
    const ctaLine = makeItalicCtaLine({
      text: opts.ctaLine,
      x: BODY_X,
      y: CARD_Y + CARD_HEIGHT - 140,
      maxWidth: BODY_W,
      align: "left",
    });
    canvas.add(ctaLine);
  }
}
