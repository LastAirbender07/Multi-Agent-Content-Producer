import * as fabric from "fabric";
import { createBrandBar, makeText, makeTitleText } from "./shared";
import { createChartObject } from "./chartRenderer";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import type { ChartType, ChartData } from "@/types/chart";

const CS = 1080;

export async function buildAuroraStat(
  slide: SlideData,
  _imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];

  // Background — very dark, near-black
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CS, height: CS, fill: "#090909",
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  }));

  const hasChart = !!(slide.chart_data && slide.chart_type);

  // Top position — tighter when chart is present
  const TOP_Y = hasChart ? 44 : Math.round(CS * 0.18);

  // ── Stat hero block ──────────────────────────────────────────────────────────
  // Estimate how wide the stat_value text actually is at 116px Syne Bold
  // Average char width at 116px is ~0.58× = ~67px per char
  const statValStr  = slide.stat_value ?? "—";
  const estimatedStatW = Math.min(660, Math.max(180, statValStr.length * 67));
  const STAT_LEFT  = 64;
  const STAT_WIDTH = estimatedStatW;
  const META_GAP   = 28;
  const META_LEFT  = STAT_LEFT + STAT_WIDTH + META_GAP;
  const META_WIDTH = CS - META_LEFT - 64;

  let curY = TOP_Y;

  // Big stat number — Syne Bold, gradient fill
  objects.push(makeTitleText(slide.stat_value ?? "—", {
    t, role: "stat_value",
    fontFamily: `${t.fontTitle}, sans-serif`,
    fontSize: 116, lineHeight: 0.88,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: STAT_WIDTH, y2: 0 },
      colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
    }) as unknown as string,
    width: STAT_WIDTH,
    left: STAT_LEFT, top: curY,
  }));

  // Meta column: stat_label (large) + title (small) stacked beside the number
  // These are vertically centered relative to the stat value block
  const statBlockH = Math.round(116 * 0.88);  // ~102px
  let metaY = curY + 8;  // slight top align, not dead-center

  if (slide.stat_label) {
    const labelLines = Math.max(1, Math.ceil(slide.stat_label.length / (META_WIDTH / (24 * 0.58))));
    objects.push(makeText(slide.stat_label, {
      role: "stat_label", fontSize: 24, fontWeight: "700", fill: t.text,
      lineHeight: 1.25, width: META_WIDTH,
      left: META_LEFT, top: metaY,
      originX: "left" as const, originY: "top" as const,
    }));
    metaY += labelLines * 24 * 1.25 + 6;
  }

  if (slide.title) {
    objects.push(makeText(slide.title, {
      role: "stat_title", fontSize: 15, fill: t.muted,
      lineHeight: 1.4, width: META_WIDTH,
      left: META_LEFT, top: metaY,
      originX: "left" as const, originY: "top" as const,
    }));
  }

  curY += statBlockH + 24;

  // ── Accent divider (AFTER stat block, not before) ────────────────────────────
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
  curY += 20;

  // ── Body text ────────────────────────────────────────────────────────────────
  if (slide.body) {
    const words    = slide.body.split(" ");
    const maxWords = hasChart ? 26 : 100;
    const bodyText = words.slice(0, maxWords).join(" ") + (words.length > maxWords ? "…" : "");

    const accentBar = new fabric.Rect({
      left: STAT_LEFT, top: curY,
      width: 3,
      height: Math.max(1, Math.ceil(bodyText.length / 52)) * (20 * 1.6) + 8,
      fill: "rgba(124,110,250,0.4)",
      originX: "left" as const, originY: "top" as const,
    });
    (accentBar as fabric.Rect & { data?: unknown }).data = { role: "stat_body_accent" };
    objects.push(accentBar);

    objects.push(makeText(bodyText, {
      role: "stat_body", fontSize: 20, fill: "rgba(250,250,250,0.72)",
      lineHeight: 1.6,
      width: CS - STAT_LEFT - 64 - 20,
      left: STAT_LEFT + 18, top: curY,
      originX: "left" as const, originY: "top" as const,
    }));
    curY += Math.max(1, Math.ceil(bodyText.length / 52)) * (20 * 1.6) + 20;
  }

  // ── Chart ────────────────────────────────────────────────────────────────────
  if (hasChart) {
    const chartH = Math.max(220, CS - t.brandBarH - curY - 28);
    const chartObj = await createChartObject(
      slide.chart_type as ChartType,
      slide.chart_data as ChartData,
      t,
      { left: STAT_LEFT, top: curY, width: CS - STAT_LEFT * 2, height: chartH },
      "aurora",
    );
    objects.push(chartObj);
  }

  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
