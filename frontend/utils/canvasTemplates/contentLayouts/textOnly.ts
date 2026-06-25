import * as fabric from "fabric";
import { createAccentLine, createBulletItem, makeText, makeTitleText } from "../shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import { estimateLines } from "@/utils/canvasTextHelpers";

const CS = 1080;

// layout === -1: text only, no image
export async function buildLayoutTextOnly(
  slide: SlideData,
  _imageUrl: string | null,
  t: CanvasTokens,
  _meta: unknown,
  objects: fabric.FabricObject[],
): Promise<void> {
  const CONTENT_H = CS - t.brandBarH;
  const TX = 60, TW = 960;
  const titleLines = estimateLines(slide.title ?? "", TW, 48);
  const titleH     = titleLines * 48 * 1.15;
  const bodyLines  = slide.body ? estimateLines(slide.body, TW, 23) : 0;
  const bodyH      = bodyLines * 23 * 1.5;   // 1.5 line-height (tighter than 1.65)
  const bulletH    = slide.bullets?.reduce((acc, b) => {
    return acc + estimateLines(b, TW - 42, 20) * 20 * 1.5 + 14;
  }, 0) ?? 0;
  const totalH = 20 + titleH + 20 + (bodyH ? bodyH + 16 : 0) + bulletH;
  let curY = Math.max(44, (CONTENT_H - totalH) / 2);

  objects.push(createAccentLine(t, 52, TX, curY));
  curY += 20;

  objects.push(makeTitleText(slide.title || "", { t, role: "slide_title", fontSize: 48, lineHeight: 1.15, width: TW, left: TX, top: curY }));
  curY += titleH + 20;

  if (slide.body) {
    objects.push(makeText(slide.body, { role: "slide_body", fontSize: 23, fill: "rgba(250,250,250,0.76)", lineHeight: 1.5, width: TW, left: TX, top: curY, originX: "left" as const, originY: "top" as const }));
    curY += bodyH + 16;
  }
  slide.bullets?.forEach((b, i) => {
    objects.push(createBulletItem(b, i, t, 20, TX, curY, TW));
    curY += estimateLines(b, TW - 42, 20) * 20 * 1.5 + 14;
  });
}
