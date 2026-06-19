import * as fabric from "fabric";
import { createBrandBar, createBgImage, createOverlay, createAccentLine, createBulletItem, makeText, makeTitleText, loadCoverImage } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";

const CS  = 1080;

export async function buildAuroraContent(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
  layout: 0 | 1 | 2 | -1,  // -1 = text-only
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];
  const has_image = imageUrl !== null && layout !== -1;

  // 1. Background texture (blurred image or dark gradient)
  if (imageUrl) {
    const bg = await createBgImage(imageUrl, "blur-darken");
    if (bg) objects.push(bg);
  } else {
    objects.push(new fabric.Rect({
      left: 0, top: 0, width: CS, height: CS,
      fill: new fabric.Gradient({ type: "linear", coords: { x1: 0, y1: 0, x2: CS, y2: CS },
        colorStops: [{ offset: 0, color: "#0D0B18" }, { offset: 1, color: "#1a1535" }] }),
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }));
  }

  // 2. Dark dim overlay
  objects.push(createOverlay("content", t));

  // Layout-specific geometry
  const CONTENT_H = CS - t.brandBarH;

  if (layout === -1 || !has_image) {
    // ── Text-only layout ─────────────────────────────────────────────────────
    const TX = 60, TY = 44, TW = 960;
    let curY = TY;

    objects.push(createAccentLine(t, 52, TX, curY));
    curY += 24;

    objects.push(makeTitleText(slide.title || "", { t, role: "slide_title", fontSize: 48, lineHeight: 1.15, width: TW, left: TX, top: curY }));
    curY += Math.ceil((slide.title?.length ?? 10) / 28) * (48 * 1.15) + 18;

    if (slide.body) {
      objects.push(makeText(slide.body, { role: "slide_body", fontSize: 23, fill: "rgba(250,250,250,0.76)", lineHeight: 1.65, width: TW, left: TX, top: curY, originX: "left" as const, originY: "top" as const }));
      curY += Math.ceil(slide.body.length / 42) * (23 * 1.65) + 12;
    }

    slide.bullets?.forEach((b, i) => {
      objects.push(createBulletItem(b, i, t, 20, TX, curY, TW));
      curY += (20 * 1.5 + 10);
    });

  } else if (layout === 0) {
    // ── Left text / Right image ───────────────────────────────────────────────
    const TX = 40, TW = 556, TY = 32;
    const IX = 664, IW = 368, IH = CONTENT_H - 80;
    let curY = TY;

    objects.push(createAccentLine(t, 44, TX, curY + 4));
    curY += 28;

    objects.push(makeTitleText(slide.title || "", { t, role: "slide_title", fontSize: 44, lineHeight: 1.15, width: TW, left: TX, top: curY }));
    curY += Math.ceil((slide.title?.length ?? 10) / 22) * (44 * 1.15) + 16;

    if (slide.body) {
      objects.push(makeText(slide.body, { role: "slide_body", fontSize: 22, fill: "rgba(250,250,250,0.76)", lineHeight: 1.6, width: TW, left: TX, top: curY, originX: "left" as const, originY: "top" as const }));
      curY += Math.ceil(slide.body.length / 26) * (22 * 1.6) + 10;
    }

    slide.bullets?.forEach((b, i) => {
      objects.push(createBulletItem(b, i, t, 19, TX, curY, TW));
      curY += 50;
    });

    // Image
    const imgTop = Math.max(40, (CONTENT_H - IH) / 2);
    const img = await loadCoverImage(imageUrl!, "image_card");
    if (img) {
      img.set({ left: IX, top: imgTop, width: IW, height: IH, scaleX: 1, scaleY: 1 });
      const clip = new fabric.Rect({ width: IW, height: IH, rx: 18, originX: "left" as const, originY: "top" as const, left: 0, top: 0 });
      img.clipPath = clip;
      objects.push(img);
    }

  } else if (layout === 1) {
    // ── Top text / Bottom image ───────────────────────────────────────────────
    const TX = 56, TW = 968, TY = 36;
    let curY = TY;

    objects.push(createAccentLine(t, 44, TX, curY));
    curY += 24;

    objects.push(makeTitleText(slide.title || "", { t, role: "slide_title", fontSize: 38, lineHeight: 1.18, width: TW, left: TX, top: curY }));
    curY += Math.ceil((slide.title?.length ?? 10) / 28) * (38 * 1.18) + 13;

    if (slide.body) {
      objects.push(makeText(slide.body, { role: "slide_body", fontSize: 19, fill: "rgba(250,250,250,0.76)", lineHeight: 1.6, width: TW, left: TX, top: curY, originX: "left" as const, originY: "top" as const }));
      curY += Math.ceil(slide.body.length / 54) * (19 * 1.6) + 8;
    }

    slide.bullets?.forEach((b, i) => {
      objects.push(createBulletItem(b, i, t, 17, TX, curY, TW));
      curY += 43;
    });

    const imgTop = Math.max(curY + 8, 300);
    const IH = CONTENT_H - imgTop - 36;
    if (IH > 80) {
      const img = await loadCoverImage(imageUrl!, "image_card");
      if (img) {
        img.set({ left: 36, top: imgTop, width: CS - 72, height: IH, scaleX: 1, scaleY: 1 });
        const clip = new fabric.Rect({ width: CS - 72, height: IH, rx: 18, originX: "left" as const, originY: "top" as const, left: 0, top: 0 });
        img.clipPath = clip;
        objects.push(img);
      }
    }

  } else {
    // ── Top image / Bottom text (layout 2) ────────────────────────────────────
    const IH = 440, TX = 56, TW = 968;
    let curY = 28;

    const img = await loadCoverImage(imageUrl!, "image_card");
    if (img) {
      img.set({ left: 36, top: curY, width: CS - 72, height: IH, scaleX: 1, scaleY: 1 });
      const clip = new fabric.Rect({ width: CS - 72, height: IH, rx: 18, originX: "left" as const, originY: "top" as const, left: 0, top: 0 });
      img.clipPath = clip;
      objects.push(img);
    }

    curY = IH + 36 + 28;
    objects.push(createAccentLine(t, 44, TX, curY));
    curY += 24;

    objects.push(makeTitleText(slide.title || "", { t, role: "slide_title", fontSize: 38, lineHeight: 1.18, width: TW, left: TX, top: curY }));
    curY += Math.ceil((slide.title?.length ?? 10) / 28) * (38 * 1.18) + 13;

    if (slide.body) {
      objects.push(makeText(slide.body, { role: "slide_body", fontSize: 19, fill: "rgba(250,250,250,0.76)", lineHeight: 1.6, width: TW, left: TX, top: curY, originX: "left" as const, originY: "top" as const }));
    }
  }

  // Brand bar
  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));

  return objects;
}
