import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import {
  makeBrandPill,
  makeOutlinedPill,
  makeMixedWeightText,
  makeDotProgressIndicator,
  type TextRun,
} from "./shared/compact";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData } from "./shared";

// Compact templates ignore the passed CanvasTokens and use their own COMPACT_TOKENS —
// the design deliberately diverges from AURORA/LUMINA (cream bg, Inter Black display).
// _t is accepted only to satisfy the TemplateBuilder signature.

const CANVAS_SIZE = 1080;

interface CompactMeta {
  category_pill?: string;
  headline_runs?: TextRun[];
  brand_wordmark?: string;
  dot_count?: number;
  dot_active?: number;
  headline_size?: number;
}

const DEFAULTS: Required<CompactMeta> = {
  category_pill: "VIRAL REEL",
  headline_runs: [{ text: "FAKE POST", weight: 900 }],
  brand_wordmark: "@nextwork",
  dot_count: 5,
  dot_active: 0,
  headline_size: 112,  // LLM suggested — 140 was too big causing over-wrap
};

export async function buildAuroraCompactHook(
  slide: SlideData & { canvas_template?: string; compact_meta?: CompactMeta },
  _imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<CompactMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };

  // If slide.title is set and compact_meta.headline_runs is default, use title as single run
  if (slide.title && !slide.compact_meta?.headline_runs) {
    m.headline_runs = [{ text: slide.title, weight: 900 }];
  }

  const objects: fabric.FabricObject[] = [];

  // 1. Cream background — the design token spec says #F5F0E8
  // POC v2 finding: user reference PNGs turned out to be PHOTOS of phones displaying
  // Instagram posts (with brown phone cases + photo distortion), not clean design refs.
  // A pixel-perfect diff against those photos is impossible for a digital template.
  // For POC v2 we render the clean design; Stage B will re-crop refs to isolate the
  // actual slide content out of the phone-case photos.
  const bg = new fabric.Rect({
    left: 0, top: 0,
    width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: tokens.bgCream,
    originX: "left", originY: "top",
    selectable: false,
  });
  setData(bg, { role: "compact_bg" });
  objects.push(bg);

  // 2. Peach category pill (top center-ish, y ≈ 140 per LLM Iter-0 fix)
  const pillH = 52;
  const pillFontSize = 22;
  const catPill = makeOutlinedPill({
    text: m.category_pill,
    x: 0, y: 140,
    tokens,
    height: pillH,
    padding: 28,
    fontSize: pillFontSize,
    letterSpacing: 180,
  });
  const pillWidth = (catPill.width ?? 0);
  catPill.set({ left: (CANVAS_SIZE - pillWidth) / 2 });
  setData(catPill, { role: "compact_category_pill" });
  objects.push(catPill);

  // 3. Big display headline (mixed-weight-text), size + position from LLM Iter-0 fix
  const headlineWidth = 940;
  const headline = makeMixedWeightText({
    runs: m.headline_runs,
    x: (CANVAS_SIZE - headlineWidth) / 2,
    y: 310,
    size: m.headline_size,
    maxWidth: headlineWidth,
    tokens,
    lineHeight: 0.92,
    align: "center",
  });
  setData(headline, { role: "compact_headline" });
  objects.push(headline);

  // 4. Brand pill (bottom-left, LLM Iter-0 fix: y=940, x=72)
  const brandPill = makeBrandPill({
    wordmark: m.brand_wordmark,
    x: 72,
    y: 940,
    tokens,
    height: 52,
    fontSize: 18,
  });
  setData(brandPill, { role: "compact_brand_pill" });
  objects.push(brandPill);

  // 5. Dot progress indicator (bottom center, LLM Iter-0 fix: y=966)
  const dots = makeDotProgressIndicator({
    count: m.dot_count,
    active: m.dot_active,
    x: CANVAS_SIZE / 2,
    y: 966,
    tokens,
    size: 10,
    gap: 14,
    activeScale: 1.6,
  });
  setData(dots, { role: "compact_dot_indicator" });
  objects.push(dots);

  return objects;
}
