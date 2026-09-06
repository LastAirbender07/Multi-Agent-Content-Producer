/**
 * aurora_compact_clean_quote.ts  — compact-clean family / pull-quote slide
 *
 * Visual DNA: warm cream #F5F0E8, oversized decorative peach quotation mark
 * top-left, Playfair Display Bold Italic quote body centred, Inter attribution
 * below, brand pill bottom-left. No pill at top — the quote mark IS the visual
 * anchor that signals "this is a quote slide".
 *
 * Layout (1080×1080):
 *   x=72  y=120   Large decorative " in peach (#E8CBA3), 220pt Playfair Bold Italic
 *   x=88  y=340   Quote body — Playfair Bold Italic, 52–60pt, dark ink, centred
 *   x=88  y=auto  Attribution — Inter 400, 24pt, muted, centred
 *   x=72  y=940   Brand pill bottom-left
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import { makeBrandPill } from "./shared/compact";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData } from "./shared";

const CANVAS_SIZE = 1080;

interface CompactCleanQuoteMeta {
  quote_text?:     string;   // the quotation body
  attribution?:    string;   // e.g. "— James Clear, Atomic Habits"
  brand_wordmark?: string;
  quote_size?:     number;   // default 56
  deco_size?:      number;   // decorative " size, default 220
}

const DEFAULTS: Required<CompactCleanQuoteMeta> = {
  quote_text:     "The secret of getting ahead is getting started.",
  attribution:    "— Mark Twain",
  brand_wordmark: "@yourbrand",
  quote_size:     56,
  deco_size:      220,
};

export async function buildAuroraCompactCleanQuote(
  slide: SlideData & { canvas_template?: string; compact_meta?: CompactCleanQuoteMeta },
  _imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<CompactCleanQuoteMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };

  // Map slide fields to meta when not explicitly overridden
  if (slide.title && !slide.compact_meta?.quote_text) {
    m.quote_text = slide.title;
  }
  if (slide.body && !slide.compact_meta?.attribution) {
    m.attribution = slide.body;
  }

  const objects: fabric.FabricObject[] = [];

  // ── 1. Cream background ──────────────────────────────────────────────────────
  const bg = new fabric.Rect({
    left: 0, top: 0,
    width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: tokens.bgCream,
    originX: "left" as const, originY: "top" as const,
    selectable: false,
  });
  setData(bg, { role: "compact_bg" });
  objects.push(bg);

  // ── 2. Decorative quotation mark — oversized, peach, top-left anchor ─────────
  // Not the body text's opening quote — a distinct visual design element.
  // Using typographic left double quotation mark """
  const decoQuote = new fabric.Textbox("\u201c", {
    left:       72,
    top:        80,
    width:      300,
    fontFamily: tokens.fontSerif,        // Playfair Display
    fontStyle:  "italic",
    fontWeight: "700",
    fontSize:   m.deco_size,
    fill:       tokens.peach,            // peach #E8CBA3 — decorative, not dominant
    lineHeight: 1,
    originX:    "left" as const,
    originY:    "top" as const,
    selectable: false, evented: false,   // decorative glyph — not user-editable
  });
  setData(decoQuote, { role: "compact_deco_quote" });
  objects.push(decoQuote);

  // ── 3. Quote body — Playfair Bold Italic, centred ─────────────────────────────
  // TWO-PASS: build at top=0, measure real height, then position.
  const padX    = tokens.padX;          // 88
  const quoteW  = CANVAS_SIZE - padX * 2;  // 904
  const quoteY  = 340;
  const quoteBody = new fabric.Textbox(`"${m.quote_text}"`, {
    left:       padX,
    top:        0,            // placeholder — set after height probe
    width:      quoteW,
    fontFamily: tokens.fontSerif,
    fontStyle:  "italic",
    fontWeight: "700",
    fontSize:   m.quote_size,
    fill:       tokens.textDark,
    lineHeight: 1.25,
    textAlign:  "center",
    originX:    "left" as const,
    originY:    "top" as const,
  });
  const realQuoteH = quoteBody.calcTextHeight();
  quoteBody.set({ top: quoteY });
  setData(quoteBody, { role: "compact_quote_body" });
  objects.push(quoteBody);

  // ── 4. Attribution — Inter 400, muted, centred, below real quote bottom ───────
  const attrY = quoteY + realQuoteH + 48;
  const attribution    = new fabric.Textbox(m.attribution, {
    left:       padX,
    top:        attrY,
    width:      quoteW,
    fontFamily: tokens.fontBody,
    fontWeight: "400",
    fontSize:   26,
    fill:       tokens.textMuted,
    lineHeight: 1.4,
    textAlign:  "center",
    originX:    "left" as const,
    originY:    "top" as const,
  });
  setData(attribution, { role: "compact_attribution" });
  objects.push(attribution);

  // ── 5. Brand pill — bottom-left, same as all compact templates ────────────────
  const brandPill = makeBrandPill({
    wordmark: m.brand_wordmark,
    x:        72,
    y:        940,
    tokens,
    height:   52,
    fontSize: 18,
  });
  setData(brandPill, { role: "compact_brand_pill" });
  objects.push(brandPill);

  return objects;
}
