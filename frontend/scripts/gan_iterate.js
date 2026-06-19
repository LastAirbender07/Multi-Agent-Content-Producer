/**
 * GAN-style iteration script for Fabric.js canvas template validation.
 *
 * Usage: node scripts/gan_iterate.js <iteration_number>
 *
 * For each iteration:
 *   1. Playwright renders all 12 slides via the editor canvas
 *   2. Each rendered PNG is saved to test-runs/<run_id>/iteration<N>/generated/
 *   3. pixelmatch compares generated vs reference
 *   4. A detailed report is saved to test-runs/<run_id>/iteration<N>/report.json
 *   5. Side-by-side composite images saved for visual inspection
 */

const { chromium } = require('../node_modules/@playwright/test');
const fs   = require('fs');
const path = require('path');
const { PNG } = require('../node_modules/pngjs/lib/png.js');
const pixelmatch = require('../node_modules/pixelmatch/index.js').default;

const RUN_ID   = '4c575d10-89ba-4c15-b714-330b06fc8deb';
const BASE_URL = 'http://localhost:3000';
const REF_DIR  = path.resolve(__dirname, `../backend/outputs/runs/${RUN_ID}/content/angle_0/png`);
const OUT_ROOT = path.resolve(__dirname, `../backend/outputs/test-runs/${RUN_ID}`);
const ITERATION = parseInt(process.argv[2] ?? '1', 10);
const ITER_DIR  = path.join(OUT_ROOT, `iteration${ITERATION}`);
const GEN_DIR   = path.join(ITER_DIR, 'generated');
const DIFF_DIR  = path.join(ITER_DIR, 'diff');
const COMP_DIR  = path.join(ITER_DIR, 'composite');

const SLIDE_TYPES = [
  { n: 1,  type: 'hook',    template: 'aurora-hook' },
  { n: 2,  type: 'content', template: 'aurora-content-0' },
  { n: 3,  type: 'stat',    template: 'aurora-stat' },         // funnel chart
  { n: 4,  type: 'stat',    template: 'aurora-stat' },         // line chart
  { n: 5,  type: 'content', template: 'aurora-content-0' },
  { n: 6,  type: 'engage',  template: 'aurora-engage' },
  { n: 7,  type: 'content', template: 'aurora-content-0' },
  { n: 8,  type: 'content', template: 'aurora-content-0' },
  { n: 9,  type: 'content', template: 'aurora-content-0' },
  { n: 10, type: 'content', template: 'aurora-content-0' },
  { n: 11, type: 'quote',   template: 'aurora-quote' },
  { n: 12, type: 'cta',     template: 'aurora-cta' },
];

for (const d of [GEN_DIR, DIFF_DIR, COMP_DIR]) {
  fs.mkdirSync(d, { recursive: true });
}

// ── Metric labels ─────────────────────────────────────────────────────────────
const SCORE_BANDS = [
  { max: 1,   label: '🏆 PERFECT',    desc: '<1% pixel diff' },
  { max: 5,   label: '✅ EXCELLENT',  desc: '1-5% diff' },
  { max: 15,  label: '🟡 GOOD',       desc: '5-15% diff' },
  { max: 30,  label: '🟠 FAIR',       desc: '15-30% diff' },
  { max: 100, label: '🔴 POOR',       desc: '>30% diff' },
];

function scoreBand(pct) {
  return SCORE_BANDS.find(b => pct < b.max) ?? SCORE_BANDS.at(-1);
}

// ── Pixel comparison ──────────────────────────────────────────────────────────
function compareImages(refPath, genPath, diffPath) {
  if (!fs.existsSync(genPath)) {
    return { error: 'generated file missing', diffPct: 100, matchedPixels: 0, totalPixels: 0 };
  }
  const refPng = PNG.sync.read(fs.readFileSync(refPath));
  const genRaw = fs.readFileSync(genPath);
  let genPng;
  try {
    genPng = PNG.sync.read(genRaw);
  } catch {
    return { error: 'generated PNG parse error', diffPct: 100, matchedPixels: 0, totalPixels: 0 };
  }

  const { width, height } = refPng;
  // Resize gen to match ref if needed
  const diffImg = new PNG({ width, height });
  let mismatch;
  try {
    mismatch = pixelmatch(refPng.data, genPng.data, diffImg.data, width, height, {
      threshold: 0.15,  // slightly lenient for font anti-aliasing
      includeAA: false,
    });
  } catch (e) {
    return { error: `pixelmatch error: ${e.message}`, diffPct: 100, matchedPixels: 0, totalPixels: width * height };
  }

  fs.writeFileSync(diffPath, PNG.sync.write(diffImg));
  const totalPixels = width * height;
  const diffPct = (mismatch / totalPixels) * 100;
  return { diffPct, mismatch, totalPixels, matchedPixels: totalPixels - mismatch };
}

// ── Main render loop ──────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🔁 GAN Iteration ${ITERATION} — Run ${RUN_ID}\n`);

  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  const results = [];

  for (const slide of SLIDE_TYPES) {
    const n      = slide.n;
    const padded = String(n).padStart(2, '0');
    const url    = `${BASE_URL}/editor?run=${RUN_ID}&view=slide&angle=0&slide=${n}`;
    const refPng = path.join(REF_DIR,  `slide_${padded}.png`);
    const genPng = path.join(GEN_DIR,  `slide_${padded}.png`);
    const diffPng= path.join(DIFF_DIR, `slide_${padded}.png`);
    const compPng= path.join(COMP_DIR, `slide_${padded}.png`);

    console.log(`  Rendering slide ${n} (${slide.template})…`);
    const slideErrors = [];
    page.on('console', m => { if (m.type() === 'error') slideErrors.push(m.text().slice(0, 120)); });

    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      // Enter edit mode if in preview
      const editBtn = page.locator('button', { hasText: 'Edit in canvas' }).first();
      if (await editBtn.count() > 0) {
        await editBtn.click();
        await page.waitForTimeout(7000);  // wait for fonts + images + template render
      } else {
        await page.waitForTimeout(4000);
      }

      // Get the canvas element bounds and screenshot exactly that area
      const canvasRect = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        if (!c) return null;
        const r = c.getBoundingClientRect();
        return { x: r.left, y: r.top, width: r.width, height: r.height };
      });

      if (!canvasRect) {
        console.log(`    ⚠️  Canvas not found for slide ${n}`);
        slideErrors.push('canvas element not found');
        results.push({ slide: n, template: slide.template, error: 'canvas not found', diffPct: 100, score: '🔴 POOR' });
        continue;
      }

      // Screenshot at native 1080×1080 by capturing the canvas element
      // Then resize to 1080×1080 for fair comparison
      await page.screenshot({
        path: genPng,
        clip: { x: canvasRect.x, y: canvasRect.y, width: canvasRect.width, height: canvasRect.height },
      });

      // Resize screenshot to 1080x1080 to match reference
      const { execSync } = require('child_process');
      execSync(`convert "${genPng}" -resize 1080x1080! "${genPng}"`);

    } catch (err) {
      console.log(`    ❌ Render error slide ${n}: ${err.message}`);
      slideErrors.push(err.message.slice(0, 120));
    }

    // Compare
    const metrics = compareImages(refPng, genPng, diffPng);
    const band    = scoreBand(metrics.diffPct ?? 100);

    // Side-by-side composite: reference | generated | diff
    if (fs.existsSync(genPng) && !metrics.error?.includes('parse')) {
      try {
        const { execSync } = require('child_process');
        execSync(`convert "${refPng}" "${genPng}" "${diffPng}" +append "${compPng}" 2>/dev/null`);
      } catch {}
    }

    const result = {
      slide: n,
      type: slide.type,
      template: slide.template,
      diffPct: Math.round((metrics.diffPct ?? 100) * 100) / 100,
      score: band.label,
      scoreDesc: band.desc,
      mismatchedPixels: metrics.mismatch ?? 0,
      totalPixels: metrics.totalPixels ?? 0,
      consoleErrors: slideErrors,
      paths: { ref: refPng, generated: genPng, diff: diffPng, composite: compPng },
    };
    results.push(result);
    console.log(`    ${band.label} — ${result.diffPct}% diff`);
    if (slideErrors.length) console.log(`    Errors: ${slideErrors[0]}`);
  }

  await browser.close();

  // ── Aggregate report ────────────────────────────────────────────────────────
  const avgDiff   = results.reduce((s, r) => s + (r.diffPct ?? 100), 0) / results.length;
  const overallBand = scoreBand(avgDiff);

  const report = {
    iteration: ITERATION,
    runId: RUN_ID,
    timestamp: new Date().toISOString(),
    overallScore: overallBand.label,
    averageDiffPct: Math.round(avgDiff * 100) / 100,
    slides: results,
    summary: {
      perfect:   results.filter(r => r.diffPct < 1).length,
      excellent: results.filter(r => r.diffPct >= 1 && r.diffPct < 5).length,
      good:      results.filter(r => r.diffPct >= 5 && r.diffPct < 15).length,
      fair:      results.filter(r => r.diffPct >= 15 && r.diffPct < 30).length,
      poor:      results.filter(r => r.diffPct >= 30).length,
    },
    topIssues: results
      .sort((a, b) => (b.diffPct ?? 100) - (a.diffPct ?? 100))
      .slice(0, 5)
      .map(r => ({ slide: r.slide, template: r.template, diffPct: r.diffPct, score: r.score })),
  };

  const reportPath = path.join(ITER_DIR, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📊 Iteration ${ITERATION} Report`);
  console.log(`   Overall: ${report.overallScore} (avg ${report.averageDiffPct}% diff)`);
  console.log(`   Perfect/Excellent/Good/Fair/Poor: ${report.summary.perfect}/${report.summary.excellent}/${report.summary.good}/${report.summary.fair}/${report.summary.poor}`);
  console.log(`   Worst slides:`);
  report.topIssues.forEach(i => console.log(`     Slide ${i.slide} (${i.template}): ${i.diffPct}% — ${i.score}`));
  console.log(`   Report: ${reportPath}`);
  console.log(`${'─'.repeat(60)}\n`);

  process.exit(0);
})();
