import * as fabric from "fabric";
import { createAccentLine, createBulletItem, measureBulletHeight, makeText, makeTitleText } from "../shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
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
  const BULLET_FS = 17, BULLET_GAP = 10;

  // ── Two-pass layout ───────────────────────────────────────────────────────
  const titleObj = makeTitleText(slide.title || "", {
    t, role: "slide_title", fontSize: 38, lineHeight: 1.18, width: TW, left: 0, top: 0,
  });
  const bodyObj = slide.body
    ? makeText(slide.body, { role: "slide_body", fontSize: 19, fill: t.muted, lineHeight: 1.6, width: TW, left: 0, top: 0, originX: "left" as const, originY: "top" as const })
    : null;
  const bulletObjs = (slide.bullets ?? []).map((b, i) =>
    createBulletItem(b, i, t, BULLET_FS, 0, 0, TW),
  );

  const titleH  = titleObj.calcTextHeight() + 8;
  const bodyH   = bodyObj ? bodyObj.calcTextHeight() + 10 : 0;
  const bulletHeights = bulletObjs.map(g => measureBulletHeight(g, BULLET_FS, BULLET_GAP));

  let curY = 36;
  objects.push(createAccentLine(t, 44, TX, curY));
  curY += 20;

  titleObj.set({ left: TX, top: curY });
  objects.push(titleObj);
  curY += titleH + 16;

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

  const imgTop = Math.max(curY + 8, 280);
  const PAD = 36;
  const IW  = CS - PAD * 2;
  const IH  = CONTENT_H - imgTop - PAD;
  if (IH > 80) {
    const img = await loadPanelImage(imageUrl!, IW, IH, PAD, imgTop, 18);
    if (img) objects.push(img);
  }
}
