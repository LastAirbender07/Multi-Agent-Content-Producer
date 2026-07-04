# Renderer Codebase Guide

> **For:** Developers who need to understand, modify, or debug the rendering engine  
> **Start here if:** You're new to the codebase and want to understand how a slide becomes a PNG

---

## Where to Start

Open these four files in this order. You'll understand the whole system after reading them.

1. `frontend/utils/canvasTemplates/index.ts` — the REGISTRY and `inferTemplate()`
2. `frontend/utils/canvasTemplates/aurora_hook.ts` — the simplest builder (no chart, no layout variants)
3. `backend/renderer/renderer_entry.ts` — the browser-side entry point (`window.Renderer`)
4. `backend/core/orchestrators/content/renderer.py` — the Python side (Playwright orchestration)

---

## Folder Map

```
project root
├── frontend/
│   ├── utils/
│   │   ├── canvasTemplates/          ← THE RENDERER (canonical source)
│   │   │   ├── index.ts              ← REGISTRY + inferTemplate()
│   │   │   ├── aurora_hook.ts        ← hook slide builder
│   │   │   ├── aurora_content.ts     ← content slide dispatcher (4 layouts)
│   │   │   ├── aurora_stat.ts        ← stat + chart builder
│   │   │   ├── aurora_quote.ts       ← quote + key insights builder
│   │   │   ├── aurora_engage.ts      ← engage/follow slide builder
│   │   │   ├── aurora_cta.ts         ← CTA slide builder
│   │   │   ├── chartRenderer.ts      ← Chart.js → Fabric bridge
│   │   │   ├── shared/               ← shared component library (see below)
│   │   │   └── contentLayouts/       ← content layout variants (see below)
│   │   ├── canvasTokens.ts           ← AURORA / LUMINA theme tokens
│   │   └── canvasFonts.ts            ← font loading (FontFace API)
│   └── constants/
│       └── slideTemplates.ts         ← editor UI metadata derived from REGISTRY
│
├── shared/
│   └── renderer/
│       └── templates/
│           └── index.ts              ← re-exports from frontend/utils/canvasTemplates/
│
└── backend/
    ├── renderer/
    │   ├── renderer_entry.ts         ← bundle entry, exposes window.Renderer
    │   ├── renderer_contract.ts      ← TypeScript interface (public API)
    │   ├── build.mjs                 ← esbuild config
    │   ├── slide_render.html         ← static HTML shell loaded by Playwright
    │   ├── renderer.bundle.js        ← compiled bundle (gitignored, regenerated)
    │   └── fabric.min.js             ← Fabric.js UMD build (gitignored)
    └── core/orchestrators/content/
        ├── renderer.py               ← Playwright orchestration (Python)
        ├── carousel_generator.py     ← canvas_template assignment, pipeline node
        └── render_server.py          ← aiohttp static file server
```

---

## The shared/ Component Library

`frontend/utils/canvasTemplates/shared/` is the building blocks layer. Every builder file imports from here — it is the shared vocabulary of the renderer.

| File | What it exports |
|------|----------------|
| `text.ts` | `makeText()`, `makeTitleText()` — typed Fabric Textbox factories with role metadata |
| `brand.ts` | `createBrandBar()` — logo + brand name + progress indicator at the bottom |
| `overlays.ts` | `createOverlay()`, `createGradientBg()`, `createGlowBg()`, `createLuminaBg()` — backgrounds |
| `components.ts` | `createGlassCard()`, `createBulletItem()`, `measureBulletHeight()`, `createInsightItem()` |
| `buttons.ts` | `createPillButton()`, `createEyebrowPill()` — all 6 pill button styles |
| `backgrounds.ts` | `createBgImage()`, `loadCoverImage()`, `createBlurredRegion()` — image loading |
| `types.ts` | `setData()`, `FabricFill`, `GlowDef`, `TemplateBuilder` — shared types |
| `index.ts` | Barrel re-export — import everything from `"./shared"` |
| `pillButtons/styleBuilders.ts` | Low-level pill style implementations (gradient, ghost, frosted-glow, etc.) |

**Rule:** If you find yourself writing raw `new fabric.Rect(...)` for something structural (a card, a divider, a button), check whether a shared component already exists.

---

## The contentLayouts/ Variants

Content slides have four image placement variants. Each is a thin function that calls `buildSideBySideLayout` or builds its own layout.

| File | Layout | Description |
|------|--------|-------------|
| `imgRight.ts` | layout-0 | Text left 57%, image right 43% |
| `imgLeft.ts` | layout-3 | Image left 43%, text right 57% |
| `imgTop.ts` | layout-2 | Image fills top, text below |
| `textTop.ts` | layout-1 | Text fills top, image below |
| `textOnly.ts` | layout-(-1) | No image, full-width text |
| `sideBySide.ts` | shared | Shared implementation for imgRight + imgLeft |
| `panelImage.ts` | utility | Loads and clips an image into a panel rect |

`aurora_content.ts` reads `canvas_template` to pick the right layout and delegates to the matching layout function.

---

## The Theme Token System

**File:** `frontend/utils/canvasTokens.ts`

Every builder receives a `CanvasTokens` object (`t`). It is the single source of all visual values — colours, fonts, sizes.

```typescript
// Aurora (dark theme):
t.bg        = "#090909"      // canvas background
t.surface   = "#131313"      // card/bar fill
t.primary   = "#7C6EFA"      // violet accent
t.secondary = "#2DD4BF"      // teal accent
t.text      = "#FAFAFA"      // headings
t.muted     = "rgba(250,250,250,0.78)"  // body text
t.fontTitle = "Syne"
t.fontBody  = "Plus Jakarta Sans"

// Lumina (light theme):
t.bg        = "#FAFAF8"
t.primary   = "#1E40AF"      // indigo
t.secondary = "#0D9488"      // teal
t.text      = "#111827"
t.muted     = "#6B7280"
```

`isDarkTheme(t)` is the canonical check for branching between dark/light behaviour. Never hard-code colour strings inside builders — always use `t.primary`, `t.secondary`, etc.

The `lw()` wrapper in `index.ts` provides Lumina variants for free: it calls the aurora builder but substitutes the `LUMINA` token set. No separate builder needed.

---

## Data Flow: Slide JSON → PNG

```
1. Pipeline run produces slides.json
         ↓ (each slide dict has type, title, body, bullets, canvas_template, _theme...)
2. carousel_generator.py
   - reads slides_raw from state
   - calls _canvas_template_id() to compute canvas_template string
   - injects _theme from emotional_hook
   - creates SlideRenderTask(slide_data, image_url, output_path, brand_name)
         ↓
3. renderer.py
   - starts aiohttp static server (serves backend/ as root)
   - launches Playwright browser (headless, deviceScaleFactor=2)
   - navigates to /renderer/slide_render.html (one-time load)
   - for each task: calls page.evaluate() → window.Renderer.render(slideJson, options)
   - screenshots → resize to 1080×1080 via Pillow → saves PNG
         ↓ (inside the browser, via the bundle)
4. renderer_entry.ts  (window.Renderer.render)
   - loads fonts via FontFace API (once, cached)
   - calls inferTemplate(slide) → looks up REGISTRY[templateId]
   - calls getTokens(templateId) → resolves AURORA or LUMINA token set
   - applies slide_overrides (per-slide CSS variable overrides from editor)
   - creates fabric.Canvas on #slide element
   - calls builder(slide, imageUrl, tokens, meta) → [FabricObject, ...]
   - adds objects to canvas, calls renderAll()
         ↓
5. Builder (e.g. buildAuroraHook)
   - creates background layer
   - creates foreground objects using shared component library
   - returns FabricObject[]
         ↓
6. Playwright screenshots the canvas element → PNG
```

---

## How the Editor Uses the Same Code

The editor (Next.js, `frontend/`) uses the same REGISTRY and builders, but via a different entry path:

```
Editor action (e.g. switch slide, apply template)
         ↓
FabricCanvas.tsx → canvasSlideLoader.ts
         ↓
buildSlideCanvas(slide, imageUrl, meta)   ← from index.ts
         ↓
REGISTRY[canvas_template] → builder → FabricObject[]
         ↓
Canvas renders in the browser directly (no Playwright, no PNG)
```

The key difference: in the editor, fonts are loaded by `canvasFonts.ts` (which reads `ASSET_BASE` from the API client). In the renderer bundle, fonts are loaded inline in `renderer_entry.ts` using `options.imageBaseUrl`. This is why `renderer_entry.ts` does not call `buildSlideCanvas()` — it would trigger the wrong font loading path.

---

## Key Dependencies and Where They Connect

```
┌─────────────────────────────────────────────────────────────────────┐
│  frontend/utils/canvasTemplates/   (builders)                       │
│                                                                      │
│  depends on:                                                         │
│   - fabric (canvas rendering) ← frontend/node_modules               │
│   - @/utils/canvasTokens      ← token system (AURORA, LUMINA)       │
│   - @/utils/canvasFonts       ← font loading (editor path only)     │
│   - @/lib/api                 ← SlideData type                      │
│   - @/types/chart             ← ChartType, ChartData                │
│   - chart.js                  ← Chart.js (via chartRenderer.ts)     │
└─────────────────────────────────────────────────────────────────────┘
          ↑ imported by
┌─────────────────────────────────────────────────────────────────────┐
│  backend/renderer/renderer_entry.ts  (bundle entry)                 │
│                                                                      │
│  resolves via esbuild aliases:                                       │
│   @/utils   → frontend/utils/                                       │
│   @/lib/api → backend/renderer/api_stub.ts  (empty stub)            │
│   @/types   → frontend/types/                                       │
│   fabric    → window.fabric  (loaded as UMD script in HTML shell)   │
│   chart.js  → frontend/node_modules/chart.js                        │
└─────────────────────────────────────────────────────────────────────┘
          ↑ page.evaluate() calls window.Renderer.render()
┌─────────────────────────────────────────────────────────────────────┐
│  backend/core/orchestrators/content/renderer.py  (Playwright)       │
│                                                                      │
│  depends on:                                                         │
│   - playwright (browser automation)                                  │
│   - aiohttp (static file server via render_server.py)               │
│   - PIL/Pillow (PNG resize after 2x screenshot)                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The Two-Pass Layout Pattern

Every builder that contains text uses the same pattern. Never guess text heights:

```typescript
// PASS 1 — create objects with placeholder position (top: 0)
const titleObj = makeTitleText(slide.title, { ..., top: 0 });
const bodyObj  = makeText(slide.body, { ..., top: 0 });

// MEASURE — call calcTextHeight() now that objects exist
const titleH = titleObj.calcTextHeight() + 24;   // + gap
const bodyH  = bodyObj.calcTextHeight() + 16;

// PASS 2 — position using measured heights
let curY = topPadding;
titleObj.set({ top: curY });  objects.push(titleObj);  curY += titleH;
bodyObj.set({ top: curY });   objects.push(bodyObj);   curY += bodyH;
```

This is necessary because Fabric.js computes text layout lazily — the height is only accurate after the Textbox object exists and has been given its `width` constraint.

---

## Common Debugging Patterns

**Builder produces wrong layout:** Add `console.log` inside the builder. In the validation script context the browser console is captured — check the `jsErrors` array in the output.

**Fonts not loading / fallback font rendering:** The font loading in `renderer_entry.ts` happens once per browser session. If you see system fonts, the `imageBaseUrl` passed to `render()` is wrong or the font files don't exist at `{imageBaseUrl}/assets/fonts/`.

**"REGISTRY['aurora-x'] is undefined":** The bundle is stale. Run `node backend/renderer/build.mjs`.

**Slide renders correctly in editor but not in PNG:** The editor and the bundle use different font loading paths. Check that `canvasFonts.ts` and the inline FONT_DEFS in `renderer_entry.ts` reference the same font family names and weights.

**Text overflows canvas:** The builder is not using `calcTextHeight()` — it is estimating heights with `lineHeight * fontSize`. Find the estimate, replace it with the two-pass pattern.
