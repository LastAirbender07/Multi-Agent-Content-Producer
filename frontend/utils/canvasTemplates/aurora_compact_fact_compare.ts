import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import { makeBrandPill } from "./shared/compact";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData } from "./shared";

const CANVAS_SIZE = 1080;
const PAD_X = 72;

// Notebook aesthetic: warm outer bg + crisp white card inset
const BG_WARM    = "#EDE5D8";   // warm off-white outer background
const CARD_WHITE = "#FFFFFF";   // inner card
const CARD_PAD   = 40;          // outer-to-card inset
const CARD_W     = CANVAS_SIZE - CARD_PAD * 2;
const CARD_H     = 860;
const CARD_TOP   = 120;

// Palette
const CORAL      = "#D46A5E";
const STAT_MUTED = "#B8B0A5";
const RULE_COLOR = "#D9D4CC";
const STAT_LINE_H = 138;        // Inter Black 110pt empirical height

interface StatBlock {
  value: string;
  caption: string;
  color?: string;
}

interface CompactFactCompareMeta {
  stat_baseline?: StatBlock;
  stat_featured?: StatBlock;
  body_header?: string;
  body_copy?: string;
  attribution?: string;
  brand_wordmark?: string;
}

const DEFAULTS: Required<CompactFactCompareMeta> = {
  stat_baseline: { value: "10–15%", caption: "Typical for the field" },
  stat_featured: { value: "22–35%", caption: "Claude's protein designs" },
  body_header: "Into the lab",
  body_copy:
    "Two independent labs built Claude's proteins and tested them. Designs bound at roughly double the rate typical for the field.",
  attribution: "Anthropic Research Report, 2024",
  brand_wordmark: "@claude",
};

export async function buildAuroraCompactFactCompare(
  slide: SlideData & { compact_meta?: CompactFactCompareMeta },
  _imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<CompactFactCompareMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };

  const objects: fabric.FabricObject[] = [];

  // 1. Warm outer background
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: BG_WARM,
    originX: "left", originY: "top", selectable: false,
  }));

  // 2. White inner card — thick black border is the "notebook" edge
  const card = new fabric.Rect({
    left: CARD_PAD, top: CARD_TOP,
    width: CARD_W, height: CARD_H,
    fill: CARD_WHITE,
    stroke: "#1B1B1B", strokeWidth: 4,
    rx: 0, ry: 0,
    originX: "left", originY: "top", selectable: false,
  });
  setData(card, { role: "fact_card" });
  objects.push(card);

  // Layout is inset by CARD_PAD + inner PAD
  const INNER_X = CARD_PAD + PAD_X;
  const STAT_TOP = CARD_TOP + 52;

  // Baseline stat
  objects.push(new fabric.Text(m.stat_baseline.value, {
    left: INNER_X, top: STAT_TOP,
    fontFamily: tokens.fontDisplay,
    fontSize: 110, fontWeight: 900,
    fill: m.stat_baseline.color ?? STAT_MUTED,
    originX: "left", originY: "top",
  }));

  const cap1 = new fabric.Textbox(m.stat_baseline.caption, {
    left: INNER_X, top: STAT_TOP + STAT_LINE_H,
    width: CARD_W - PAD_X * 2,
    fontFamily: tokens.fontBody, fontSize: 24, fontWeight: 400,
    fill: tokens.textDark,
    originX: "left", originY: "top",
  });
  setData(cap1, { role: "fact_caption_baseline" });
  objects.push(cap1);

  const stat2Y = STAT_TOP + STAT_LINE_H + 38 + 70;

  // Featured stat (accent colour)
  objects.push(new fabric.Text(m.stat_featured.value, {
    left: INNER_X, top: stat2Y,
    fontFamily: tokens.fontDisplay,
    fontSize: 110, fontWeight: 900,
    fill: m.stat_featured.color ?? CORAL,
    originX: "left", originY: "top",
  }));

  const cap2 = new fabric.Textbox(m.stat_featured.caption, {
    left: INNER_X, top: stat2Y + STAT_LINE_H,
    width: CARD_W - PAD_X * 2,
    fontFamily: tokens.fontBody, fontSize: 24, fontWeight: 400,
    fill: tokens.textDark,
    originX: "left", originY: "top",
  });
  setData(cap2, { role: "fact_caption_featured" });
  objects.push(cap2);

  // Hairline rule
  const ruleY = stat2Y + STAT_LINE_H + 60;
  objects.push(new fabric.Rect({
    left: INNER_X, top: ruleY,
    width: CARD_W - PAD_X * 2, height: 1,
    fill: RULE_COLOR,
    originX: "left", originY: "top", selectable: false,
  }));

  // Body header + copy
  const bodyHeaderY = ruleY + 32;
  objects.push(new fabric.Text(m.body_header, {
    left: INNER_X, top: bodyHeaderY,
    fontFamily: tokens.fontBody, fontSize: 28, fontWeight: 700,
    fill: tokens.textDark,
    originX: "left", originY: "top",
  }));

  objects.push(new fabric.Textbox(m.body_copy, {
    left: INNER_X, top: bodyHeaderY + 44,
    width: CARD_W - PAD_X * 2,
    fontFamily: tokens.fontBody, fontSize: 24, fontWeight: 400,
    fill: tokens.textDark, lineHeight: 1.5,
    originX: "left", originY: "top",
  }));

  // Attribution — bottom-right of the warm margin strip
  objects.push(new fabric.Text(m.attribution, {
    left: CANVAS_SIZE - (CARD_PAD + 24), top: CANVAS_SIZE - 50,
    fontFamily: tokens.fontBody, fontSize: 16, fontStyle: "italic",
    fill: "#8A837A",
    originX: "right", originY: "top",
  }));

  // Brand pill (bottom-left, in the warm margin strip)
  const brandPill = makeBrandPill({
    wordmark: m.brand_wordmark,
    x: CARD_PAD + 24, y: CANVAS_SIZE - 66,
    tokens, height: 48, fontSize: 17,
  });
  setData(brandPill, { role: "fact_brand_pill" });
  objects.push(brandPill);

  return objects;
}
