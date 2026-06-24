import { useState, useEffect } from "react";
import type { SelectedObjectInfo } from "@/components/editor/FabricCanvas";

const TOOLBAR_HEIGHT = 44;
const CLEARANCE     = 8;  // gap between toolbar bottom and selected object top

/**
 * Calculates the floating ContextToolbar position above the selected canvas object.
 * Converts canvas-space bounding rect to scaled screen coordinates.
 */
export function useToolbarPosition(
  selectedObject: SelectedObjectInfo | null,
  canvasReady: boolean,
): { top: number; left: number } | null {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!selectedObject || !canvasReady) { setPos(null); return; }
    const s  = selectedObject.scale;
    const br = selectedObject.canvasBoundingRect;
    setPos({
      top:  Math.max(4, br.top  * s - TOOLBAR_HEIGHT - CLEARANCE),
      left: Math.max(4, br.left * s),
    });
  }, [selectedObject, canvasReady]);

  return pos;
}
