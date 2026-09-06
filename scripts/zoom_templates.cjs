/**
 * zoom_templates.cjs — render each Phase 2.5 template at full resolution
 * by creating the slide and screenshotting at 2× DPR with a larger viewport
 * so the canvas is bigger and text is clearly readable.
 */
const path = require("path");
const fs   = require("fs");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);

const OUT = path.join(__dirname, "playwright_shots/zoomed");
fs.mkdirSync(OUT, { recursive: true });

// Templates to zoom — Phase 2.5 new ones + key problem ones
const TEMPLATES = [
  "aurora-editorial-hook",
  "aurora-editorial-cta",
  "aurora-compact-clean-cta",
  "aurora-compact-clean-quote",
  "aurora-compact-clean-engage",
  "aurora-nextwork-dark-cta",
  "aurora-nextwork-dark-engage",
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Larger viewport = bigger canvas = more readable text
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1200 });
  page.on("pageerror", e => console.log("[err]", e.message.slice(0,80)));
  page.on("console",   m => { if (m.type()==="error") console.log("[console]", m.text().slice(0,80)); });

  for (const tmpl of TEMPLATES) {
    console.log(`\n── ${tmpl}`);
    await page.goto("http://localhost:3000/editor", { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(400);

    const tb = page.getByRole("button", { name: /^templates$/i }).first();
    await tb.click();
    await page.waitForTimeout(400);

    const tile = page.locator(`[data-slide-type='${tmpl}']`).first();
    await tile.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(250);
    await tile.click();
    await page.waitForURL(/view=slide/, { timeout: 15000 });
    await page.waitForTimeout(700);

    const eb = page.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
    if (await eb.isVisible({ timeout: 5000 }).catch(() => false)) {
      await eb.click();
      await page.waitForTimeout(400);
    }
    await page.waitForSelector("canvas", { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2500); // generous settle for fonts + Fabric

    // Get canvas box
    const box = await page.evaluate(() => {
      const el = document.querySelector(".upper-canvas") || document.querySelector("canvas");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    });

    if (!box) { console.log("  ⚠️  no canvas"); continue; }
    console.log(`  canvas: ${Math.round(box.width)}×${Math.round(box.height)} at (${Math.round(box.x)},${Math.round(box.y)})`);

    // Screenshot just the canvas area
    await page.screenshot({
      path: path.join(OUT, `${tmpl}.png`),
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    });
    console.log(`  ✅ saved`);
  }

  await browser.close();
  console.log(`\nZoomed screenshots → ${OUT}`);
})().catch(e => { console.error("[FATAL]", e.message); process.exit(1); });
