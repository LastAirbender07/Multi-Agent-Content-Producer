const path = require("path");
const fs   = require("fs");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);
const OUT = path.join(__dirname, "playwright_shots/visual_audit");

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
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  page.on("pageerror", e => console.log("[err]", e.message.slice(0, 80)));

  for (const tmpl of TEMPLATES) {
    await page.goto("http://localhost:3000/editor", { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(400);

    const tb = page.getByRole("button", { name: /^templates$/i }).first();
    await tb.click();
    await page.waitForTimeout(400);

    const tile = page.locator(`[data-slide-type='${tmpl}']`).first();
    await tile.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(250);
    await tile.click();
    await page.waitForURL(/view=slide/, { timeout: 15000 });
    await page.waitForTimeout(600);

    const eb = page.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
    if (await eb.isVisible({ timeout: 5000 }).catch(() => false)) {
      await eb.click();
      await page.waitForTimeout(400);
    }
    await page.waitForSelector("canvas", { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2200); // extra settle for font loading

    const box = await page.evaluate(() => {
      const el = document.querySelector(".upper-canvas") || document.querySelector("canvas");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    });
    if (!box) { console.log("no canvas:", tmpl); continue; }

    await page.screenshot({ path: path.join(OUT, `${tmpl}.png`), clip: box });
    console.log(`✅ ${tmpl} — ${box.width}×${box.height}`);
  }

  await browser.close();
})().catch(e => { console.error("[FATAL]", e.message); process.exit(1); });
