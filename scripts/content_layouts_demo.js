/**
 * Renders slide 9 of run 70dc4da9 in all 4 image-position layout variants.
 * Temporarily patches canvas_template in slides.json for each render, then restores.
 * Output: backend/outputs/test-runs/layout_variants/content_[0-3].png
 *
 * Usage: node scripts/content_layouts_demo.js
 */

const path = require('path');
const fs   = require('fs');
const PROJECT  = path.resolve(__dirname, '..');
const FRONTEND = path.join(PROJECT, 'frontend');
const { chromium } = require(path.join(FRONTEND, 'node_modules/@playwright/test'));

const RUN_ID  = '70dc4da9-086a-48da-942f-e0b92da07e13';
const SLIDE_N = 9;
const BASE_URL = 'http://localhost:3000';
const OUT_DIR  = path.join(PROJECT, 'backend/outputs/test-runs/layout_variants');

const SLIDES_JSON = path.join(
  PROJECT, 'backend/outputs/runs', RUN_ID, 'content/angle_0/slides.json'
);

const LAYOUTS = [
  { template: 'aurora-content-0', label: 'Layout 0 — Text LEFT  / Image RIGHT' },
  { template: 'aurora-content-3', label: 'Layout 3 — Image LEFT / Text RIGHT'  },
  { template: 'aurora-content-1', label: 'Layout 1 — Text TOP   / Image BOTTOM' },
  { template: 'aurora-content-2', label: 'Layout 2 — Image TOP  / Text BOTTOM'  },
];

function patchSlide(template) {
  const data = JSON.parse(fs.readFileSync(SLIDES_JSON, 'utf8'));
  data.slides[SLIDE_N - 1].canvas_template = template;
  fs.writeFileSync(SLIDES_JSON, JSON.stringify(data, null, 2));
}

function restoreSlide() {
  const data = JSON.parse(fs.readFileSync(SLIDES_JSON, 'utf8'));
  data.slides[SLIDE_N - 1].canvas_template = null;
  fs.writeFileSync(SLIDES_JSON, JSON.stringify(data, null, 2));
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const { template, label } of LAYOUTS) {
    console.log(`\n  Rendering: ${label}`);

    // Patch slides.json so the editor picks up this template
    patchSlide(template);
    await new Promise(r => setTimeout(r, 500)); // small delay for fs flush

    const url = `${BASE_URL}/editor?run=${RUN_ID}&view=slide&angle=0&slide=${SLIDE_N}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const editBtn = page.locator('button', { hasText: /(Edit in canvas|Open in canvas editor)/i }).first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
      await page.waitForTimeout(14000);
    } else {
      await page.waitForTimeout(7000);
    }

    const dataUrl = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return c ? c.toDataURL('image/png') : null;
    });

    if (dataUrl && dataUrl.startsWith('data:image/png')) {
      const outFile = path.join(OUT_DIR, `${template}.png`);
      fs.writeFileSync(outFile, Buffer.from(dataUrl.split(',')[1], 'base64'));
      console.log(`  ✅ Saved: ${outFile}`);
    } else {
      console.log(`  ❌ Canvas not found`);
    }
  }

  await browser.close();

  // Always restore
  restoreSlide();
  console.log(`\nRestored slides.json. All 4 layouts saved to: ${OUT_DIR}\n`);
})().catch(err => {
  restoreSlide();
  console.error(err);
  process.exit(1);
});
