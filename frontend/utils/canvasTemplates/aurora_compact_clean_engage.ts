/**
 * aurora_compact_clean_engage.ts  — compact-clean family / save+engage slide
 *
 * Visual DNA: warm cream #F5F0E8, Inter Black bold action verb ("Save this."),
 * peach outlined pill with action label, Inter muted supporting copy,
 * brand pill bottom-left. The goal is a strong single-ask — not a wall of text.
 *
 * Layout (1080×1080):
 *   x=88  y=340   Inter Black verb at ~120pt — one punchy word or phrase
 *   x=88  y=510   Peach pill with action label, left-aligned
 *   x=88  y=620   Muted supporting copy, 30pt, max 2 lines
 *   x=72  y=940   Brand pill bottom-left
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

interface CompactCleanEngageMeta {
  verb_runs?:      TextRun[];   // big display verb — default "Save this."
  verb_size?:      number;      // default 118
  pill_text?:      string;      // pill label — default "SAVE + SHARE"
  support_text?:   string;      // muted copy — default "If this helped you, send it to someone who needs it."
  brand_wordmark?: string;
}

const DEFAULTS: Required<CompactCleanEngageMeta> = {
  verb_runs:      [{ text: "Save this.", weight: 900 }],
  verb_size:      118,
  pill_text:      "SAVE + SHARE",
  support_text:   "If this helped you, send it to someone who needs it.",
  brand_wordmark: "@yourbrand",
};

export async function buildAuroraCompactCleanEngage(
  slide: SlideData & { canvas_template?: string; compact_meta?: CompactCleanEngageMeta },
  _imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<CompactCleanEngageMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };

  if (slide.title && !slide.compact_meta?.verb_runs) {
    // Clamp the verb to a short punchy phrase — max first 6 words so it stays readable at 118pt.
    // Long pipeline-generated titles blow out the layout at that font size.
    const titleWords = slide.title.split(/\s+/);
    const verbText   = titleWords.slice(0, 6).join(" ");
    m.verb_runs = [{ text: verbText, weight: 900 }];
  }
  if (slide.body && !slide.compact_meta?.support_text) {
    m.support_text = slide.body;
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

  // ── 2. Bold action verb — Inter Black, left-aligned, high on the slide ────────
  // Two-pass: measure verb height first so pill + support don't overlap it.
  const padX  = tokens.padX;  // 88
  const verbW = CANVAS_SIZE - padX * 2;
  const verbY = 280;

  // Pass 1: measure — create verb object, measure height via calcTextHeight
  const verb = makeMixedWeightText({
    runs:      m.verb_runs,
    x:         padX,
    y:         verbY,
    size:      m.verb_size,
    maxWidth:  verbW,
    tokens,
    lineHeight: 1.0,
    align:     "left",
  });
  verb.set({ left: padX, textAlign: "left" });
  setData(verb, { role: "compact_headline" });
  objects.push(verb);

  // Measure real height (works after object creation)
  const verbH = (verb.calcTextHeight?.() ?? m.verb_size * 1.2) + 8;

  // Pass 2: positions flow from verbY + verbH
  const pillY    = Math.max(verbY + verbH + 24, 520);
  const supportY = pillY + 72;  // pill height 52 + 20 gap

  // ── 3. Peach action pill — left-aligned under the verb ────────────────────────
  const pill = makeOutlinedPill({
    text:          m.pill_text,
    x:             padX,
    y:             pillY,
    tokens,
    height:        52,
    padding:       28,
    fontSize:      22,
    letterSpacing: 180,
  });
  setData(pill, { role: "compact_engage_pill" });
  objects.push(pill);

  // ── 4. Muted supporting copy — left-aligned, 28pt ────────────────────────────
  const support = new fabric.Textbox(m.support_text, {
    left:       padX,
    top:        supportY,
    width:      verbW,
    fontFamily: tokens.fontBody,
    fontWeight: "400",
    fontSize:   28,
    fill:       tokens.textMuted,
    lineHeight: 1.45,
    textAlign:  "left",
    originX:    "left" as const,
    originY:    "top" as const,
  });
  setData(support, { role: "compact_support" });
  objects.push(support);

  // ── 5. Brand pill — bottom-left ───────────────────────────────────────────────
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
