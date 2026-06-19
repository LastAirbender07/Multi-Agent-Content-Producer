import * as fabric from "fabric";
import { createBrandBar, createBgImage, createOverlay, makeText } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";

const CS = 1080;

export async function buildAuroraQuote(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];

  // 1. Blurred background
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

  // 2. Overlay
  objects.push(createOverlay("quote", t));

  // Inner layout constants
  const INNER_X = 72;
  const INNER_W = CS - 144;   // 936px — wide enough so attribution fits on one line

  const quoteText  = slide.title || "Your quote text here";
  const attrText   = slide.body ? slide.body.replace(/^[-–—]\s*/, "") : "";
  const hasBullets = (slide.bullets?.length ?? 0) > 0;

  // Height estimates
  const markH      = Math.round(100 * 0.65) + 12;   // decorative quote mark
  const quoteLines = Math.max(1, Math.ceil(quoteText.length / (INNER_W / (40 * 0.58))));
  const quoteH     = quoteLines * 40 * 1.42 + 18;
  const attrH      = attrText ? 28 : 0;
  const divH       = hasBullets ? 48 : 0;
  const labelH     = hasBullets ? 36 : 0;
  const insightH   = hasBullets
    ? slide.bullets!.reduce((acc, b) => {
        const lines = Math.max(1, Math.ceil(b.length / (INNER_W / (21 * 0.58))));
        return acc + lines * 21 * 1.55 + 10;
      }, 0)
    : 0;
  const totalH = markH + quoteH + attrH + divH + labelH + insightH;

  const CONTENT_H = CS - t.brandBarH;
  let curY = Math.max(52, (CONTENT_H - totalH) / 2);

  // 3. Large decorative quote mark
  objects.push(makeText('"', {
    role: "quote_mark",
    fontSize: 100, fontWeight: "700",
    fontFamily: `${t.fontTitle}, sans-serif`,
    fill: t.primary, opacity: 0.55, lineHeight: 0.65,
    left: INNER_X, top: curY,
    originX: "left" as const, originY: "top" as const,
  }));
  curY += markH;

  // 4. Quote text (italic, prominent)
  objects.push(makeText(quoteText, {
    role: "quote_text",
    fontSize: 40, fontWeight: "600", fontStyle: "italic",
    fill: t.text, lineHeight: 1.42,
    width: INNER_W,
    left: INNER_X, top: curY,
    originX: "left" as const, originY: "top" as const,
  }));
  curY += quoteH;

  // 5. Attribution — full INNER_W so it stays on one line
  if (attrText) {
    objects.push(makeText(`— ${attrText}`, {
      role: "quote_attr",
      fontSize: 20, fill: t.muted,
      width: INNER_W,   // wide enough — prevents wrapping
      left: INNER_X, top: curY,
      originX: "left" as const, originY: "top" as const,
    }));
    curY += attrH;
  }

  // 6. Key Insights section
  if (hasBullets) {
    // Thin divider
    curY += 20;
    objects.push(new fabric.Rect({
      left: INNER_X, top: curY, width: INNER_W, height: 1,
      fill: "rgba(255,255,255,0.10)",
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }));
    curY += 20;

    // "KEY INSIGHTS" label
    objects.push(makeText("KEY INSIGHTS", {
      role: "insights_label",
      fontSize: 12, fontWeight: "700", fill: t.secondary, charSpacing: 120,
      left: INNER_X, top: curY,
      originX: "left" as const, originY: "top" as const,
    }));
    curY += 22;

    // Insight items — compact, dot + text
    slide.bullets!.forEach((b) => {
      // Dot
      const dot = new fabric.Circle({
        radius: 4, left: INNER_X, top: curY + 7,
        fill: t.primary, selectable: false, evented: false,
        originX: "left" as const, originY: "top" as const,
      });
      (dot as fabric.Circle & { data?: unknown }).data = { role: "insight_dot" };
      objects.push(dot);

      // Text
      const bLines = Math.max(1, Math.ceil(b.length / (INNER_W / (21 * 0.58))));
      objects.push(makeText(b, {
        role: "insight_text",
        fontSize: 21, fill: "rgba(250,250,250,0.80)", lineHeight: 1.5,
        width: INNER_W - 22,
        left: INNER_X + 22, top: curY,
        originX: "left" as const, originY: "top" as const,
      }));
      curY += bLines * 21 * 1.5 + 10;   // tighter gap between bullets
    });
  }

  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
