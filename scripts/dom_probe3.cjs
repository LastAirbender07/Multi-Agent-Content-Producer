const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const { chromium } = require(path.join(ROOT, "frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test"));
const OUT = path.join(__dirname, "playwright_shots/live_test");

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 80, args: ["--window-size=1440,900"] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("http://localhost:3000/editor", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click "Hook" template tile to create a new standalone slide
  console.log("Clicking 'Hook' template...");
  const hookBtn = page.locator("button", { hasText: /^HookBold/ }).first();
  await hookBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, "probe3_01_after_hook_click.png") });

  const info1 = await page.evaluate(() => ({
    canvases: document.querySelectorAll("canvas").length,
    canvasClasses: [...document.querySelectorAll("canvas")].map(c => c.className),
    buttons: [...document.querySelectorAll("button")].map(b => b.textContent?.trim()).filter(Boolean).slice(0,20),
    url: window.location.href,
    fabricOnWindow: !!window.__fc,
  }));
  console.log("After hook click:");
  console.log("  canvases:", info1.canvases, info1.canvasClasses);
  console.log("  buttons:", info1.buttons);
  console.log("  url:", info1.url);
  console.log("  window.__fc:", info1.fabricOnWindow);

  // If still no canvas, try "All Runs" → pick pipe-run-001 → click slide
  if (info1.canvases === 0) {
    console.log("\nNo canvas yet. Trying All Runs...");
    const allRuns = page.locator("button", { hasText: "All Runs" }).first();
    await allRuns.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, "probe3_02_all_runs.png") });

    const info2 = await page.evaluate(() => ({
      canvases: document.querySelectorAll("canvas").length,
      text: document.body.innerText?.slice(0, 800),
      clickables: [...document.querySelectorAll("button, a, li")].map(e => e.textContent?.trim()).filter(t => t && t.length < 80 && t.length > 2).slice(0, 30),
    }));
    console.log("After All Runs:", info2.clickables);
  }

  await page.waitForTimeout(5000);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
