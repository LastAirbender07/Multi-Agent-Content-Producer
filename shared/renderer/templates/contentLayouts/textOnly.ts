import * as fabric from "fabric";
import { createAccentLine, createBulletItem, measureBulletHeight, makeText, makeTitleText } from "../shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";

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
  const BULLET_FS = 20;
  const BULLET_GAP = 12;

  // ── Two-pass layout ───────────────────────────────────────────────────────
  const titleObj = makeTitleText(slide.title || "", {
    t, role: "slide_title", fontSize: 48, lineHeight: 1.15, width: TW, left: 0, top: 0,
  });
  const bodyObj = slide.body
    ? makeText(slide.body, { role: "slide_body", fontSize: 23, fill: t.muted, lineHeight: 1.65, width: TW, left: 0, top: 0, originX: "left" as const, originY: "top" as const })
    : null;

  const bulletObjs = (slide.bullets ?? []).map((b, i) =>
    createBulletItem(b, i, t, BULLET_FS, 0, 0, TW),
  );

  const titleH  = titleObj.calcTextHeight() + 8;
  const bodyH   = bodyObj ? bodyObj.calcTextHeight() + 16 : 0;
  const accentH = 20;
  const bulletHeights = bulletObjs.map(g => measureBulletHeight(g, BULLET_FS, BULLET_GAP));
  const bulletH = bulletHeights.reduce((s, h) => s + h, 0);
  const totalH  = accentH + titleH + 20 + bodyH + bulletH;
  let curY = Math.max(44, (CONTENT_H - totalH) / 2);

  objects.push(createAccentLine(t, 52, TX, curY));
  curY += accentH;

  titleObj.set({ left: TX, top: curY });
  objects.push(titleObj);
  curY += titleH + 20;

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
