/**
 * fabricCrop.ts — Fabric v7.4.0 image crop helpers (inlined from fabric/extensions)
 *
 * Source: fabric/extensions/cropping_controls/ — pinned to fabric v7.4.0
 * Why inlined: fabric/extensions runtime import pulls in 'westures' (not installed).
 *              deep .mjs path imports are outside the package exports map (Turbopack risk).
 * If fabric is upgraded: re-copy from the new version's cropping_controls/ folder.
 *
 * DO NOT build custom crop/pan — these are the canonical Fabric v7 implementations.
 *
 * What these give you (Canva-style crop UX):
 *   enterCropMode    — double-click handler: swaps to 8 crop handles + ghost overlay + pan
 *   renderGhostImage — before:render hook: draws full image at 50% opacity OUTSIDE crop window
 *   cropPanMoveHandler — moving handler: drag converts to cropX/cropY (image stays fixed)
 *   createImageCroppingControls — 8 handles: 4 corners = scale within src bounds, 4 edges = crop
 */

import type {
  FabricImage,
  ObjectEvents,
  TPointerEventInfo,
} from 'fabric';
import { controlsUtils, Control, Point, util } from 'fabric';

const { wrapWithFixedAnchor, wrapWithFireEvent, scaleCursorStyleHandler } = controlsUtils;

// ── Internal helpers (from croppingControls.ts) ───────────────────────────────

import type { TransformActionHandler } from 'fabric';

const cropActionName = () => 'crop';

const changeCropWidth: ReturnType<typeof wrapWithFireEvent> = wrapWithFireEvent(
  'CROPPING' as Parameters<typeof wrapWithFireEvent>[0],
  wrapWithFixedAnchor(((eventData, transform, x, y) => {
    const { target } = transform;
    const { width } = target;
    const image = target as FabricImage;
    const modified = controlsUtils.changeObjectWidth(eventData, transform, x, y);
    const availableWidth = image._element.width - image.cropX;
    if (modified) {
      if (image.width > availableWidth) image.width = availableWidth;
      if (image.width < 1) image.width = 1;
    }
    return width !== image.width;
  }) as TransformActionHandler),
);

const changeCropHeight: ReturnType<typeof wrapWithFireEvent> = wrapWithFireEvent(
  'CROPPING' as Parameters<typeof wrapWithFireEvent>[0],
  wrapWithFixedAnchor(((eventData, transform, x, y) => {
    const { target } = transform;
    const { height } = target;
    const image = target as FabricImage;
    const modified = controlsUtils.changeObjectHeight(eventData, transform, x, y);
    const availableHeight = image._element.height - image.cropY;
    if (modified) {
      if (image.height > availableHeight) image.height = availableHeight;
      if (image.height < 1) image.height = 1;
    }
    return height !== image.height;
  }) as TransformActionHandler),
);

const changeCropX: ReturnType<typeof wrapWithFireEvent> = wrapWithFireEvent(
  'CROPPING' as Parameters<typeof wrapWithFireEvent>[0],
  wrapWithFixedAnchor(((eventData, transform, x, y) => {
    const { target } = transform;
    const image = target as FabricImage;
    const { width, cropX } = image;
    const modified = controlsUtils.changeObjectWidth(eventData, transform, x, y);
    let newCropX = cropX + width - image.width;
    image.width = width;
    if (modified) {
      if (newCropX < 0) newCropX = 0;
      image.cropX = newCropX;
      image.width += cropX - newCropX;
    }
    return newCropX !== cropX;
  }) as TransformActionHandler),
);

const changeCropY: ReturnType<typeof wrapWithFireEvent> = wrapWithFireEvent(
  'CROPPING' as Parameters<typeof wrapWithFireEvent>[0],
  wrapWithFixedAnchor(((eventData, transform, x, y) => {
    const { target } = transform;
    const image = target as FabricImage;
    const { height, cropY } = image;
    const modified = controlsUtils.changeObjectHeight(eventData, transform, x, y);
    let newCropY = cropY + height - image.height;
    image.height = height;
    if (modified) {
      if (newCropY < 0) newCropY = 0;
      image.cropY = newCropY;
      image.height += cropY - newCropY;
    }
    return newCropY !== cropY;
  }) as TransformActionHandler),
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ghostScalePositionHandler(this: any, _dim: unknown, _finalMatrix: unknown, fabricObject: FabricImage) {
  const matrix = fabricObject.calcTransformMatrix();
  const vpt = fabricObject.getViewportTransform();
  const _mat = util.multiplyTransformMatrices(vpt, matrix);
  const x = (this as { x: number }).x < 0
    ? -fabricObject.width / 2 - fabricObject.cropX
    : fabricObject.getElement().width - fabricObject.width / 2 - fabricObject.cropX;
  const y = (this as { y: number }).y < 0
    ? -fabricObject.height / 2 - fabricObject.cropY
    : fabricObject.getElement().height - fabricObject.height / 2 - fabricObject.cropY;
  return new Point(x, y).transform(_mat);
}

type ScaleHandler = (cx: number, cy: number) => TransformActionHandler;
const scaleEquallyCropGenerator: ScaleHandler = (cx, cy) => (eventData, transform, x, y) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { target } = transform as unknown as { target: FabricImage };
  const { width: fullWidth, height: fullHeight } = target.getElement();
  const remainderX = fullWidth - target.width - target.cropX;
  const remainderY = fullHeight - target.height - target.cropY;
  const flipNum = (o: number, f: boolean) => f ? 1 - o : o;
  const anchorOriginX = flipNum(cx < 0 ? 1 + remainderX / target.width : -target.cropX / target.width, target.flipX);
  const anchorOriginY = flipNum(cy < 0 ? 1 + remainderY / target.height : -target.cropY / target.height, target.flipY);
  const constraint = target.translateToOriginPoint(target.getCenterPoint(), anchorOriginX, anchorOriginY);
  const newPoint = controlsUtils.getLocalPoint(transform, anchorOriginX, anchorOriginY, x, y);
  const scale = Math.min(Math.abs(newPoint.x / fullWidth), Math.abs(newPoint.y / fullHeight));
  const scaleChangeX = scale / target.scaleX;
  const scaleChangeY = scale / target.scaleY;
  const newWidth  = target.width  / scaleChangeX;
  const newHeight = target.height / scaleChangeY;
  const scaledRemX = remainderX / scaleChangeX;
  const scaledRemY = remainderY / scaleChangeY;
  const newCropX = cx < 0 ? fullWidth  - newWidth  - scaledRemX : target.cropX / scaleChangeX;
  const newCropY = cy < 0 ? fullHeight - newHeight - scaledRemY : target.cropY / scaleChangeY;
  const boundsFailX = (cx < 0 ? scaledRemX : newCropX) + newWidth  > fullWidth;
  const boundsFailY = (cy < 0 ? scaledRemY : newCropY) + newHeight > fullHeight;
  if (boundsFailX || boundsFailY) return false;
  target.scaleX = scale; target.scaleY = scale;
  target.width  = newWidth; target.height = newHeight;
  target.cropX  = newCropX; target.cropY  = newCropY;
  const newAncX = flipNum(cx < 0 ? 1 + scaledRemX / newWidth  : -newCropX / newWidth,  target.flipX);
  const newAncY = flipNum(cy < 0 ? 1 + scaledRemY / newHeight : -newCropY / newHeight, target.flipY);
  target.setPositionByOrigin(constraint, newAncX, newAncY);
  return true;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const withFlip = (h: TransformActionHandler, flipped: TransformActionHandler, axis: 'flipX' | 'flipY'): TransformActionHandler =>
  (e, t, x, y) => (t.target as any)[axis] ? flipped(e, t, x, y) : h(e, t, x, y);

const withCornerFlip = (
  xH: TransformActionHandler, xF: TransformActionHandler,
  yH: TransformActionHandler, yF: TransformActionHandler,
): TransformActionHandler => (e, t, x, y) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tgt = t.target as any;
  const xr = (tgt.flipX ? xF : xH)(e, t, x, y);
  const yr = (tgt.flipY ? yF : yH)(e, t, x, y);
  return xr || yr;
};

// ── renderCornerControl and renderRoundedSegmentControl (from controlRendering.ts) ─

/* eslint-disable @typescript-eslint/no-explicit-any */
function renderRoundedSegmentControl(
  this: any, ctx: CanvasRenderingContext2D, left: number, top: number,
  _styleOverride: any, fabricObject: FabricImage,
) {
  const { stroke, xSize, ySize } = this.commonRenderProps(ctx, left, top, fabricObject, _styleOverride);
  const c = Math.max(xSize, ySize); const l = Math.min(xSize, ySize); const u = c / 2;
  const d = 2 * fabricObject.borderScaleFactor;
  ctx.save(); ctx.rotate(((this.angle || 0) * Math.PI) / 180); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-u, 0); ctx.lineTo(u, 0);
  if (stroke) { ctx.lineWidth = l; ctx.stroke(); }
  ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = stroke ? l - d : l; ctx.stroke();
  ctx.restore();
}

function shouldActivateCorner(
  this: any, controlKey: string, fabricObject: FabricImage, coords: any,
  left: number, top: number,
) {
  if ((fabricObject.canvas?.getActiveObject()) !== fabricObject || !fabricObject.isControlVisible(controlKey)) return false;
  const { tl, tr, br, bl } = coords;
  const cx = (tl.x + tr.x + br.x + bl.x) / 4;
  const cy = (tl.y + tr.y + br.y + bl.y) / 4;
  const sx = this.sizeX || fabricObject.cornerSize; const sy = (this.sizeY || fabricObject.cornerSize) / 2;
  const ang = ((fabricObject.angle || 0) + (this.angle || 0)) * Math.PI / 180;
  const cos = Math.cos(ang); const sin = Math.sin(ang);
  const rot = (p: Point) => new Point(p.x * cos - p.y * sin + cx, p.x * sin + p.y * cos + cy);
  const hPts = [rot(new Point(-sy, -sy)), rot(new Point(sx + sy, -sy)), rot(new Point(sx + sy, sy)), rot(new Point(-sy, sy))];
  const vPts = [rot(new Point(-sy, -sy)), rot(new Point(sy, -sy)), rot(new Point(sy, sx + sy)), rot(new Point(-sy, sx + sy))];
  const inPoly = (pt: Point, poly: Point[]) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      if (((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };
  const mp = new Point(left, top);
  return inPoly(mp, hPts) || inPoly(mp, vPts);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCornerControl(this: any, ctx: CanvasRenderingContext2D, left: number, top: number, _style: any, fab: FabricImage) {
  const { stroke, xSize: sw, ySize: sh } = this.commonRenderProps(ctx, left, top, fab, _style);
  const d = 2 * fab.borderScaleFactor;
  ctx.save(); ctx.rotate(((this.angle || 0) * Math.PI) / 180); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const draw = () => { ctx.beginPath(); ctx.moveTo(sw, 0); ctx.lineTo(0, 0); ctx.lineTo(0, sw); };
  if (stroke) { ctx.lineWidth = sh; draw(); ctx.stroke(); }
  ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = stroke ? sh - d : sh; draw(); ctx.stroke();
  ctx.restore();
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Public exports ────────────────────────────────────────────────────────────

/**
 * Converts a drag-move event into a cropX/cropY change on the image.
 * The image stays fixed on canvas; the visible window shifts.
 * Attach with: fabricImage.on('moving', cropPanMoveHandler)
 */
export const cropPanMoveHandler = ({ transform }: ObjectEvents['moving']) => {
  const { target, original } = transform;
  const fabricImage = target as FabricImage;
  const p = new Point(
    target.left - original.left,
    target.top  - original.top,
  ).transform(
    util.invertTransform(
      util.createRotateMatrix({ angle: fabricImage.getTotalAngle() }),
    ),
  );
  let cropX = (original as { cropX?: number }).cropX! - (p.x / fabricImage.scaleX) * (fabricImage.flipX ? -1 : 1);
  let cropY = (original as { cropY?: number }).cropY! - (p.y / fabricImage.scaleY) * (fabricImage.flipY ? -1 : 1);
  const { width, height, _element } = fabricImage;
  if (cropX < 0) cropX = 0;
  if (cropY < 0) cropY = 0;
  if (cropX + width  > _element.width)  cropX = _element.width  - width;
  if (cropY + height > _element.height) cropY = _element.height - height;
  fabricImage.cropX = cropX;
  fabricImage.cropY = cropY;
  fabricImage.left  = original.left;
  fabricImage.top   = original.top;
};

/**
 * Draws the full source image at 50% opacity outside the current crop window.
 * This is the "ghost" that lets the user see what they are cropping to.
 * Attach with: fabricImage.on('before:render', renderGhostImage)
 */
export function renderGhostImage(
  this: FabricImage,
  { ctx }: { ctx: CanvasRenderingContext2D },
) {
  const element = this._element;
  const ghostX = -this.width / 2 - this.cropX;
  const ghostY = -this.height / 2 - this.cropY;
  const alpha = ctx.globalAlpha;
  ctx.globalAlpha *= 0.5;
  ctx.drawImage(element, ghostX, ghostY);
  ctx.strokeStyle = this.borderColor;
  ctx.lineWidth = this.borderScaleFactor / this.scaleX;
  ctx.strokeRect(ghostX, ghostY, element.width, element.height);
  ctx.globalAlpha = alpha;
}

/**
 * Creates the 8 crop controls:
 *   4 corners (tls, brs, trs, bls) — scale image within source pixel bounds
 *   4 edges  (mlc, mrc, mbc, mtc) — crop from that edge
 * Plus 4 corner-crop handles (tlc, trc, blc, brc).
 */
export const createImageCroppingControls = () => ({
  // 4 corner handles — scale the image uniformly within source pixel bounds
  tls: new Control({ x: -0.5, y: -0.5, cursorStyleHandler: scaleCursorStyleHandler, positionHandler: ghostScalePositionHandler, actionHandler: scaleEquallyCropGenerator(-0.5, -0.5) }),
  brs: new Control({ x:  0.5, y:  0.5, cursorStyleHandler: scaleCursorStyleHandler, positionHandler: ghostScalePositionHandler, actionHandler: scaleEquallyCropGenerator( 0.5,  0.5) }),
  trs: new Control({ x:  0.5, y: -0.5, cursorStyleHandler: scaleCursorStyleHandler, positionHandler: ghostScalePositionHandler, actionHandler: scaleEquallyCropGenerator( 0.5, -0.5) }),
  bls: new Control({ x: -0.5, y:  0.5, cursorStyleHandler: scaleCursorStyleHandler, positionHandler: ghostScalePositionHandler, actionHandler: scaleEquallyCropGenerator(-0.5,  0.5) }),
  // 4 edge handles — crop from each edge (moves the crop boundary in/out)
  mlc: new Control({ x: -0.5, y: 0, angle: 90, sizeX: 8, sizeY: 16, render: renderRoundedSegmentControl, cursorStyleHandler: scaleCursorStyleHandler, actionHandler: withFlip(changeCropX,      changeCropWidth,  'flipX'), getActionName: cropActionName }),
  mrc: new Control({ x:  0.5, y: 0, angle: 90, sizeX: 8, sizeY: 16, render: renderRoundedSegmentControl, cursorStyleHandler: scaleCursorStyleHandler, actionHandler: withFlip(changeCropWidth,  changeCropX,      'flipX'), getActionName: cropActionName }),
  mbc: new Control({ x: 0, y:  0.5, angle: 0, sizeX: 16, sizeY: 8, render: renderRoundedSegmentControl, cursorStyleHandler: scaleCursorStyleHandler, actionHandler: withFlip(changeCropHeight, changeCropY,      'flipY'), getActionName: cropActionName }),
  mtc: new Control({ x: 0, y: -0.5, angle: 0, sizeX: 16, sizeY: 8, render: renderRoundedSegmentControl, cursorStyleHandler: scaleCursorStyleHandler, actionHandler: withFlip(changeCropY,      changeCropHeight, 'flipY'), getActionName: cropActionName }),
});

/**
 * Wire crop mode on a FabricImage.
 * Call this as a mouse:dblclick handler or programmatically.
 * First double-click enters crop mode; second double-click exits.
 * On exit, cropX/cropY/width/height are baked into the image — persisted by canvas.toJSON().
 */
export const enterCropMode = function enterCropMode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  this: any,
  { target }: TPointerEventInfo,
) {
  const fabricImage = target as FabricImage;
  const { controls, padding } = fabricImage;
  fabricImage.padding = 0;
  fabricImage.controls = createImageCroppingControls();
  fabricImage.on('moving', cropPanMoveHandler);
  fabricImage.on('before:render', renderGhostImage);
  fabricImage.setCoords();
  const exitCropMode = () => {
    fabricImage.padding = padding;
    fabricImage.off('moving', cropPanMoveHandler);
    fabricImage.off('before:render', renderGhostImage);
    fabricImage.controls = controls;
    fabricImage.setCoords();
    fabricImage.once('mousedblclick', enterCropMode);
    fabricImage.canvas?.requestRenderAll();
  };
  // Delay registering the exit handler by one frame — without this, the same
  // dblclick event that triggered enterCropMode would immediately fire exitCropMode
  // (Fabric fires mousedblclick on the image object itself after the canvas handler runs).
  setTimeout(() => {
    fabricImage.once('mousedblclick', exitCropMode);
  }, 50);
  fabricImage.canvas?.requestRenderAll();
};
