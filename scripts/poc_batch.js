/**
 * POC batch test — renders hook slides from multiple runs (Aurora + Lumina)
 * and reports aggregate scores. Each run creates a timestamped iteration
 * sub-directory so previous results are never overwritten.
 *
 * Usage: node scripts/poc_batch.js [--iteration N]
 *
 * Output: backend/outputs/test-runs/poc/batch/iteration<N>/<run_id>/
 */

const path      = require('path');
const fs        = require('fs');
const { execSync } = require('child_process');
const { chromium } = require(`${__dirname}/../frontend/node_modules/@playwright/test`);

const {
  scoreBand, JS_ERROR_MAX_LENGTH, startStaticServer, getFreePort,
  compareImages, loadHookSlide, loadImageUrl,
} = require('./poc_utils');

// ── Paths ─────────────────────────────────────────────────────────────────────
const PROJECT      = path.resolve(__dirname, '..');
const RUNS_DIR     = `${PROJECT}/backend/outputs/runs`;
const BACKEND_ROOT = `${PROJECT}/backend`;

// ── Args ──────────────────────────────────────────────────────────────────────
const iterIdx   = process.argv.indexOf('--iteration');
const ITERATION = iterIdx >= 0 ? parseInt(process.argv[iterIdx + 1], 10) : 1;

const ITER_DIR = path.join(PROJECT, 'backend/outputs/test-runs/poc/batch', `iteration${ITERATION}`);
fs.mkdirSync(ITER_DIR, { recursive: true });

// ── Test runs ─────────────────────────────────────────────────────────────────
const TEST_RUNS = [
  // Aurora
  '283fcc93-fc7c-4fe3-bd43-ed012be93d03',
  '30afa4ae-2de1-4f4a-9527-5ed3b65045bc',
  '335ca26c-b2b5-41db-8dd1-0750c08147ac',
  '3ba8325b-6df9-4eb7-9fea-b1cf18a199ce',
  // Lumina
  '16d6ff62-cbd9-4fb1-8f5f-1c7e7df60c2e',
  '4c575d10-89ba-4c15-b714-330b06fc8deb',
  '9d73b8f6-75fa-4b4d-b414-8db8c39c065e',
  'f0b8ab08-6a28-4fd7-a013-f0da74c709c4',
];

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🔬 POC Batch — Iteration ${ITERATION} — ${TEST_RUNS.length} runs\n`);

  const port   = await getFreePort();
  const server = startStaticServer(BACKEND_ROOT, port);
  const baseUrl = `http://localhost:${port}`;
  console.log(`  Server: ${baseUrl}\n`);

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const runId of TEST_RUNS) {
    let hookData, imageUrl, refPng;
    try {
      hookData = loadHookSlide(RUNS_DIR, runId);
      imageUrl = loadImageUrl(RUNS_DIR, BACKEND_ROOT, runId, hookData.hook.slide_number ?? 1);
      refPng   = path.join(RUNS_DIR, runId, 'content/angle_0/png/slide_01.png');
      if (!fs.existsSync(refPng)) throw new Error('reference PNG missing');
    } catch (e) {
      console.log(`  ⚠️  ${runId.slice(0, 8)}: skip — ${e.message}`);
      continue;
    }

    const { hook, total, theme } = hookData;
    const runOutDir = path.join(ITER_DIR, runId);
    fs.mkdirSync(runOutDir, { recursive: true });

    const outRef  = path.join(runOutDir, 'reference.png');
    const outGen  = path.join(runOutDir, 'generated.png');
    const outComp = path.join(runOutDir, 'composite.png');
    fs.copyFileSync(refPng, outRef);

    const jsErrors = [];
    const page     = await browser.newPage();
    await page.setViewportSize({ width: 1080, height: 1080 });
    page.on('console',   m => { if (m.type() === 'error') jsErrors.push(m.text().slice(0, JS_ERROR_MAX_LENGTH)); });
    page.on('pageerror', e => jsErrors.push(e.message.slice(0, JS_ERROR_MAX_LENGTH)));

    let rendered = false;
    try {
      await page.goto(`${baseUrl}/renderer/slide_render.html`, { waitUntil: 'networkidle' });
      await page.evaluate(
        async (args) => { await window.Renderer.render(args.slide, args.opts); },
        { slide: { ...hook, image_url: imageUrl }, opts: { imageBaseUrl: baseUrl, totalSlides: total } },
      );
      const dataUrl = await page.evaluate(() => document.querySelector('canvas')?.toDataURL('image/png') ?? null);
      if (dataUrl?.startsWith('data:image')) {
        fs.writeFileSync(outGen, Buffer.from(dataUrl.split(',')[1], 'base64'));
        rendered = true;
      }
    } catch (e) {
      jsErrors.push(e.message.slice(0, 80));
    }
    await page.close();

    const metrics = compareImages(outRef, outGen);
    const band    = scoreBand(metrics.contentDiffPct ?? 100);

    if (rendered && fs.existsSync(outRef)) {
      try { execSync(`convert "${outRef}" "${outGen}" +append "${outComp}" 2>/dev/null`); }
      catch { /* ImageMagick optional */ }
    }

    const result = {
      runId, theme,
      title:           (hook.title ?? '').slice(0, 55),
      score:           band.label,
      pass:            band.pass,
      contentZoneDiff: metrics.contentDiffPct ?? 100,
      fullCanvasDiff:  metrics.fullDiffPct ?? 100,
      jsErrors:        jsErrors.length,
      rendered,
    };
    results.push(result);

    console.log(`  [${theme.padEnd(6)}] ${band.label} — content ${result.contentZoneDiff}% | full ${result.fullCanvasDiff}%`);
    console.log(`           "${result.title}"`);
    if (jsErrors.length) console.log(`           ⚠️  JS: ${jsErrors[0]}`);
  }

  await browser.close();
  server.close();

  // ── Aggregate ──────────────────────────────────────────────────────────────
  const passing  = results.filter(r => r.pass);
  const aurora   = results.filter(r => r.theme === 'aurora');
  const lumina   = results.filter(r => r.theme === 'lumina');
  const avgDiff  = arr => arr.length ? (arr.reduce((s, r) => s + r.contentZoneDiff, 0) / arr.length).toFixed(1) : 'n/a';

  console.log(`\n${'═'.repeat(65)}`);
  console.log(`📊 Batch Iteration ${ITERATION} Summary`);
  console.log(`   Passed:      ${passing.length} / ${results.length}`);
  console.log(`   Aurora avg:  ${avgDiff(aurora)}% content diff  (${aurora.filter(r => r.pass).length}/${aurora.length} pass)`);
  console.log(`   Lumina avg:  ${avgDiff(lumina)}% content diff  (${lumina.filter(r => r.pass).length}/${lumina.length} pass)`);
  console.log(`   Overall avg: ${avgDiff(results)}% content diff`);
  console.log(`   Output dir:  ${ITER_DIR}`);
  console.log(`${'═'.repeat(65)}\n`);

  const report = { iteration: ITERATION, timestamp: new Date().toISOString(), results };
  fs.writeFileSync(path.join(ITER_DIR, 'report.json'), JSON.stringify(report, null, 2));

  if (passing.length === results.length) {
    console.log(`✅ ALL PASS — POC validated across Aurora + Lumina.\n`);
    process.exit(0);
  } else {
    console.log(`❌ ${results.length - passing.length} run(s) need attention — check ${ITER_DIR}\n`);
    process.exit(1);
  }
})();
