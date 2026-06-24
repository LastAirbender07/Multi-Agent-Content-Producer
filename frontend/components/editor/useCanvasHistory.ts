import { useRef, useCallback } from "react";
import type * as fabric from "fabric";

export function useCanvasHistory(
  canvasRef: React.MutableRefObject<fabric.Canvas | null>,
  onUndoRedoStateChange: (canUndo: boolean, canRedo: boolean) => void,
): {
  commit: (label?: string) => void;
  undo: () => void;
  redo: () => void;
  resetHistory: () => void;
} {
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);

  const refreshUndoRedo = useCallback(() => {
    onUndoRedoStateChange(undoStack.current.length > 0, redoStack.current.length > 0);
  }, [onUndoRedoStateChange]);

  const commit = useCallback((_label = "change") => {
    const c = canvasRef.current; if (!c) return;
    undoStack.current.push(JSON.stringify(c.toJSON()));
    redoStack.current = []; refreshUndoRedo();
  }, [canvasRef, refreshUndoRedo]);

  const undo = useCallback(() => {
    const c = canvasRef.current; if (!c || !undoStack.current.length) return;
    const current = JSON.stringify(c.toJSON());
    const snapshot = undoStack.current.pop()!;
    redoStack.current.push(current);
    c.loadFromJSON(JSON.parse(snapshot)).then(() => c.renderAll());
    refreshUndoRedo();
  }, [canvasRef, refreshUndoRedo]);

  const redo = useCallback(() => {
    const c = canvasRef.current; if (!c || !redoStack.current.length) return;
    const current = JSON.stringify(c.toJSON());
    const snapshot = redoStack.current.pop()!;
    undoStack.current.push(current);
    c.loadFromJSON(JSON.parse(snapshot)).then(() => c.renderAll());
    refreshUndoRedo();
  }, [canvasRef, refreshUndoRedo]);

  const resetHistory = useCallback(() => {
    undoStack.current = []; redoStack.current = []; refreshUndoRedo();
  }, [refreshUndoRedo]);

  return { commit, undo, redo, resetHistory };
}
