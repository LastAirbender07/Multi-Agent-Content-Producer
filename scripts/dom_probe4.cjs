const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const { chromium } = require(path.join(ROOT, "frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test"));
const OUT = path.join(__dirname, "playwright_shots/live_test");
const fs = require("fs");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 80, args: ["--window-size=1440,900"] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  page.on("console", m => { if(m.type()==="error") console.log("[ERR]", m.text().slice(0,100)); });

  await page.goto("http://localhost:3000/editor", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);

  console.log("Clicking Hook to create a slide...");
  await page.locator("button", { hasText: /^HookBold/ }).first().click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(OUT, "probe4_01_after_create.png") });

  const s1 = await page.evaluate(() => ({
    url: window.location.href,
    canvases: [...document.querySelectorAll("canvas")].map(c => ({cls: c.className.slice(0,60), id: c.id, w: c.width, h: c.height})),
    fabricOnWindow: !!window.__fc,
    allText: document.body.innerText?.slice(0, 1500),
  }));
  console.log("URL:", s1.url);
  console.log("Canvases:", JSON.stringify(s1.canvases, null, 2));
  console.log("window.__fc:", s1.fabricOnWindow);
  console.log("Page text:\n", s1.allText);

  await page.waitForTimeout(5000);
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
