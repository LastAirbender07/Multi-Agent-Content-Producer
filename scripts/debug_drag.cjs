/**
 * Debug the exact drag path for compact components — screenshots at each step
 */
const path = require("path");
const fs   = require("fs");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);
const OUT = path.join(__dirname, "playwright_shots/debug_drag");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  page.on("console", m => { if (m.type() !== "log") console.log(`[${m.type()}] ${m.text().slice(0,150)}`); });
  page.on("pageerror", e => console.log(`[pageerror] ${e.message.slice(0,150)}`));

  // 1. Open editor
  await page.goto("http://localhost:3000/editor", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/01_initial.png` });

  // 2. Click Templates tab
  const templBtn = page.getByRole("button", { name: /^templates$/i }).first();
  await templBtn.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/02_templates_tab.png` });

  // 3. Click aurora-hook
  await page.locator("[data-slide-type='aurora-hook']").first().click();
  await page.waitForURL(/view=slide/, { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/03_slide_created.png` });

  // 4. Enter edit mode
  const editBtn = page.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
  if (await editBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
    await editBtn.click();
    await page.waitForTimeout(500);
  }
  await page.waitForSelector("canvas", { timeout: 10000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/04_canvas_open.png` });

  // 5. Get canvas box
  const box = await page.evaluate(() => {
    const upper = document.querySelector(".upper-canvas") || document.querySelector("canvas");
    if (!upper) return null;
    const r = upper.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left+r.width/2, cy: r.top+r.height/2 };
  });
  console.log("Canvas box:", box);

  // 6. Object count BEFORE
  const before = await page.evaluate(() => window.__fc?.getObjects().length ?? -1);
  console.log("Objects before:", before);

  // 7. Switch to Components tab
  const compBtn = page.getByRole("button", { name: /^components$/i }).first();
  await compBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/05_components_tab.png` });

  // 8. Find compact-mixed-weight-text tile
  const tile = page.locator("[data-component-id='compact-mixed-weight-text']").first();
  await tile.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/06_tile_scrolled.png` });

  const tileBox = await tile.boundingBox();
  console.log("Tile box:", tileBox);

  const tileVis = await tile.isVisible();
  console.log("Tile visible:", tileVis);

  if (!tileVis || !tileBox) {
    console.log("❌ Tile not visible — cannot test drag");
    await browser.close(); return;
  }

  // 9. Attempt drag with detailed logging
  console.log(`Dragging from (${Math.round(tileBox.x + tileBox.width/2)}, ${Math.round(tileBox.y + tileBox.height/2)}) → (${Math.round(box.cx)}, ${Math.round(box.cy)})`);

  await page.mouse.move(tileBox.x + tileBox.width/2, tileBox.y + tileBox.height/2);
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${OUT}/07_before_drag.png` });

  await page.mouse.down();
  await page.waitForTimeout(100);

  // Move in steps, screenshot midway
  await page.mouse.move(box.cx - 200, box.cy - 50, { steps: 5 });
  await page.screenshot({ path: `${OUT}/08_mid_drag.png` });

  await page.mouse.move(box.cx, box.cy, { steps: 8 });
  await page.screenshot({ path: `${OUT}/09_over_canvas.png` });

  await page.mouse.up();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/10_after_drop.png` });

  // 10. Check count after
  const after = await page.evaluate(() => window.__fc?.getObjects().length ?? -1);
  console.log("Objects after:", after, "(delta:", after - before, ")");

  const objs = await page.evaluate(() => {
    if (!window.__fc) return [];
    return window.__fc.getObjects().map((o,i) => ({
      i, type: o.type, role: o.data?.role||null, sel: o.selectable,
      left: Math.round(o.left||0), top: Math.round(o.top||0),
      w: Math.round(o.width||0), h: Math.round(o.height||0),
    }));
  });
  console.log("All canvas objects:");
  objs.forEach(o => console.log(`  [${o.i}] ${o.type} role=${o.role} sel=${o.sel} left=${o.left} top=${o.top} ${o.w}x${o.h}`));

  await browser.close();
  console.log("\nScreenshots →", OUT);
})().catch(e => { console.error(e.message); process.exit(1); });
