/**
 * aurora_compact_clean_cta.ts  — compact-clean family / CTA slide
 *
 * Visual DNA: warm cream #F5F0E8, Inter Black headline centred, peach pill top,
 * brand pill + dot progress bottom.  Matches aurora-compact-hook aesthetic exactly.
 *
 * Layout (all y values at 1080×1080):
 *   y=140  peach outlined pill (top-centre)
 *   y=260  large Inter 900 headline (~88–96pt) — centred
 *   y=auto muted attribution / handle·cadence sub-text (centred, below headline)
 *   y=940  brand pill (bottom-left, x=72) + dot progress (bottom-right)
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

const CANVAS_SIZE = 1080;

interface CompactCleanCtaMeta {
  pill_text?:      string;        // default "FOLLOW FOR MORE"
  headline_runs?:  TextRun[];     // default single Black "Follow for more"
  sub_text?:       string;        // default "@handle  ·  Every week"
  brand_wordmark?: string;        // default "@yourbrand"
  headline_size?:  number;        // default 92
}

const DEFAULTS: Required<CompactCleanCtaMeta> = {
  pill_text:      "FOLLOW FOR MORE",
  headline_runs:  [{ text: "Follow for more", weight: 900 }],
  sub_text:       "@yourbrand  ·  Every week",
  brand_wordmark: "@yourbrand",
  headline_size:  92,
};

export async function buildAuroraCompactCleanCta(
  slide: SlideData & { canvas_template?: string; compact_meta?: CompactCleanCtaMeta },
  _imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<CompactCleanCtaMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };

  // Prefer slide.title for the headline when no explicit compact_meta.headline_runs
  if (slide.title && !slide.compact_meta?.headline_runs) {
    m.headline_runs = [{ text: slide.title, weight: 900 }];
  }
  // Prefer slide.body for sub_text when not overridden
  if (slide.body && !slide.compact_meta?.sub_text) {
    m.sub_text = slide.body;
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

  // ── 2. Peach outlined pill — top-centre ──────────────────────────────────────
  const pillH = 52;
  const catPill = makeOutlinedPill({
    text: m.pill_text,
    x: 0, y: 140,
    tokens,
    height: pillH,
    padding: 28,
    fontSize: 22,
    letterSpacing: 180,
  });
  // Centre the pill horizontally
  const pillW = catPill.width ?? 0;
  catPill.set({ left: (CANVAS_SIZE - pillW) / 2 });
  setData(catPill, { role: "compact_category_pill" });
  objects.push(catPill);

  // ── 3. Headline (Inter Black, centred) ────────────────────────────────────────
  // TWO-PASS: build at top=0, measure, then position.
  const padX    = tokens.padX;
  const headlineW = CANVAS_SIZE - padX * 2;  // 904px
  const headlineY = 265;
  const headline = makeMixedWeightText({
    runs:      m.headline_runs,
    x:         padX,
    y:         0,             // placeholder — set after height probe
    size:      m.headline_size,
    maxWidth:  headlineW,
    tokens,
    lineHeight: 1.05,
    align:     "center",
  });
  const realHeadlineH = headline.calcTextHeight();
  headline.set({ left: padX, top: headlineY, textAlign: "center" });
  setData(headline, { role: "compact_headline" });
  objects.push(headline);

  // ── 4. Sub-text — muted, centred, below headline ──────────────────────────────
  const subY = headlineY + realHeadlineH + 52;
  const sub = new fabric.Textbox(m.sub_text, {
    left:       padX,
    top:        subY,
    width:      headlineW,
    fontSize:   28,
    fontWeight: "400",
    fill:       tokens.textMuted,
    fontFamily: tokens.fontBody,
    lineHeight: 1.4,
    textAlign:  "center",
    originX:    "left" as const,
    originY:    "top" as const,
  });
  setData(sub, { role: "compact_sub" });
  objects.push(sub);

  // ── 5. Brand pill — bottom-left, matches compact-hook exactly ────────────────
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
