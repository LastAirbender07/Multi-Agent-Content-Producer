// shared/renderer/templates re-exports from frontend/utils/canvasTemplates/
// The canonical source of truth lives in frontend/ where Next.js/Turbopack can resolve it.
// The esbuild bundle (backend) resolves @/utils → frontend/utils, so this location is also correct for Playwright rendering.
export * from "../../../frontend/utils/canvasTemplates/index";
