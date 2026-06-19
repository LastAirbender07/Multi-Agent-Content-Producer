import * as fabric from "fabric";
import { createBrandBar, createBgImage, createOverlay, createInsightItem, makeText } from "./shared";
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
      left: 0, top: 0, width: CS, height: CS,
      fill: new fabric.Gradient({ type: "linear", coords: { x1: 0, y1: 0, x2: CS, y2: CS },
        colorStops: [{ offset: 0, color: "#0D0B18" }, { offset: 1, color: "#1a1535" }] }),
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }));
  }

  // 2. Overlay
  objects.push(createOverlay("quote", t));

  // Estimate inner block height for vertical centering
  const INNER_X = 72, INNER_W = CS - 144;
  const quoteText = slide.title || "Your quote text here";
  const attrText  = slide.body ? slide.body.replace(/^[-–—]\s*/, "") : "";
  const hasBullets = slide.bullets && slide.bullets.length > 0;

  const markH     = 100 * 0.65 + 12;
  const quoteLines = Math.ceil(quoteText.length / 30);
  const quoteH    = quoteLines * 40 * 1.42 + 22;
  const attrH     = attrText ? 30 : 0;
  const dividerH  = hasBullets ? 1 + 64 : 0;
  const insightsH = hasBullets ? (slide.bullets!.length * (21 * 1.55 + 14)) : 0;
  const totalH    = markH + quoteH + attrH + dividerH + insightsH;

  const CONTENT_H = CS - t.brandBarH;
  let curY = Math.max(60, (CONTENT_H - totalH) / 2);

  // 3. Quote mark
  objects.push(makeText('"', {
    role: "quote_mark", fontSize: 100, fontWeight: "700",
    fontFamily: `${t.fontTitle}, sans-serif`,
    fill: t.primary, opacity: 0.55, lineHeight: 0.65,
    left: INNER_X, top: curY,
    originX: "left" as const, originY: "top" as const,
  }));
  curY += markH;

  // 4. Quote text (slide.title in quote slides)
  objects.push(makeText(quoteText, {
    role: "quote_text", fontSize: 40, fontWeight: "600", fontStyle: "italic",
    fill: t.text, lineHeight: 1.42, width: INNER_W,
    left: INNER_X, top: curY,
    originX: "left" as const, originY: "top" as const,
  }));
  curY += quoteH;

  // 5. Attribution (slide.body)
  if (attrText) {
    objects.push(makeText(`— ${attrText}`, {
      role: "quote_attr", fontSize: 20, fill: t.muted,
      left: INNER_X, top: curY,
      originX: "left" as const, originY: "top" as const,
    }));
    curY += attrH;
  }

  // 6. Insights section (slide.bullets)
  if (hasBullets) {
    // Divider
    const div = new fabric.Rect({
      left: INNER_X, top: curY + 32, width: INNER_W, height: 1,
      fill: "rgba(255,255,255,0.10)", selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    });
    (div as fabric.Rect & { data?: unknown }).data = { role: "quote_divider" };
    objects.push(div);
    curY += 32 + 1 + 26;

    // "KEY INSIGHTS" label
    objects.push(makeText("KEY INSIGHTS", {
      role: "insights_label", fontSize: 13, fontWeight: "700",
      fill: t.secondary, charSpacing: 120,
      left: INNER_X, top: curY,
      originX: "left" as const, originY: "top" as const,
    }));
    curY += 18 + 18;

    slide.bullets!.forEach((b, i) => {
      objects.push(createInsightItem(b, t, INNER_X, curY, INNER_W));
      curY += Math.ceil(b.length / (INNER_W / (21 * 0.6))) * (21 * 1.55) + 14;
    });
  }

  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
