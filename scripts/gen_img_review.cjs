const path = require("path");
const { chromium } = require(path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test"));
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setViewportSize({ width: 2200, height: 2800 });
  await p.goto("file://" + path.join(__dirname, "playwright_shots/image_replace_verify/review.html"), { waitUntil: "load" });
  await p.waitForFunction(() => [...document.querySelectorAll("img")].every(i => i.complete), { timeout: 10000 });
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(__dirname, "playwright_shots/image_replace_verify/REVIEW.png"), fullPage: true });
  await b.close();
  console.log("done");
})().catch(e => { console.error(e.message); process.exit(1); });
