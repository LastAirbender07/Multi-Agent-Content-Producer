import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import {
  makeBrandPill,
  makeOutlinedPill,
} from "./shared/compact";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData } from "./shared";

const CANVAS_SIZE = 1080;
const PAD_X = 72;

// Fact/stat palette — sampled from claude/image copy 4.png
const CORAL = "#D46A5E";
const STAT_MUTED = "#B8B0A5";
const RULE_COLOR = "#D9D4CC";

// Inter Black line heights: baseline 90pt → ~112px, featured 140pt → ~175px (empirical)
const STAT_BASELINE_SIZE = 90;
const STAT_FEATURED_SIZE = 140;
const STAT_BASELINE_H = 112;
const STAT_FEATURED_H = 175;

type FactVariant = "single" | "compare";

interface StatBlock {
  value: string;
  caption: string;
  color?: string;
}

interface CompactFactMeta {
  variant?: FactVariant;
  stat?: StatBlock;
  stat_baseline?: StatBlock;
  stat_featured?: StatBlock;
  body_header?: string;
  body_copy?: string;
  attribution?: string;
  category_pill?: string;
  brand_wordmark?: string;
}

const DEFAULTS: Required<CompactFactMeta> = {
  variant: "compare",
  stat: { value: "+47%", caption: "improvement in 30 days" },
  stat_baseline: { value: "10–15%", caption: "Typical for the field" },
  stat_featured: { value: "22–35%", caption: "Claude's protein designs" },
  body_header: "Into the lab",
  body_copy:
    "Two independent labs built Claude's proteins and tested them. Designs bound at roughly double the rate typical for the field.",
  attribution: "Anthropic Research Report, 2024",
  category_pill: "STAT",
  brand_wordmark: "@nextwork",
};

export async function buildAuroraCompactFact(
  slide: SlideData & { compact_meta?: CompactFactMeta },
  _imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<CompactFactMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };

  const objects: fabric.FabricObject[] = [];

  // 1. Cream background
  const bg = new fabric.Rect({
    left: 0, top: 0,
    width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: tokens.bgCream,
    originX: "left", originY: "top",
    selectable: false,
  });
  setData(bg, { role: "fact_bg" });
  objects.push(bg);

  if (m.variant === "compare") {
    // Two-stat compare — no pill, straight left-aligned stats
    // Layout mirrors claude/image copy 4.png

    const stat1 = new fabric.Text(m.stat_baseline.value, {
      left: PAD_X, top: 100,
      fontFamily: tokens.fontDisplay,
      fontSize: STAT_BASELINE_SIZE, fontWeight: 900,
      fill: m.stat_baseline.color ?? STAT_MUTED,
      originX: "left", originY: "top",
      selectable: false,
    });
    setData(stat1, { role: "fact_stat_baseline" });
    objects.push(stat1);

    const cap1 = new fabric.Textbox(m.stat_baseline.caption, {
      left: PAD_X, top: 100 + STAT_BASELINE_H,
      width: CANVAS_SIZE - PAD_X * 2,
      fontFamily: tokens.fontBody,
      fontSize: 22, fontWeight: 400,
      fill: STAT_MUTED,
      originX: "left", originY: "top",
      selectable: false,
    });
    setData(cap1, { role: "fact_caption_baseline" });
    objects.push(cap1);

    // Featured stat starts below baseline caption — extra air creates visual breathing room
    const stat2Y = 100 + STAT_BASELINE_H + 34 + 56;

    const stat2 = new fabric.Text(m.stat_featured.value, {
      left: PAD_X, top: stat2Y,
      fontFamily: tokens.fontDisplay,
      fontSize: STAT_FEATURED_SIZE, fontWeight: 900,
      fill: m.stat_featured.color ?? CORAL,
      originX: "left", originY: "top",
      selectable: false,
    });
    setData(stat2, { role: "fact_stat_featured" });
    objects.push(stat2);

    const cap2 = new fabric.Textbox(m.stat_featured.caption, {
      left: PAD_X, top: stat2Y + STAT_FEATURED_H,
      width: CANVAS_SIZE - PAD_X * 2,
      fontFamily: tokens.fontBody,
      fontSize: 22, fontWeight: 400,
      fill: tokens.textDark,
      originX: "left", originY: "top",
      selectable: false,
    });
    setData(cap2, { role: "fact_caption_featured" });
    objects.push(cap2);

    // Hairline rule after second caption
    const ruleY = stat2Y + STAT_FEATURED_H + 56;
    const rule = new fabric.Rect({
      left: PAD_X, top: ruleY,
      width: CANVAS_SIZE - PAD_X * 2, height: 1,
      fill: RULE_COLOR,
      originX: "left", originY: "top",
      selectable: false,
    });
    setData(rule, { role: "fact_rule" });
    objects.push(rule);

    // Body section
    const bodyHeaderY = ruleY + 36;
    const bodyHeader = new fabric.Text(m.body_header, {
      left: PAD_X, top: bodyHeaderY,
      fontFamily: tokens.fontBody,
      fontSize: 26, fontWeight: 700,
      fill: tokens.textDark,
      originX: "left", originY: "top",
      selectable: false,
    });
    setData(bodyHeader, { role: "fact_body_header" });
    objects.push(bodyHeader);

    const bodyCopy = new fabric.Textbox(m.body_copy, {
      left: PAD_X, top: bodyHeaderY + 40,
      width: CANVAS_SIZE - PAD_X * 2,
      fontFamily: tokens.fontBody,
      fontSize: 22, fontWeight: 400,
      fill: tokens.textDark,
      lineHeight: 1.55,
      originX: "left", originY: "top",
      selectable: false,
    });
    setData(bodyCopy, { role: "fact_body_copy" });
    objects.push(bodyCopy);

  } else {
    // Single-stat variant — category pill + big stat + claim
    const pillH = 48;
    const catPill = makeOutlinedPill({
      text: m.category_pill,
      x: PAD_X, y: 120,
      tokens,
      height: pillH,
      padding: 24,
      fontSize: 19,
      letterSpacing: 180,
    });
    setData(catPill, { role: "fact_category_pill" });
    objects.push(catPill);

    // Big stat left-aligned — 140pt fills ~190px height
    const bigStat = new fabric.Text(m.stat.value, {
      left: PAD_X, top: 220,
      fontFamily: tokens.fontDisplay,
      fontSize: 140, fontWeight: 900,
      fill: m.stat.color ?? CORAL,
      originX: "left", originY: "top",
      selectable: false,
    });
    setData(bigStat, { role: "fact_stat_single" });
    objects.push(bigStat);

    const statCap = new fabric.Textbox(m.stat.caption, {
      left: PAD_X, top: 420,
      width: CANVAS_SIZE - PAD_X * 2,
      fontFamily: tokens.fontBody,
      fontSize: 26, fontWeight: 400,
      fill: STAT_MUTED,
      originX: "left", originY: "top",
      selectable: false,
    });
    setData(statCap, { role: "fact_stat_caption" });
    objects.push(statCap);

    // Rule + bold claim
    const rule = new fabric.Rect({
      left: PAD_X, top: 498,
      width: CANVAS_SIZE - PAD_X * 2, height: 1,
      fill: RULE_COLOR,
      originX: "left", originY: "top",
      selectable: false,
    });
    objects.push(rule);

    const claim = new fabric.Textbox(m.body_copy, {
      left: PAD_X, top: 530,
      width: CANVAS_SIZE - PAD_X * 2,
      fontFamily: tokens.fontBody,
      fontSize: 34, fontWeight: 700,
      fill: tokens.textDark,
      lineHeight: 1.35,
      originX: "left", originY: "top",
      selectable: false,
    });
    setData(claim, { role: "fact_claim" });
    objects.push(claim);

    // Attribution sits above the brand pill
    const attr = new fabric.Textbox(m.attribution, {
      left: PAD_X, top: 860,
      width: CANVAS_SIZE - PAD_X * 2,
      fontFamily: tokens.fontBody,
      fontSize: 18, fontWeight: 300, fontStyle: "italic",
      fill: tokens.textMuted,
      originX: "left", originY: "top",
      selectable: false,
    });
    setData(attr, { role: "fact_attribution" });
    objects.push(attr);
  }

  // Bottom chrome — same as hook
  const brandPill = makeBrandPill({
    wordmark: m.brand_wordmark,
    x: 72, y: 940,
    tokens, height: 52, fontSize: 18,
  });
  setData(brandPill, { role: "fact_brand_pill" });
  objects.push(brandPill);

  return objects;
}
