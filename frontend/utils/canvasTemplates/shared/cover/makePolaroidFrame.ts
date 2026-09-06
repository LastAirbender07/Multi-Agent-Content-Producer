import * as fabric from "fabric";

export interface PolaroidFrameOpts {
  /** Canvas X of the top-left corner of the outer frame */
  x: number;
  /** Canvas Y of the top-left corner of the outer frame */
  y: number;
  /** Overall frame width (default 380) */
  frameW?: number;
  /** Overall frame height (default 460) — classic polaroid ~4:5 ratio with thick base */
  frameH?: number;
  /** Padding between frame edge and photo area (default 24) */
  padX?: number;
  /** Top padding above photo (default 24) */
  padTop?: number;
  /** Bottom white space below photo — classic thick polaroid base (default 100) */
  padBottom?: number;
  /** Corner radius of the outer frame (default 4) */
  cornerRadius?: number;
  /** Tilt angle in degrees (default -2) */
  tilt?: number;
  /** Optional initial image URL to pre-fill the photo slot */
  imageUrl?: string;
  /** Caption text shown in the base area (default "— caption —") */
  caption?: string;
}

/**
 * makePolaroidFrame
 * ─────────────────
 * Creates a printed-photograph / Polaroid style component:
 *
 *   ┌────────────────────────┐  ← outer white frame (rounded, shadow)
 *   │  ┌──────────────────┐  │  ← inner photo area
 *   │  │                  │  │
 *   │  │  [grey / photo]  │  │
 *   │  │                  │  │
 *   │  └──────────────────┘  │
 *   │                        │  ← thick white base (classic polaroid look)
 *   │     — caption —        │
 *   └────────────────────────┘
 *
 * The group is tagged with data.role = "polaroid_frame" so image drops
 * and the "Replace Photo" ContextToolbar button can target it.
 *
 * Image slot dimensions are stored in data.innerW / data.innerH so the
 * fill handler knows how to scale the replacement image.
 */
export async function makePolaroidFrame(
  opts: PolaroidFrameOpts,
): Promise<fabric.Group> {
  const {
    x,
    y,
    frameW     = 380,
    frameH     = 460,
    padX       = 24,
    padTop     = 24,
    padBottom  = 100,
    cornerRadius = 4,
    tilt       = -2,
    imageUrl,
    caption    = "— caption —",
  } = opts;

  const innerW = frameW - padX * 2;               // photo width
  const innerH = frameH - padTop - padBottom;     // photo height
  const innerLeft = padX;                          // in group-local coords (group origin = top-left of frame)
  const innerTop  = padTop;

  const objects: fabric.FabricObject[] = [];

  // ── 1. Outer white frame ───────────────────────────────────────────────────
  // Shadow is on the GROUP (not this child rect) — a shadow on a child forces
  // the Group's shouldCache() to return false, which then causes the clipPath
  // to receive an empty DrawContext ({}) and crash on parentClipPaths.forEach.
  objects.push(new fabric.Rect({
    left: 0, top: 0,
    width: frameW, height: frameH,
    fill: "#FFFFFF",
    rx: cornerRadius, ry: cornerRadius,
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  }));

  // ── 2. Photo area — placeholder OR loaded image ────────────────────────────
  let photoChild: fabric.FabricObject;

  if (imageUrl) {
    try {
      const img   = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
      const iw    = img.width  ?? innerW;
      const ih    = img.height ?? innerH;
      const scale = Math.max(innerW / iw, innerH / ih);
      // Position matches the placeholder (innerLeft, innerTop) so group-centering
      // lands the image in the same spot. Center image within the photo area.
      img.set({
        left:   innerLeft + (innerW - iw * scale) / 2,
        top:    innerTop  + (innerH - ih * scale) / 2,
        scaleX: scale, scaleY: scale,
        selectable: true, evented: true,   // double-click group → pan/crop
        originX: "left" as const, originY: "top" as const,
      });
      // No absolutePositioned clip — group outer-frame clip handles overflow
      photoChild = img;
    } catch {
      photoChild = _makePlaceholder(innerLeft, innerTop, innerW, innerH);
    }
  } else {
    photoChild = _makePlaceholder(innerLeft, innerTop, innerW, innerH);
  }
  objects.push(photoChild);

  // ── 3. Thin top/side border around photo area (mimics photo print edge) ────
  objects.push(new fabric.Rect({
    left: innerLeft - 1, top: innerTop - 1,
    width: innerW + 2, height: innerH + 2,
    fill: "transparent",
    stroke: "rgba(0,0,0,0.06)",
    strokeWidth: 1,
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  }));

  // ── 4. Caption text in the white base ─────────────────────────────────────
  objects.push(new fabric.Textbox(caption, {
    left: padX,
    top:  innerTop + innerH + Math.round((padBottom - 20) / 2),
    width: innerW,
    fontSize: 18,
    fontFamily: "Georgia, serif",
    fontStyle: "italic" as const,
    fill: "#A0998F",
    textAlign: "center" as const,
    selectable: true, evented: true,   // caption IS directly editable
    originX: "left" as const, originY: "top" as const,
  }));

  // ── Group ─────────────────────────────────────────────────────────────────
  // clipPath must be passed IN the constructor — assigning it post-construction
  // causes Fabric v7 to propagate _set('canvas', …) onto an unwired Rect whose
  // _objects is undefined, triggering the "forEach of undefined" crash on add().
  // objectCaching:true forces Fabric to use renderCache() path, which initialises
  // DrawContext with parentClipPaths:[]. Without it, render() calls drawObject({})
  // and createClipPathLayer crashes on context.parentClipPaths.forEach (Fabric v7 bug).
  // Shadow is on the GROUP, not on any child rect — a shadow on a child forces
  // Group.shouldCache() → false, which makes render() call drawObject({}) with
  // an empty DrawContext, causing context.parentClipPaths.forEach to crash.
  // With shadow on the group itself + objectCaching:true, Fabric uses renderCache()
  // which properly initialises DrawContext with parentClipPaths:[].
  const group = new fabric.Group(objects, {
    selectable: true,
    evented: true,
    interactive: true, subTargetCheck: true,
    objectCaching: true,
    shadow: new fabric.Shadow({
      color: "rgba(0,0,0,0.18)",
      blur: 24,
      offsetX: 3,
      offsetY: 8,
    }),
    originX: "left" as const,
    originY: "top" as const,
    clipPath: new fabric.Rect({
      left:   -(frameW / 2), top: -(frameH / 2),
      width:  frameW, height: frameH,
      rx: cornerRadius, ry: cornerRadius,
      originX: "left" as const, originY: "top" as const,
    }),
  });

  // Tag for image-slot protocol
  (group as fabric.Group & { data?: unknown }).data = {
    role:       "polaroid_frame",
    innerW,
    innerH,
    innerLeft,
    innerTop,
    frameW,
    frameH,
  };

  group.set({
    left:  x + frameW / 2,
    top:   y + frameH / 2,
    angle: tilt,
  });

  return group;
}

/** Grey placeholder rectangle for the photo slot */
function _makePlaceholder(
  left: number, top: number, w: number, h: number,
): fabric.Rect {
  return new fabric.Rect({
    left, top, width: w, height: h,
    fill: new fabric.Gradient({
      type: "linear",
      gradientUnits: "pixels",
      coords: { x1: 0, y1: 0, x2: 0, y2: h },
      colorStops: [
        { offset: 0,   color: "#D8D3CE" },
        { offset: 1,   color: "#C4BFB9" },
      ],
    }),
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  });
}
