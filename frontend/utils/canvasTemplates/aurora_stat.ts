import * as fabric from "fabric";
import { createBrandBar, createGlowBg, makeText, makeTitleText, setData } from "./shared";
import type { FabricFill } from "./shared/types";
import { createChartObject } from "./chartRenderer";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { isDarkTheme } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import type { ChartType, ChartData } from "@/types/chart";

const CS = 1080;

/**
 * Pick the largest font size that fits statValStr on ONE line within maxWidth px.
 * Uses a temporary Fabric Text object and calcTextWidth() for accurate measurement.
 * Starts at 116px, reduces in steps of 8 down to 52px minimum.
 */
function statFontSize(statValStr: string, maxWidth: number, fontFamily: string): number {
  for (let fs = 116; fs >= 52; fs -= 8) {
    const probe = new fabric.Text(statValStr, { fontSize: fs, fontFamily, fontWeight: "700" });
    if ((probe.calcTextWidth?.() ?? fs * statValStr.length * 0.62) <= maxWidth) return fs;
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
    left: 0, top: 0, width: CS, height: CS, fill: t.bg,
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  }));

  const hasChart = !!(slide.chart_data && slide.chart_type);
  // Push stat number close to top so maximum canvas height is available for the chart
  const TOP_Y    = hasChart ? 40 : Math.round(CS * 0.18);

  // ── Layout constants ──────────────────────────────────────────────────────────
  const STAT_LEFT = 64;
  // Reserve at most 55% of canvas width for the stat number — leaves room for meta
  const MAX_STAT_W = Math.round(CS * 0.55);   // 594px
  const META_GAP  = 52;

  const statValStr = slide.stat_value ?? "—";

  // Compute font size that fits on ONE line — never wraps
  const FS = statFontSize(statValStr, MAX_STAT_W, `${t.fontTitle}, sans-serif`);
  // 0.88 = empirical Syne Bold cap-height ratio — single line of stat value clears this height
  const STAT_LINE_H = Math.round(FS * 0.88);

  // ── Two-pass: create stat object first, read its actual rendered width ───────
  // Using character-width estimation (0.62×FS) is inaccurate for Unicode chars
  // like ₹ and mixed-case text. Instead we create the Textbox and read its width
  // after Fabric computes the layout.
  const statObj = makeTitleText(statValStr, {
    t, role: "stat_value",
    fontFamily: `${t.fontTitle}, sans-serif`,
    fontSize: FS,
    lineHeight: 0.88,
    fill: new fabric.Gradient({
      type: "linear",
      coords: { x1: 0, y1: 0, x2: MAX_STAT_W, y2: 0 },
      colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
    }) as FabricFill,
    width: MAX_STAT_W,
    left: STAT_LEFT, top: 0,
  });
  // Use the actual content width (not container width) so META_LEFT is accurate
  const STAT_ACT_W = Math.min(MAX_STAT_W, Math.ceil((statObj as fabric.Textbox).calcTextWidth?.() ?? MAX_STAT_W));

  const META_LEFT  = STAT_LEFT + STAT_ACT_W + META_GAP;
  const META_WIDTH = Math.max(200, CS - META_LEFT - 64);  // guaranteed minimum 200px

  let curY = TOP_Y;
  statObj.set({ top: curY });
  objects.push(statObj);

  // ── Meta column (label + title) beside the number ────────────────────────────
  // Two-pass: create text objects, measure with calcTextHeight(), then position
  let metaY = curY + 6;
  let metaBottom = metaY;

  if (slide.stat_label) {
    const labelObj = makeText(slide.stat_label, {
      role: "stat_label", fontSize: 24, fontWeight: "700", fill: t.text,
      lineHeight: 1.25, width: META_WIDTH,
      left: META_LEFT, top: metaY,
      originX: "left" as const, originY: "top" as const,
    });
    objects.push(labelObj);
    metaY += labelObj.calcTextHeight() + 8;
    metaBottom = metaY;
  }

  if (slide.title) {
    const titleObj = makeText(slide.title, {
      role: "stat_title", fontSize: 15, fill: t.muted,
      lineHeight: 1.4, width: META_WIDTH,
      left: META_LEFT, top: metaY,
      originX: "left" as const, originY: "top" as const,
    });
    objects.push(titleObj);
    metaBottom = metaY + titleObj.calcTextHeight();
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
  setData(divider, { role: "stat_divider" });
  objects.push(divider);
  curY += 22;

  // ── Body text ─────────────────────────────────────────────────────────────────
  if (slide.body) {
    const BODY_FS = 20;
    const BODY_W  = CS - STAT_LEFT - 64 - 20;
    const BODY_LH = 1.6;

    const bodyObj = makeText(slide.body, {
      role: "stat_body", fontSize: BODY_FS, fill: t.muted,
      lineHeight: BODY_LH, width: BODY_W,
      left: STAT_LEFT + 18, top: curY,
      originX: "left" as const, originY: "top" as const,
    });
    const rawH = (bodyObj as fabric.Textbox).calcTextHeight?.() ?? (BODY_FS * BODY_LH * 2);
    const barH = rawH;

    // Size the accent bar to match the measured text height
    const accentBar = new fabric.Rect({
      left: STAT_LEFT, top: curY,
      width: 3, height: barH, rx: 2,
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: 0, y2: barH },
        colorStops: [{ offset: 0, color: t.primary + "8C" }, { offset: 1, color: t.primary + "26" }],
      }),
      originX: "left" as const, originY: "top" as const,
    });
    setData(accentBar, { role: "stat_body_accent" });
    objects.push(accentBar);
    objects.push(bodyObj);
    curY += barH + 22;
  }

  // ── Chart ─────────────────────────────────────────────────────────────────────
  if (hasChart) {
    const chartTheme = isDarkTheme(t) ? "aurora" : "lumina";
    // Use ALL remaining vertical space — mirrors Jinja2's flex-grow:1 chart container.
    // 20px bottom padding before the brand bar.
    const chartH = Math.max(300, CS - t.brandBarH - curY - 20);
    objects.push(await createChartObject(
      slide.chart_type as ChartType,
      slide.chart_data as ChartData,
      t,
      { left: STAT_LEFT, top: curY, width: CS - STAT_LEFT * 2, height: chartH },
      chartTheme,
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
