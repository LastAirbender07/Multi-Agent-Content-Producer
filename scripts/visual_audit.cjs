/**
 * visual_audit.cjs
 *
 * Opens every template in the real browser, takes a screenshot of the rendered
 * slide canvas at 2x pixel density, saves it to playwright_shots/visual_audit/.
 * No assertions — pure screenshot capture for human + AI pixel review.
 *
 * Usage: node scripts/visual_audit.cjs
 */

const path = require("path");
const fs   = require("fs");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);

const OUT = path.join(__dirname, "playwright_shots/visual_audit");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:3000";

const ALL_TEMPLATES = [
  // Aurora extended
  "aurora-hook",
  "aurora-content-0",
  "aurora-stat",
  "aurora-quote",
  "aurora-cta",
  "aurora-engage",
  // Compact clean
  "aurora-compact-hook",
  "aurora-compact-fact",
  "aurora-compact-fact-compare",
  "aurora-compact-step",
  "aurora-compact-step-index",
  "aurora-compact-step-detail",
  "aurora-compact-stat-hero",
  "aurora-compact-list-item",
  "aurora-compact-quote",
  // Phase 2.5 new — compact-clean gap-fills
  "aurora-compact-clean-cta",
  "aurora-compact-clean-quote",
  "aurora-compact-clean-engage",
  // Phase 2.5 new — editorial
  "aurora-editorial-hook",
  "aurora-editorial-cta",
  // Phase 2.5 new — nextwork-dark
  "aurora-nextwork-dark-cta",
  "aurora-nextwork-dark-engage",
  // Cover hero
  "aurora-carousel-cover-hero-phone",
  "aurora-carousel-cover-hero-images",
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--window-size=1440,900", "--force-device-scale-factor=2"],
  });

  const page = await browser.newPage();
  // 2x device pixel ratio for sharp screenshots
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => Object.defineProperty(window, "devicePixelRatio", { get: () => 2 }));

  page.on("pageerror", e => console.log(`[pageerror] ${e.message.slice(0,100)}`));

  // Open editor
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(500);

  // Click Templates tab
  const templBtn = page.getByRole("button", { name: /^templates$/i }).first();
  await templBtn.click();
  await page.waitForTimeout(400);

  for (const tmpl of ALL_TEMPLATES) {
    console.log(`\n── ${tmpl} ──`);

    // Navigate back to clean editor state
    await page.goto(`${BASE}/editor`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(400);
    await templBtn.click();
    await page.waitForTimeout(400);

    // Find and click the tile
    const tile = page.locator(`[data-slide-type='${tmpl}']`).first();
    await tile.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);

    const tileVis = await tile.isVisible({ timeout: 5000 }).catch(() => false);
    if (!tileVis) {
      console.log(`  ⚠️  tile not found`);
      continue;
    }

    await tile.click();
    await page.waitForURL(/view=slide/, { timeout: 15000 });
    await page.waitForTimeout(600);

    // Click edit button
    const editBtn = page.locator("button").filter({ hasText: /open in canvas|edit in canvas|edit this slide/i }).first();
    if (await editBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(400);
    }

    // Wait for canvas to fully render
    await page.waitForSelector("canvas", { timeout: 12000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1800); // fonts + Fabric render settle

    // Find the canvas element bounding box and screenshot just the canvas area
    const canvasBox = await page.evaluate(() => {
      // Try upper-canvas (Fabric's interactive layer) or the main canvas
      const el = document.querySelector(".upper-canvas") || document.querySelector("canvas");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    });

    if (!canvasBox || canvasBox.width < 100) {
      console.log(`  ⚠️  canvas not found or too small`);
      // Full page fallback
      await page.screenshot({ path: path.join(OUT, `${tmpl}_FULLPAGE.png`), fullPage: false });
      continue;
    }

    // Screenshot just the canvas area — crop to slide only
    await page.screenshot({
      path: path.join(OUT, `${tmpl}.png`),
      clip: {
        x: canvasBox.x,
        y: canvasBox.y,
        width: canvasBox.width,
        height: canvasBox.height,
      },
    });

    console.log(`  ✅  saved ${tmpl}.png (${Math.round(canvasBox.width)}×${Math.round(canvasBox.height)})`);
  }

  await browser.close();
  console.log(`\n\nAll screenshots → ${OUT}`);
  console.log(`Total: ${ALL_TEMPLATES.length} templates`);
})().catch(e => { console.error("[FATAL]", e.message); process.exit(1); });
