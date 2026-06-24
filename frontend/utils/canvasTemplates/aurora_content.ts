import * as fabric from "fabric";
import { createBrandBar, createBgImage, createOverlay, createAccentLine, createBulletItem, makeText, makeTitleText } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";

const CS = 1080;

/**
 * Load image to fill a rectangular panel with cover-fit + rx rounded clip.
 * Uses absolutePositioned:true on clipPath so Fabric clips in canvas space.
 */
async function loadPanelImage(
  imageUrl: string,
  panelW: number,
  panelH: number,
  panelLeft: number,
  panelTop: number,
  rx = 18,
  verticalAlign: "center" | "top" = "center",
): Promise<fabric.FabricImage | null> {
  try {
    const el = new Image();
    el.crossOrigin = "anonymous";
    const nat = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      el.onload  = () => resolve({ w: el.naturalWidth, h: el.naturalHeight });
      el.onerror = reject;
      el.src = imageUrl;
    });
    const img = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });

    const scale = Math.max(panelW / nat.w, panelH / nat.h);
    const scaledW = nat.w * scale;
    const scaledH = nat.h * scale;
    const offsetX = (panelW  - scaledW) / 2;
    const offsetY = verticalAlign === "top" ? 0 : (panelH - scaledH) / 2;

    img.set({
      left:   panelLeft + offsetX,
      top:    panelTop  + offsetY,
      scaleX: scale, scaleY: scale,
      originX: "left" as const, originY: "top" as const,
    });

    // absolutePositioned clip = canvas-space rect, not local-space
    const clip = new fabric.Rect({
      left: panelLeft, top: panelTop,
      width: panelW, height: panelH, rx,
      absolutePositioned: true,
      originX: "left" as const, originY: "top" as const,
    });
    img.clipPath = clip;
    (img as fabric.FabricImage & { data?: unknown }).data = { role: "image_card" };
    return img;
  } catch { return null; }
}

export async function buildAuroraContent(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
  layout: 0 | 1 | 2 | 3 | -1,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];
  const has_image = imageUrl !== null && layout !== -1;
  const CONTENT_H = CS - t.brandBarH;  // 1008px

  // Background — near-black with blurred image texture
  if (imageUrl) {
    const bg = await createBgImage(imageUrl, "blur-darken");
    if (bg) objects.push(bg);
  } else {
    objects.push(new fabric.Rect({
      left: 0, top: 0, width: CS, height: CS, fill: "#090909",
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }));
  }
  objects.push(createOverlay("content", t));

  // ── Layout helpers ────────────────────────────────────────────────────────────

  const estimateLines = (text: string, width: number, fontSize: number) =>
    Math.max(1, Math.ceil(text.length / Math.max(1, Math.floor(width / (fontSize * 0.58)))));

  if (layout === -1 || !has_image) {
    // ── Text-only: full-width, vertically centered ────────────────────────────
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

  } else if (layout === 0) {
    // ── Left text (57%) / Right image (43%) ───────────────────────────────────
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

  } else if (layout === 1) {
    // ── Top text / Bottom image ────────────────────────────────────────────────
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

  } else if (layout === 2) {
    // ── Top image / Bottom text (layout 2) ────────────────────────────────────
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

  } else {
    // ── Layout 3: Image LEFT (43%) / Text RIGHT (57%) — mirror of layout-0 ──────
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

  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
