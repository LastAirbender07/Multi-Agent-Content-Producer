import * as fabric from "fabric";
import { createBrandBar, createAccentLine, makeText, makeTitleText } from "./shared";
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

  // Background (dark surface, no full-bleed image on stat slides)
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CS, height: CS, fill: t.surface,
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  }));

  const hasChart = !!(slide.chart_data && slide.chart_type);
  let curY = hasChart ? 52 : CS * 0.22;  // flex-start if chart, else center-ish

  // Accent line
  objects.push(createAccentLine(t, 60, 64, curY));
  curY += 22;

  // Stat value (huge number)
  const statVal = slide.stat_value ?? "—";
  const statVTextbox = makeTitleText(statVal, {
    t,
    role: "stat_value",
    fontSize: 116,
    fontFamily: `${t.fontTitle}, sans-serif`,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: 400, y2: 0 },
      colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
    }) as unknown as string,
    lineHeight: 0.88,
    left: 64, top: curY,
    width: 560,
  });
  objects.push(statVTextbox);

  // Stat label + title beside stat value
  const metaLeft = 64 + 400 + 28;
  const metaW    = CS - metaLeft - 64;
  let metaY = curY + 10;

  if (slide.stat_label) {
    objects.push(makeText(slide.stat_label, {
      role: "stat_label", fontSize: 24, fontWeight: "600", fill: t.text,
      lineHeight: 1.3, width: metaW, left: metaLeft, top: metaY,
      originX: "left" as const, originY: "top" as const,
    }));
    metaY += Math.ceil(slide.stat_label.length / (metaW / (24 * 0.6))) * (24 * 1.3) + 8;
  }

  if (slide.title) {
    objects.push(makeText(slide.title, {
      role: "stat_title", fontSize: 16, fill: t.muted,
      lineHeight: 1.4, width: metaW, left: metaLeft, top: metaY,
      originX: "left" as const, originY: "top" as const,
    }));
  }

  curY += 116 * 0.88 + 28;

  // Divider
  const divider = new fabric.Rect({
    left: 64, top: curY, width: 60, height: 3, rx: 2,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: 60, y2: 0 },
      colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
    }),
    originX: "left" as const, originY: "top" as const,
  });
  (divider as fabric.Rect & { data?: unknown }).data = { role: "stat_divider" };
  objects.push(divider);
  curY += 28;

  // Body text
  if (slide.body) {
    // Left border accent
    const accentBar = new fabric.Rect({
      left: 64, top: curY, width: 3, height: Math.ceil(slide.body.length / 54) * (20 * 1.6) + 8,
      fill: "rgba(124,110,250,0.35)",
      originX: "left" as const, originY: "top" as const,
    });
    (accentBar as fabric.Rect & { data?: unknown }).data = { role: "stat_body_accent" };
    objects.push(accentBar);
    objects.push(makeText(slide.body, {
      role: "stat_body", fontSize: 20, fill: "rgba(250,250,250,0.72)",
      lineHeight: 1.6, width: CS - 64 - 64 - 20, left: 64 + 18, top: curY,
      originX: "left" as const, originY: "top" as const,
    }));
    curY += Math.ceil(slide.body.length / 54) * (20 * 1.6) + 24;
  }

  // Chart
  if (hasChart) {
    const chartH = Math.max(200, CS - t.brandBarH - curY - 32);
    const chartObj = await createChartObject(
      slide.chart_type as ChartType,
      slide.chart_data as ChartData,
      t,
      { left: 64, top: curY, width: CS - 128, height: chartH },
      "aurora",
    );
    objects.push(chartObj);
  }

  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
