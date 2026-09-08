/**
 * view_runs.cjs — Open verified E2E run slides in browser for visual review
 * Updated 2026-09-08 to point at latest verified runs after RCA layout fix.
 * 
 * Usage: node scripts/view_runs.cjs
 */
const path = require("path");
const fs   = require("fs");
const { chromium } = require(path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test"));

const RUNS = {
  "OPINION — Hustle Culture (aurora-lite)":   "9e8f47d7-c4ae-45a4-9ca5-dec21a701088",
  "FACTS — Sleep & Memory (compact-clean)":   "a9b353d1-08d9-4678-9d5f-f1692a1a0ff5",
};

const BASE = path.join(__dirname, "../backend/outputs/runs");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 900 });

  for (const [label, runId] of Object.entries(RUNS)) {
    const pngDir = path.join(BASE, runId, "content", "angle_0", "png");
    if (!fs.existsSync(pngDir)) { console.log(`SKIP: ${label} — ${pngDir} not found`); continue; }

    const pngs = fs.readdirSync(pngDir).filter(f => f.endsWith(".png")).sort();
    console.log(`\n${label} (${pngs.length} slides):`);

    for (const png of pngs) {
      const absPath = path.join(pngDir, png);
      await page.goto(`file://${absPath}`);
      await page.waitForTimeout(600);
      console.log(`  ✓ ${png}`);
    }
  }

  console.log("\nDone — press Ctrl+C to close.");
  await new Promise(() => {});
})();
