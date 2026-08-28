import * as fabric from "fabric";

export interface TiltedImageSpec {
  src: string;
  tilt: number;
  width: number;
  height: number;
  cornerRadius: number;
}

export interface TiltedImagePairOpts {
  images: [TiltedImageSpec, TiltedImageSpec];
  overlapPct?: number;   // second image overlaps first by this % of img[0].width
  x: number;
  y: number;
}

/**
 * Two rounded-corner images (or placeholder rects) at independent tilts.
 * Designed for the "Google, Where Am I?" variant: paper-cutout + tablet side by side.
 * Group's bounding box may exceed parent — do NOT clip.
 */
export async function makeTiltedImagePair(
  opts: TiltedImagePairOpts,
): Promise<fabric.Group> {
  const { images, overlapPct = 20, x, y } = opts;

  const PLACEHOLDER_COLORS = ["#C8E6C9", "#BBDEFB"];
  const objects: fabric.FabricObject[] = [];
  let offsetX = 0;

  for (const [i, spec] of images.entries()) {
    let fabricImg: fabric.FabricImage | null = null;
    if (spec.src) {
      try {
        fabricImg = await fabric.FabricImage.fromURL(spec.src, { crossOrigin: "anonymous" });
      } catch { /* fall back to placeholder rect */ }
    }

    const shadow = new fabric.Shadow({
      color: "rgba(0,0,0,0.22)",
      blur: 20, offsetX: 0, offsetY: 8,
    });

    if (fabricImg) {
      const iw    = fabricImg.width  ?? spec.width;
      const ih    = fabricImg.height ?? spec.height;
      const scale = Math.max(spec.width / iw, spec.height / ih);
      // clip in the image's own display-space (absolutePositioned: false = default).
      // The image's visual center is (0,0) in this space, so we offset by half-dimensions.
      const clip  = new fabric.Rect({
        left: -spec.width / 2,
        top:  -spec.height / 2,
        width: spec.width,
        height: spec.height,
        rx: spec.cornerRadius, ry: spec.cornerRadius,
        originX: "left" as const, originY: "top" as const,
      });
      fabricImg.set({
        left: offsetX + (spec.width  - iw * scale) / 2,
        top:  (spec.height - ih * scale) / 2,
        scaleX: scale, scaleY: scale,
        angle: spec.tilt,
        clipPath: clip,
        shadow,
        selectable: false, evented: false,
        originX: "left" as const, originY: "top" as const,
      });
      objects.push(fabricImg);
    } else {
      const placeholder = new fabric.Rect({
        left: offsetX,
        top: 0,
        width: spec.width,
        height: spec.height,
        fill: PLACEHOLDER_COLORS[i],
        rx: spec.cornerRadius, ry: spec.cornerRadius,
        angle: spec.tilt,
        shadow,
        selectable: false, evented: false,
        originX: "left" as const, originY: "top" as const,
      });
      objects.push(placeholder);
    }

    // Next image overlaps the current one
    offsetX += spec.width * (1 - overlapPct / 100);
  }

  const totalW = offsetX + images[1].width;
  const totalH = Math.max(images[0].height, images[1].height);

  const group = new fabric.Group(objects, {
    selectable: false, evented: false,
  });
  group.set({
    left: x + totalW / 2,
    top:  y + totalH / 2,
  });

  return group;
}
