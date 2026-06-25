import * as fabric from "fabric";
import { createAccentLine, createBulletItem, makeText, makeTitleText } from "../shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import { estimateLines } from "@/utils/canvasTextHelpers";
import { loadPanelImage } from "./panelImage";

const CS = 1080;

// layout === 1: text top, image bottom
export async function buildLayoutTextTop(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  _meta: unknown,
  objects: fabric.FabricObject[],
): Promise<void> {
  const CONTENT_H = CS - t.brandBarH;
  const TX = 56, TW = CS - TX * 2;
  let curY = 36;

  objects.push(createAccentLine(t, 44, TX, curY));
  curY += 20;

  const titleLines = estimateLines(slide.title ?? "", TW, 38);
  objects.push(makeTitleText(slide.title || "", { t, role: "slide_title", fontSize: 38, lineHeight: 1.18, width: TW, left: TX, top: curY }));
  curY += titleLines * 38 * 1.18 + 16;

  if (slide.body) {
    const bodyLines = estimateLines(slide.body, TW, 19);
    objects.push(makeText(slide.body, { role: "slide_body", fontSize: 19, fill: "rgba(250,250,250,0.76)", lineHeight: 1.45, width: TW, left: TX, top: curY, originX: "left" as const, originY: "top" as const }));
    curY += bodyLines * 19 * 1.45 + 10;  // tighter lineHeight (1.45 not 1.6)
  }
  slide.bullets?.forEach((b, i) => {
    objects.push(createBulletItem(b, i, t, 17, TX, curY, TW));
    curY += 17 * 1.5 * 2 + 12;  // fixed 2-line budget per bullet = equal spacing
  });

  const imgTop = Math.max(curY + 8, 280);
  const PAD = 36;
  const IW  = CS - PAD * 2;
  const IH  = CONTENT_H - imgTop - PAD;
  if (IH > 80) {
    const img = await loadPanelImage(imageUrl!, IW, IH, PAD, imgTop, 18);
    if (img) objects.push(img);
  }
}
