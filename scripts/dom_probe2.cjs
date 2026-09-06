const path = require("path");
const fs   = require("fs");
const ROOT = path.resolve(__dirname, "..");
const { chromium } = require(path.join(ROOT, "frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test"));
const OUT = path.join(__dirname, "playwright_shots/live_test");

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100, args: ["--window-size=1440,900"] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  page.on("console", m => { if (["error","warn"].includes(m.type())) console.log(`[${m.type()}]`, m.text().slice(0,120)); });
  page.on("pageerror", e => console.log("[pageerror]", e.message.slice(0,120)));

  // Go to editor homepage first (no params)
  console.log("Step 1: editor base page...");
  await page.goto("http://localhost:3000/editor", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, "probe2_01_base.png") });

  // Check what's on screen
  const base = await page.evaluate(() => ({
    buttons: [...document.querySelectorAll("button")].map(b => b.textContent?.trim()).filter(Boolean),
    links: [...document.querySelectorAll("a")].map(a => a.textContent?.trim() + "|" + a.href).filter(Boolean).slice(0,10),
    canvases: document.querySelectorAll("canvas").length,
    inputs: [...document.querySelectorAll("input")].map(i => i.placeholder || i.type).slice(0,5),
  }));
  console.log("Base page buttons:", base.buttons.slice(0,15));
  console.log("Base page canvases:", base.canvases);

  // Try clicking on "pipe-run-001" run or any run in the list
  console.log("\nStep 2: Looking for runs list...");
  const runLinks = await page.evaluate(() => {
    const items = [...document.querySelectorAll("a, button, [role='button'], li, tr, [class*='run'], [class*='row']")];
    return items
      .map(el => ({ text: el.textContent?.trim()?.slice(0,60), tag: el.tagName, class: el.className?.slice(0,40) }))
      .filter(i => i.text && i.text.length > 2)
      .slice(0, 30);
  });
  console.log("Clickable items:", JSON.stringify(runLinks, null, 2));

  await page.waitForTimeout(3000);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
