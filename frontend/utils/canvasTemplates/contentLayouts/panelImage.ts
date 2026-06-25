import * as fabric from "fabric";

/**
 * Load image to fill a rectangular panel with cover-fit + rx rounded clip.
 * Uses absolutePositioned:true on clipPath so Fabric clips in canvas space.
 */
export async function loadPanelImage(
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
