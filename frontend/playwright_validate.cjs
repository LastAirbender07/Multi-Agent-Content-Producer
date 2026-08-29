/**
 * Broader validation: cycle all compact templates, screenshot each
 */
const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const OUT = path.resolve(__dirname, "../scripts/playwright_shots/validation");
fs.mkdirSync(OUT, { recursive: true });

const COMPACT_TYPES = [
  "aurora-compact-hook",
  "aurora-compact-fact",
  "aurora-compact-fact-compare",
  "aurora-compact-step",
  "aurora-compact-step-index",
  "aurora-compact-step-detail",
  "aurora-compact-stat-hero",
  "aurora-compact-list-item",
  "aurora-compact-quote",
];

(async () => {
  const browser = await chromium.launch({ headless: true, slowMo: 100 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("http://localhost:3000/editor", { waitUntil: "networkidle" });

  // Open Templates tab
  await page.getByRole("button", { name: "Templates" }).click();
  await page.waitForTimeout(600);

  for (const type of COMPACT_TYPES) {
    console.log(`Testing ${type}...`);

    // Click the tile
    const tile = page.locator(`[data-slide-type='${type}']`).first();
    if (!await tile.count()) {
      console.warn(`  ⚠ tile not found: ${type}`);
      continue;
    }

    // Listen for any API errors
    const errors = [];
    page.on("response", resp => {
      if (!resp.ok() && resp.url().includes("localhost:8000")) {
        errors.push(`${resp.status()} ${resp.url()}`);
      }
    });

    await tile.click();
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${OUT}/${type}_preview.png` });

    // Enter canvas editor
    const editBtn = page.getByRole("button", { name: /edit in canvas/i });
    if (await editBtn.count()) {
      await editBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${OUT}/${type}_canvas.png` });

      // Click somewhere in the slide to test object selectability
      const canvas = page.locator("canvas").first();
      const box = await canvas.boundingBox({ timeout: 8000 }).catch(() => null);
      if (box) {
        await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.35);
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${OUT}/${type}_clicked.png` });

        // Check if something was selected (right panel shows "TEXT" or "OBJECT")
        const panelHeader = await page.locator("text=TEXT, text=OBJECT, text=GROUP").first().textContent({ timeout: 1000 }).catch(() => "");
        if (panelHeader) {
          console.log(`  ✓ Object selected — panel shows: ${panelHeader}`);
        } else {
          console.warn(`  ⚠ Nothing selected after click`);
        }
      } else {
        console.warn(`  ⚠ Canvas not found`);
      }
    } else {
      console.warn(`  ⚠ "Edit in canvas" button not found`);
    }

    if (errors.length) {
      console.error(`  ✗ API errors: ${errors.join(", ")}`);
    } else {
      console.log(`  ✓ No API errors`);
    }
  }

  console.log(`\nValidation screenshots → ${OUT}`);
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
