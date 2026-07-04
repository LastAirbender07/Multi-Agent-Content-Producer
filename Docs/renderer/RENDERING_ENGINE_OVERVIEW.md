# Rendering Engine — Engineering Overview

> **For:** Onboarding engineers, technical interviews, architecture discussions
> **Status:** Complete — Phases 1–4 shipped + architectural review clean-up applied
> **Full decision record:** `Docs/content-strategy/RENDERING_ENGINE_ADR.md`

---

## The Problem

Every slide had two completely separate visual implementations that had to produce identical output:

- One in **Jinja2 + CSS** (used by the backend to export PNGs via Playwright)
- One in **Fabric.js TypeScript** (used by the frontend editor canvas)

These two implementations were written separately, maintained separately, and inevitably drifted apart. A dedicated GAN-style validation system existed solely to measure how far apart they were at any given time.

The deeper problem: **Jinja2 was a second layout engine** inside a system that already had a perfectly good layout engine in Fabric.js. Every new slide type, every visual tweak, every bug fix required two implementations.

---

## What Was Decided

The system should have exactly one rendering engine. Fabric.js template builders become the single source of truth for every slide's visual appearance. Playwright's only job is to open a browser, run the renderer, and take a screenshot. Jinja2 is deleted.

The full reasoning, option evaluation, and trade-offs are in the ADR. The short version: Playwright is not the problem — it is already the right tool for deterministic screenshot capture. The problem was that Jinja2 was competing with Fabric.js to define the same thing.

---

## What Was Built

### The rendering platform

A static HTML shell (`backend/renderer/slide_render.html`) loads Fabric.js and the renderer bundle. Playwright navigates to this shell, calls `window.Renderer.render(slideJson, options)`, and screenshots the canvas. The renderer bundle is built from the same Fabric.js template builders that power the editor — nothing duplicated, nothing diverged.

The public API surface is a single function:

```
window.Renderer.render(slide, { imageBaseUrl }) → Promise<void>
```

Playwright never knows about Fabric, the registry, fonts, or images. Those are all internal. Adding a new slide type is a single registry entry — no Playwright changes, no backend changes, no Jinja2 file.

### The shared renderer module

The template builders were moved from `frontend/utils/canvasTemplates/` to `shared/renderer/templates/`. This makes the renderer a platform-level artifact consumed by two equal peers — the editor and the export pipeline — rather than a piece of frontend code the backend happened to be reaching into.

The `shared/` directory sits at the repo root. Both the frontend (via tsconfig path alias) and the esbuild bundle (via alias configuration) resolve `@/renderer/templates/...` to the same physical location.

### The registry contract

The `REGISTRY` in `shared/renderer/templates/index.ts` maps template identifiers to builder functions. A template identifier is a string like `aurora-hook`, `lumina-stat`, `aurora-content-2`. Every slide in the pipeline carries a `canvas_template` field that contains this string. The renderer looks it up, finds the builder, and calls it.

`inferTemplate()` handles the fallback for slides that do not have a pre-assigned template — it derives the template from the slide's `type` and `_theme` fields. This means the pipeline can produce correct output even when the content generator does not explicitly assign a template.

---

## The Architecture in Plain Language

**Old architecture:**

```
Slide JSON → Jinja2 → HTML → Playwright → PNG
Slide JSON → Fabric.js → Canvas → Editor
```

Two independent systems. One team changed the CSS. The other forgot to change the TypeScript. Users see different output in the editor than what gets exported.

**New architecture:**

```
Slide JSON → REGISTRY → Fabric.js Builder → Canvas → Playwright → PNG
                                           ↕
                                        Editor
```

One system. The canvas IS the export. What you see in the editor is rendered by the same code path as the PNG you download.

---

## How to Explain This in an Interview

**"Why did you do this?"**
We had two layout engines maintaining the same visual output. That is a maintenance burden that compounds — every feature, every bug, every new slide type costs double. The system also had a validation pipeline dedicated to measuring the drift between the two engines, which is a signal that something structural is wrong.

**"What was the core insight?"**
Playwright doesn't need an HTML layout engine to take a screenshot — it just needs a browser and a canvas. Fabric.js already runs in a browser. So instead of having Playwright render Jinja2 HTML, we have Playwright visit a static shell, call our Fabric renderer, and screenshot the result. Playwright becomes a screenshot tool, not a rendering tool.

**"What were the risks?"**
The main risk was bundle configuration — the Fabric.js template code was written as Next.js TypeScript with `@/` path aliases. We had to make sure esbuild could resolve all those aliases without the Next.js runtime. The solution was a set of alias overrides in the build config and a minimal stub for the one import that required the Next.js API client. Once the bundle built cleanly, the architecture was proven.

**"How do you add a new slide type now?"**
One file, one registry entry. The builder function receives slide data, theme tokens, and image URLs. It returns an array of Fabric objects. That is the entire contract. The builder is immediately available to both the editor and the export pipeline.

**"What did you delete?"**
16 Jinja2 `.html.j2` template files and their CSS. ~150 lines of dead Python code (Jinja2 rendering functions, screenshot functions that called those rendering functions). The GAN drift validator that existed only to measure how wrong the two implementations were relative to each other.

---

## Current State of the Codebase

| Location                                           | What it is                                                                                         |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `frontend/utils/canvasTemplates/`                | Canonical slide builders — single source of truth (must stay here for Turbopack)                  |
| `shared/renderer/templates/`                     | Re-export stubs pointing to`frontend/utils/canvasTemplates/`                                     |
| `backend/renderer/slide_render.html`             | Static HTML shell loaded by Playwright                                                             |
| `backend/renderer/renderer_entry.ts`             | Bundle entry point — exposes`window.Renderer`, imports from `frontend/utils/canvasTemplates/` |
| `backend/renderer/renderer_contract.ts`          | TypeScript interface — the public API boundary                                                    |
| `backend/renderer/build.mjs`                     | esbuild config — bundles templates for browser use                                                |
| `backend/core/orchestrators/content/renderer.py` | Python side — Playwright orchestration, one browser per carousel                                  |

---

## Developer Setup

After cloning and running `cd frontend && pnpm install`:

```bash
# One-time: create the node_modules symlink so TypeScript can resolve fabric/chart.js
# when type-checking files in shared/
ln -sf frontend/node_modules shared/node_modules

# Build the renderer bundle (required after any template change)
node backend/renderer/build.mjs
```

**No symlink is needed for the frontend dev server.** The `frontend/utils/canvasTemplates/` directory is the canonical source of truth and is directly on the Next.js project root — no extra alias or config is needed.

The bundle does not auto-rebuild on file change. Run `build.mjs` after any change to `frontend/utils/canvasTemplates/` or `backend/renderer/renderer_entry.ts`.

---

## Architecture Note — Where the Canonical Files Live

The templates were initially moved to `shared/renderer/templates/` as part of Phase 3. This worked for the esbuild bundle (backend) and TypeScript type-checking, but **Next.js Turbopack cannot resolve tsconfig `paths` that point outside the project root** — it is a Turbopack security restriction that cannot be overridden with `resolveAlias`.

The resolution:

- **Canonical source:** `frontend/utils/canvasTemplates/` — unchanged, inside the Next.js project root, Turbopack resolves it natively
- **`shared/renderer/templates/`** — re-exports from `frontend/utils/canvasTemplates/`; exists so the `shared/` namespace is meaningful and the esbuild bundle can import via the `@/renderer` alias if needed
- **`backend/renderer/renderer_entry.ts`** — imports directly from `frontend/utils/canvasTemplates/`; the esbuild `@/utils` alias resolves `frontend/utils/` correctly

The ADR's "renderer as a platform-level artifact in `shared/`" goal is achieved conceptually — `shared/renderer/` is the public interface. The physical location of the implementation is in `frontend/` because that is the constraint Turbopack imposes.

---

## Further Reading

| Document | Purpose |
|----------|---------|
| `Docs/renderer/RENDERING_ENGINE_ADR.md` | Full decision record — problem, options evaluated, migration roadmap |
| `Docs/renderer/RENDERER_CODEBASE_GUIDE.md` | How to navigate and understand the renderer code — folder structure, dependencies, data flow |
| `Docs/renderer/ADDING_A_SLIDE_TYPE.md` | End-to-end guide for adding a new slide type — builder, registry, pipeline, LLM prompt |


- **`.next` cache must be cleared after tsconfig/next.config changes.** If you change `frontend/tsconfig.json` or `frontend/next.config.ts`, run `rm -rf frontend/.next` before restarting the dev server. A stale cache causes Turbopack to hang silently during compilation with no error output.
- **Next.js Turbopack cannot resolve tsconfig paths pointing outside the project root.** Symlinks and `resolveAlias` config both fail. The canonical template source must stay in `frontend/utils/canvasTemplates/`. See the Architecture Note above for context.
- The `shared/renderer/templates/` directory contains thin re-export stubs pointing back to `frontend/utils/canvasTemplates/`. If you add a new template builder, add it to `frontend/utils/canvasTemplates/` — the `shared/` stubs will pick it up via `export *`.
- The `shared/node_modules` symlink (→ `frontend/node_modules`) is a one-time setup step that is not automated. New contributors need to run `ln -sf frontend/node_modules shared/node_modules` after cloning (documented in README and `.gitignore`).
- The renderer bundle at `backend/renderer/renderer.bundle.js` does not auto-rebuild on file change. Any change to `frontend/utils/canvasTemplates/` or `backend/renderer/renderer_entry.ts` requires a manual `node backend/renderer/build.mjs` before the change is live in the export pipeline.
