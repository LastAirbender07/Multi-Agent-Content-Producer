import * as fabric from "fabric";
import { createBrandBar, createBgImage, createOverlay, createInsightItem, makeText, makeTitleText } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { isDarkTheme } from "@/utils/canvasTokens";
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

  // Lumina: solid light background so quote text is readable.
  // Aurora: blurred image texture for atmosphere.
  if (imageUrl && isDarkTheme(t)) {
    const bg = await createBgImage(imageUrl, "blur-darken");
    if (bg) objects.push(bg);
  } else {
    objects.push(new fabric.Rect({
      left: 0, top: 0, width: CS, height: CS, fill: t.bg,
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }));
  }

  // 2. Overlay (subtle tint)
  objects.push(createOverlay("quote", t));

  // For Lumina: a soft gradient panel behind the quote area adds visual depth
  // without making it feel heavy. Aurora's blurred image provides this naturally.
  const INNER_X = 72;
  const INNER_W = CS - 144;

  const quoteText  = slide.title || "Your quote text here";
  const attrText   = slide.body ? slide.body.replace(/^[-–—]\s*/, "") : "";
  const hasBullets = (slide.bullets?.length ?? 0) > 0;

  // Pass 1: create text objects and measure real heights
  const markH = Math.round(100 * 0.65) + 12;  // decorative quote mark (fixed — single large char)

  const quoteObj = makeText(quoteText, {
    role: "quote_text",
    fontSize: 40, fontWeight: "600", fontStyle: "italic",
    fill: t.text, lineHeight: 1.42,
    width: INNER_W,
    left: INNER_X, top: 0,
    originX: "left" as const, originY: "top" as const,
  });
  const quoteH = quoteObj.calcTextHeight() + 18;

  const attrH   = attrText ? 28 : 0;
  const divH    = hasBullets ? 48 : 0;
  const labelH  = hasBullets ? 36 : 0;

  // Pass 1b: pre-create insight items and measure with calcTextHeight()
  // (same two-pass pattern used by hook/stat/engage — avoids char-width estimation)
  const insightObjs = hasBullets
    ? slide.bullets!.map(b => createInsightItem(b, t, INNER_X, 0, INNER_W))
    : [];
  const insightHeights = insightObjs.map(g => {
    const label = (g as fabric.Group).getObjects().find(o => o instanceof fabric.Textbox) as fabric.Textbox | undefined;
    return (label?.calcTextHeight() ?? 21 * 1.5) + 10;
  });
  const insightH = insightHeights.reduce((s, h) => s + h, 0);

  const totalH = markH + quoteH + attrH + divH + labelH + insightH;

  const CONTENT_H = CS - t.brandBarH;
  let curY = Math.max(52, (CONTENT_H - totalH) / 2);

  // Lumina: left accent stripe + soft gradient tint panel for visual structure
  if (!isDarkTheme(t)) {
    const panelH = markH + quoteH + (attrH ? attrH + 8 : 0);
    // Soft gradient wash behind quote area
    objects.push(new fabric.Rect({
      left: 0, top: curY - 24, width: CS, height: panelH + 48,
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: CS, y2: panelH + 48 },
        colorStops: [
          { offset: 0,   color: t.primary   + "0D" },  // 5% opacity
          { offset: 1,   color: t.secondary + "0D" },
        ],
      }),
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }));
    // Bold left accent stripe
    objects.push(new fabric.Rect({
      left: 0, top: curY - 24, width: 6, height: panelH + 48,
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: 0, y2: panelH + 48 },
        colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
      }),
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }));
  }

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

  // 4. Quote text (italic, prominent) — already created in pass 1
  quoteObj.set({ top: curY });
  objects.push(quoteObj);
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

  // 6. Key Insights section — uses pre-created insightObjs from Pass 1b
  if (hasBullets) {
    curY += 20;
    objects.push(new fabric.Rect({
      left: INNER_X, top: curY, width: INNER_W, height: 1,
      fill: isDarkTheme(t) ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }));
    curY += 20;

    objects.push(makeText("KEY INSIGHTS", {
      role: "insights_label",
      fontSize: 13, fontWeight: "700", fill: t.secondary, charSpacing: 120,
      width: INNER_W,
      left: INNER_X, top: curY,
      originX: "left" as const, originY: "top" as const,
    }));
    curY += 28;

    insightObjs.forEach((g, i) => {
      g.set({ top: curY });
      objects.push(g);
      curY += insightHeights[i];
    });
  }

  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
