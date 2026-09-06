/**
 * canvasDropHandlers.ts
 * ─────────────────────
 * Dispatches drag-drop events to per-component dropper modules.
 * Each component lives in its own file under ./componentDroppers/.
 * To add a new component: create a file there, export a drop* function,
 * import it here, and add a case below.
 */

import * as fabric from "fabric";
import { dropBrandBar }     from "./componentDroppers/brandBar";
import { dropGlassCard }    from "./componentDroppers/glassCard";
import { dropStatBlock }    from "./componentDroppers/statBlock";
import { dropQuoteBlock }   from "./componentDroppers/quoteBlock";
import { dropBulletList }   from "./componentDroppers/bulletList";
import { dropAccentLine }   from "./componentDroppers/accentLine";
import { dropEyebrowPill }  from "./componentDroppers/eyebrowPill";
import { dropGlowBlob }     from "./componentDroppers/glowBlob";
import { dropDecoRing }     from "./componentDroppers/decoRing";
import {
  dropBtnGradient,
  dropBtnGhost,
  dropBtnFrostedGlow,
  dropBtnSolidWhite,
  dropBtnDarkPill,
  dropBtnDarkGradient,
} from "./componentDroppers/buttons";

// ── Compact primitive droppers ────────────────────────────────────────────────
import { dropCompactBrandPill }       from "./componentDroppers/compactBrandPill";
import { dropCompactOutlinedPill }    from "./componentDroppers/compactOutlinedPill";
import { dropCompactMixedWeightText } from "./componentDroppers/compactMixedWeightText";
import { dropCompactDotProgress }     from "./componentDroppers/compactDotProgress";
import { dropCompactNumberBadge }     from "./componentDroppers/compactNumberBadge";
import { dropCompactEditorialHeader } from "./componentDroppers/compactEditorialHeader";
// ── Cover-hero primitive droppers ─────────────────────────────────────────────
import { dropCoverPhoneMockup }       from "./componentDroppers/coverPhoneMockup";
import { dropCoverImagePair }         from "./componentDroppers/coverImagePair";
import { dropCoverOverlayCards }      from "./componentDroppers/coverOverlayCards";
import { dropCoverStraddlingTitle }   from "./componentDroppers/coverStraddlingTitle";
import { dropCoverMetallicGradient }  from "./componentDroppers/coverMetallicGradient";
import { dropCoverDisplayHeadline }   from "./componentDroppers/coverDisplayHeadline";
import { dropCoverBodyText }          from "./componentDroppers/coverBodyText";
import { dropCoverItalicCta }         from "./componentDroppers/coverItalicCta";
import { dropCoverPolaroidFrame }     from "./componentDroppers/coverPolaroidFrame";

import { ASSET_BASE as API_BASE } from "@/lib/api/client";

// ── Type for objects with data metadata ──────────────────────────────────────

type FabricObjectWithData = fabric.FabricObject & {
  data?: {
    role?: string;
    phoneW?: number;
    phoneH?: number;
    cornerRadius?: number;
    innerW?: number;
    innerH?: number;
    innerLeft?: number;
    innerTop?: number;
    filledSlots?: number;
    slotCount?: number;
    slotDimensions?: Array<{ w: number; h: number; cornerRadius: number }>;
  };
};

/** Image-slot roles — dropping an image URL onto these fills the slot instead of creating a free image */
export const IMAGE_SLOT_ROLES = new Set(["phone_mockup", "image_pair", "polaroid_frame"]);


// ── fillImageSlot: replace a placeholder / previous photo inside a slot group ─
// NOTE: This is kept for backwards compatibility with existing slides that used
// the slot/group system. For new workflows, users drag images from the Images panel
// and use the native Fabric crop mode (double-click image → ghost overlay + handles).

export async function fillImageSlot(
  canvas: fabric.Canvas,
  slotGroup: fabric.Group,
  imageUrl: string,
): Promise<void> {
  const d = (slotGroup as FabricObjectWithData).data;
  if (!d?.role) return;

  const img = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
  const iw  = img.width  ?? 400;
  const ih  = img.height ?? 400;

  if (d.role === "phone_mockup") {
    const phoneW = d.phoneW ?? 360;
    const phoneH = d.phoneH ?? 780;
    const children = slotGroup.getObjects();
    const old = children[0];
    const scale = Math.max(phoneW / iw, phoneH / ih);
    const cx = old ? (old.left ?? 0) + (phoneW / 2) : 0;
    const cy = old ? (old.top  ?? 0) + (phoneH / 2) : 0;
    img.set({
      left: cx - (iw * scale) / 2, top: cy - (ih * scale) / 2,
      scaleX: scale, scaleY: scale,
      selectable: true, evented: true,
      originX: "left" as const, originY: "top" as const,
    });
    if (old) slotGroup.remove(old);
    slotGroup.insertAt(0, img);

  } else if (d.role === "image_pair") {
    const filledSlots    = d.filledSlots ?? 0;
    const slotDimensions = d.slotDimensions ?? [
      { w: 340, h: 460, cornerRadius: 20 },
      { w: 300, h: 400, cornerRadius: 20 },
    ];
    const slotIdx = filledSlots % 2;
    const slot    = slotDimensions[slotIdx];
    const children = slotGroup.getObjects();
    const old = children[slotIdx];
    const scale = Math.max(slot.w / iw, slot.h / ih);
    img.set({
      left: old ? old.left : 0, top: old ? old.top : 0,
      scaleX: scale, scaleY: scale,
      angle: slotIdx === 0 ? -6 : 5,
      selectable: true, evented: true,
      originX: "left" as const, originY: "top" as const,
    });
    img.clipPath = new fabric.Rect({
      left: 0, top: 0, width: slot.w, height: slot.h,
      rx: slot.cornerRadius, ry: slot.cornerRadius,
      originX: "left" as const, originY: "top" as const,
    });
    if (old) slotGroup.remove(old);
    slotGroup.insertAt(slotIdx, img);
    d.filledSlots = filledSlots + 1;

  } else if (d.role === "polaroid_frame") {
    const innerW = d.innerW ?? 332;
    const innerH = d.innerH ?? 336;
    const children = slotGroup.getObjects();
    const photoIdx = 1;
    const old = children[photoIdx];
    const scale = Math.max(innerW / iw, innerH / ih);
    const cx = old ? (old.left ?? 0) + (innerW / 2) : 0;
    const cy = old ? (old.top  ?? 0) + (innerH / 2) : 0;
    img.set({
      left: cx - (iw * scale) / 2, top: cy - (ih * scale) / 2,
      scaleX: scale, scaleY: scale,
      selectable: true, evented: true,
      originX: "left" as const, originY: "top" as const,
    });
    if (old) slotGroup.remove(old);
    slotGroup.insertAt(photoIdx, img);
  }

  (slotGroup as fabric.Group & { dirty?: boolean }).dirty = true;
  slotGroup.setCoords();
  canvas.setActiveObject(slotGroup);
  canvas.requestRenderAll();
}

// ── Image drop ────────────────────────────────────────────────────────────────

export async function addImageToCanvas(
  canvas: fabric.Canvas,
  imageUrl: string,
  dropX: number,
  dropY: number,
  canvasSize: number,
): Promise<void> {
  // ── Image-slot protocol: if the active object is a slot container, fill it ──
  const active = canvas.getActiveObject() as FabricObjectWithData | null;
  if (active && active.type === "group" && active.data?.role && IMAGE_SLOT_ROLES.has(active.data.role)) {
    await fillImageSlot(canvas, active as fabric.Group, imageUrl);
    return;
  }

  // ── Default: create a free-floating image ─────────────────────────────────
  const naturalSize = await new Promise<{ w: number; h: number }>((resolve) => {
    const el = new Image(); el.crossOrigin = "anonymous";
    el.onload  = () => resolve({ w: el.naturalWidth, h: el.naturalHeight });
    el.onerror = () => resolve({ w: 400, h: 400 });
    el.src = imageUrl;
  });
  const img = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
  const targetSize = 300;
  const imgScale = Math.min(targetSize / naturalSize.w, targetSize / naturalSize.h);
  img.set({
    left:   Math.max(0, Math.min(dropX - targetSize / 2, canvasSize - targetSize)),
    top:    Math.max(0, Math.min(dropY - targetSize / 2, canvasSize - targetSize)),
    scaleX: imgScale, scaleY: imgScale,
    originX: "left" as const, originY: "top" as const,
  });
  (img as fabric.FabricImage & { data?: { role: string } }).data = { role: "dropped_image" };
  canvas.add(img); canvas.setActiveObject(img); canvas.renderAll();
}

// ── Component drop router ─────────────────────────────────────────────────────

export async function addComponentToCanvas(
  canvas: fabric.Canvas,
  componentId: string,
  dropX: number,
  dropY: number,
  apiBase: string = API_BASE,
  theme: "aurora" | "lumina" = "aurora",
): Promise<void> {
  const { getTokens } = await import("@/utils/canvasTokens");
  const t = getTokens(`${theme}-hook`);

  switch (componentId) {
    case "brand-bar":         await dropBrandBar(canvas, t, apiBase, dropX, dropY);    break;
    case "dark-card":         await dropGlassCard(canvas, t, dropX, dropY);            break;
    case "stat-block":        await dropStatBlock(canvas, t, dropX, dropY);            break;
    case "quote-block":       await dropQuoteBlock(canvas, t, dropX, dropY);           break;
    case "bullet-list":       await dropBulletList(canvas, t, dropX, dropY);           break;
    case "accent-line":       await dropAccentLine(canvas, t, dropX, dropY);           break;
    case "eyebrow-pill":      await dropEyebrowPill(canvas, t, dropX, dropY);          break;
    case "glow-blob":         await dropGlowBlob(canvas, t, dropX, dropY);             break;
    case "deco-ring":         await dropDecoRing(canvas, t, dropX, dropY);             break;
    // Buttons — all 6 styles
    case "cta-button":
    case "btn-gradient":      await dropBtnGradient(canvas, t, dropX, dropY);          break;
    case "btn-ghost":         await dropBtnGhost(canvas, t, dropX, dropY);             break;
    case "btn-frosted-glow":  await dropBtnFrostedGlow(canvas, t, dropX, dropY);       break;
    case "btn-solid-white":   await dropBtnSolidWhite(canvas, t, dropX, dropY);        break;
    case "btn-dark-pill":     await dropBtnDarkPill(canvas, t, dropX, dropY);          break;
    case "btn-dark-gradient": await dropBtnDarkGradient(canvas, t, dropX, dropY);      break;

    // ── Compact primitive droppers ─────────────────────────────────────────────
    case "compact-brand-pill":        await dropCompactBrandPill(canvas, t, dropX, dropY);       break;
    case "compact-outlined-pill":     await dropCompactOutlinedPill(canvas, t, dropX, dropY);    break;
    case "compact-mixed-weight-text": await dropCompactMixedWeightText(canvas, t, dropX, dropY); break;
    case "compact-dot-progress":      await dropCompactDotProgress(canvas, t, dropX, dropY);     break;
    case "compact-number-badge":      await dropCompactNumberBadge(canvas, t, dropX, dropY);     break;
    case "compact-editorial-header":  await dropCompactEditorialHeader(canvas, t, dropX, dropY); break;
    // ── Cover-hero primitive droppers ──────────────────────────────────────────
    case "cover-phone-mockup":        await dropCoverPhoneMockup(canvas, t, dropX, dropY);       break;
    case "cover-image-pair":          await dropCoverImagePair(canvas, t, dropX, dropY);         break;
    case "cover-overlay-cards":       await dropCoverOverlayCards(canvas, t, dropX, dropY);      break;
    case "cover-straddling-title":    await dropCoverStraddlingTitle(canvas, t, dropX, dropY);   break;
    case "cover-metallic-gradient":   await dropCoverMetallicGradient(canvas, t, dropX, dropY);  break;
    case "cover-display-headline":    await dropCoverDisplayHeadline(canvas, t, dropX, dropY);   break;
    case "cover-body-text":           await dropCoverBodyText(canvas, t, dropX, dropY);          break;
    case "cover-italic-cta":          await dropCoverItalicCta(canvas, t, dropX, dropY);         break;
    case "cover-polaroid-frame":      await dropCoverPolaroidFrame(canvas, t, dropX, dropY);      break;

    default:
      console.warn(`Unknown component: ${componentId}`);
  }

  // Guard against canvas being disposed/destroyed between the async dropper and renderAll.
  // Fabric v7 sets canvas.destroyed = true on .dispose(); _objects becomes undefined.
  const c = canvas as fabric.Canvas & { destroyed?: boolean; _objects?: unknown[] };
  if (c && !c.destroyed && Array.isArray(c._objects)) {
    canvas.renderAll();
  }
}
