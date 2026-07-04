import * as fabric from "fabric";
import { createAccentLine, createBulletItem, measureBulletHeight, makeText, makeTitleText } from "../shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
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
  const TITLE_FS = 42, BODY_FS = 21, BULLET_FS = 18;
  const BULLET_GAP = 10;

  // ── Two-pass layout ───────────────────────────────────────────────────────
  const titleObj = makeTitleText(slide.title || "", {
    t, role: "slide_title", fontSize: TITLE_FS, lineHeight: 1.18, width: TW, left: 0, top: 0,
  });
  const bodyObj = slide.body
    ? makeText(slide.body, { role: "slide_body", fontSize: BODY_FS, fill: t.muted, lineHeight: 1.6, width: TW, left: 0, top: 0, originX: "left" as const, originY: "top" as const })
    : null;
  const bulletObjs = (slide.bullets ?? []).map((b, i) =>
    createBulletItem(b, i, t, BULLET_FS, 0, 0, TW),
  );

  const titleH  = titleObj.calcTextHeight() + 8;
  const bodyH   = bodyObj ? bodyObj.calcTextHeight() + 10 : 0;
  const accentH = 20;
  const bulletHeights = bulletObjs.map(g => measureBulletHeight(g, BULLET_FS, BULLET_GAP));
  const bulletH    = bulletHeights.reduce((s, h) => s + h, 0);
  const textBlockH = 20 + accentH + titleH + bodyH + bulletH + 24;

  const IW = CS - PAD * 2;
  const IH = Math.max(200, CONTENT_H - textBlockH - 24);

  const img = await loadPanelImage(imageUrl!, IW, IH, PAD, 24, 18, "top");
  if (img) objects.push(img);

  let curY = 24 + IH + 20;
  objects.push(createAccentLine(t, 44, TX, curY));
  curY += accentH;

  titleObj.set({ left: TX, top: curY });
  objects.push(titleObj);
  curY += titleH + 12;

  if (bodyObj) {
    bodyObj.set({ left: TX, top: curY });
    objects.push(bodyObj);
    curY += bodyH;
  }

  bulletObjs.forEach((g, i) => {
    g.set({ left: TX, top: curY });
    objects.push(g);
    curY += bulletHeights[i];
  });
}
