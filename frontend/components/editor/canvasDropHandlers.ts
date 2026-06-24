import * as fabric from "fabric";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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
  const { createBrandBar, createAccentLine, createBulletItem } = await import("@/utils/canvasTemplates/shared");
  const { createBigNumberGroup } = await import("@/utils/canvasTemplates/chartRenderer");
  const { getTokens } = await import("@/utils/canvasTokens");
  const t = getTokens("aurora-hook");

  switch (componentId) {
    case "brand-bar": {
      const objs = await createBrandBar(
        t, `${apiBase}/assets/brand/logo.png`, "THEOPINIONBOARD", 1, 11
      );
      for (const obj of objs) canvas.add(obj);
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
      const texts = ["Key insight number one", "Key insight number two", "Key insight number three"];
      for (let i = 0; i < texts.length; i++) {
        const bullet = createBulletItem(texts[i], i, t, 22);
        bullet.set({ left: Math.max(0, dropX - 400), top: Math.max(0, dropY - 80 + i * 54) });
        canvas.add(bullet);
      }
      break;
    }
    default:
      console.warn(`Unknown component: ${componentId}`);
  }

  canvas.renderAll();
}
