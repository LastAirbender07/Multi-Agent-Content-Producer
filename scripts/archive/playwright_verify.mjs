/**
 * Playwright verification: compact templates + selectability + no regression
 * Run from repo root: node scripts/playwright_verify.mjs
 */
import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT = path.resolve("scripts/playwright_shots");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── A. Open editor ──────────────────────────────────────────────────────────
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/01_editor_open.png`, fullPage: false });
  console.log("✓ Editor opened");

  // ── B. Check no horizontal scroll ──────────────────────────────────────────
  const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const bodyClientWidth = await page.evaluate(() => document.body.clientWidth);
  console.log(`  scrollWidth=${bodyScrollWidth} clientWidth=${bodyClientWidth}`);
  if (bodyScrollWidth > bodyClientWidth + 5) {
    console.warn("⚠ Horizontal scroll detected!");
  } else {
    console.log("✓ No horizontal scroll at 1440×900");
  }

  // ── C. Click Templates tab ──────────────────────────────────────────────────
  const tmplTab = page.getByRole("button", { name: /templates/i }).first();
  await tmplTab.waitFor({ timeout: 5000 });
  await tmplTab.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/02_templates_tab.png`, fullPage: false });
  console.log("✓ Templates tab clicked");

  // ── D. Count compact tiles ──────────────────────────────────────────────────
  const allTiles = await page.locator("[data-slide-type]").all();
  const tileTypes = await Promise.all(allTiles.map(t => t.getAttribute("data-slide-type")));
  const compactTiles = tileTypes.filter(t => t?.includes("compact"));
  console.log(`  Total tiles: ${allTiles.length}  |  Compact tiles: ${compactTiles.length}`);
  console.log(`  Compact: ${compactTiles.join(", ")}`);

  // ── E. Click aurora-compact-list tile ──────────────────────────────────────
  const listTile = page.locator("[data-slide-type='aurora-compact-list']").first();
  const listExists = await listTile.count();
  if (listExists) {
    await listTile.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/03_compact_list_rendered.png`, fullPage: false });
    console.log("✓ Compact List tile clicked — slide created");
  } else {
    console.warn("⚠ aurora-compact-list tile not found");
  }

  // ── F. Click aurora-compact-hook tile ──────────────────────────────────────
  const hookTile = page.locator("[data-slide-type='aurora-compact-hook']").first();
  if (await hookTile.count()) {
    await hookTile.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/04_compact_hook_rendered.png`, fullPage: false });
    console.log("✓ Compact Hook tile clicked");
  }

  // ── G. Regression: standard aurora-hook ────────────────────────────────────
  const stdHookTile = page.locator("[data-slide-type='aurora-hook']").first();
  if (await stdHookTile.count()) {
    await stdHookTile.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/05_std_hook_regression.png`, fullPage: false });
    console.log("✓ Standard Hook tile clicked (regression check)");
  }

  // ── H. Try to click on canvas object to verify selectability ───────────────
  // Look for the Fabric canvas element
  const canvas = page.locator("canvas").first();
  await canvas.waitFor({ timeout: 5000 });
  const box = await canvas.boundingBox();
  if (box) {
    // Click somewhere in the center of the slide area — should select an object
    await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.40);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/06_object_clicked.png`, fullPage: false });
    console.log("✓ Clicked canvas center area (check screenshot for selection handles)");
  }

  await page.screenshot({ path: `${OUT}/07_final.png`, fullPage: false });
  console.log(`\n✓ All screenshots saved to ${OUT}`);
  await browser.close();
})();
