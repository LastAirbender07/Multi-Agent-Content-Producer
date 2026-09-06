/**
 * aurora_editorial_hook.ts — editorial family / opening hook slide
 *
 * Visual DNA: cold white #FFFFFF, 5px black border frame (8px inset),
 * editorial header bar (@handle left + italic series title right + hairline rule),
 * Playfair Display Bold Italic headline (large, left-aligned), secondary body
 * line in Inter 400, and a chapter/issue number bottom-right.
 *
 * Matches the SahilBloom book-page aesthetic — serif-first, structured,
 * "save-worthy" from first sight.
 *
 * Layout (1080×1080):
 *   border: 5px, 8px from edges
 *   y=50   editorial header (@handle | italic series title | hairline rule at y=82)
 *   y=200  Playfair Bold Italic headline — large, left, wrapping
 *   y=auto Inter 400 body — 30pt, muted, below headline
 *   y=1010 bottom-right chapter label (e.g. "01") in muted grey
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import { makeEditorialHeaderBar } from "./shared/compact";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData } from "./shared";

const CANVAS_SIZE = 1080;

// Shared editorial constants — match aurora_compact_list_item.ts exactly
const BG_WHITE      = "#FFFFFF";
const INK_PRIMARY   = "#1B1B1B";
const INK_MUTED     = "#6B6560";
const BORDER_COLOR  = "#1B1B1B";
const BORDER_WIDTH  = 5;
const BORDER_INSET  = 8;
const PAD_X         = 72;       // inner text margin (inside the border)

interface EditorialHookMeta {
  handle?:       string;
  series_title?: string;
  headline?:     string;
  body?:         string;
  chapter?:      string;  // e.g. "01", "No. 7"
  headline_size?: number; // default 88
}

const DEFAULTS: Required<EditorialHookMeta> = {
  handle:        "@yourbrand",
  series_title:  "The Series Title.",
  headline:      "The one idea that changed how I think about everything.",
  body:          "A deep-dive into the framework behind it.",
  chapter:       "01",
  headline_size: 88,
};

export async function buildAuroraEditorialHook(
  slide: SlideData & { canvas_template?: string; compact_meta?: EditorialHookMeta },
  _imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<EditorialHookMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };

  if (slide.title && !slide.compact_meta?.headline) m.headline = slide.title;
  if (slide.body  && !slide.compact_meta?.body)     m.body     = slide.body;

  const objects: fabric.FabricObject[] = [];

  // ── 1. White background ──────────────────────────────────────────────────────
  const bg = new fabric.Rect({
    left: 0, top: 0,
    width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: BG_WHITE,
    originX: "left" as const, originY: "top" as const,
    selectable: false,
  });
  setData(bg, { role: "editorial_bg" });
  objects.push(bg);

  // ── 2. Border frame — 5px, 8px inset (matches list-item exactly) ─────────────
  const border = new fabric.Rect({
    left:        BORDER_INSET,
    top:         BORDER_INSET,
    width:       CANVAS_SIZE - BORDER_INSET * 2,
    height:      CANVAS_SIZE - BORDER_INSET * 2,
    fill:        "transparent",
    stroke:      BORDER_COLOR,
    strokeWidth: BORDER_WIDTH,
    originX:     "left" as const,
    originY:     "top" as const,
    selectable:  false,
  });
  setData(border, { role: "editorial_border" });
  objects.push(border);

  // ── 3. Editorial header bar (@handle | italic series | hairline rule) ─────────
  const [handle, series, rule] = makeEditorialHeaderBar({
    handle:      m.handle,
    seriesTitle: m.series_title,
    canvasWidth: CANVAS_SIZE,
    tokens,
    y:           50,
    ruleY:       86,
    paddingX:    PAD_X,
    fontSize:    20,
  });
  setData(handle, { role: "editorial_handle" });   // selectable — @handle text
  setData(series, { role: "editorial_series" });   // selectable — series title text
  setData(rule,   { role: "editorial_rule"   });   // decorative — hairline, not selectable
  objects.push(handle, series, rule);

  // ── 4. Playfair Bold Italic headline — left, large, below header ──────────────
  const headlineY = 145;
  const headlineW = CANVAS_SIZE - PAD_X * 2;
  const headline  = new fabric.Textbox(m.headline, {
    left:       PAD_X,
    top:        headlineY,
    width:      headlineW,
    fontFamily: tokens.fontSerif,    // Playfair Display
    fontStyle:  "italic",
    fontWeight: "700",
    fontSize:   m.headline_size,
    fill:       INK_PRIMARY,
    lineHeight: 1.18,
    textAlign:  "left",
    originX:    "left" as const,
    originY:    "top" as const,
  });
  setData(headline, { role: "editorial_headline" });
  objects.push(headline);

  // ── 5. Body line — Inter 400, muted, below headline ──────────────────────────
  // Approximate headline height for stacking
  const estHeadlineLines  = Math.ceil((m.headline.length / 30));   // ~30 chars/line at 88pt
  const estHeadlineHeight = estHeadlineLines * m.headline_size * 1.18;
  const bodyY             = headlineY + estHeadlineHeight + 40;

  const body = new fabric.Textbox(m.body, {
    left:       PAD_X,
    top:        bodyY,
    width:      headlineW,
    fontFamily: tokens.fontBody,  // Inter
    fontWeight: "400",
    fontSize:   30,
    fill:       INK_MUTED,
    lineHeight: 1.45,
    textAlign:  "left",
    originX:    "left" as const,
    originY:    "top" as const,
  });
  setData(body, { role: "editorial_body" });
  objects.push(body);

  // ── 6. Chapter/issue label — bottom-right, muted ─────────────────────────────
  const chapterLabel = new fabric.Textbox(m.chapter, {
    left:       CANVAS_SIZE - PAD_X - 80,
    top:        CANVAS_SIZE - BORDER_INSET - BORDER_WIDTH - 46,
    width:      80,
    fontFamily: tokens.fontBody,
    fontWeight: "400",
    fontSize:   24,
    fill:       INK_MUTED,
    textAlign:  "right",
    originX:    "left" as const,
    originY:    "top" as const,
  });
  setData(chapterLabel, { role: "editorial_chapter" });
  objects.push(chapterLabel);

  return objects;
}
