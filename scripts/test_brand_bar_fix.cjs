/**
 * Quick test for brand-bar selectability fix
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const { chromium } = require(
  path.join(ROOT, "frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);
const fs = require("fs");

const OUT = path.join(__dirname, "playwright_shots/brand_bar_fix");
fs.mkdirSync(OUT, { recursive: true });
function log(msg) { process.stdout.write(msg + "\n"); }

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50, args: ["--window-size=1680,980"] });
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 980 } });
  const page = await ctx.newPage();
  page.on("pageerror", e => log("[page-error] " + e.message.slice(0,120)));
  page.on("console", m => { if (m.type()==="error") log("[console] " + m.text().slice(0,100)); });

  log("Opening editor...");
  await page.goto("http://localhost:3000/editor", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1000);

  // Create a slide
  const hookBtn = page.locator("[data-slide-type='aurora-hook']").first();
  await hookBtn.click();
  await page.waitForURL(/run=.*&view=slide/, { timeout: 15000 });
  await page.waitForTimeout(1500);
  log("Slide created: " + page.url());

  // Enter edit mode
  const editBtn = page.locator("button", { hasText: /Open in canvas|Edit in canvas|Edit this slide/i }).first();
  if (await editBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await editBtn.click();
    log("Clicked edit button");
  }
  await page.waitForSelector("canvas", { timeout: 10000 });
  await page.waitForTimeout(2000);

  const fcAvail = await page.evaluate(() => !!window.__fc);
  log("window.__fc: " + fcAvail);

  // Switch to Components tab
  await page.locator("button", { hasText: /^Components$/ }).first().click();
  await page.waitForTimeout(500);

  const canvasBox = await page.evaluate(() => {
    const upper = document.querySelector(".upper-canvas") || document.querySelector("canvas");
    if (!upper) return null;
    const r = upper.getBoundingClientRect();
    return { cx: r.left + r.width/2, cy: r.top + r.height/2 };
  });
  log("Canvas center: " + JSON.stringify(canvasBox));

  // Test brand-bar
  log("\n── Testing brand-bar ──");
  const tile = page.locator('[data-component-id="brand-bar"]').first();
  await tile.scrollIntoViewIfNeeded();
  const tileBox = await tile.boundingBox();
  log("Tile at: " + JSON.stringify({ x: Math.round(tileBox.x), y: Math.round(tileBox.y) }));

  await page.mouse.move(tileBox.x + tileBox.width/2, tileBox.y + tileBox.height/2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.cx - 100, canvasBox.cy, { steps: 5 });
  await page.mouse.move(canvasBox.cx, canvasBox.cy, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "01_dropped.png") });

  // Click to select
  await page.mouse.click(canvasBox.cx, canvasBox.cy);
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => {
    const fc = window.__fc;
    if (!fc) return { error: "no __fc" };
    const obj = fc.getActiveObject();
    if (!obj) {
      // List all objects
      const objs = fc.getObjects();
      return { selected: false, objCount: objs.length, types: objs.map(o => o.type + " sel=" + o.selectable) };
    }
    return { selected: true, type: obj.type, selectable: obj.selectable, evented: obj.evented };
  });
  log("After click: " + JSON.stringify(state));
  await page.screenshot({ path: path.join(OUT, "02_after_click.png") });

  if (state.selected) {
    log("✓ PASS — brand-bar is selectable (type=" + state.type + ")");
  } else {
    log("✗ FAIL — brand-bar still not selectable");
    log("  Objects on canvas: " + JSON.stringify(state.objCount) + " — " + JSON.stringify(state.types));
    // Try clicking each object
    if (state.objCount > 0) {
      const allObjs = await page.evaluate(() => {
        const fc = window.__fc;
        return fc.getObjects().map((o, i) => ({
          i, type: o.type, selectable: o.selectable, evented: o.evented,
          left: Math.round(o.left), top: Math.round(o.top),
          w: Math.round(o.getScaledWidth ? o.getScaledWidth() : o.width),
          h: Math.round(o.getScaledHeight ? o.getScaledHeight() : o.height),
        }));
      });
      log("  All objects: " + JSON.stringify(allObjs));
    }
  }

  log("\nKeeping open 10s...");
  await page.waitForTimeout(10000);
  await browser.close();
  process.exit(state.selected ? 0 : 1);
})().catch(e => { log("[FATAL] " + e.message); process.exit(1); });
