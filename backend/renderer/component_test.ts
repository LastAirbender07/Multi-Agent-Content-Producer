/**
 * component_test.ts — bundle entry for isolated primitive testing.
 *
 * Exposes:
 *   window.ComponentTest.loadFonts(baseUrl)  — Register Inter + Playfair fonts
 *   window.ComponentTest.build(name, opts)   — Build a primitive and return
 *                                              a fabric.Object ready to add()
 *
 * Loaded by backend/renderer/component_test.html; called from
 * scripts/gan_component_snapshots.js in --component mode.
 */

import * as fabric from "fabric";
import {
  makeBrandPill,
  makeOutlinedPill,
  makeMixedWeightText,
  makeDotProgressIndicator,
} from "../../frontend/utils/canvasTemplates/shared/compact";
import { COMPACT_TOKENS } from "../../frontend/utils/canvasTemplates/shared/design_tokens";

// ── Fabric init (same as renderer_entry.ts) ──────────────────────────────────
(fabric.FabricObject as { customProperties?: string[] }).customProperties = ["data"];
fabric.config.configure({ enableGLFiltering: false });

// ── Font loading ─────────────────────────────────────────────────────────────
const FONT_DEFS = [
  { family: "Inter",             weight: "900", style: "normal", path: "/assets/fonts/Inter-Black.woff2" },
  { family: "Playfair Display",  weight: "700", style: "italic", path: "/assets/fonts/PlayfairDisplay-BoldItalic.woff2" },
  { family: "Plus Jakarta Sans", weight: "700", style: "normal", path: "/assets/fonts/PlusJakartaSans-Bold.woff2" },
];

let _fontsLoaded = false;

async function loadFonts(baseUrl: string): Promise<void> {
  if (_fontsLoaded) return;
  await Promise.allSettled(FONT_DEFS.map(async ({ family, weight, style, path }) => {
    try {
      const face = new FontFace(family, `url(${baseUrl}${path})`, { weight, style });
      document.fonts.add(await face.load());
    } catch {
      // Ignore — system fallback used
    }
  }));
  await document.fonts.ready;
  _fontsLoaded = true;
}

// ── Component registry ───────────────────────────────────────────────────────
type Builder = (opts: Record<string, unknown>) => fabric.FabricObject;

// Wraps opts, injecting COMPACT_TOKENS if opts.tokens is the string "COMPACT_TOKENS"
function resolveTokens<T extends { tokens?: unknown }>(opts: T): T {
  if (opts.tokens === "COMPACT_TOKENS") {
    return { ...opts, tokens: COMPACT_TOKENS } as T;
  }
  // If tokens not provided at all, inject COMPACT_TOKENS as default
  if (opts.tokens === undefined) {
    return { ...opts, tokens: COMPACT_TOKENS } as T;
  }
  return opts;
}

const BUILDERS: Record<string, Builder> = {
  "make-brand-pill": (o) => makeBrandPill(resolveTokens(o as Parameters<typeof makeBrandPill>[0])),
  "make-outlined-pill": (o) => makeOutlinedPill(resolveTokens(o as Parameters<typeof makeOutlinedPill>[0])),
  "make-mixed-weight-text": (o) => makeMixedWeightText(resolveTokens(o as Parameters<typeof makeMixedWeightText>[0])),
  "make-dot-progress-indicator": (o) => makeDotProgressIndicator(resolveTokens(o as Parameters<typeof makeDotProgressIndicator>[0])),
};

function build(name: string, opts: Record<string, unknown>): fabric.FabricObject {
  const builder = BUILDERS[name];
  if (!builder) throw new Error(`Unknown component: ${name}. Available: ${Object.keys(BUILDERS).join(", ")}`);
  return builder(opts);
}

// ── Expose to window ─────────────────────────────────────────────────────────
interface ComponentTestAPI {
  loadFonts: (baseUrl: string) => Promise<void>;
  build: (name: string, opts: Record<string, unknown>) => fabric.FabricObject;
  fabric: typeof fabric;
  tokens: typeof COMPACT_TOKENS;
}

(window as Window & { ComponentTest?: ComponentTestAPI }).ComponentTest = {
  loadFonts,
  build,
  fabric,
  tokens: COMPACT_TOKENS,
};
