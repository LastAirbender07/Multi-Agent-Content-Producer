/**
 * aurora_compact_content.ts — Compact-clean family / general content slide
 *
 * Visual DNA: full-bleed photo background → dark gradient overlay (transparent top,
 * dark bottom) → large title + body text anchored to lower half.
 * No stats. No step numbers. Just image + story.
 *
 * Used for:  FACTS content slides (photo + fact body)
 *            REVIEW content slides
 *            Any compact-clean slide type=content without a stat value
 *
 * Falls back to slide.title / slide.body when compact_meta is absent — compatible
 * with auto-generated pipeline slides without manual compact_meta authoring.
 *
 * Layout (1080×1080):
 *   Full-bleed photo background (cover-fit, same as aurora_compact_step)
 *   Dark gradient overlay (rgba 0→0.72 top→bottom)
 *   Optional eyebrow pill — top-left (12pt, outlined)
 *   TITLE — Inter Black 56pt, white, left-aligned, bottom half
 *   BODY  — Inter Regular 22pt, white/70%, wraps below title
 *   Brand pill — bottom-left
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import { makeBrandPill, makeOutlinedPill } from "./shared/compact";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData, resolveAssetUrl } from "./shared";

const CANVAS_SIZE = 1080;
const PAD_X       = 60;
const PAD_BOTTOM  = 120;   // space for brand pill
const TITLE_FS    = 56;
const BODY_FS     = 22;
const TITLE_BODY_GAP = 20;

interface CompactContentMeta {
  heading?:       string;    // ← slide.title
  body_copy?:     string;    // ← slide.body
  eyebrow?:       string;    // ← topic tag (optional)
  brand_wordmark?: string;
  image_url?:     string;
}

const DEFAULTS: Required<CompactContentMeta> = {
  heading:       "Your headline here",
  body_copy:     "One supporting idea — clear and direct.",
  eyebrow:       "",
  brand_wordmark: "@yourbrand",
  image_url:     "",
};

export async function buildAuroraCompactContent(
  slide: SlideData & { image_url?: string; compact_meta?: CompactContentMeta },
  imageUrl: string | null,
  _t: CanvasTokens,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<CompactContentMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };

  // Fallback from standard slide fields — no compact_meta needed for pipeline slides
  if (!slide.compact_meta) {
    if (slide.title) m.heading   = slide.title;
    if (slide.body)  m.body_copy = slide.body;
  }

  const objects: fabric.FabricObject[] = [];
  const resolvedImageUrl = resolveAssetUrl(imageUrl ?? (slide.image_url ?? m.image_url ?? null) ?? null);

  // ── 1. Photo background ───────────────────────────────────────────────────
  if (resolvedImageUrl) {
    try {
      const img = await fabric.FabricImage.fromURL(resolvedImageUrl, { crossOrigin: "anonymous" });
      const scaleX = CANVAS_SIZE / (img.width  ?? CANVAS_SIZE);
      const scaleY = CANVAS_SIZE / (img.height ?? CANVAS_SIZE);
      img.set({
        left: 0, top: 0,
        originX: "left", originY: "top",
        scaleX: Math.max(scaleX, scaleY),
        scaleY: Math.max(scaleX, scaleY),
        selectable: false,
      });
      setData(img, { role: "content_bg_photo" });
      objects.push(img);
    } catch { /* fallback below */ }
  }

  // Dark fallback when no image
  if (objects.length === 0) {
    objects.push(new fabric.Rect({
      left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE,
      fill: new fabric.Gradient({
        type: "linear", gradientUnits: "percentage",
        coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
        colorStops: [
          { offset: 0, color: "#1A1208" },
          { offset: 1, color: "#0A0A0A" },
        ],
      }),
      originX: "left", originY: "top",
      selectable: false,
    }));
  }

  // ── 2. Gradient overlay — transparent top, dark bottom ───────────────────
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: new fabric.Gradient({
      type: "linear", gradientUnits: "percentage",
      coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
      colorStops: [
        { offset: 0,    color: "rgba(0,0,0,0.05)" },
        { offset: 0.35, color: "rgba(0,0,0,0.25)" },
        { offset: 0.65, color: "rgba(0,0,0,0.55)" },
        { offset: 1,    color: "rgba(0,0,0,0.82)" },
      ],
    }),
    originX: "left", originY: "top",
    selectable: false,
  }));

  // ── 3. Optional eyebrow pill ──────────────────────────────────────────────
  if (m.eyebrow) {
    const pill = makeOutlinedPill({
      text: m.eyebrow.toUpperCase(),
      x: PAD_X, y: 72,
      tokens, height: 40, padding: 20, fontSize: 12, letterSpacing: 200,
    });
    setData(pill, { role: "content_eyebrow" });
    objects.push(pill);
  }

  // ── 4. Two-pass layout: measure title + body, anchor to bottom ───────────
  const TEXT_W = CANVAS_SIZE - PAD_X * 2;

  // Pass 1: measure
  const titleProbe = new fabric.Textbox(m.heading, {
    width: TEXT_W,
    fontFamily: tokens.fontBody,
    fontSize: TITLE_FS, fontWeight: 900,
    lineHeight: 1.08,
  });
  const titleH = (titleProbe.height ?? TITLE_FS * 1.08) + 8;

  const bodyProbe = m.body_copy
    ? new fabric.Textbox(m.body_copy, {
        width: TEXT_W,
        fontFamily: tokens.fontBody,
        fontSize: BODY_FS, fontWeight: 400,
        lineHeight: 1.55,
      })
    : null;
  const bodyH = bodyProbe ? ((bodyProbe.height ?? BODY_FS * 1.55) + 8) : 0;

  const blockH = titleH + (bodyH ? TITLE_BODY_GAP + bodyH : 0);

  // Pass 2: anchor text block above brand pill
  const blockBottom = CANVAS_SIZE - PAD_BOTTOM - 20;
  const titleTop    = blockBottom - blockH;

  // Title
  const titleObj = new fabric.Textbox(m.heading, {
    left: PAD_X, top: titleTop,
    width: TEXT_W,
    fontFamily: tokens.fontBody,
    fontSize: TITLE_FS, fontWeight: 900,
    fill: "#FFFFFF",
    lineHeight: 1.08,
    originX: "left", originY: "top",
  });
  setData(titleObj, { role: "content_title" });
  objects.push(titleObj);

  // Body
  if (m.body_copy) {
    const bodyObj = new fabric.Textbox(m.body_copy, {
      left: PAD_X, top: titleTop + titleH + TITLE_BODY_GAP,
      width: TEXT_W,
      fontFamily: tokens.fontBody,
      fontSize: BODY_FS, fontWeight: 400,
      fill: "rgba(255,255,255,0.75)",
      lineHeight: 1.55,
      originX: "left", originY: "top",
    });
    setData(bodyObj, { role: "content_body" });
    objects.push(bodyObj);
  }

  // ── 5. Brand pill ─────────────────────────────────────────────────────────
  const brandPill = makeBrandPill({
    wordmark: m.brand_wordmark,
    x: PAD_X, y: CANVAS_SIZE - 80,
    tokens, height: 52, fontSize: 18,
  });
  setData(brandPill, { role: "content_brand_pill" });
  objects.push(brandPill);

  return objects;
}
