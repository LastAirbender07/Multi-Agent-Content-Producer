const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const { chromium } = require(path.join(ROOT, "frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test"));

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1600, height: 960 });
  page.on("console", m => { if (m.type() === "error") console.log("[console-error]", m.text().slice(0,100)); });
  page.on("pageerror", e => console.log("[page-error]", e.message.slice(0,100)));

  console.log("Navigating...");
  await page.goto("http://localhost:3000/editor?run=pipe-run-001&view=slide&angle=0&slide=0", {
    waitUntil: "networkidle", timeout: 30000
  });

  // Wait generously for React hydration + canvas mount
  console.log("Waiting for hydration...");
  await page.waitForTimeout(5000);

  const info = await page.evaluate(() => {
    const allCanvas = [...document.querySelectorAll("canvas")];
    const allButtons = [...document.querySelectorAll("button")]
      .map(b => b.textContent?.trim()).filter(Boolean).slice(0, 25);
    const allTabs = [...document.querySelectorAll("[role='tab'], button")]
      .map(e => e.textContent?.trim()).filter(t => t && t.length < 30).slice(0, 20);
    const dataCompIds = [...document.querySelectorAll("[data-component-id]")]
      .map(e => e.getAttribute("data-component-id")).slice(0, 5);
    return {
      url: window.location.href,
      title: document.title,
      canvasCount: allCanvas.length,
      canvasClasses: allCanvas.map(c => c.className || "(no class)"),
      canvasIds: allCanvas.map(c => c.id || "(no id)"),
      buttons: [...new Set(allButtons)],
      dataCompIds,
      fabricOnWindow: !!window.__fc,
      bodyText: document.body.innerText?.slice(0, 600),
    };
  });

  console.log("URL:", info.url);
  console.log("Title:", info.title);
  console.log("Canvas count:", info.canvasCount);
  console.log("Canvas classes:", info.canvasClasses);
  console.log("Canvas IDs:", info.canvasIds);
  console.log("Buttons:", info.buttons);
  console.log("data-component-id elements:", info.dataCompIds);
  console.log("window.__fc:", info.fabricOnWindow);
  console.log("Body text:\n", info.bodyText);

  await page.screenshot({ path: path.join(__dirname, "playwright_shots/live_test/dom_probe.png") });
  console.log("Screenshot saved.");

  await page.waitForTimeout(5000);
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
