import * as fabric from "fabric";
import { createBrandBar, createGlowBg, makeText, makeTitleText } from "./shared";
import { createChartObject } from "./chartRenderer";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import type { ChartType, ChartData } from "@/types/chart";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricFill = string | fabric.Gradient<any, any> | fabric.Pattern;

const CS = 1080;

/**
 * Pick a font size that fits statValStr on ONE line within maxWidth px.
 * Uses Syne Bold average char width ≈ 0.62× fontSize.
 * Starts at 116px, reduces in steps of 8 down to 52px minimum.
 */
function statFontSize(statValStr: string, maxWidth: number): number {
  for (let fs = 116; fs >= 52; fs -= 8) {
    const estimatedW = statValStr.length * fs * 0.62;
    if (estimatedW <= maxWidth) return fs;
  }
  return 52;
}

export async function buildAuroraStat(
  slide: SlideData,
  _imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];

  // Background
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CS, height: CS, fill: "#090909",
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  }));

  const hasChart = !!(slide.chart_data && slide.chart_type);
  // With a chart, push stat to 64px top so the large number doesn't bleed off edge.
  // Without a chart, centre vertically in the content zone.
  const TOP_Y    = hasChart ? 64 : Math.round(CS * 0.18);

  // ── Layout constants ──────────────────────────────────────────────────────────
  const STAT_LEFT = 64;
  // Reserve at most 55% of canvas width for the stat number — leaves room for meta
  const MAX_STAT_W = Math.round(CS * 0.55);   // 594px
  const META_GAP  = 52;

  const statValStr = slide.stat_value ?? "—";

  // Compute font size that fits on ONE line — never wraps
  const FS = statFontSize(statValStr, MAX_STAT_W);

  // Actual single-line height at this font size
  const STAT_LINE_H = Math.round(FS * 0.88);  // Syne line-height ~0.88
  // Width the text actually occupies at this font size
  const STAT_ACT_W  = Math.min(MAX_STAT_W, Math.round(statValStr.length * FS * 0.62));

  const META_LEFT  = STAT_LEFT + STAT_ACT_W + META_GAP;
  const META_WIDTH = CS - META_LEFT - 64;

  let curY = TOP_Y;

  // ── Big stat number — ALWAYS one line ────────────────────────────────────────
  objects.push(makeTitleText(statValStr, {
    t, role: "stat_value",
    fontFamily: `${t.fontTitle}, sans-serif`,
    fontSize: FS,
    lineHeight: 0.88,
    fill: new fabric.Gradient({
      type: "linear",
      coords: { x1: 0, y1: 0, x2: STAT_ACT_W, y2: 0 },
      colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
    }) as FabricFill,
    width: STAT_ACT_W,
    left: STAT_LEFT, top: curY,
  }));

  // ── Meta column (label + title) beside the number ────────────────────────────
  let metaY = curY + 6;
  let metaBottom = metaY;  // track how far down the meta column extends

  if (slide.stat_label) {
    const labelCharsPerLine = Math.max(1, Math.floor(META_WIDTH / (24 * 0.58)));
    const labelLines = Math.max(1, Math.ceil(slide.stat_label.length / labelCharsPerLine));
    objects.push(makeText(slide.stat_label, {
      role: "stat_label", fontSize: 24, fontWeight: "700", fill: t.text,
      lineHeight: 1.25, width: META_WIDTH,
      left: META_LEFT, top: metaY,
      originX: "left" as const, originY: "top" as const,
    }));
    metaY += labelLines * 24 * 1.25 + 8;
    metaBottom = metaY;
  }

  if (slide.title) {
    const titleCharsPerLine = Math.max(1, Math.floor(META_WIDTH / (15 * 0.58)));
    const titleLines = Math.max(1, Math.ceil(slide.title.length / titleCharsPerLine));
    objects.push(makeText(slide.title, {
      role: "stat_title", fontSize: 15, fill: t.muted,
      lineHeight: 1.4, width: META_WIDTH,
      left: META_LEFT, top: metaY,
      originX: "left" as const, originY: "top" as const,
    }));
    metaBottom = metaY + titleLines * 15 * 1.4;
  }

  // curY must clear BOTH the stat number AND the meta column — whichever is lower
  const statBottom = curY + STAT_LINE_H;
  curY = Math.max(statBottom, metaBottom) + 28;

  // ── Accent divider ────────────────────────────────────────────────────────────
  const divider = new fabric.Rect({
    left: STAT_LEFT, top: curY, width: 56, height: 3, rx: 2,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: 56, y2: 0 },
      colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
    }),
    originX: "left" as const, originY: "top" as const,
  });
  (divider as fabric.Rect & { data?: unknown }).data = { role: "stat_divider" };
  objects.push(divider);
  curY += 22;

  // ── Body text ─────────────────────────────────────────────────────────────────
  if (slide.body) {
    const words    = slide.body.split(" ");
    const maxWords = hasChart ? 26 : 100;
    const bodyText = words.slice(0, maxWords).join(" ") + (words.length > maxWords ? "…" : "");

    const BODY_FS  = 20;
    const BODY_W   = CS - STAT_LEFT - 64 - 20;
    const BODY_LH  = 1.6;
    const bodyCharsPerLine = Math.max(1, Math.floor(BODY_W / (BODY_FS * 0.58)));
    const bodyLines        = Math.max(1, Math.ceil(bodyText.length / bodyCharsPerLine));
    const barH             = bodyLines * BODY_FS * BODY_LH;

    const accentBar = new fabric.Rect({
      left: STAT_LEFT, top: curY,
      width: 3, height: barH, rx: 2,
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: 0, y2: barH },
        colorStops: [{ offset: 0, color: "rgba(124,110,250,0.55)" }, { offset: 1, color: "rgba(124,110,250,0.15)" }],
      }),
      originX: "left" as const, originY: "top" as const,
    });
    (accentBar as fabric.Rect & { data?: unknown }).data = { role: "stat_body_accent" };
    objects.push(accentBar);

    objects.push(makeText(bodyText, {
      role: "stat_body", fontSize: BODY_FS, fill: "rgba(250,250,250,0.72)",
      lineHeight: BODY_LH, width: BODY_W,
      left: STAT_LEFT + 18, top: curY,
      originX: "left" as const, originY: "top" as const,
    }));
    curY += barH + 22;
  }

  // ── Chart ─────────────────────────────────────────────────────────────────────
  if (hasChart) {
    const chartH = Math.max(220, CS - t.brandBarH - curY - 28);
    objects.push(await createChartObject(
      slide.chart_type as ChartType,
      slide.chart_data as ChartData,
      t,
      { left: STAT_LEFT, top: curY, width: CS - STAT_LEFT * 2, height: chartH },
      "aurora",
    ));
  } else {
    // No chart — fill lower half with atmospheric glow so it doesn't look empty
    objects.push(...createGlowBg([
      { rx: 480, ry: 420, left: CS * 0.3, top: curY + 60,  color: t.primary,   opacity: 0.18 },
      { rx: 380, ry: 340, left: CS * 0.0, top: curY + 180, color: t.secondary, opacity: 0.12 },
    ]));
  }

  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
