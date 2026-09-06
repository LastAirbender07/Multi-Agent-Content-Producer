/**
 * aurora_nextwork_dark_engage.ts — nextwork-dark family / engagement slide
 *
 * Visual DNA: near-black #0D0D0D, Inter Black white verb headline ("Save this."),
 * white outlined pill ("SAVE THIS"), off-white muted supporting copy, white brand pill.
 *
 * Layout (1080×1080):
 *   x=88  y=300   Inter Black white verb (~118pt)
 *   x=88  y=530   White outlined pill — SAVE THIS
 *   x=88  y=630   Off-white muted copy (30pt Inter 400)
 *   x=72  y=940   White brand pill (dark text)
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import {
  makeBrandPill,
  makeOutlinedPill,
  makeMixedWeightText,
  type TextRun,
} from "./shared/compact";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData } from "./shared";

const CANVAS_SIZE  = 1080;

const BG_DARK      = "#0D0D0D";
const TEXT_WHITE   = "#F5F0E8";
const TEXT_MUTED   = "#999490";
const PILL_BG      = "transparent";
const PILL_STROKE  = "#F5F0E8";
const PILL_TEXT    = "#F5F0E8";
const BRAND_BG     = "#F5F0E8";
const BRAND_TEXT   = "#0D0D0D";

interface NextworkDarkEngageMeta {
  verb_runs?:      TextRun[];
  verb_size?:      number;
  pill_text?:      string;
  support_text?:   string;
  brand_wordmark?: string;
}

const DEFAULTS: Required<NextworkDarkEngageMeta> = {
  verb_runs:      [{ text: "Save this.", weight: 900 }],
  verb_size:      118,
  pill_text:      "SAVE THIS",
  support_text:   "If this helped you, send it to someone who needs it.",
  brand_wordmark: "@yourbrand",
};

export async function buildAuroraNxtworkDarkEngage(
  slide: SlideData & { canvas_template?: string; compact_meta?: NextworkDarkEngageMeta },
  _imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<NextworkDarkEngageMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };

  if (slide.title && !slide.compact_meta?.verb_runs) {
    m.verb_runs = [{ text: slide.title, weight: 900 }];
  }
  if (slide.body && !slide.compact_meta?.support_text) {
    m.support_text = slide.body;
  }

  const objects: fabric.FabricObject[] = [];

  // ── 1. Dark background ────────────────────────────────────────────────────────
  const bg = new fabric.Rect({
    left: 0, top: 0,
    width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: BG_DARK,
    originX: "left" as const, originY: "top" as const,
    selectable: false,
  });
  setData(bg, { role: "dark_bg" });
  objects.push(bg);

  // ── 2. Inter Black white verb ─────────────────────────────────────────────────
  const padX   = tokens.padX;  // 88
  const verbW  = CANVAS_SIZE - padX * 2;
  const verb   = makeMixedWeightText({
    runs:      m.verb_runs,
    x:         padX,
    y:         300,
    size:      m.verb_size,
    maxWidth:  verbW,
    tokens,
    lineHeight: 1.0,
    align:     "left",
    defaultColor: TEXT_WHITE,
  });
  verb.set({ left: padX, textAlign: "left" });
  setData(verb, { role: "dark_headline" });
  objects.push(verb);

  // ── 3. White outlined action pill ─────────────────────────────────────────────
  const pill = makeOutlinedPill({
    text:          m.pill_text,
    x:             padX,
    y:             530,
    tokens,
    height:        52,
    padding:       28,
    fontSize:      22,
    letterSpacing: 180,
    fillColor:     PILL_BG,
    textColor:     PILL_TEXT,
    strokeColor:   PILL_STROKE,
    strokeWidth:   2,
  });
  setData(pill, { role: "dark_engage_pill" });
  objects.push(pill);

  // ── 4. Off-white muted supporting copy ───────────────────────────────────────
  const support = new fabric.Textbox(m.support_text, {
    left:       padX,
    top:        630,
    width:      verbW,
    fontFamily: tokens.fontBody,
    fontWeight: "400",
    fontSize:   30,
    fill:       TEXT_MUTED,
    lineHeight: 1.45,
    textAlign:  "left",
    originX:    "left" as const,
    originY:    "top" as const,
  });
  setData(support, { role: "dark_support" });
  objects.push(support);

  // ── 5. White brand pill — bottom-left ─────────────────────────────────────────
  const brandPill = makeBrandPill({
    wordmark:  m.brand_wordmark,
    x:         72,
    y:         940,
    tokens,
    height:    52,
    fontSize:  18,
    bgColor:   BRAND_BG,
    textColor: BRAND_TEXT,
  });
  setData(brandPill, { role: "dark_brand_pill" });
  objects.push(brandPill);

  return objects;
}
