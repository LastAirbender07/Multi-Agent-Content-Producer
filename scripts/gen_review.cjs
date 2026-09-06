const path = require("path");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setViewportSize({ width: 2400, height: 3200 });
  await p.goto("file://" + path.join(__dirname, "playwright_shots/zoomed/review.html"), { waitUntil: "load" });
  await p.waitForFunction(() => [...document.querySelectorAll("img")].every(i => i.complete && i.naturalWidth > 0), { timeout: 15000 });
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(__dirname, "playwright_shots/zoomed/REVIEW.png"), fullPage: true });
  await b.close();
  console.log("Done → scripts/playwright_shots/zoomed/REVIEW.png");
})().catch(e => { console.error(e.message); process.exit(1); });
