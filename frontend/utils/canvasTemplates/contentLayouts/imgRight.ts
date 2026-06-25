import * as fabric from "fabric";
import { createAccentLine, createBulletItem, makeText, makeTitleText } from "../shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import { estimateLines } from "@/utils/canvasTextHelpers";
import { loadPanelImage } from "./panelImage";

const CS = 1080;

// layout === 0: text left (57%), image right (43%)
export async function buildLayoutImgRight(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  _meta: unknown,
  objects: fabric.FabricObject[],
): Promise<void> {
  const CONTENT_H = CS - t.brandBarH;
  const PAD_X = 40, PAD_Y = 32, GAP = 36;
  const TEXT_W  = Math.floor((CS - PAD_X * 2) * 0.57);   // 570px
  const IMAGE_W = (CS - PAD_X * 2) - TEXT_W - GAP;       // 394px
  const IMAGE_X = PAD_X + TEXT_W + GAP;
  const IMAGE_H = Math.round(IMAGE_W * 5 / 4);
  const IMAGE_Y = Math.max(PAD_Y, (CONTENT_H - IMAGE_H) / 2);

  // Compute total text height first so we can vertically center it
  const titleLines0 = estimateLines(slide.title ?? "", TEXT_W, 44);
  const titleH0     = titleLines0 * 44 * 1.15;
  const bodyLines0  = slide.body ? estimateLines(slide.body, TEXT_W, 22) : 0;
  const bodyH0      = bodyLines0 * 22 * 1.5;
  const accentH0    = 24;
  // Fixed bullet row height = 19 * 1.5 * 2 lines + 12 gap (consistent spacing)
  const BULLET_ROW_H = 19 * 1.5 * 2 + 14;  // 71px per bullet (2-line budget)
  const bulletH0 = (slide.bullets?.length ?? 0) * BULLET_ROW_H;
  const totalTextH  = accentH0 + titleH0 + 20 + (bodyH0 ? bodyH0 + 14 : 0) + bulletH0;
  // Center text block vertically in content area
  let curY = Math.max(PAD_Y, (CONTENT_H - totalTextH) / 2);

  objects.push(createAccentLine(t, 44, PAD_X, curY + 4));
  curY += 28;

  objects.push(makeTitleText(slide.title || "", { t, role: "slide_title", fontSize: 44, lineHeight: 1.15, width: TEXT_W, left: PAD_X, top: curY }));
  curY += titleH0 + 20;

  if (slide.body) {
    objects.push(makeText(slide.body, { role: "slide_body", fontSize: 22, fill: "rgba(250,250,250,0.76)", lineHeight: 1.5, width: TEXT_W, left: PAD_X, top: curY, originX: "left" as const, originY: "top" as const }));
    curY += bodyH0 + 14;
  }
  // Fixed-height bullet rows — guarantees equal spacing
  slide.bullets?.forEach((b, i) => {
    objects.push(createBulletItem(b, i, t, 19, PAD_X, curY, TEXT_W));
    curY += BULLET_ROW_H;  // fixed, not estimated
  });

  const img = await loadPanelImage(imageUrl!, IMAGE_W, IMAGE_H, IMAGE_X, IMAGE_Y, 18);
  if (img) objects.push(img);
  else {
    objects.push(new fabric.Rect({
      left: IMAGE_X, top: IMAGE_Y, width: IMAGE_W, height: IMAGE_H, rx: 18,
      fill: new fabric.Gradient({ type: "linear", coords: { x1: 0, y1: 0, x2: IMAGE_W, y2: IMAGE_H },
        colorStops: [{ offset: 0, color: "rgba(124,110,250,0.14)" }, { offset: 1, color: "rgba(45,212,191,0.07)" }] }),
      stroke: "rgba(124,110,250,0.18)", strokeWidth: 1,
      originX: "left" as const, originY: "top" as const,
    }));
  }
}
