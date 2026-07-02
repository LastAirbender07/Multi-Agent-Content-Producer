/**
 * Renderer entry point — bundles Fabric.js canvas template builders and exposes
 * window.Renderer.render(slideJson, options) as the public API.
 *
 * Design decisions:
 * - Fonts loaded here via options.imageBaseUrl (not canvasFonts.ts which hardcodes localhost:8000)
 * - REGISTRY + inferTemplate imported directly; buildSlideCanvas skipped (it calls loadCanvasFonts)
 * - Canvas backgroundColor is always dark (#090909) regardless of theme — the background image
 *   covers it fully, and using tokens.bg (white for Lumina) produced visible edge artifacts
 */

import * as fabric from "fabric";
import { Chart, registerables } from "chart.js";
import { REGISTRY, inferTemplate } from "../../frontend/utils/canvasTemplates/index";
import { getTokens, applyOverrides } from "../../frontend/utils/canvasTokens";
import type { SlideData } from "../../frontend/lib/api/types";

// Register all Chart.js components (scales, elements, plugins).
// In Next.js these are auto-registered; in the standalone renderer we must do it explicitly.
Chart.register(...registerables);

// ── Constants ────────────────────────────────────────────────────────────────

// Canvas size — read from the resolved token set (canvasTokens.ts defines canvasSize = 1080
// on every theme). This avoids duplicating the constant here.
const CANVAS_BG_COLOR   = "#090909";
const DEFAULT_LOGO_PATH = "/assets/brand/logo.png";
const DEFAULT_BRAND     = "THEOPINIONBOARD";

const FONT_DEFS = [
  { family: "Syne",              weight: "700", path: "/assets/fonts/Syne-Bold.woff2" },
  { family: "Plus Jakarta Sans", weight: "700", path: "/assets/fonts/PlusJakartaSans-Bold.woff2" },
  { family: "Plus Jakarta Sans", weight: "600", path: "/assets/fonts/PlusJakartaSans-SemiBold.woff2" },
  { family: "Plus Jakarta Sans", weight: "400", path: "/assets/fonts/PlusJakartaSans-Regular.woff2" },
];

// ── One-time fabric init ──────────────────────────────────────────────────────
// Runs when the bundle loads, not on every render() call.

(fabric.FabricObject as { customProperties?: string[] }).customProperties = ["data"];
fabric.config.configure({ enableGLFiltering: false });

// ── Font loading ──────────────────────────────────────────────────────────────

let _fontsLoaded = false;

async function loadFonts(baseUrl: string): Promise<void> {
  if (_fontsLoaded) return;
  await Promise.allSettled(FONT_DEFS.map(async ({ family, weight, path }) => {
    try {
      const face = new FontFace(family, `url(${baseUrl}${path})`, { weight });
      document.fonts.add(await face.load());
    } catch {
      // Font unavailable — system sans-serif fallback used
    }
  }));
  _fontsLoaded = true;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RenderOptions {
  imageBaseUrl: string;
  totalSlides?: number;
  brandName?:   string;   // defaults to DEFAULT_BRAND
}

interface RendererAPI {
  render(
    slideJson: SlideData & { canvas_template?: string; image_url?: string; _theme?: string },
    options: RenderOptions,
  ): Promise<void>;
}

// ── Canvas instance registry ─────────────────────────────────────────────────
// Keyed by canvas element reference to handle multiple canvases if needed.
const _canvasInstances = new WeakMap<HTMLCanvasElement, fabric.Canvas>();

// ── Public API ────────────────────────────────────────────────────────────────

(window as Window & { Renderer?: RendererAPI }).Renderer = {
  async render(slideJson, options) {
    await loadFonts(options.imageBaseUrl);

    const canvasEl = document.getElementById("slide") as HTMLCanvasElement | null;
    if (!canvasEl) throw new Error('Canvas element #slide not found in slide_render.html');

    // Dispose previous instance on this element (supports repeated renders)
    const prev = _canvasInstances.get(canvasEl);
    if (prev) {
      prev.dispose();
      _canvasInstances.delete(canvasEl);
    }

    const templateId = inferTemplate(slideJson);
    const tokens     = applyOverrides(
      getTokens(templateId),
      (slideJson.slide_overrides as Record<string, string>) ?? {},
    );

    const canvas = new fabric.Canvas(canvasEl, {
      width:  tokens.canvasSize,
      height: tokens.canvasSize,
      backgroundColor: CANVAS_BG_COLOR,
      enableRetinaScaling: false,
    });
    _canvasInstances.set(canvasEl, canvas);

    const imageUrl = slideJson.image_url
      ? (slideJson.image_url.startsWith("http")
          ? slideJson.image_url
          : `${options.imageBaseUrl}${slideJson.image_url}`)
      : null;

    const meta = {
      slideNum:    slideJson.slide_number ?? 1,
      totalSlides: options.totalSlides ?? 10,
      logoUrl:     `${options.imageBaseUrl}${DEFAULT_LOGO_PATH}`,
      brandName:   options.brandName ?? DEFAULT_BRAND,
    };

    const builder = REGISTRY[templateId] ?? REGISTRY["aurora-hook"];
    const objects = await builder(slideJson, imageUrl, tokens, meta);
    objects.forEach(obj => {
      canvas.add(obj);
      obj.setCoords();
    });
    canvas.renderAll();
  },
};
