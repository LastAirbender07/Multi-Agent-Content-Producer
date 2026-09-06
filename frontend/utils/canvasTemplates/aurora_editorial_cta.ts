/**
 * aurora_editorial_cta.ts — editorial family / closing CTA slide
 *
 * Visual DNA: cold white #FFFFFF, 5px black border frame (8px inset),
 * editorial header bar top (@handle | italic series title | hairline rule),
 * large centred Playfair Bold Italic CTA headline, thin hairline rule,
 * and a small muted "Follow @handle" footer centred below.
 *
 * Aesthetic: feels like the closing page of a well-designed book or journal.
 * No pills, no gradients — stark editorial confidence.
 *
 * Layout (1080×1080):
 *   border: 5px, 8px inset
 *   y=50    editorial header (@handle | italic series title | hairline rule y=82)
 *   y=360   Playfair Bold Italic CTA — centred, large (~72pt)
 *   y~auto  hairline rule below headline (32px below last text line)
 *   y~auto  "Follow @handle" Inter 400 muted, centred
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import { makeEditorialHeaderBar } from "./shared/compact";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData } from "./shared";

const CANVAS_SIZE = 1080;

const BG_WHITE      = "#FFFFFF";
const INK_PRIMARY   = "#1B1B1B";
const INK_MUTED     = "#6B6560";
const BORDER_COLOR  = "#1B1B1B";
const BORDER_WIDTH  = 5;
const BORDER_INSET  = 8;
const PAD_X         = 96;       // slightly tighter centred layout

interface EditorialCtaMeta {
  handle?:        string;
  series_title?:  string;
  cta_headline?:  string;
  cta_size?:      number;
  follow_text?:   string;
}

const DEFAULTS: Required<EditorialCtaMeta> = {
  handle:        "@yourbrand",
  series_title:  "The Series Title.",
  cta_headline:  "Follow along.\nMore every week.",
  cta_size:      80,
  follow_text:   "Follow @yourbrand",
};

export async function buildAuroraEditorialCta(
  slide: SlideData & { canvas_template?: string; compact_meta?: EditorialCtaMeta },
  _imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<EditorialCtaMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };

  if (slide.title && !slide.compact_meta?.cta_headline) m.cta_headline = slide.title;
  if (slide.body  && !slide.compact_meta?.follow_text)  m.follow_text  = slide.body;

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

  // ── 2. Border frame ──────────────────────────────────────────────────────────
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

  // ── 3. Editorial header bar ──────────────────────────────────────────────────
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
  [handle, series, rule].forEach(o => setData(o, { role: "editorial_header" }));
  objects.push(handle, series, rule);

  // ── 4. CTA headline — Playfair Bold Italic, centred, large ───────────────────
  const ctaW    = CANVAS_SIZE - PAD_X * 2;
  const ctaY    = 340;
  const cta     = new fabric.Textbox(m.cta_headline, {
    left:       PAD_X,
    top:        ctaY,
    width:      ctaW,
    fontFamily: tokens.fontSerif,
    fontStyle:  "italic",
    fontWeight: "700",
    fontSize:   m.cta_size,
    fill:       INK_PRIMARY,
    lineHeight: 1.2,
    textAlign:  "center",
    originX:    "left" as const,
    originY:    "top" as const,
  });
  setData(cta, { role: "editorial_cta" });
  objects.push(cta);

  // ── 5. Thin hairline rule below CTA ──────────────────────────────────────────
  // Estimate CTA height from line count + size
  const ctaLines      = m.cta_headline.split("\n").length;
  const estCtaHeight  = ctaLines * m.cta_size * 1.2;
  const ruleTopY      = ctaY + estCtaHeight + 48;

  const hairline = new fabric.Line(
    [PAD_X + 60, ruleTopY, CANVAS_SIZE - PAD_X - 60, ruleTopY],
    {
      stroke:      INK_PRIMARY,
      strokeWidth: 1,
      selectable:  false,
      originX:     "left" as const,
      originY:     "top" as const,
    },
  );
  setData(hairline, { role: "editorial_rule" });
  objects.push(hairline);

  // ── 6. Follow footer — Inter 400, centred, muted ─────────────────────────────
  const followY = ruleTopY + 36;
  const follow  = new fabric.Textbox(m.follow_text, {
    left:       PAD_X,
    top:        followY,
    width:      ctaW,
    fontFamily: tokens.fontBody,
    fontWeight: "400",
    fontSize:   28,
    fill:       INK_MUTED,
    lineHeight: 1.4,
    textAlign:  "center",
    originX:    "left" as const,
    originY:    "top" as const,
  });
  setData(follow, { role: "editorial_follow" });
  objects.push(follow);

  return objects;
}
