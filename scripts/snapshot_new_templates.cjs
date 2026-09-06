/**
 * snapshot_new_templates.cjs
 * ──────────────────────────
 * Renders Phase 2.5 new templates via the standalone renderer bundle
 * (no backend / no real run IDs needed) and saves PNGs for visual inspection.
 *
 * Usage (from project root):
 *   node scripts/snapshot_new_templates.cjs
 *
 * Output: scripts/playwright_shots/phase2.5/<template-key>.png
 */

const path = require("path");
const fs   = require("fs");

const FRONTEND = path.resolve(__dirname, "../frontend");
const { chromium } = require(path.join(FRONTEND, "node_modules/@playwright/test"));

const RENDERER_HTML = path.resolve(__dirname, "../backend/renderer/slide_render.html");
const FONT_BASE     = "http://localhost:8000";   // backend serves /assets/fonts/
const OUT_DIR       = path.resolve(__dirname, "playwright_shots/phase2.5");

fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Templates to snapshot ─────────────────────────────────────────────────────
// Add new template keys here as they are built.
const SNAPSHOTS = [
  {
    key: "aurora-compact-clean-cta",
    slide: {
      canvas_template: "aurora-compact-clean-cta",
      type: "cta",
      _theme: "aurora",
      title: "Follow for more",
      body: "@yourbrand  ·  Every Sunday",
      compact_meta: {
        pill_text: "FOLLOW FOR MORE",
        brand_wordmark: "@yourbrand",
        dot_count: 8,
        dot_active: 7,
      },
    },
  },
  {
    key: "aurora-compact-clean-quote",
    slide: {
      canvas_template: "aurora-compact-clean-quote",
      type: "quote",
      _theme: "aurora",
      title: "The secret of getting ahead is getting started.",
      body: "— Mark Twain",
      compact_meta: { brand_wordmark: "@yourbrand" },
    },
  },
  {
    key: "aurora-compact-clean-engage",
    slide: {
      canvas_template: "aurora-compact-clean-engage",
      type: "engage",
      _theme: "aurora",
      title: "Save this.",
      body: "If this helped you, send it to someone who needs it.",
      compact_meta: { pill_text: "SAVE + SHARE", brand_wordmark: "@yourbrand" },
    },
  },
  {
    key: "aurora-editorial-hook",
    slide: {
      canvas_template: "aurora-editorial-hook",
      type: "hook",
      _theme: "aurora",
      title: "The one idea that changed how I think about everything.",
      body: "A deep-dive into the framework behind it.",
      compact_meta: {
        handle:       "@yourbrand",
        series_title: "The Thinking Series.",
        chapter:      "01",
      },
    },
  },
  {
    key: "aurora-editorial-cta",
    slide: {
      canvas_template: "aurora-editorial-cta",
      type: "cta",
      _theme: "aurora",
      title: "Follow along.\nMore every week.",
      body: "Follow @yourbrand",
      compact_meta: {
        handle:       "@yourbrand",
        series_title: "The Thinking Series.",
      },
    },
  },
  {
    key: "aurora-nextwork-dark-cta",
    slide: {
      canvas_template: "aurora-nextwork-dark-cta",
      type: "cta",
      _theme: "aurora",
      title: "Follow for more.",
      body: "@yourbrand  ·  Every Sunday",
      compact_meta: {
        pill_text:      "FOLLOW FOR MORE",
        brand_wordmark: "@yourbrand",
      },
    },
  },
  {
    key: "aurora-nextwork-dark-engage",
    slide: {
      canvas_template: "aurora-nextwork-dark-engage",
      type: "engage",
      _theme: "aurora",
      title: "Save this.",
      body: "If this helped you, send it to someone who needs it.",
      compact_meta: {
        pill_text:      "SAVE THIS",
        brand_wordmark: "@yourbrand",
      },
    },
  },
];

// ── Renderer call  ─────────────────────────────────────────────────────────────
async function renderSlide(page, slideJson) {
  const fileUrl = `file://${RENDERER_HTML}`;
  await page.goto(fileUrl, { waitUntil: "networkidle" });

  // Wait for window.Renderer to be available
  await page.waitForFunction(() => typeof window.Renderer !== "undefined", { timeout: 10000 });

  const result = await page.evaluate(
    async ({ json, fontBase }) => {
      const canvas = document.getElementById("slide");
      try {
        await window.Renderer.render(json, {
          canvas,
          imageBaseUrl: fontBase,
          logoUrl: "",
          slideNum: 1,
          totalSlides: 8,
          brandName: "YourBrand",
        });
        return { ok: true, dataUrl: canvas.toDataURL("image/png") };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
    { json: slideJson, fontBase: FONT_BASE }
  );

  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1080 });

  page.on("pageerror", e => console.error("  [page-error]", e.message));
  page.on("console",   m => { if (m.type() === "error") console.error("  [console-error]", m.text()); });

  let passed = 0; let failed = 0;

  for (const { key, slide } of SNAPSHOTS) {
    process.stdout.write(`Rendering ${key} … `);
    try {
      const result = await renderSlide(page, slide);
      if (!result.ok) {
        console.log(`❌  ERROR: ${result.error}`);
        failed++;
        continue;
      }
      const outPath = path.join(OUT_DIR, `${key}.png`);
      fs.writeFileSync(outPath, Buffer.from(result.dataUrl.split(",")[1], "base64"));
      console.log(`✓  → ${path.relative(process.cwd(), outPath)}`);
      passed++;
    } catch (e) {
      console.log(`❌  EXCEPTION: ${e.message}`);
      failed++;
    }
  }

  await browser.close();

  console.log(`\n${passed} passed  ${failed} failed`);
  if (failed) process.exit(1);
})();
