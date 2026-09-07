const path = require("path");
const fs   = require("fs");
const { chromium } = require(path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test"));

const OUT = path.join(__dirname, "playwright_shots/aurora_lite");
fs.mkdirSync(OUT, { recursive: true });

async function saveCanvas(page, name) {
  const d = await page.evaluate(() => {
    const c = window.__fc; if (!c) return null;
    c.renderAll();
    return (document.querySelector(".lower-canvas") || document.querySelector("canvas"))?.toDataURL("image/png") ?? null;
  });
  if (d) fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(d.split(",")[1], "base64"));
}

async function openTemplate(page, id) {
  await page.goto("http://localhost:3000/editor", { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /^templates$/i }).first().click();
  await page.waitForTimeout(500);
  const tile = page.locator(`[data-slide-type='${id}']`).first();
  await tile.scrollIntoViewIfNeeded().catch(()=>{});
  await tile.click();
  await page.waitForURL(/view=slide/, { timeout: 15000 });
  await page.waitForTimeout(600);
  const eb = page.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
  if (await eb.isVisible({ timeout: 5000 }).catch(()=>false)) { await eb.click(); await page.waitForTimeout(400); }
  await page.waitForSelector("canvas", { timeout: 10000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
}

(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--window-size=1440,900"] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Aurora Lite Content
  console.log("Opening aurora-lite-content...");
  await openTemplate(page, "aurora-lite-content");
  await saveCanvas(page, "aurora_lite_content");
  console.log("  saved aurora_lite_content.png");

  // Aurora Lite Quote
  console.log("Opening aurora-lite-quote...");
  await openTemplate(page, "aurora-lite-quote");
  await saveCanvas(page, "aurora_lite_quote");
  console.log("  saved aurora_lite_quote.png");

  // Compare with dense aurora-content-0
  console.log("Opening aurora-content-0 (dense, for comparison)...");
  await openTemplate(page, "aurora-content-0");
  await saveCanvas(page, "aurora_extended_content_dense");
  console.log("  saved aurora_extended_content_dense.png");

  await browser.close();

  // Build comparison grid
  const shots = ["aurora_lite_content", "aurora_lite_quote", "aurora_extended_content_dense"];
  const labels = ["Aurora Lite Content (NEW -- 64pt, <=15 words, no bullets)", "Aurora Lite Quote (NEW -- 50pt, no bullets)", "Aurora Extended Content (OLD -- dense, 48pt, bullets)"];
  const cards = shots.map((name, i) => {
    const fp = path.join(OUT, name + ".png");
    if (!fs.existsSync(fp)) return `<div style="color:#f87171">${name} not found</div>`;
    const b64 = fs.readFileSync(fp).toString("base64");
    const isNew = i < 2;
    return `<div style="border:2px solid ${isNew ? '#7C6EFA' : '#444'};border-radius:8px;overflow:hidden;display:inline-block">
      <img src="data:image/png;base64,${b64}" style="width:360px;display:block">
      <div style="padding:8px;font-size:10px;color:${isNew ? '#7C6EFA' : '#666'};font-family:monospace;background:#111">${labels[i]}</div>
    </div>`;
  }).join('\n');

  const html = `<!DOCTYPE html><html><head><style>body{background:#050505;padding:24px;margin:0}h1{color:#f59e0b;font-size:14px;margin-bottom:16px}p{color:#555;font-size:11px;margin-bottom:20px}.row{display:flex;gap:16px;flex-wrap:wrap}</style></head><body>
    <h1>Phase 3.5 -- Aurora Lite Visual Verification</h1>
    <p>Left/center: new aurora-lite (dark + readable). Right: old aurora-extended (dense). Compare density.</p>
    <div class="row">${cards}</div></body></html>`;
  const tmp = path.join(OUT, "_grid.html");
  fs.writeFileSync(tmp, html);

  const b2 = await chromium.launch({ headless: true });
  const p2 = await b2.newPage();
  await p2.setViewportSize({ width: 1400, height: 700 });
  await p2.goto("file://" + tmp, { waitUntil: "load" });
  await p2.waitForFunction(()=>[...document.querySelectorAll("img")].every(i=>i.complete&&i.naturalWidth>0), {timeout:10000});
  await p2.waitForTimeout(400);
  await p2.screenshot({ path: path.join(OUT, "COMPARISON.png"), fullPage: true });
  await b2.close();
  fs.unlinkSync(tmp);
  console.log("Comparison grid -> " + path.join(OUT, "COMPARISON.png"));
})().catch(e => { console.error(e.message); process.exit(1); });
