import { useEffect } from "react";
import type * as fabric from "fabric";

export function useCanvasCheckpoint(
  canvasRef: React.MutableRefObject<fabric.Canvas | null>,
  isViewOnlyRef: React.MutableRefObject<boolean>,
  runId: string,
  angleIndex: number,
  slideNumber: number,
): void {
  useEffect(() => {
    const id = setInterval(() => {
      if (isViewOnlyRef.current) return;   // never checkpoint view-only slides
      const c = canvasRef.current; if (!c) return;
      try { localStorage.setItem(`canvas_cp_${runId}_${angleIndex}_${slideNumber}`, JSON.stringify(c.toJSON())); } catch {}
    }, 30_000);
    return () => clearInterval(id);
  }, [canvasRef, isViewOnlyRef, runId, angleIndex, slideNumber]);
}
