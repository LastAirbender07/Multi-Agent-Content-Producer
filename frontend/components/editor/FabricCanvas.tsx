"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import * as fabric from "fabric";
import { api } from "@/lib/api";
import { buildSlideCanvas } from "@/utils/canvasTemplates/index";
import type { SlideMeta } from "@/utils/canvasTemplates/index";
import { getTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";

// Disable WebGL — avoids cross-origin texture errors for canvas2d filters
fabric.config.configure({ enableGLFiltering: false });

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export interface SelectedObjectInfo {
  type: "textbox" | "image" | "other";
  role: string;
  fabricType: string;
  // Bounding rect in CANVAS coordinates (not screen coordinates)
  canvasBoundingRect: { left: number; top: number; width: number; height: number };
  // Current combined scale for converting canvas coords → screen coords
  scale: number;
}

export interface FabricCanvasAPI {
  getCanvas: () => fabric.Canvas | null;
  applyImage: (url: string) => Promise<void>;
  getCanvasJson: () => object;
  getTextFields: () => { title: string; body: string; bullets: string[]; stat_value: string; stat_label: string };
  undo: () => void;
  redo: () => void;
  commit: (label?: string) => void;
  ungroup: () => void;
  triggerResize: () => void;
  getContainerRect: () => DOMRect | null;
}

interface FabricCanvasProps {
  runId: string;
  angleIndex: number;
  slideNumber: number;
  zoomLevel: number;
  onObjectSelected: (info: SelectedObjectInfo | null) => void;
  onCanvasChanged: () => void;
  registerCanvasRef: (api: FabricCanvasAPI | null) => void;
  onUndoRedoStateChange: (canUndo: boolean, canRedo: boolean) => void;
  onSlideLoaded?: (theme: "aurora" | "lumina", isViewOnly: boolean) => void;
}

const CANVAS_SIZE = 1080;

export function FabricCanvas({
  runId, angleIndex, slideNumber, zoomLevel,
  onObjectSelected, onCanvasChanged,
  registerCanvasRef, onUndoRedoStateChange,
  onSlideLoaded,
}: FabricCanvasProps) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const loadTokenRef = useRef(0);

  const [scale, setScale] = useState(1);
  const fitScaleRef = useRef(1);
  const zoomLevelRef = useRef(zoomLevel);

  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [restoreBanner, setRestoreBanner] = useState<string | null>(null);

  // ── Zoom sync ────────────────────────────────────────────────────────────────

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
    applyScale(fitScaleRef.current, zoomLevel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomLevel]);

  // ── Scale helpers ────────────────────────────────────────────────────────────

  function applyScale(fitScale: number, zoom: number) {
    fitScaleRef.current = fitScale;
    setScale(fitScale * zoom);
  }

  function currentScale() { return fitScaleRef.current * zoomLevelRef.current; }

  // ── Undo / Redo ─────────────────────────────────────────────────────────────

  const refreshUndoRedo = useCallback(() => {
    onUndoRedoStateChange(undoStack.current.length > 0, redoStack.current.length > 0);
  }, [onUndoRedoStateChange]);

  const commit = useCallback((_label = "change") => {
    const c = canvasRef.current; if (!c) return;
    undoStack.current.push(JSON.stringify(c.toJSON()));
    redoStack.current = []; refreshUndoRedo();
  }, [refreshUndoRedo]);

  const undo = useCallback(() => {
    const c = canvasRef.current; if (!c || !undoStack.current.length) return;
    const current = JSON.stringify(c.toJSON());
    const snapshot = undoStack.current.pop()!;
    redoStack.current.push(current);
    c.loadFromJSON(JSON.parse(snapshot)).then(() => c.renderAll());
    refreshUndoRedo();
  }, [refreshUndoRedo]);

  const redo = useCallback(() => {
    const c = canvasRef.current; if (!c || !redoStack.current.length) return;
    const current = JSON.stringify(c.toJSON());
    const snapshot = redoStack.current.pop()!;
    undoStack.current.push(current);
    c.loadFromJSON(JSON.parse(snapshot)).then(() => c.renderAll());
    refreshUndoRedo();
  }, [refreshUndoRedo]);

  const resetHistory = useCallback(() => {
    undoStack.current = []; redoStack.current = []; refreshUndoRedo();
  }, [refreshUndoRedo]);

  // ── Ungroup ──────────────────────────────────────────────────────────────────

  const handleUngroup = useCallback(() => {
    const c = canvasRef.current;
    const activeObj = c?.getActiveObject();
    if (!c || !activeObj || activeObj.type !== "group") return;

    const group = activeObj as fabric.Group;
    const groupMatrix = group.calcTransformMatrix();
    const children = group.getObjects();

    commit("Ungroup");
    c.remove(group);

    children.forEach(child => {
      const localPoint = new fabric.Point(child.left ?? 0, child.top ?? 0);
      const canvasPoint = fabric.util.transformPoint(localPoint, groupMatrix);
      child.set({
        left:    canvasPoint.x,
        top:     canvasPoint.y,
        angle:   (child.angle  ?? 0) + (group.angle  ?? 0),
        scaleX:  (child.scaleX ?? 1) * (group.scaleX ?? 1),
        scaleY:  (child.scaleY ?? 1) * (group.scaleY ?? 1),
        originX: "left" as const,
        originY: "top"  as const,
      });
      c.add(child);
    });

    c.renderAll();
    onCanvasChanged();
  }, [commit, onCanvasChanged]);

  // ── View-only flag (set at slide load time for legacy runs) ─────────────────
  const isViewOnlyRef = useRef(false);

  // ── Fabric canvas init ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!canvasElRef.current) return;
    const c = new fabric.Canvas(canvasElRef.current, {
      width: CANVAS_SIZE, height: CANVAS_SIZE,
      preserveObjectStacking: true, selection: true,
      backgroundColor: "#111111",
    });
    canvasRef.current = c;

    const onSelected = () => {
      const obj = c.getActiveObject();
      if (!obj) { onObjectSelected(null); return; }
      const br = obj.getBoundingRect();
      const s = currentScale();
      onObjectSelected({
        type: obj.type === "textbox" ? "textbox" : obj.type === "image" ? "image" : "other",
        role: (obj as fabric.Object & { data?: { role?: string } }).data?.role ?? "",
        fabricType: obj.type ?? "unknown",
        canvasBoundingRect: { left: br.left, top: br.top, width: br.width, height: br.height },
        scale: s,
      });
    };

    c.on("selection:created", onSelected);
    c.on("selection:updated", onSelected);
    c.on("selection:cleared", () => onObjectSelected(null));
    c.on("object:modified", () => { if (isViewOnlyRef.current) return; commit("modify"); onCanvasChanged(); });
    c.on("text:editing:exited", () => { if (isViewOnlyRef.current) return; commit("text edit"); onCanvasChanged(); });

    return () => { c.off(); c.dispose(); canvasRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ResizeObserver ────────────────────────────────────────────────────────────

  useEffect(() => {
    const outer = outerRef.current; if (!outer) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      const padding = 16;
      const fitScale = Math.min(
        (width  - padding) / CANVAS_SIZE,
        (height - padding) / CANVAS_SIZE,
        1,
      );
      applyScale(fitScale, zoomLevelRef.current);
    });
    observer.observe(outer);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load slide ───────────────────────────────────────────────────────────────

  // Guard function for async load race conditions — true if this load has been superseded
  const isStale = (token: number) => token !== loadTokenRef.current || !canvasRef.current;

  useEffect(() => {
    const c = canvasRef.current; if (!c || !runId) return;
    loadTokenRef.current += 1;
    const token = loadTokenRef.current;
    loadSlide(c, token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, angleIndex, slideNumber]);

  async function loadSlide(c: fabric.Canvas, token: number) {
    setLoading(true); setRestoreBanner(null);
    try {
      const cpKey = `canvas_cp_${runId}_${angleIndex}_${slideNumber}`;
      const { canvas_json, slide } = await api.getCanvas(runId, angleIndex, slideNumber);
      if (isStale(token)) return;

      // Emit slide theme and isViewOnly so parent can use correct tokens / show banner
      if (slide) {
        const tmpl = (slide as { canvas_template?: string }).canvas_template ?? "";
        const thm  = tmpl.startsWith("lumina") || (slide as { _theme?: string })._theme === "lumina"
          ? "lumina" : "aurora";
        const viewOnly = !tmpl;
        isViewOnlyRef.current = viewOnly;
        onSlideLoaded?.(thm, viewOnly);
      }

      if (canvas_json) {
        await c.loadFromJSON(canvas_json);
        if (isStale(token)) return;
        c.renderAll(); resetHistory();
      } else {
        const checkpoint = localStorage.getItem(cpKey);
        if (checkpoint) {
          setRestoreBanner(checkpoint);
          await loadInitial(c, slide, token);
        } else {
          await loadInitial(c, slide, token);
          if (isStale(token)) return;
          resetHistory();
        }
      }

      // Apply view-only lock AFTER objects are loaded — loadInitial creates fresh
      // objects with selectable:true, so we must lock after, not before.
      // Also clear any stale checkpoint so the Restore banner never appears for legacy slides.
      if (isViewOnlyRef.current) {
        localStorage.removeItem(cpKey);
        c.selection = false;
        c.getObjects().forEach(obj => obj.set({ selectable: false, evented: false }));
        c.renderAll();
      }
    } catch (e) {
      if (token === loadTokenRef.current) console.error("FabricCanvas loadSlide error:", e);
    } finally {
      if (token === loadTokenRef.current) setLoading(false);
    }
  }

  async function loadInitial(c: fabric.Canvas, slide: SlideData | null, token: number) {
    if (!slide) return;

    // ── Resolve image URL from asset library ───────────────────────────────
    let imageUrl: string | null = null;
    try {
      const lib = await api.getImageLibrary(runId);
      if (isStale(token)) return;
      const imgs = lib.run_images[`angle_${angleIndex}`] ?? [];
      const match = imgs.find(i => i.slide_number === slideNumber);
      if (match) imageUrl = `${API_BASE}${match.url}`;
    } catch {}

    if (isStale(token)) return;

    // ── Resolve slide metadata for brand bar ───────────────────────────────
    let totalSlides = 11;
    try {
      const manifest = await api.getRunManifest(runId);
      totalSlides = manifest.angles[angleIndex]?.slide_count ?? 11;
    } catch {}

    if (isStale(token)) return;

    const meta: SlideMeta = {
      slideNum:    slideNumber,
      totalSlides,
      logoUrl:     `${API_BASE}/assets/brand/logo.png`,
      brandName:   "THEOPINIONBOARD",
    };

    // ── Build template objects ─────────────────────────────────────────────
    // buildSlideCanvas() uses the canvas_template field (or infers it) to
    // select the correct Aurora/Lumina template builder and create all Fabric
    // objects pixel-faithfully matching the Jinja2 design.
    const objects = await buildSlideCanvas(
      slide as SlideData & { canvas_template?: string },
      imageUrl,
      meta,
    );

    if (isStale(token)) return;

    // ── Apply to canvas ────────────────────────────────────────────────────
    c.clear();
    c.set("backgroundColor", getTokens(
      (slide as SlideData & { canvas_template?: string }).canvas_template ?? "aurora-hook"
    ).bg);
    for (const obj of objects) {
      c.add(obj);
      obj.setCoords();
    }
    c.renderAll();
  }

  async function handleRestoreYes(checkpoint: string) {
    const c = canvasRef.current; if (!c) return;
    setRestoreBanner(null);
    await c.loadFromJSON(JSON.parse(checkpoint));
    c.renderAll(); resetHistory();
    if (isViewOnlyRef.current) {
      c.selection = false;
      c.getObjects().forEach(obj => obj.set({ selectable: false, evented: false }));
      c.renderAll();
    }
  }

  function handleRestoreNo() {
    localStorage.removeItem(`canvas_cp_${runId}_${angleIndex}_${slideNumber}`);
    setRestoreBanner(null); resetHistory();
  }

  // ── Drop handler ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const outer = outerRef.current; if (!outer) return;
    function onDragOver(e: DragEvent) { e.preventDefault(); }

    async function onDrop(e: DragEvent) {
      e.preventDefault();
      if (!canvasRef.current || !containerRef.current) return;

      const imageUrl    = e.dataTransfer?.getData("imageUrl");
      const componentId = e.dataTransfer?.getData("componentId");
      const c           = canvasRef.current;
      const s           = currentScale();
      const rect        = containerRef.current.getBoundingClientRect();
      const dropX       = (e.clientX - rect.left) / s;
      const dropY       = (e.clientY - rect.top) / s;

      if (imageUrl) {
        // ── Image from Images panel ──────────────────────────────────────
        commit("drop image");
        try {
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
            left: Math.max(0, Math.min(dropX - targetSize / 2, CANVAS_SIZE - targetSize)),
            top:  Math.max(0, Math.min(dropY - targetSize / 2, CANVAS_SIZE - targetSize)),
            scaleX: imgScale, scaleY: imgScale,
            originX: "left" as const, originY: "top" as const,
          });
          (img as fabric.FabricImage & { data?: { role: string } }).data = { role: "dropped_image" };
          c.add(img); c.setActiveObject(img); c.renderAll(); onCanvasChanged();
        } catch (err) { console.error("Drop image error:", err); }

      } else if (componentId) {
        // ── Component from Templates panel ───────────────────────────────
        commit("drop component");
        try {
          const { createBrandBar, createAccentLine, createBulletItem } = await import("@/utils/canvasTemplates/shared");
          const { createBigNumberGroup } = await import("@/utils/canvasTemplates/chartRenderer");
          const { getTokens } = await import("@/utils/canvasTokens");
          const t = getTokens("aurora-hook");

          switch (componentId) {
            case "brand-bar": {
              const objs = await createBrandBar(
                t, `${API_BASE}/assets/brand/logo.png`, "THEOPINIONBOARD", 1, 11
              );
              for (const obj of objs) c.add(obj);
              break;
            }
            case "accent-line": {
              const line = createAccentLine(t, 44, Math.max(0, dropX - 22), Math.max(0, dropY - 2));
              c.add(line); c.setActiveObject(line);
              break;
            }
            case "stat-block": {
              const group = createBigNumberGroup(
                { statValue: "42%", statLabel: "Key Metric", statContext: "Source: 2024", labels: [], values: [] },
                t, { left: Math.max(0, dropX - 476), top: Math.max(0, dropY - 150) },
              );
              c.add(group); c.setActiveObject(group);
              break;
            }
            case "bullet-list": {
              const texts = ["Key insight number one", "Key insight number two", "Key insight number three"];
              for (let i = 0; i < texts.length; i++) {
                const bullet = createBulletItem(texts[i], i, t, 22);
                bullet.set({ left: Math.max(0, dropX - 400), top: Math.max(0, dropY - 80 + i * 54) });
                c.add(bullet);
              }
              break;
            }
            default:
              console.warn(`Unknown component: ${componentId}`);
          }

          c.renderAll(); onCanvasChanged();
        } catch (err) { console.error("Component drop error:", err); }
      }
    }

    outer.addEventListener("dragover", onDragOver);
    outer.addEventListener("drop", onDrop);
    return () => {
      outer.removeEventListener("dragover", onDragOver);
      outer.removeEventListener("drop", onDrop);
    };
  }, [commit, onCanvasChanged]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (e.shiftKey && meta && e.key.toLowerCase() === "z") { e.preventDefault(); redo(); return; }
      if (meta && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && !meta) {
        if (isViewOnlyRef.current) return;
        const tag = (document.activeElement as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          const active = canvasRef.current?.getActiveObject();
          if (active) { e.preventDefault(); commit("delete"); canvasRef.current?.remove(active); canvasRef.current?.renderAll(); onCanvasChanged(); }
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, commit, onCanvasChanged]);

  // ── Register API ref ─────────────────────────────────────────────────────────

  useEffect(() => {
    const api_: FabricCanvasAPI = {
      getCanvas: () => canvasRef.current,
      getContainerRect: () => containerRef.current?.getBoundingClientRect() ?? null,
      commit,
      ungroup: handleUngroup,
      undo, redo,
      applyImage: async (url: string) => {
        const c = canvasRef.current; if (!c) return;
        commit("apply image");
        try {
          const naturalSize = await new Promise<{ w: number; h: number }>((resolve) => {
            const el = new Image(); el.crossOrigin = "anonymous";
            el.onload = () => resolve({ w: el.naturalWidth, h: el.naturalHeight });
            el.onerror = () => resolve({ w: 400, h: 400 });
            el.src = url;
          });
          const img = await fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
          const targetSize = 400;
          const imgScale = Math.min(targetSize / naturalSize.w, targetSize / naturalSize.h);
          img.set({ left: 200, top: 200, scaleX: imgScale, scaleY: imgScale, originX: "left" as const, originY: "top" as const });
          (img as fabric.FabricImage & { data?: { role: string } }).data = { role: "applied_image" };
          c.add(img); c.setActiveObject(img); c.renderAll(); onCanvasChanged();
        } catch (err) { console.error("applyImage error:", err); }
      },
      getCanvasJson: () => canvasRef.current ? canvasRef.current.toJSON() : {},
      getTextFields: () => {
        const c = canvasRef.current;
        if (!c) return { title: "", body: "", bullets: [], stat_value: "", stat_label: "" };
        const objs = c.getObjects() as Array<fabric.FabricObject & { data?: { role?: string }; text?: string }>;
        const get = (role: string) => objs.find(o => o.data?.role === role)?.text ?? "";
        const bulletsRaw = get("bullets");
        return {
          title: get("title"), body: get("body"),
          bullets: bulletsRaw ? bulletsRaw.split("\n").map(l => l.replace(/^[•\-]\s*/, "")).filter(Boolean) : [],
          stat_value: get("stat_value"), stat_label: get("stat_label"),
        };
      },
      triggerResize: () => applyScale(fitScaleRef.current, zoomLevelRef.current),
    };
    registerCanvasRef(api_);
    return () => registerCanvasRef(null);
  }, [registerCanvasRef, undo, redo, commit, handleUngroup, onCanvasChanged]);

  // ── Auto-checkpoint ──────────────────────────────────────────────────────────

  useEffect(() => {
    const id = setInterval(() => {
      if (isViewOnlyRef.current) return;   // never checkpoint view-only slides
      const c = canvasRef.current; if (!c) return;
      try { localStorage.setItem(`canvas_cp_${runId}_${angleIndex}_${slideNumber}`, JSON.stringify(c.toJSON())); } catch {}
    }, 30_000);
    return () => clearInterval(id);
  }, [runId, angleIndex, slideNumber]);

  // ── Render ────────────────────────────────────────────────────────────────────

  const scaledSize = CANVAS_SIZE * scale;

  return (
    <div ref={outerRef} className="flex-1 bg-zinc-950 overflow-hidden flex items-center justify-center relative">
      {restoreBanner && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-xl text-xs">
          <span className="text-zinc-300">Unsaved session found —</span>
          <button onClick={() => handleRestoreYes(restoreBanner)} className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all">Restore</button>
          <button onClick={handleRestoreNo} className="px-2.5 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-all">Discard</button>
        </div>
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-10">
          <Loader2 size={28} className="text-violet-400 animate-spin" />
        </div>
      )}
      {/*
        containerRef: layout box = scaledSize × scaledSize (flex centering works naturally).
        Inner div: native 1080×1080, CSS-scaled from top-left.
        overflow: visible on containerRef so we don't clip when scale has fractional rounding.
      */}
      <div
        ref={containerRef}
        style={{
          width: scaledSize,
          height: scaledSize,
          position: "relative",
          flexShrink: 0,
          overflow: "visible",  // don't clip on rounding — shadow ring defines boundary
          boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 8px 40px rgba(0,0,0,0.7)",
          borderRadius: 2,
        }}
      >
        <div
          style={{
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            transformOrigin: "0 0",
            transform: `scale(${scale})`,
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          <canvas ref={canvasElRef} />
        </div>
      </div>
    </div>
  );
}
