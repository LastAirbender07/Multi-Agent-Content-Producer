# Rendering Engine Architecture — Complete Decision Record

> **Status:** Approved  
> **Created:** 2026-06-29  
> **Authors:** Architecture discussion between Claude (Anthropic) and ChatGPT (OpenAI), mediated by the project owner  
> **Location:** `Docs/content-strategy/RENDERING_ENGINE_ADR.md`

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [How the Discussion Evolved](#2-how-the-discussion-evolved)
3. [Options Evaluated](#3-options-evaluated)
4. [The Final Decision — Option D+](#4-the-final-decision--option-d)
5. [Architecture Review Points — What Was Agreed and What Was Deferred](#5-architecture-review-points)
6. [Final Architecture](#6-final-architecture)
7. [The Canonical Boundary](#7-the-canonical-boundary)
8. [Proof-of-Concept Specification](#8-proof-of-concept-specification)
9. [Migration Roadmap](#9-migration-roadmap)
10. [What Is Deferred and Why](#10-what-is-deferred-and-why)

---

## 1. The Problem

### What exists today

Every slide type in this system has **two independent visual rendering implementations** that must produce identical output:

| Implementation | Files | Technology |
|---|---|---|
| Backend export | `backend/core/templates/carousel/aurora/*.html.j2` | Jinja2 + CSS |
| Frontend editor | `frontend/utils/canvasTemplates/aurora_*.ts` | Fabric.js TypeScript |

**Example — the content slide type:**
- `backend/core/templates/carousel/aurora/content.html.j2` — 200+ lines of HTML/CSS
- `frontend/utils/canvasTemplates/aurora_content.ts` + `contentLayouts/imgRight.ts`, `textTop.ts`, etc. — 300+ lines of TypeScript

These two implementations must produce visually identical output. They never will, permanently.

### What this costs

| Cost | Evidence in codebase |
|---|---|
| Every visual change must be implemented twice | Every font-size or spacing change touches both systems |
| Every new slide type requires two implementations | Multi-format expansion plan (10 new types) = 20 implementations |
| Drift is inevitable and ongoing | GAN validation system (`scripts/gan_iterate.js`) exists specifically to detect and measure drift |
| New engineers must understand both systems | No single place to look for "how does this slide look?" |

### The root cause

**Playwright is not the problem.** Playwright is used correctly as a screenshot tool.

**The problem is that Jinja2 + CSS is a second layout engine.** The current pipeline is:

```
Slide JSON → Jinja2 → HTML + CSS → Playwright → PNG
Slide JSON → Fabric.js TypeScript → Canvas → Editor
```

Two rendering engines. They must be kept in sync forever.

---

## 2. How the Discussion Evolved

### Initial framing (project owner)
"We're being monotonous. We need multiple post formats. But adding new templates means implementing them twice. This can't continue."

### Phase 1 — Problem diagnosis
Claude audited the codebase and confirmed: the issue is structural, not a bug. Two rendering systems with a GAN validator managing their drift is an ongoing tax.

Three options were identified:
- **Option A:** Keep both (unsustainable)
- **Option B:** Fabric.js-only, export PNG from canvas directly (server-side Fabric problem)
- **Option C:** Jinja2 as thin scaffold, Fabric.js as the single visual source of truth, Playwright screenshots the canvas

### Phase 2 — ChatGPT's refinement (Option D)
ChatGPT refined Option C into "Option D: Single Shared Renderer" and introduced the React analogy: a rendering platform with multiple runtimes. Core insight:

> *"Playwright becomes a deterministic rendering runtime rather than another layout engine."*

Key proposal: a static HTML shell loads the shared renderer bundle, Playwright screenshots the canvas. Jinja2 eliminated entirely.

### Phase 3 — Claude's codebase-grounded validation
Claude reviewed Option D against the actual code and found:

**What is correct and will work:**
- The static HTML shell approach — the existing `render_server.py` already serves static files over HTTP for Playwright
- The Playwright synchronisation — already using `document.fonts.ready` + `wait_for_timeout`
- Font consistency — both editor and Playwright run in Chromium, fonts are identical
- `window.Renderer.render(slide)` as the API contract — cleaner than polling flags

**What requires non-trivial work (not blockers, but costs):**
- Bundling: template builders use `@/` Next.js path aliases, `document.body.appendChild()` for Chart.js, and `ASSET_BASE` (localhost:8000). Resolving these for a browser-loadable bundle requires esbuild/Vite configuration.
- Font URL context: `loadCanvasFonts()` fetches from `ASSET_BASE` — works in Playwright context since the FastAPI backend is running, but must be explicitly handled.

**The hidden gem Claude identified:**

The `canvas_template` field already exists in every `slides.json` entry:
```json
"canvas_template": "aurora-content-2"
```

And the REGISTRY in `canvasTemplates/index.ts` already maps these IDs to builder functions. The routing contract already exists. The migration is: bundle the REGISTRY and builders, serve them to Playwright, call `window.Renderer.render(slideJson)`. The infrastructure is already there.

### Phase 4 — ChatGPT's Scene Graph proposal and its resolution
ChatGPT proposed introducing a formal Scene abstraction:

```
Slide JSON → Renderer → Scene Graph → Fabric Runtime
```

This would decouple the renderer from Fabric entirely, enabling future runtimes (SVG, PDF, native).

**Claude's response:** The proposal is architecturally ideal for building from scratch. For this project, Fabric Objects are already a scene graph. Adding `MyScene → FabricScene → Canvas` introduces a translation layer with zero current business value. Defer until a second runtime actually exists.

**ChatGPT's concession:** Fully agreed. "Claude is correct. You're not building Canva." Scene abstraction deferred.

### Phase 5 — Final convergence

Both architectures agreed on:
1. Single rendering engine (Fabric.js template builders are the canonical visual implementation)
2. Playwright as a screenshot runtime only
3. `window.Renderer.render(slide)` as the public API contract
4. `canvas_template` → REGISTRY → Builder as the existing routing mechanism
5. Prove before migrating (aurora-hook POC first)
6. Scene Graph deferred until a second runtime exists

The only open discussion was time horizon: Claude was optimising for the next 2 weeks (delivery), ChatGPT for 5 years (platform). Both framings are valid. The resolution: execute in phases, stop at "Delete Jinja + Move to shared/" and ship. Add Scene abstraction only when a second runtime is needed.

---

## 3. Options Evaluated

### Option A — Keep both (rejected)
Unsustainable for the multi-format expansion plan. 10 new slide types × 2 implementations = 20 implementations, plus permanent GAN drift management. Rejected.

### Option B — Fabric.js-only, client-side PNG export (rejected)
`canvas.toDataURL()` for PNG export is client-side only. Server-side batch generation (rendering all slides when a pipeline run completes) requires `node-canvas` which has known font rendering differences from Chrome. Rejected.

### Option C — Jinja2 as scaffold + Fabric canvas in Playwright (evolved into D)
Correct direction but still mentioned "Jinja2 generates HTML per slide." ChatGPT refined this to eliminate Jinja2 entirely.

### Option D — Static HTML shell + shared renderer bundle + Playwright (approved, refined into D+)
One static HTML shell. Renderer bundle built from existing Fabric template builders. Playwright loads shell, injects slide JSON, calls `window.Renderer.render()`, screenshots canvas.

### Option D+ — Rendering Platform Architecture (final approved form)
Same as D but with a philosophy shift: don't think of this as "sharing Fabric templates." Think of it as **building a rendering platform with multiple runtimes**. Exactly like React doesn't care whether it renders to DOM, Native, or Server — the renderer doesn't care whether it's consumed by the editor or Playwright.

---

## 4. The Final Decision — Option D+

**The system will have exactly one rendering engine.**

Fabric.js template builders (`frontend/utils/canvasTemplates/`) become the canonical visual implementation. Every slide's visual appearance is defined exactly once, in these builders.

Playwright stops being a layout engine. It becomes a deterministic browser runtime whose only job is to execute the renderer and capture the output.

The backend will never contain presentation or layout logic. Jinja2 templates are deleted.

---

## 5. Architecture Review Points

### Agreed — implement now

| Point | Agreement |
|---|---|
| One rendering engine, Playwright as screenshot runtime | ✅ Both |
| `canvas_template` → REGISTRY → Builder as the routing mechanism | ✅ Both |
| `window.Renderer.render(slide)` as the public API boundary | ✅ Both |
| Static HTML shell for Playwright | ✅ Both |
| Prove with aurora-hook before migrating everything | ✅ Both |
| Pixel tolerance (not binary equality) as success criterion | ✅ Both |
| Bundling with esbuild/Vite is the main engineering cost | ✅ Both |
| "Don't pay for abstraction until you've earned it" | ✅ Both |

### Agreed — defer

| Point | Reason for deferral |
|---|---|
| Scene Graph (`Slide JSON → Scene → Fabric Runtime`) | No second runtime exists yet. Fabric Objects already ARE a scene graph. Add when SVG/PDF runtime is needed. |
| `shared/` directory at repo root | Mechanical refactor of import paths. Do after migration is proven. |
| Additional export targets (LinkedIn, PDF, SVG) | Each needs different layout rules, not just different canvas size. Future problem. |

### Important constraints identified by Claude

| Constraint | Impact |
|---|---|
| `@/` Next.js path aliases in template builders | Must be resolved in esbuild config before bundle can run in Playwright |
| `ASSET_BASE` (localhost:8000) in `canvasFonts.ts` | Font URL must resolve correctly in Playwright context — works since FastAPI is running, but must be explicit |
| `document.body.appendChild()` in `chartImageRenderer.ts` | Requires `document.body` to exist in the HTML shell — it will, Chromium provides full DOM |
| `document.createElement("canvas")` in `backgrounds.ts` | Same — requires DOM, works in Chromium shell |

None of these are blockers. All are well-understood DOM APIs that work in any Chromium page, including Playwright-loaded pages.

---

## 6. Final Architecture

### Rendering pipeline (current → target)

**Current:**
```
Slide JSON
    ↓
Jinja2 template
    ↓
HTML + CSS
    ↓
Playwright
    ↓
PNG
```

**Target:**
```
Slide JSON
    ↓
canvas_template field
    ↓
Renderer Registry (REGISTRY in canvasTemplates/index.ts)
    ↓
Fabric Builder (aurora_content.ts, aurora_hook.ts, etc.)
    ↓
Fabric Canvas (1080×1080)
    ↓
Chromium (Playwright)
    ↓
1080×1080 PNG
```

### Responsibility boundaries

| Component | Responsible for | NOT responsible for |
|---|---|---|
| **Renderer** | Layout, typography, spacing, colours, gradients, chart placement, image placement | AI, research, workflow |
| **Playwright** | Loading HTML shell, executing renderer, waiting for completion, taking screenshot | Layout decisions |
| **Backend pipeline** | Research, AI, workflow, slide JSON generation | Visual layout |
| **Frontend editor** | Editing, interactions, drag/drop, undo, property panels | Layout calculations |

### The `window.Renderer` contract

```typescript
interface SlideRenderer {
  render(slideJson: SlideData, options: RenderOptions): Promise<void>;
}

interface RenderOptions {
  imageBaseUrl: string;  // e.g. "http://localhost:8000"
  theme?: "aurora" | "lumina";
}

// Playwright usage (permanent — never changes regardless of new slide types)
await page.evaluate(async (args) => {
  await window.Renderer.render(args.slide, args.options);
}, { slide: slideJson, options: { imageBaseUrl: "http://localhost:8000" } });
await page.screenshot({ path: outputPath });
```

Playwright never knows about Fabric, the Registry, fonts, or images. Those are renderer internals.

---

## 7. The Canonical Boundary

**This principle goes into the project README:**

> There must exist exactly one implementation of every visual layout in the entire repository. That implementation lives in `frontend/utils/canvasTemplates/` (later: `shared/renderer/templates/`). Everything else — the Next.js editor, the Playwright export pipeline, and any future runtime — is a consumer of that renderer. A slide type is implemented once and is immediately available to every consumer.
>
> If visual layout logic exists outside the renderer (Jinja2 templates, inline CSS, Python code that positions elements), that is a bug in the architecture.

**The registry is the plugin system:**

```typescript
// Adding a new slide type becomes one registration:
REGISTRY["aurora-timeline"] = buildAuroraTimeline;

// No backend changes.
// No Playwright changes.
// No editor changes.
// No Jinja2 file.
// One implementation. Available everywhere.
```

---

## 8. Proof-of-Concept Specification

### Goal
Prove that the architecture works before committing to full migration.

### Chosen slide type
`aurora-hook` — selected because:
- Simplest builder (no chart, no image layout variants)
- Fewest DOM dependencies
- Lowest risk for the first proof

### What to build

**Step 1: Static HTML shell (`backend/renderer/slide_render.html`)**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>body { margin: 0; padding: 0; background: #000; }</style>
</head>
<body>
  <canvas id="slide"></canvas>
  <script src="renderer.bundle.js"></script>
  <script>
    window.__renderReady = false;
    window.Renderer.render(window.__slideData, window.__renderOptions)
      .then(() => { window.__renderReady = true; })
      .catch(err => { window.__renderError = err.message; });
  </script>
</body>
</html>
```

**Step 2: Build the renderer bundle**

```bash
# esbuild command (to be refined during POC)
npx esbuild frontend/utils/canvasTemplates/index.ts \
  --bundle \
  --platform=browser \
  --outfile=backend/renderer/renderer.bundle.js \
  --alias:@/utils=./frontend/utils \
  --alias:@/lib/api/client=./backend/renderer/api_client_stub.ts \
  --external:fabric
```

Note: Fabric.js should be loaded as a separate `<script>` in the HTML shell (from CDN or local file) rather than bundled — it's large and already a browser library.

**Step 3: Playwright calls the renderer**

```python
# In carousel_generator.py — replace current Jinja2 path for aurora-hook
async with serve_directory(_BACKEND_ROOT) as base_url:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page(viewport={"width": 1080, "height": 1080})
        
        # Load the static shell
        await page.goto(f"{base_url}/backend/renderer/slide_render.html")
        
        # Inject slide data
        await page.evaluate("""
            (args) => {
                window.__slideData = args.slide;
                window.__renderOptions = args.options;
            }
        """, {"slide": slide_data, "options": {"imageBaseUrl": base_url}})
        
        # Trigger render and wait
        await page.evaluate("""
            async () => {
                await window.Renderer.render(window.__slideData, window.__renderOptions);
            }
        """)
        
        # Screenshot
        await page.screenshot(path=output_path)
```

### Success criterion

The POC succeeds when, given:
- Identical `slide.json` data
- Identical font files
- Identical image assets
- Same Chromium version

The current pipeline PNG and the new renderer PNG are **visually equivalent within an acceptable pixel tolerance**.

**Measuring tolerance:** Use `pixelmatch` (already used in `scripts/gan_iterate.js`):
- < 2% pixel difference: ✅ Pass — proceed with full migration
- 2–5% pixel difference: ⚠️ Investigate — may be antialiasing or font hinting
- > 5% pixel difference: ❌ Fail — renderer has a layout bug to fix

**What "visual equivalence" means for this project:** A human reviewer should not be able to identify which PNG came from which pipeline when shown both side-by-side.

### POC is complete when
1. `aurora-hook` renders through the new path
2. Visual comparison passes the tolerance threshold
3. Playwright execution time is not significantly worse than current (< 20% slower per slide)

### POC explicitly does NOT include
- Moving files to `shared/`
- Changing any import paths
- Migrating other slide types
- Deleting any Jinja2 files
- Modifying the frontend editor

---

## 9. Migration Roadmap

### Phase 1 — Proof of Concept (3 days)
- [ ] Write `backend/renderer/slide_render.html` (static shell)
- [ ] Configure esbuild to bundle template builders
- [ ] Handle `@/` alias resolution and `ASSET_BASE` in bundle
- [ ] Implement `window.Renderer.render()` entry point
- [ ] Wire Playwright to call renderer instead of loading Jinja2 HTML (aurora-hook only)
- [ ] Run visual comparison: new PNG vs current Jinja2 PNG
- [ ] **Gate:** Pass visual tolerance check before proceeding

### Phase 2 — Migrate remaining slide types (3–5 days)
- [ ] aurora-content (4 layout variants) + aurora-stat + aurora-quote + aurora-cta + aurora-engage
- [ ] lumina variants (same builders, different tokens — thin wrappers, low effort)
- [ ] Visual comparison for each type
- [ ] Delete all Jinja2 `.html.j2` files
- [ ] Delete `render_server.py` if no longer needed, or simplify
- [ ] **Gate:** All 6 aurora types + 6 lumina types pass visual comparison

### Phase 3 — Move renderer to shared/ (2 days)
- [ ] Create `shared/renderer/` directory at repo root
- [ ] Move `frontend/utils/canvasTemplates/` to `shared/renderer/templates/`
- [ ] Update all frontend import paths (`@/utils/canvasTemplates/` → `shared/renderer/templates/`)
- [ ] Update esbuild config to point at new location
- [ ] Verify frontend editor still works (imports resolve)
- [ ] Verify Playwright bundle still builds

### Phase 4 — Renderer API (1 day)
- [ ] Formalise `window.Renderer` interface in TypeScript
- [ ] Add `loadFonts()`, `preloadAssets()` as explicit methods
- [ ] Document the contract — Playwright and editor are consumers, never see Fabric internals
- [ ] Write the canonical boundary rule into README

### Phase 5 — Stop and ship

**Do not proceed further** until a genuine second rendering runtime (SVG, PDF, LinkedIn format) is required. When that requirement appears, introduce the Scene abstraction at that point. Not before.

---

## 10. What Is Deferred and Why

### Scene Graph abstraction

**Deferred until:** A second rendering runtime (SVG, PDF, native app) actually exists and must be supported.

**Why not now:** Fabric Objects already are a scene graph. Introducing `MyScene → FabricScene → Canvas` adds a translation layer with zero current business value. The abstraction is only justified when there are two consumers with genuinely different rendering requirements. "We might need PDF someday" is not sufficient justification.

**What the trigger looks like:** When you write `renderer.exportSVG()` and need the same data to produce both a Fabric canvas and an SVG, that is when the Scene abstraction earns its existence.

### `shared/` directory

**Deferred to Phase 3:** Moving files is a mechanical refactor. It doesn't affect whether the architecture works. Do it after Phase 2 proves the migration, not before.

### Additional export targets (LinkedIn, Twitter, PDF)

**Deferred:** Each target needs different layout rules, aspect ratios, and font sizing — not just a different canvas size. These are future design problems, not solved by this migration.

---

## Appendix A — Key Technical Dependencies

| Dependency | Role | Location | Risk |
|---|---|---|---|
| Fabric.js 7.4.0 | Canvas rendering engine | frontend/node_modules | Load as separate `<script>` in shell, not bundled |
| `canvasFonts.ts` | Font loading via FontFace API | `frontend/utils/canvasFonts.ts` | `ASSET_BASE` must resolve to FastAPI server |
| `chartImageRenderer.ts` | Chart.js → PNG via offscreen canvas | `canvasTemplates/chartGroupBuilders/` | Uses `document.body.appendChild()` — works in Chromium shell |
| `backgrounds.ts` | Image blur via Canvas 2D | `canvasTemplates/shared/` | Uses `document.createElement("canvas")` — works in Chromium shell |
| `ASSET_BASE` | API base URL | `lib/api/client.ts` | Must be replaced with `imageBaseUrl` option in render context |
| `canvas_template` field | Template routing key | `slides.json` per slide | Already exists — no changes needed |
| `REGISTRY` | Builder lookup table | `canvasTemplates/index.ts` | Already exists — is the renderer contract |

---

## Appendix B — What the GAN Validator Becomes

The GAN validation system (`scripts/gan_iterate.js`, `scripts/gan_multi.js`) was built to detect and measure drift between the two rendering engines. After Phase 2, drift is structurally impossible — there is only one engine.

The GAN validator does not become useless. It becomes an optional **quality assurance tool** rather than a structural necessity:
- Use it to validate the Phase 1 POC (compare new renderer PNG vs old Jinja2 PNG)
- Use it to validate Phase 2 migrations (each slide type)
- After migration is complete, retain it as a regression tool for new slide type additions

---

*This document represents the consensus of a multi-session architecture review. It is the authoritative decision record for the rendering engine consolidation.*
