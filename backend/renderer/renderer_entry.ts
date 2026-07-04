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
import type { SlideMeta } from "../../frontend/utils/canvasTemplates/index";
import { getTokens, applyOverrides } from "../../frontend/utils/canvasTokens";
import type { SlideData } from "../../frontend/lib/api/types";
import type { RendererAPI, RenderOptions, SlideInput } from "./renderer_contract";

// Register all Chart.js components (scales, elements, plugins).
// In Next.js these are auto-registered; in the standalone renderer we must do it explicitly.
Chart.register(...registerables);

// ── Constants ────────────────────────────────────────────────────────────────

// Canvas size — read from the resolved token set (canvasTokens.ts defines canvasSize = 1080
// on every theme). This avoids duplicating the constant here.
const CANVAS_BG_COLOR   = "#090909";
const DEFAULT_LOGO_PATH = "/assets/brand/logo.png";

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
// RenderOptions, SlideInput, and RendererAPI are the canonical contract — see renderer_contract.ts.
// Internally we work with SlideData (the full typed shape) — the contract accepts SlideInput
// (loose) so Playwright callers don't need to import frontend types. The cast below is safe
// because every caller is expected to pass a valid slide JSON object.
function asSlide(input: SlideInput): SlideData & { canvas_template?: string } {
  return input as unknown as SlideData & { canvas_template?: string };
}

// ── Canvas instance registry ─────────────────────────────────────────────────
// Keyed by canvas element reference to handle multiple canvases if needed.
const _canvasInstances = new WeakMap<HTMLCanvasElement, fabric.Canvas>();

// ── Public API ────────────────────────────────────────────────────────────────

(window as Window & { Renderer?: RendererAPI }).Renderer = {
  loadFonts,
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

    // Cast at the boundary — SlideInput is the loose public type, SlideData is the typed internal shape
    const slide = asSlide(slideJson);

    const templateId = inferTemplate(slide);
    const tokens     = applyOverrides(
      getTokens(templateId),
      slide.slide_overrides ?? {},
    );

    const canvas = new fabric.Canvas(canvasEl, {
      width:  tokens.canvasSize,
      height: tokens.canvasSize,
      backgroundColor: CANVAS_BG_COLOR,
      enableRetinaScaling: false,
    });
    _canvasInstances.set(canvasEl, canvas);

    const imageUrl = slide.image_url
      ? (slide.image_url.startsWith("http")
          ? slide.image_url
          : `${options.imageBaseUrl}${slide.image_url}`)
      : null;

    const meta: SlideMeta = {
      slideNum:    slide.slide_number ?? 1,
      totalSlides: options.totalSlides ?? 10,
      logoUrl:     `${options.imageBaseUrl}${DEFAULT_LOGO_PATH}`,
      brandName:   options.brandName ?? "",
    };

    const builder = REGISTRY[templateId] ?? REGISTRY["aurora-hook"];
    const objects = await builder(slide, imageUrl, tokens, meta);
    objects.forEach(obj => {
      canvas.add(obj);
      obj.setCoords();
    });
    canvas.renderAll();
  },
};
