/**
 * Crop just the top 250px of the canvas for each problem template
 */
const path = require("path");
const fs   = require("fs");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);
const OUT = path.join(__dirname, "playwright_shots/zoomed");

const TEMPLATES = [
  "aurora-compact-clean-cta",
  "aurora-compact-clean-engage",
  "aurora-nextwork-dark-cta",
  "aurora-nextwork-dark-engage",
];

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  // Large enough viewport to get a 1:1 canvas
  await p.setViewportSize({ width: 1920, height: 1200 });

  for (const tmpl of TEMPLATES) {
    await p.goto("http://localhost:3000/editor", { waitUntil: "networkidle", timeout: 20000 });
    await p.waitForTimeout(400);
    const tb = p.getByRole("button", { name: /^templates$/i }).first();
    await tb.click(); await p.waitForTimeout(400);
    const tile = p.locator(`[data-slide-type='${tmpl}']`).first();
    await tile.scrollIntoViewIfNeeded().catch(()=>{});
    await tile.click();
    await p.waitForURL(/view=slide/, { timeout: 15000 });
    await p.waitForTimeout(600);
    const eb = p.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
    if (await eb.isVisible({ timeout: 5000 }).catch(()=>false)) { await eb.click(); await p.waitForTimeout(400); }
    await p.waitForSelector("canvas", { timeout: 10000 });
    await p.waitForLoadState("networkidle");
    await p.waitForTimeout(2500);

    const box = await p.evaluate(() => {
      const el = document.querySelector(".upper-canvas") || document.querySelector("canvas");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    });
    if (!box) continue;

    // Take TWO crops: top 30% and full slide
    await p.screenshot({
      path: path.join(OUT, `${tmpl}_TOP.png`),
      clip: { x: box.x, y: box.y, width: box.width, height: Math.round(box.height * 0.30) },
    });
    console.log(`✅ ${tmpl}_TOP.png`);
  }
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
