import * as fabric from "fabric";
import { createAccentLine, createBulletItem, makeText, makeTitleText } from "../shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import { estimateLines } from "@/utils/canvasTextHelpers";
import { loadPanelImage } from "./panelImage";

const CS = 1080;

// layout === 3: image left (43%), text right (57%) — mirror of layout-0
export async function buildLayoutImgLeft(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  _meta: unknown,
  objects: fabric.FabricObject[],
): Promise<void> {
  const CONTENT_H = CS - t.brandBarH;
  const PAD_X = 40, PAD_Y = 32, GAP = 36;
  const IMAGE_W = Math.floor((CS - PAD_X * 2) * 0.43);   // 431px
  const TEXT_W  = (CS - PAD_X * 2) - IMAGE_W - GAP;      // 533px
  const IMAGE_X = PAD_X;
  const TEXT_X  = PAD_X + IMAGE_W + GAP;
  const IMAGE_H = Math.round(IMAGE_W * 5 / 4);
  const IMAGE_Y = Math.max(PAD_Y, (CONTENT_H - IMAGE_H) / 2);

  // Compute text block height to vertically center it
  const titleLines3 = estimateLines(slide.title ?? "", TEXT_W, 44);
  const titleH3     = titleLines3 * 44 * 1.15;
  const bodyLines3  = slide.body ? estimateLines(slide.body, TEXT_W, 22) : 0;
  const bodyH3      = bodyLines3 * 22 * 1.5;
  const accentH3    = 24;
  const BULLET_ROW_H3 = 19 * 1.5 * 2 + 14;
  const bulletH3    = (slide.bullets?.length ?? 0) * BULLET_ROW_H3;
  const totalTextH3 = accentH3 + titleH3 + 20 + (bodyH3 ? bodyH3 + 14 : 0) + bulletH3;
  let curY = Math.max(PAD_Y, (CONTENT_H - totalTextH3) / 2);

  // Image panel — left side
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

  // Text block — right side
  objects.push(createAccentLine(t, 44, TEXT_X, curY + 4));
  curY += 28;

  objects.push(makeTitleText(slide.title || "", { t, role: "slide_title", fontSize: 44, lineHeight: 1.15, width: TEXT_W, left: TEXT_X, top: curY }));
  curY += titleH3 + 20;

  if (slide.body) {
    objects.push(makeText(slide.body, { role: "slide_body", fontSize: 22, fill: "rgba(250,250,250,0.76)", lineHeight: 1.5, width: TEXT_W, left: TEXT_X, top: curY, originX: "left" as const, originY: "top" as const }));
    curY += bodyH3 + 14;
  }
  slide.bullets?.forEach((b, i) => {
    objects.push(createBulletItem(b, i, t, 19, TEXT_X, curY, TEXT_W));
    curY += BULLET_ROW_H3;
  });
}
