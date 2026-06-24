import type * as fabric from "fabric";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "@/utils/canvasTemplates/index";
import type { api as ApiType } from "@/lib/api";

export interface SlideLoaderContext {
  runId: string;
  angleIndex: number;
  slideNumber: number;
  canvasRef: React.MutableRefObject<fabric.Canvas | null>;
  isViewOnlyRef: React.MutableRefObject<boolean>;
  loadTokenRef: React.MutableRefObject<number>;
  setLoading: (v: boolean) => void;
  setRestoreBanner: (v: string | null) => void;
  onSlideLoaded?: (theme: "aurora" | "lumina", isViewOnly: boolean) => void;
  resetHistory: () => void;
  API_BASE: string;
  getTokens: (template: string) => any;
  buildSlideCanvas: (slide: any, imageUrl: string | null, meta: SlideMeta) => Promise<fabric.FabricObject[]>;
  apiClient: typeof import("@/lib/api").api;
}

// Guard function: returns true if this load has been superseded or canvas is gone
function isStale(token: number, context: SlideLoaderContext): boolean {
  return token !== context.loadTokenRef.current || !context.canvasRef.current;
}

export async function loadInitial(
  c: fabric.Canvas,
  slide: SlideData | null,
  token: number,
  context: SlideLoaderContext,
): Promise<void> {
  if (!slide) return;
  const { runId, angleIndex, slideNumber, API_BASE, apiClient, buildSlideCanvas, getTokens } = context;

  // ── Resolve image URL from asset library ───────────────────────────────
  let imageUrl: string | null = null;
  try {
    const lib = await apiClient.getImageLibrary(runId);
    if (isStale(token, context)) return;
    const imgs = lib.run_images[`angle_${angleIndex}`] ?? [];
    const match = imgs.find((i: any) => i.slide_number === slideNumber);
    if (match) imageUrl = `${API_BASE}${match.url}`;
  } catch {}

  if (isStale(token, context)) return;

  // ── Resolve slide metadata for brand bar ───────────────────────────────
  let totalSlides = 11;
  try {
    const manifest = await apiClient.getRunManifest(runId);
    totalSlides = manifest.angles[angleIndex]?.slide_count ?? 11;
  } catch {}

  if (isStale(token, context)) return;

  const meta: SlideMeta = {
    slideNum:    slideNumber,
    totalSlides,
    logoUrl:     `${API_BASE}/assets/brand/logo.png`,
    brandName:   "THEOPINIONBOARD",
  };

  const objects = await buildSlideCanvas(
    slide as SlideData & { canvas_template?: string },
    imageUrl,
    meta,
  );

  if (isStale(token, context)) return;

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

export async function loadSlide(context: SlideLoaderContext): Promise<void> {
  const { runId, angleIndex, slideNumber, canvasRef, isViewOnlyRef, loadTokenRef,
    setLoading, setRestoreBanner, onSlideLoaded, resetHistory, apiClient } = context;

  const c = canvasRef.current;
  if (!c) return;

  const token = loadTokenRef.current;
  setLoading(true); setRestoreBanner(null);

  try {
    const cpKey = `canvas_cp_${runId}_${angleIndex}_${slideNumber}`;
    const { canvas_json, slide } = await apiClient.getCanvas(runId, angleIndex, slideNumber);
    if (isStale(token, context)) return;

    // Emit slide theme and isViewOnly so parent can use correct tokens / show banner
    if (slide) {
      const tmpl = (slide as { canvas_template?: string }).canvas_template ?? "";
      const thm  = tmpl.startsWith("lumina") || (slide as { _theme?: string })._theme === "lumina"
        ? "lumina" : "aurora";
      const viewOnly = !tmpl;
      isViewOnlyRef.current = viewOnly;
      onSlideLoaded?.(thm, viewOnly);
      // Close the race window: prevent canvas selection immediately while loadInitial builds objects.
      if (viewOnly) c.selection = false;
    }

    if (canvas_json) {
      await c.loadFromJSON(canvas_json);
      if (isStale(token, context)) return;
      c.renderAll(); resetHistory();
    } else {
      const checkpoint = localStorage.getItem(cpKey);
      if (checkpoint) {
        setRestoreBanner(checkpoint);
        await loadInitial(c, slide, token, context);
      } else {
        await loadInitial(c, slide, token, context);
        if (isStale(token, context)) return;
        resetHistory();
      }
    }

    // Apply view-only lock AFTER objects are loaded
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
