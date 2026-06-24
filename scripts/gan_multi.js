/**
 * GAN Multi-Run Template Validation Script
 * =========================================
 *
 * Architecture:
 *   - Loads GAN_CATALOG.json (built by catalog_builder.py from all runs)
 *   - For each template type, renders up to 10 real slides from different runs
 *   - Compares generated vs reference PNGs per-slide
 *   - Aggregates scores per template type
 *   - Optionally runs an LLM reasoning pass to identify common failure patterns
 *   - Writes a structured report + per-type summary
 *
 * Usage:
 *   node scripts/gan_multi.js [--iterations N] [--template aurora-stat] [--llm]
 *
 * Examples:
 *   node scripts/gan_multi.js                          # run all templates, 1 iteration
 *   node scripts/gan_multi.js --template aurora-hook   # focus on hook only
 *   node scripts/gan_multi.js --llm                    # add LLM reasoning analysis
 */

const fs   = require('fs');
const path = require('path');

const PROJECT  = path.resolve(__dirname, '..');
const FRONTEND = path.join(PROJECT, 'frontend');

const { chromium } = require(path.join(FRONTEND, 'node_modules/@playwright/test'));
const { PNG }      = require(path.join(FRONTEND, 'node_modules/pngjs/lib/png.js'));
const pixelmatch   = require(path.join(FRONTEND, 'node_modules/pixelmatch/index.js')).default;

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL     = 'http://localhost:3000';
const CATALOG_PATH = path.join(__dirname, 'GAN_CATALOG.json');
const OUT_ROOT  = path.join(PROJECT, 'backend/outputs/test-runs/_multi');

const args = process.argv.slice(2);
const getArg = (flag, def = null) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const FLAG_TEMPLATE = getArg('--template');   // filter to one template type
const FLAG_LLM      = args.includes('--llm'); // run LLM analysis after
const MAX_SAMPLES   = parseInt(getArg('--samples', '10'), 10);
const WAIT_CANVAS   = 14000;  // ms after clicking "Edit in canvas"

const RUN_ID = `multi_${Date.now()}`;
const ITER_DIR = path.join(OUT_ROOT, RUN_ID);
const GEN_DIR  = path.join(ITER_DIR, 'generated');
const DIFF_DIR = path.join(ITER_DIR, 'diff');
const COMP_DIR = path.join(ITER_DIR, 'composite');

// ── Score bands ───────────────────────────────────────────────────────────────
// NOTE: Pixel diff vs Jinja2/Playwright reference will always be non-zero because
// HTML rendering ≠ Fabric canvas 2D (different font hinting, chart engine, AA).
// Bands measure "how close is the Fabric render to the reference design intent",
// not "is this a pixel-perfect duplicate". <15% = visually equivalent. >35% = layout broken.

const SCORE_BANDS = [
  { max: 5,   emoji: '🏆', label: 'EXCELLENT', desc: '<5% — near-pixel-perfect' },
  { max: 15,  emoji: '✅', label: 'GREAT',     desc: '5-15% — visually equivalent' },
  { max: 25,  emoji: '🟡', label: 'GOOD',      desc: '15-25% — minor layout diff' },
  { max: 35,  emoji: '🟠', label: 'FAIR',      desc: '25-35% — noticeable diff' },
  { max: 100, emoji: '🔴', label: 'BROKEN',    desc: '>35% — layout broken' },
];
const band = pct => SCORE_BANDS.find(b => pct < b.max) ?? SCORE_BANDS.at(-1);

// ── Pixel diff ────────────────────────────────────────────────────────────────
// For slides with background images, ~60% of pixel diff is engine-level rendering
// noise (CSS blur vs Canvas 2D blur). We measure TWO scores:
//   full:    whole-canvas diff (includes bg noise)
//   content: bottom 55% of canvas only — brand bar + glass card area — the part
//            that actually matters for layout quality

function compareImages(refPath, genPath, diffPath) {
  if (!fs.existsSync(genPath)) return { diffPct: 100, error: 'missing' };
  try {
    const ref = PNG.sync.read(fs.readFileSync(refPath));
    const gen = PNG.sync.read(fs.readFileSync(genPath));
    const { width, height } = ref;
    const diff = new PNG({ width, height });

    // Full canvas comparison
    const mismatch = pixelmatch(ref.data, gen.data, diff.data, width, height, {
      threshold: 0.15, includeAA: false,
    });
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    const fullDiffPct = (mismatch / (width * height)) * 100;

    // Content-zone comparison: bottom 55% of canvas (row 486 onward at 1080px)
    // This covers the glass card, body text and brand bar — skips most bg image area
    const contentStartRow = Math.floor(height * 0.45);
    const contentPixels   = width * (height - contentStartRow);
    const contentDiff     = new PNG({ width, height: height - contentStartRow });

    // Extract sub-regions
    const stride = width * 4;
    const refSub = ref.data.slice(contentStartRow * stride);
    const genSub = gen.data.slice(contentStartRow * stride);
    const contentMismatch = pixelmatch(refSub, genSub, contentDiff.data, width, height - contentStartRow, {
      threshold: 0.15, includeAA: false,
    });
    const contentDiffPct = (contentMismatch / contentPixels) * 100;

    // Primary score = content zone diff (fairer for image-backed templates)
    return {
      diffPct: contentDiffPct,
      fullDiffPct,
      mismatch: contentMismatch,
      totalPixels: contentPixels,
    };
  } catch (e) {
    return { diffPct: 100, error: e.message };
  }
}

// ── Render one slide ───────────────────────────────────────────────────────────

async function renderSlide(page, entry, genPng, attempt = 1) {
  const { run_id, slide_n } = entry;
  const url = `${BASE_URL}/editor?run=${run_id}&view=slide&angle=0&slide=${slide_n}`;

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Click "Edit in canvas" or "Open in canvas editor" if preview mode
  const editBtn = page.locator('button', { hasText: /(Edit in canvas|Open in canvas editor)/i }).first();
  if (await editBtn.count() > 0) {
    await editBtn.click();
    await page.waitForTimeout(WAIT_CANVAS);
  } else {
    await page.waitForTimeout(6000);
  }

  // Extract native 1080×1080 via canvas.toDataURL (lossless, no upscale blur)
  const dataUrl = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? c.toDataURL('image/png') : null;
  });

  if (dataUrl && dataUrl.startsWith('data:image/png')) {
    fs.writeFileSync(genPng, Buffer.from(dataUrl.split(',')[1], 'base64'));
    return true;
  }

  // Retry once after an extra wait — canvas may still be initialising
  if (attempt < 2) {
    await page.waitForTimeout(5000);
    const retry = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return c ? c.toDataURL('image/png') : null;
    });
    if (retry && retry.startsWith('data:image/png')) {
      fs.writeFileSync(genPng, Buffer.from(retry.split(',')[1], 'base64'));
      return true;
    }
  }
  return false;
}

// ── Build composite (ref | generated | diff) ──────────────────────────────────

function buildComposite(refPng, genPng, diffPng, compPng) {
  try {
    const { execSync } = require('child_process');
    execSync(`magick "${refPng}" "${genPng}" "${diffPng}" +append "${compPng}" 2>/dev/null || convert "${refPng}" "${genPng}" "${diffPng}" +append "${compPng}" 2>/dev/null`);
  } catch {}
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error('❌ GAN_CATALOG.json not found. Run catalog_builder.py first.');
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  for (const d of [GEN_DIR, DIFF_DIR, COMP_DIR]) fs.mkdirSync(d, { recursive: true });

  // Filter catalog if --template specified
  const templateKeys = Object.keys(catalog).filter(k =>
    !FLAG_TEMPLATE || k.startsWith(FLAG_TEMPLATE)
  );

  console.log(`\n🧬 GAN Multi-Run Validation`);
  console.log(`   Templates: ${templateKeys.length} types | Max samples: ${MAX_SAMPLES} per type`);
  if (FLAG_TEMPLATE) console.log(`   Filtered to: ${FLAG_TEMPLATE}`);
  console.log(`   Output: ${ITER_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── Per-template results ────────────────────────────────────────────────────
  const templateResults = {};

  for (const templateKey of templateKeys) {
    const entries = catalog[templateKey].slice(0, MAX_SAMPLES);
    const baseTemplate = templateKey.split('::')[0];
    const chartType    = templateKey.includes('::') ? templateKey.split('::')[1] : null;

    console.log(`\n  ── ${templateKey} (${entries.length} samples) ──`);
    const slideResults = [];

    for (const entry of entries) {
      const { run_id, slide_n, ref_png } = entry;
      const slug   = `${run_id.slice(0,8)}_s${String(slide_n).padStart(2,'0')}`;
      const genPng  = path.join(GEN_DIR,  `${slug}.png`);
      const diffPng = path.join(DIFF_DIR, `${slug}.png`);
      const compPng = path.join(COMP_DIR, `${slug}.png`);

      process.stdout.write(`    ${slug}… `);

      if (!fs.existsSync(ref_png)) {
        console.log('⚠️  ref PNG missing — skipping');
        slideResults.push({ slug, run_id, slide_n, diffPct: null, score: '⚠️ SKIP', error: 'ref missing' });
        continue;
      }

      const ok = await renderSlide(page, entry, genPng).catch(() => false);
      if (!ok || !fs.existsSync(genPng)) {
        console.log('❌ render failed');
        slideResults.push({ slug, run_id, slide_n, diffPct: 100, score: '🔴 POOR', error: 'render failed' });
        continue;
      }

      const metrics = compareImages(ref_png, genPng, diffPng);
      buildComposite(ref_png, genPng, diffPng, compPng);
      const b = band(metrics.diffPct);
      const fullStr = metrics.fullDiffPct != null ? ` (full:${metrics.fullDiffPct.toFixed(1)}%)` : '';
      console.log(`${b.emoji} ${metrics.diffPct?.toFixed(1)}%${fullStr}`);
      slideResults.push({ slug, run_id, slide_n, ...metrics, score: `${b.emoji} ${b.label}`, composite: compPng });
    }

    const valid   = slideResults.filter(r => !r.error);
    const avgDiff = valid.length
      ? valid.reduce((s, r) => s + r.diffPct, 0) / valid.length
      : 100;
    const b = band(avgDiff);

    templateResults[templateKey] = {
      template: baseTemplate,
      chartType,
      sampleCount: entries.length,
      avgDiff: Math.round(avgDiff * 100) / 100,
      overallBand: `${b.emoji} ${b.label}`,
      distribution: {
        perfect:   slideResults.filter(r => r.diffPct < 1).length,
        excellent: slideResults.filter(r => r.diffPct >= 1  && r.diffPct < 5).length,
        good:      slideResults.filter(r => r.diffPct >= 5  && r.diffPct < 15).length,
        fair:      slideResults.filter(r => r.diffPct >= 15 && r.diffPct < 30).length,
        poor:      slideResults.filter(r => r.diffPct >= 30).length,
      },
      slides: slideResults,
      worstSlides: [...slideResults].sort((a,b) => (b.diffPct||0) - (a.diffPct||0)).slice(0,3)
        .map(r => ({ slug: r.slug, diffPct: r.diffPct?.toFixed(1), score: r.score, composite: r.composite })),
    };
  }

  await browser.close();

  // ── Aggregate summary ───────────────────────────────────────────────────────
  const allDiffs = Object.values(templateResults).map(r => r.avgDiff);
  const overallAvg = allDiffs.reduce((s, d) => s + d, 0) / allDiffs.length;

  console.log(`\n${'═'.repeat(64)}`);
  console.log(`📊 GAN Multi-Run Report — ${new Date().toISOString().slice(0,19)}`);
  console.log(`   Overall average: ${band(overallAvg).emoji} ${overallAvg.toFixed(1)}%`);
  console.log(`${'─'.repeat(64)}`);

  const sorted = Object.entries(templateResults).sort((a,b) => b[1].avgDiff - a[1].avgDiff);
  for (const [key, r] of sorted) {
    const dist = `P${r.distribution.perfect}/E${r.distribution.excellent}/G${r.distribution.good}/F${r.distribution.fair}/X${r.distribution.poor}`;
    console.log(`  ${r.overallBand.padEnd(16)} ${key.padEnd(28)} ${r.avgDiff.toFixed(1)}% avg  [${dist}]`);
  }

  // ── LLM reasoning pass ──────────────────────────────────────────────────────
  if (FLAG_LLM) {
    console.log(`\n${'─'.repeat(64)}`);
    console.log(`🤖 LLM Analysis (calling backend)…`);
    try {
      const worstEntries = sorted
        .filter(([,r]) => r.avgDiff > 10)
        .map(([key, r]) => ({
          template: key,
          avgDiff: r.avgDiff,
          worstSlides: r.worstSlides,
        }));

      const prompt = `You are analyzing template rendering quality for a Fabric.js carousel editor.

The templates are Fabric.js canvas templates that recreate Instagram carousel slides.
Each template is compared pixel-by-pixel against reference PNGs generated by Playwright/Jinja2.

Here are the templates with >10% average pixel diff (worst performers):
${JSON.stringify(worstEntries, null, 2)}

For each template, analyze the likely root causes of pixel difference and suggest specific code fixes.
Focus on: layout positioning, font sizing, spacing, image crop, gradient rendering.
Be concrete and actionable. Format as JSON: { "templateKey": { "issues": [...], "fixes": [...] } }`;

      const response = await fetch(`http://localhost:8000/api/v1/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await response.json();
      const analysis = data.reply || data.error || 'No response';
      console.log('\n' + analysis);

      // Save analysis
      const analysisPath = path.join(ITER_DIR, 'llm_analysis.json');
      fs.writeFileSync(analysisPath, JSON.stringify({ prompt, analysis, timestamp: new Date().toISOString() }, null, 2));
      console.log(`\n  Analysis saved to: ${analysisPath}`);
    } catch (e) {
      console.log(`  LLM call failed: ${e.message}`);
    }
  }

  // ── Save full report ────────────────────────────────────────────────────────
  const report = {
    runId: RUN_ID,
    timestamp: new Date().toISOString(),
    overallAvgDiff: Math.round(overallAvg * 100) / 100,
    overallBand: `${band(overallAvg).emoji} ${band(overallAvg).label}`,
    templateResults,
    outputDir: ITER_DIR,
  };

  const reportPath = path.join(ITER_DIR, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`  Full report: ${reportPath}`);
  console.log(`  Composites:  ${COMP_DIR}`);
  console.log(`${'═'.repeat(64)}\n`);

  process.exit(0);
})();
