/**
 * Debug compact component drops - capture console errors from the drop
 */
const path = require("path");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);

const BASE = "http://localhost:3000";
const COMPONENTS = ["compact-mixed-weight-text", "compact-dot-progress", "compact-number-badge", "compact-editorial-header"];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  const allLogs = [];
  page.on("console", m => allLogs.push(`[${m.type()}] ${m.text().slice(0, 200)}`));
  page.on("pageerror", e => allLogs.push(`[pageerror] ${e.message.slice(0, 200)}`));

  // Open editor + aurora-hook
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /^templates$/i }).first().click();
  await page.waitForTimeout(300);
  await page.locator("[data-slide-type='aurora-hook']").first().click();
  await page.waitForURL(/view=slide/, { timeout: 15000 });
  await page.waitForTimeout(500);
  const editBtn = page.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
  if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await editBtn.click();
    await page.waitForTimeout(400);
  }
  await page.waitForSelector("canvas", { timeout: 10000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  const box = await page.evaluate(() => {
    const c = document.querySelector(".upper-canvas") || document.querySelector("canvas");
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left+r.width/2, cy: r.top+r.height/2 };
  });

  for (const compId of COMPONENTS) {
    allLogs.length = 0; // reset logs per component
    console.log(`\n── Testing: ${compId} ──`);

    // Switch to components tab
    await page.getByRole("button", { name: /^components$/i }).first().click();
    await page.waitForTimeout(400);

    const tile = page.locator(`[data-component-id='${compId}']`).first();
    await tile.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(200);

    const tileBox = await tile.boundingBox();
    if (!tileBox) { console.log(`  ❌ Tile not found`); continue; }

    // Get count before
    const before = await page.evaluate(() => window.__fc ? window.__fc.getObjects().length : -1);

    // Drag
    await page.mouse.move(tileBox.x + tileBox.width/2, tileBox.y + tileBox.height/2);
    await page.mouse.down();
    await page.mouse.move(box.cx - 100, box.cy, { steps: 5 });
    await page.mouse.move(box.cx, box.cy, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(1200); // extra wait

    const after = await page.evaluate(() => window.__fc ? window.__fc.getObjects().length : -1);

    // Get detailed object list
    const objs = await page.evaluate(() => {
      if (!window.__fc) return [];
      return window.__fc.getObjects().map((o,i) => ({
        i, type: o.type, role: o.data?.role || null, sel: o.selectable,
        left: Math.round(o.left||0), top: Math.round(o.top||0),
        w: Math.round(o.width||0), h: Math.round(o.height||0),
      }));
    });

    console.log(`  Before: ${before}, After: ${after} (delta: ${after-before})`);
    if (after > before) {
      const newObj = objs[objs.length-1];
      console.log(`  ✅ New object: type=${newObj.type} role=${newObj.role} left=${newObj.left} top=${newObj.top} w=${newObj.w} h=${newObj.h} sel=${newObj.sel}`);
    } else {
      console.log(`  ❌ No new object`);
    }

    // Print any errors/warnings
    const errors = allLogs.filter(l => l.includes('[error]') || l.includes('[pageerror]') || l.includes('[warn]'));
    if (errors.length > 0) {
      console.log(`  Console output (errors/warns):`);
      errors.forEach(l => console.log(`    ${l}`));
    }
    // Also print Unknown component warnings
    const unknowns = allLogs.filter(l => l.includes('Unknown component') || l.includes('unknown'));
    if (unknowns.length > 0) unknowns.forEach(l => console.log(`  ⚠️  ${l}`));

    // Navigate back cleanly for next test
    await page.goto(`${BASE}/editor`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /^templates$/i }).first().click();
    await page.waitForTimeout(300);
    await page.locator("[data-slide-type='aurora-hook']").first().click();
    await page.waitForURL(/view=slide/, { timeout: 15000 });
    await page.waitForTimeout(400);
    const eb = page.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
    if (await eb.isVisible({ timeout: 4000 }).catch(() => false)) {
      await eb.click(); await page.waitForTimeout(400);
    }
    await page.waitForSelector("canvas", { timeout: 8000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
  }

  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
