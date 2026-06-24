import * as fabric from "fabric";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const CANVAS_SIZE = 1080;

export async function addImageToCanvas(
  canvas: fabric.Canvas,
  imageUrl: string,
  dropX: number,
  dropY: number,
  canvasSize: number,
): Promise<void> {
  const naturalSize = await new Promise<{ w: number; h: number }>((resolve) => {
    const el = new Image(); el.crossOrigin = "anonymous";
    el.onload = () => resolve({ w: el.naturalWidth, h: el.naturalHeight });
    el.onerror = () => resolve({ w: 400, h: 400 });
    el.src = imageUrl;
  });
  const img = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
  const targetSize = 300;
  const imgScale = Math.min(targetSize / naturalSize.w, targetSize / naturalSize.h);
  img.set({
    left: Math.max(0, Math.min(dropX - targetSize / 2, canvasSize - targetSize)),
    top:  Math.max(0, Math.min(dropY - targetSize / 2, canvasSize - targetSize)),
    scaleX: imgScale, scaleY: imgScale,
    originX: "left" as const, originY: "top" as const,
  });
  (img as fabric.FabricImage & { data?: { role: string } }).data = { role: "dropped_image" };
  canvas.add(img); canvas.setActiveObject(img); canvas.renderAll();
}

export async function addComponentToCanvas(
  canvas: fabric.Canvas,
  componentId: string,
  dropX: number,
  dropY: number,
  apiBase: string,
): Promise<void> {
  const {
    createBrandBar, createAccentLine, createBulletItem,
    createGlassCard, createInsightItem, createEyebrowPill, createPillButton,
  } = await import("@/utils/canvasTemplates/shared");
  const { createBigNumberGroup } = await import("@/utils/canvasTemplates/chartRenderer");
  const { getTokens } = await import("@/utils/canvasTokens");
  const t = getTokens("aurora-hook");

  switch (componentId) {
    case "brand-bar": {
      // Brand bar objects are individually non-selectable — group them so the bar moves as one unit
      const objs = await createBrandBar(
        t, `${apiBase}/assets/brand/logo.png`, "THEOPINIONBOARD", 1, 11,
      );
      objs.forEach(obj => obj.set({ selectable: true, evented: true }));
      const group = new fabric.Group(objs, {
        originX: "left" as const, originY: "top" as const,
      });
      (group as fabric.Group & { data?: unknown }).data = { role: "dropped_brand_bar" };
      canvas.add(group); canvas.setActiveObject(group);
      break;
    }
    case "accent-line": {
      const line = createAccentLine(t, 44, Math.max(0, dropX - 22), Math.max(0, dropY - 2));
      canvas.add(line); canvas.setActiveObject(line);
      break;
    }
    case "stat-block": {
      const group = createBigNumberGroup(
        { statValue: "42%", statLabel: "Key Metric", statContext: "Source: 2024", labels: [], values: [] },
        t, { left: Math.max(0, dropX - 476), top: Math.max(0, dropY - 150) },
      );
      canvas.add(group); canvas.setActiveObject(group);
      break;
    }
    case "bullet-list": {
      // Add each bullet independently so they can be individually positioned
      const texts = ["Key insight number one", "Key insight number two", "Key insight number three"];
      for (let i = 0; i < texts.length; i++) {
        const bullet = createBulletItem(texts[i], i, t, 22);
        bullet.set({
          left: Math.max(0, dropX - 400),
          top:  Math.max(0, dropY - 80 + i * 54),
          selectable: true, evented: true,
        });
        canvas.add(bullet);
      }
      break;
    }
    case "dark-card": {
      // Frosted glass card — grouped so it moves/deletes as one object
      const W = 400, H = 280;
      const cardLeft = Math.max(0, Math.min(dropX - W / 2, CANVAS_SIZE - W));
      const cardTop  = Math.max(0, Math.min(dropY - H / 2, CANVAS_SIZE - H));
      const objs = await createGlassCard({ left: cardLeft, top: cardTop, width: W, height: H }, null, 16, t, 24);
      // Re-enable selection on each child before grouping, then group them
      objs.forEach(obj => obj.set({ selectable: true, evented: true }));
      const group = new fabric.Group(objs, {
        left: cardLeft, top: cardTop,
        originX: "left" as const, originY: "top" as const,
      });
      (group as fabric.Group & { data?: unknown }).data = { role: "dropped_glass_card" };
      canvas.add(group); canvas.setActiveObject(group);
      break;
    }
    case "quote-block": {
      // Insight item used as a standalone quote
      const insight = createInsightItem(
        "Add your quote or insight here.",
        t,
        Math.max(0, dropX - 400),
        Math.max(0, dropY - 20),
        800,
      );
      canvas.add(insight); canvas.setActiveObject(insight);
      break;
    }
    case "cta-button": {
      const W = 320, H = 60;
      const btn = createPillButton(t, {
        label: "Follow for more →",
        style: "gradient",
        width: W, height: H, fontSize: 18,
        left: Math.max(0, dropX - W / 2),
        top:  Math.max(0, dropY - H / 2),
        role: "dropped_cta_button",
      });
      canvas.add(btn); canvas.setActiveObject(btn);
      break;
    }
    case "eyebrow-pill": {
      const pill = createEyebrowPill(
        "FOLLOW FOR MORE",
        t,
        Math.max(80, dropX),   // left arg = center X
        Math.max(0, dropY - 17),
      );
      canvas.add(pill); canvas.setActiveObject(pill);
      break;
    }
    default:
      console.warn(`Unknown component: ${componentId}`);
  }

  canvas.renderAll();
}
