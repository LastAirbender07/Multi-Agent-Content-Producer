import * as fabric from "fabric";
import { createAccentLine, createBulletItem, measureBulletHeight, makeText, makeTitleText } from "../shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import { loadPanelImage } from "./panelImage";

const CS = 1080;
const PAD_X     = 40;
const PAD_Y     = 32;
const GAP       = 36;
const BULLET_FS = 19;
const BULLET_GAP = 10;
const IMG_ASPECT = 5 / 4;  // height = width * IMG_ASPECT
const IMG_RX    = 18;

/**
 * Shared two-pass layout for layout-0 (text left, image right)
 * and layout-3 (image left, text right). Only IMAGE_X and TEXT_X differ.
 */
export async function buildSideBySideLayout(
  side: "imageRight" | "imageLeft",
  slide: SlideData,
  imageUrl: string,          // caller must guarantee image exists — see aurora_content.ts has_image guard
  t: CanvasTokens,
  objects: fabric.FabricObject[],
): Promise<void> {
  const CONTENT_H = CS - t.brandBarH;
  const TEXT_W    = Math.floor((CS - PAD_X * 2) * 0.57);
  const IMAGE_W   = (CS - PAD_X * 2) - TEXT_W - GAP;
  const IMAGE_H   = Math.round(IMAGE_W * IMG_ASPECT);
  const IMAGE_Y   = Math.max(PAD_Y, (CONTENT_H - IMAGE_H) / 2);

  const IMAGE_X = side === "imageRight" ? PAD_X + TEXT_W + GAP : PAD_X;
  const TEXT_X  = side === "imageRight" ? PAD_X                : PAD_X + IMAGE_W + GAP;

  // ── Pass 1: create text objects and measure heights ───────────────────────
  const titleObj = makeTitleText(slide.title || "", {
    t, role: "slide_title", fontSize: 44, lineHeight: 1.15, width: TEXT_W, left: 0, top: 0,
  });
  const bodyObj = slide.body
    ? makeText(slide.body, {
        role: "slide_body", fontSize: 22, fill: t.muted, lineHeight: 1.6,
        width: TEXT_W, left: 0, top: 0,
        originX: "left" as const, originY: "top" as const,
      })
    : null;
  const bulletObjs = (slide.bullets ?? []).map((b, i) =>
    createBulletItem(b, i, t, BULLET_FS, 0, 0, TEXT_W),
  );

  const titleH         = titleObj.calcTextHeight() + 8;
  const bodyH          = bodyObj ? bodyObj.calcTextHeight() + 14 : 0;
  const accentH        = 24;
  const bulletHeights  = bulletObjs.map(g => measureBulletHeight(g, BULLET_FS, BULLET_GAP));
  const bulletH        = bulletHeights.reduce((s, h) => s + h, 0);
  const totalTextH     = accentH + titleH + 20 + bodyH + bulletH;
  let curY = Math.max(PAD_Y, (CONTENT_H - totalTextH) / 2);

  // ── Image panel ───────────────────────────────────────────────────────────
  const img = await loadPanelImage(imageUrl, IMAGE_W, IMAGE_H, IMAGE_X, IMAGE_Y, IMG_RX);
  if (img) {
    objects.push(img);
  } else {
    objects.push(new fabric.Rect({
      left: IMAGE_X, top: IMAGE_Y, width: IMAGE_W, height: IMAGE_H, rx: IMG_RX,
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: IMAGE_W, y2: IMAGE_H },
        colorStops: [
          { offset: 0, color: t.primary + "24" },   // theme-aware fallback
          { offset: 1, color: t.secondary + "12" },
        ],
      }),
      stroke: t.primary + "2E", strokeWidth: 1,
      originX: "left" as const, originY: "top" as const,
    }));
  }

  // ── Pass 2: position text block ───────────────────────────────────────────
  objects.push(createAccentLine(t, 44, TEXT_X, curY + 4));
  curY += 28;

  titleObj.set({ left: TEXT_X, top: curY });
  objects.push(titleObj);
  curY += titleH + 20;

  if (bodyObj) {
    bodyObj.set({ left: TEXT_X, top: curY });
    objects.push(bodyObj);
    curY += bodyH;
  }

  bulletObjs.forEach((g, i) => {
    g.set({ left: TEXT_X, top: curY });
    objects.push(g);
    curY += bulletHeights[i];
  });
}
