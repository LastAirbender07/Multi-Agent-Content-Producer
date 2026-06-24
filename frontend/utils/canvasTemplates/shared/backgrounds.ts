import * as fabric from "fabric";
import { setData, supportsCtxFilter } from "./types";

const CS = 1080;

// ── Background image helpers ─────────────────────────────────────────────────

export async function createBgImage(imageUrl: string, fit: "cover" | "blur-darken"): Promise<fabric.FabricImage | null> {
  try {
    if (fit === "blur-darken") {
      const dataUrl = await blurDarkenImage(imageUrl);
      const img = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: "anonymous" });
      img.set({
        left: -(CS * 0.075), top: -(CS * 0.075),
        scaleX: (CS * 1.15) / (img.width  ?? CS),
        scaleY: (CS * 1.15) / (img.height ?? CS),
        originX: "left" as const, originY: "top" as const,
        selectable: false, evented: false,
      });
      setData(img, { role: "bg_texture" });
      return img;
    }
    return await loadCoverImage(imageUrl, "bg_image");
  } catch { return null; }
}

export async function loadCoverImage(imageUrl: string, role: string, selectable = true): Promise<fabric.FabricImage | null> {
  try {
    const el = new Image();
    el.crossOrigin = "anonymous";
    const nat = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      el.onload  = () => resolve({ w: el.naturalWidth, h: el.naturalHeight });
      el.onerror = reject;
      el.src = imageUrl;
    });
    const img = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
    const scale = Math.max(CS / nat.w, CS / nat.h);
    img.set({
      left: (CS - nat.w * scale) / 2, top: (CS - nat.h * scale) / 2,
      scaleX: scale, scaleY: scale,
      originX: "left" as const, originY: "top" as const,
      selectable, evented: selectable,
    });
    setData(img, { role });
    return img;
  } catch { return null; }
}

export async function createBlurredRegion(
  imageUrl: string,
  region:   { left: number; top: number; width: number; height: number },
  blur = 16,
): Promise<fabric.FabricImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const off = document.createElement("canvas");
      off.width = CS; off.height = CS;
      const ctx = off.getContext("2d")!;
      ctx.filter = supportsCtxFilter() ? `blur(${blur}px)` : "none";
      ctx.drawImage(img, 0, 0, CS, CS);
      ctx.filter = "none";
      const crop = document.createElement("canvas");
      crop.width = region.width; crop.height = region.height;
      crop.getContext("2d")!.drawImage(off, region.left, region.top, region.width, region.height, 0, 0, region.width, region.height);
      fabric.FabricImage.fromURL(crop.toDataURL("image/jpeg", 0.85))
        .then(fi => {
          fi.set({ left: region.left, top: region.top, originX: "left" as const, originY: "top" as const, selectable: false, evented: false });
          resolve(fi);
        })
        .catch(reject);
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

async function blurDarkenImage(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const off = document.createElement("canvas");
      off.width = CS; off.height = CS;
      const ctx = off.getContext("2d")!;
      ctx.filter = supportsCtxFilter() ? "blur(32px) brightness(0.15)" : "none";
      ctx.drawImage(img, 0, 0, CS, CS);
      if (!supportsCtxFilter()) {
        ctx.filter = "none";
        ctx.fillStyle = "rgba(9,9,9,0.85)";
        ctx.fillRect(0, 0, CS, CS);
      }
      resolve(off.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}
