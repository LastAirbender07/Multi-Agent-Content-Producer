/**
 * Playwright verification: compact templates + selectability + no regression
 * Run: node playwright_verify.cjs  (from frontend/)
 */
const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const OUT = path.resolve(__dirname, "../scripts/playwright_shots");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // A. Open editor
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/01_editor_open.png` });
  console.log("✓ Editor opened");

  // B. No horizontal scroll check
  const scrollW = await page.evaluate(() => document.body.scrollWidth);
  const clientW = await page.evaluate(() => document.body.clientWidth);
  console.log(`  scroll=${scrollW} client=${clientW}`);
  console.log(scrollW > clientW + 5 ? "⚠ Horizontal scroll detected!" : "✓ No horizontal scroll");

  // C. Click Templates tab
  await page.getByRole("button", { name: /templates/i }).first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/02_templates_tab.png` });
  console.log("✓ Templates tab opened");

  // D. Count tiles
  const tiles = await page.locator("[data-slide-type]").all();
  const types = await Promise.all(tiles.map(t => t.getAttribute("data-slide-type")));
  const compact = types.filter(t => t && t.includes("compact"));
  console.log(`  Total tiles: ${types.length}  Compact: ${compact.length}`);
  compact.forEach(c => console.log(`    ${c}`));

  // E. Compact List tile
  const listTile = page.locator("[data-slide-type='aurora-compact-list-item']").first();
  if (await listTile.count()) {
    await listTile.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/03_compact_list.png` });
    console.log("✓ Compact List rendered");

    // Click "Edit in canvas" to open Fabric editor
    const editBtn = page.getByRole("button", { name: /edit in canvas/i });
    if (await editBtn.count()) {
      await editBtn.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${OUT}/03b_list_in_canvas.png` });
      console.log("✓ Opened in canvas editor");

      // Try clicking an object on canvas to verify selectability
      const canvas = page.locator("canvas").first();
      const box = await canvas.boundingBox({ timeout: 10000 });
      if (box) {
        // Click the body text area (left side, ~35% from top)
        await page.mouse.click(box.x + box.width * 0.38, box.y + box.height * 0.22);
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${OUT}/04_list_click_test.png` });
        console.log("✓ Clicked canvas — check screenshot for selection handles");
      }
    }
  } else {
    console.warn("⚠ aurora-compact-list-item tile not found");
  }

  // F. Compact Hook
  const hookTile = page.locator("[data-slide-type='aurora-compact-hook']").first();
  if (await hookTile.count()) {
    await hookTile.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/05_compact_hook.png` });
    console.log("✓ Compact Hook rendered");
  }

  // G. Regression: standard aurora-hook
  const stdHook = page.locator("[data-slide-type='aurora-hook']").first();
  if (await stdHook.count()) {
    await stdHook.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/06_std_hook_regression.png` });
    console.log("✓ Standard Hook regression checked");
  }

  await page.screenshot({ path: `${OUT}/07_final.png` });
  console.log(`\nScreenshots → ${OUT}`);
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
