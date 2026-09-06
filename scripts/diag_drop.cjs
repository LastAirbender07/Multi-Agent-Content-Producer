const path = require("path");
const { chromium } = require(path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test"));
const TEST_IMG_URL = "http://localhost:8000/assets/images/rajini-test.png";
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto("http://localhost:3000/editor", { waitUntil: "networkidle", timeout: 25000 });
  await p.waitForTimeout(400);
  await p.getByRole("button", { name: /^templates$/i }).first().click();
  await p.waitForTimeout(400);
  await p.locator("[data-slide-type='aurora-hook']").first().click();
  await p.waitForURL(/view=slide/, { timeout: 15000 });
  await p.waitForTimeout(600);
  const eb = p.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
  if (await eb.isVisible({ timeout: 5000 }).catch(() => false)) { await eb.click(); await p.waitForTimeout(400); }
  await p.waitForSelector("canvas", { timeout: 10000 });
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(2000);
  const r = await p.evaluate(async (imgUrl) => {
    if (!window.__fc) return { error: "no __fc" };
    const canvasEl = document.querySelector("canvas");
    const outerDiv = canvasEl ? (canvasEl.closest(".flex-1") || canvasEl.parentElement) : null;
    if (!outerDiv) return { error: "no outer div" };
    const rect = outerDiv.getBoundingClientRect();
    const dt = new DataTransfer();
    dt.setData("imageUrl", imgUrl);
    outerDiv.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt, clientX: rect.left + rect.width/2, clientY: rect.top + rect.height/2 }));
    await new Promise(res => setTimeout(res, 1500));
    return window.__fc.getObjects().map(o => ({ type: o.type, role: o.data?.role, selectable: o.selectable }));
  }, TEST_IMG_URL);
  console.log(JSON.stringify(r, null, 2));
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
