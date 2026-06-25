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
import {
  dropBtnGradient,
  dropBtnGhost,
  dropBtnFrostedGlow,
  dropBtnSolidWhite,
  dropBtnDarkPill,
  dropBtnDarkGradient,
} from "./componentDroppers/buttons";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ── Image drop ────────────────────────────────────────────────────────────────

export async function addImageToCanvas(
  canvas: fabric.Canvas,
  imageUrl: string,
  dropX: number,
  dropY: number,
  canvasSize: number,
): Promise<void> {
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
): Promise<void> {
  const { getTokens } = await import("@/utils/canvasTokens");
  const t = getTokens("aurora-hook");

  switch (componentId) {
    case "brand-bar":         await dropBrandBar(canvas, t, apiBase);                  break;
    case "dark-card":         await dropGlassCard(canvas, t, dropX, dropY);            break;
    case "stat-block":        await dropStatBlock(canvas, t, dropX, dropY);            break;
    case "quote-block":       await dropQuoteBlock(canvas, t, dropX, dropY);           break;
    case "bullet-list":       await dropBulletList(canvas, t, dropX, dropY);           break;
    case "accent-line":       await dropAccentLine(canvas, t, dropX, dropY);           break;
    case "eyebrow-pill":      await dropEyebrowPill(canvas, t, dropX, dropY);          break;
    // Buttons — all 6 styles
    case "cta-button":
    case "btn-gradient":      await dropBtnGradient(canvas, t, dropX, dropY);          break;
    case "btn-ghost":         await dropBtnGhost(canvas, t, dropX, dropY);             break;
    case "btn-frosted-glow":  await dropBtnFrostedGlow(canvas, t, dropX, dropY);       break;
    case "btn-solid-white":   await dropBtnSolidWhite(canvas, t, dropX, dropY);        break;
    case "btn-dark-pill":     await dropBtnDarkPill(canvas, t, dropX, dropY);          break;
    case "btn-dark-gradient": await dropBtnDarkGradient(canvas, t, dropX, dropY);      break;

    default:
      console.warn(`Unknown component: ${componentId}`);
  }

  canvas.renderAll();
}
