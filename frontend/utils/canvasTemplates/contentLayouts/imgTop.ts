import * as fabric from "fabric";
import { createAccentLine, createBulletItem, makeText, makeTitleText } from "../shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import { estimateLines } from "@/utils/canvasTextHelpers";
import { loadPanelImage } from "./panelImage";

const CS = 1080;

// layout === 2: image top, text bottom
export async function buildLayoutImgTop(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  _meta: unknown,
  objects: fabric.FabricObject[],
): Promise<void> {
  const CONTENT_H = CS - t.brandBarH;
  const PAD = 36, TX = 56, TW = CS - TX * 2;

  // Bigger font sizes for layout-2 (user feedback: text too small)
  const TITLE_FS = 42, BODY_FS = 21, BULLET_FS = 18;
  const BULLET_ROW_H2 = BULLET_FS * 1.45 * 2 + 10;  // fixed row budget

  const titleLines = estimateLines(slide.title ?? "", TW, TITLE_FS);
  const titleH     = titleLines * TITLE_FS * 1.18;
  const bodyLines  = slide.body ? estimateLines(slide.body, TW, BODY_FS) : 0;
  const bodyH      = bodyLines * BODY_FS * 1.45;
  const bulletH    = (slide.bullets?.length ?? 0) * BULLET_ROW_H2;
  const textPadT = 20, textPadB = 24, accentH = 20;
  const textBlockH = textPadT + accentH + titleH
    + (bodyH ? bodyH + 10 : 0)
    + (bulletH ? bulletH + 6 : 0)
    + textPadB;

  // Image height — fills available space above text
  const IW = CS - PAD * 2;
  const IH = Math.max(200, CONTENT_H - textBlockH - 24);

  // Image fills the top portion — use "top" vertical align to show key subjects
  const img = await loadPanelImage(imageUrl!, IW, IH, PAD, 24, 18, "top");
  if (img) objects.push(img);

  let curY = 24 + IH + textPadT;
  objects.push(createAccentLine(t, 44, TX, curY));
  curY += accentH;

  objects.push(makeTitleText(slide.title || "", { t, role: "slide_title", fontSize: TITLE_FS, lineHeight: 1.18, width: TW, left: TX, top: curY }));
  curY += titleH + 12;

  if (slide.body) {
    objects.push(makeText(slide.body, { role: "slide_body", fontSize: BODY_FS, fill: "rgba(250,250,250,0.76)", lineHeight: 1.45, width: TW, left: TX, top: curY, originX: "left" as const, originY: "top" as const }));
    curY += bodyH + 10;
  }

  // Fixed-height bullet rows — equal spacing guaranteed
  slide.bullets?.forEach((b, i) => {
    objects.push(createBulletItem(b, i, t, BULLET_FS, TX, curY, TW));
    curY += BULLET_ROW_H2;
  });
}
