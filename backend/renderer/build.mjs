/**
 * esbuild config for the renderer bundle.
 * Run from the project root: node backend/renderer/build.mjs
 *
 * Resolves @/ aliases that the frontend TypeScript uses, stubs out
 * Next.js-specific imports, and externalises Fabric.js (loaded separately
 * in the HTML shell so we don't double-bundle it).
 */

import esbuild from "esbuild";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");  // project root

await esbuild.build({
  entryPoints: [join(__dirname, "renderer_entry.ts")],
  bundle: true,
  platform: "browser",
  target: ["chrome110"],
  outfile: join(__dirname, "renderer.bundle.js"),
  alias: {
    // @/ → frontend/ root
    "@/utils":       join(ROOT, "frontend/utils"),
    "@/types":       join(ROOT, "frontend/types"),
    // @/renderer → shared/renderer/ (canonical renderer location post Phase 3)
    "@/renderer":    join(ROOT, "shared/renderer"),
    // Stub out Next.js-specific API modules
    "@/lib/api/client": join(__dirname, "client_stub.ts"),
    "@/lib/api":        join(__dirname, "api_stub.ts"),
    // chart.js lives in frontend node_modules (not backend)
    "chart.js": join(ROOT, "frontend/node_modules/chart.js"),
  },
  // Fabric is loaded as a UMD <script> in slide_render.html and exposed as
  // window.fabric. Tell esbuild to resolve `import * as fabric from "fabric"`
  // to a stub that re-exports from the window global.
  plugins: [{
    name: "fabric-window-global",
    setup(build) {
      build.onResolve({ filter: /^fabric$/ }, () => ({
        path: "fabric",
        namespace: "fabric-global",
      }));
      build.onLoad({ filter: /.*/, namespace: "fabric-global" }, () => ({
        contents: "module.exports = window.fabric",
        loader: "js",
      }));
    },
  }],
  define: {
    "process.env.NODE_ENV": '"production"',
    // NEXT_PUBLIC_API_BASE_URL is not referenced in the bundled templates — omitted intentionally.
  },
  logLevel: "info",
  minify: process.env.NODE_ENV === "production",  // minify in CI/prod; keep readable in dev
});
