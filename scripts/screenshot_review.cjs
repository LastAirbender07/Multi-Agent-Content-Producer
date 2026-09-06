/**
 * screenshot_review.cjs
 * Opens the review.html grid page and takes a high-res screenshot of each section.
 */
const path = require("path");
const fs   = require("fs");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);

const REVIEW_HTML = `file://${path.join(__dirname, "playwright_shots/visual_audit/review.html")}`;
const OUT = path.join(__dirname, "playwright_shots/visual_audit");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1800, height: 1200 });
  await page.goto(REVIEW_HTML, { waitUntil: "load" });
  // Wait for all images to load
  await page.waitForFunction(() => {
    const imgs = [...document.querySelectorAll("img")];
    return imgs.every(img => img.complete && img.naturalWidth > 0);
  }, { timeout: 15000 });
  await page.waitForTimeout(500);

  // Full page screenshot of the grid
  await page.screenshot({
    path: path.join(OUT, "REVIEW_GRID.png"),
    fullPage: true,
  });

  await browser.close();
  console.log(`Review grid → ${path.join(OUT, "REVIEW_GRID.png")}`);
})().catch(e => { console.error(e.message); process.exit(1); });
