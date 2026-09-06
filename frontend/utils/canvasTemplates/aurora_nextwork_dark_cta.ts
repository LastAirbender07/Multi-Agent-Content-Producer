/**
 * aurora_nextwork_dark_cta.ts — nextwork-dark family / closing CTA
 *
 * Visual DNA: near-black #0D0D0D, white outlined pill ("FOLLOW FOR MORE"),
 * Inter Black white CTA headline, muted off-white sub-copy, white brand pill.
 *
 * The "nextwork-dark" family is the inverse of compact-clean — same structural
 * rhythm, but flipped: dark bg, light type. Fits nextwork's dark-mode aesthetic.
 *
 * Layout (1080×1080):
 *   x=88  y=300   White outlined pill CTA label
 *   x=88  y=440   Inter Black white headline (~100pt)
 *   x=88  y=680   Off-white muted sub-copy (28pt Inter 400)
 *   x=72  y=940   White brand pill (dark text inside)
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

// Dark family colour constants
const BG_DARK      = "#0D0D0D";
const TEXT_WHITE   = "#F5F0E8";   // warm-white (same as bgCream, works on dark)
const TEXT_MUTED   = "#999490";   // muted warm-grey on dark
const PILL_BG      = "transparent";
const PILL_STROKE  = "#F5F0E8";
const PILL_TEXT    = "#F5F0E8";
const BRAND_BG     = "#F5F0E8";
const BRAND_TEXT   = "#0D0D0D";

interface NextworkDarkCtaMeta {
  pill_text?:     string;
  headline_runs?: TextRun[];
  headline_size?: number;
  sub_text?:      string;
  brand_wordmark?: string;
}

const DEFAULTS: Required<NextworkDarkCtaMeta> = {
  pill_text:      "FOLLOW FOR MORE",
  headline_runs:  [{ text: "Follow for more.", weight: 900 }],
  headline_size:  96,
  sub_text:       "@yourbrand  ·  Every Sunday",
  brand_wordmark: "@yourbrand",
};

export async function buildAuroraNxtworkDarkCta(
  slide: SlideData & { canvas_template?: string; compact_meta?: NextworkDarkCtaMeta },
  _imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<NextworkDarkCtaMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };

  if (slide.title && !slide.compact_meta?.headline_runs) {
    m.headline_runs = [{ text: slide.title, weight: 900 }];
  }
  if (slide.body && !slide.compact_meta?.sub_text) {
    m.sub_text = slide.body;
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

  // ── 2. White outlined pill — top, left-aligned ────────────────────────────────
  const padX  = tokens.padX;  // 88
  const pill  = makeOutlinedPill({
    text:          m.pill_text,
    x:             padX,
    y:             300,
    tokens,
    height:        52,
    padding:       28,
    fontSize:      20,
    letterSpacing: 180,
    fillColor:     PILL_BG,
    textColor:     PILL_TEXT,
    strokeColor:   PILL_STROKE,
    strokeWidth:   2,
  });
  setData(pill, { role: "dark_cta_pill" });
  objects.push(pill);

  // ── 3. Inter Black white headline ─────────────────────────────────────────────
  const headlineW = CANVAS_SIZE - padX * 2;
  const headline  = makeMixedWeightText({
    runs:      m.headline_runs,
    x:         padX,
    y:         440,
    size:      m.headline_size,
    maxWidth:  headlineW,
    tokens,
    lineHeight: 1.05,
    align:     "left",
    defaultColor: TEXT_WHITE,
  });
  headline.set({ left: padX, textAlign: "left" });
  setData(headline, { role: "dark_headline" });
  objects.push(headline);

  // ── 4. Off-white sub-copy ─────────────────────────────────────────────────────
  const sub = new fabric.Textbox(m.sub_text, {
    left:       padX,
    top:        680,
    width:      headlineW,
    fontFamily: tokens.fontBody,
    fontWeight: "400",
    fontSize:   28,
    fill:       TEXT_MUTED,
    lineHeight: 1.4,
    textAlign:  "left",
    originX:    "left" as const,
    originY:    "top" as const,
  });
  setData(sub, { role: "dark_sub" });
  objects.push(sub);

  // ── 5. White brand pill — bottom-left ─────────────────────────────────────────
  const brandPill = makeBrandPill({
    wordmark: m.brand_wordmark,
    x:        72,
    y:        940,
    tokens,
    height:   52,
    fontSize: 18,
    bgColor:  BRAND_BG,
    textColor: BRAND_TEXT,
  });
  setData(brandPill, { role: "dark_brand_pill" });
  objects.push(brandPill);

  return objects;
}
