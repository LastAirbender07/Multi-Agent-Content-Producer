import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import type { ChartType, ChartData } from "@/types/chart";
import { makeBrandPill } from "./shared/compact";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData } from "./shared";
import { createChartObject } from "./chartRenderer";

// SRP: one job — give data room to breathe.
// Category pill + headline frames the question. Chart fills the canvas and answers it.
// No stat number. No body text. Every pixel below the headline belongs to the chart.

const CANVAS_SIZE  = 1080;
const PAD_X        = 64;
const TEXT_W       = CANVAS_SIZE - PAD_X * 2;  // 952px
const HEADLINE_FS  = 52;
const BRAND_PILL_Y = CANVAS_SIZE - 80;
const CHART_TOP    = 260;  // headline + pill + gaps; chart starts here

interface CompactChartMeta {
  headline?:      string;   // overrides slide.title — what this chart proves
  brand_wordmark?: string;
}

const DEFAULTS: CompactChartMeta = {
  headline:      "",
  brand_wordmark: "@nextwork",
};

export async function buildAuroraCompactChart(
  slide: SlideData & { compact_meta?: CompactChartMeta },
  _imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: CompactChartMeta = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };
  if (_meta.brandName) m.brand_wordmark = `@${_meta.brandName.replace(/^@/, "")}`;

  const headline = m.headline || slide.title || "";
  const hasChart = !!(slide.chart_data && slide.chart_type);

  const objects: fabric.FabricObject[] = [];

  // ── Background ────────────────────────────────────────────────────────────────
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: new fabric.Gradient({
      type: "linear", gradientUnits: "percentage",
      coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
      colorStops: [
        { offset: 0,   color: "#0D1520" },
        { offset: 0.5, color: "#0F1825" },
        { offset: 1,   color: "#0A1018" },
      ],
    }),
    originX: "left", originY: "top", selectable: false,
  }));
  // Glassmorphism overlay
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: new fabric.Gradient({
      type: "linear", gradientUnits: "percentage",
      coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
      colorStops: [
        { offset: 0,    color: "rgba(8,12,20,0.88)" },
        { offset: 0.44, color: "rgba(8,12,20,0.91)" },
        { offset: 1,    color: "rgba(8,12,20,0.96)" },
      ],
    }),
    originX: "left", originY: "top", selectable: false,
  }));
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CANVAS_SIZE, height: 4,
    fill: "rgba(255,255,255,0.06)",
    originX: "left", originY: "top", selectable: false,
  }));

  // ── DATA pill ─────────────────────────────────────────────────────────────────
  const PILL_H  = 34;
  const PILL_PX = 18;
  const pillLabel = "DATA";
  // Pill background
  objects.push(new fabric.Rect({
    left: PAD_X, top: 52,
    width: PILL_PX * 2 + pillLabel.length * 9,  // approximate width
    height: PILL_H, rx: PILL_H / 2,
    fill: "rgba(245,197,24,0.18)",
    originX: "left", originY: "top", selectable: false,
  }));
  objects.push(new fabric.Text(pillLabel, {
    left: PAD_X + PILL_PX, top: 52 + 8,
    fontFamily: tokens.fontBody, fontSize: 13, fontWeight: 700,
    fill: "#F5C518", letterSpacing: 1.5,
    originX: "left", originY: "top", selectable: false,
  }));

  // ── Headline (frames the question the chart answers) ──────────────────────────
  const hlProbe = new fabric.Textbox(headline, {
    width: TEXT_W, fontFamily: tokens.fontBody,
    fontSize: HEADLINE_FS, fontWeight: 700, lineHeight: 1.12,
  });
  const hlH = (hlProbe.height ?? HEADLINE_FS) + 8;
  const headlineTop = 52 + PILL_H + 16;

  objects.push(new fabric.Textbox(headline, {
    left: PAD_X, top: headlineTop, width: TEXT_W,
    fontFamily: tokens.fontBody, fontSize: HEADLINE_FS, fontWeight: 700,
    fill: "#FFFFFF", lineHeight: 1.12,
    originX: "left", originY: "top",
  }));

  // ── Chart — fills all space between headline and brand pill ───────────────────
  const dynamicChartTop = headlineTop + hlH + 28;
  const chartH = Math.max(260, BRAND_PILL_Y - dynamicChartTop - 24);

  if (hasChart) {
    objects.push(await createChartObject(
      slide.chart_type as ChartType,
      slide.chart_data as ChartData,
      _t,
      { left: PAD_X, top: dynamicChartTop, width: TEXT_W, height: chartH },
      "aurora",
    ));
  } else {
    // Placeholder when no chart data — shows a "no data" message
    objects.push(new fabric.Textbox("Chart data unavailable", {
      left: PAD_X, top: dynamicChartTop + chartH / 2 - 20, width: TEXT_W,
      fontFamily: tokens.fontBody, fontSize: 20, fontWeight: 400,
      fill: "rgba(255,255,255,0.3)", textAlign: "center",
      originX: "left", originY: "top",
    }));
  }

  // ── Brand pill ────────────────────────────────────────────────────────────────
  if (m.brand_wordmark) {
    const brandPill = makeBrandPill({
      wordmark: m.brand_wordmark,
      x: PAD_X, y: BRAND_PILL_Y,
      tokens, height: 48, fontSize: 17,
    });
    setData(brandPill, { role: "chart_brand_pill" });
    objects.push(brandPill);
  }

  return objects;
}
