/**
 * POC single-run loop — GAN-style visual comparison for one run's hook slide.
 * Exits 0 on PASS (EXCELLENT or GREAT), 1 on FAIL, 2 on setup error.
 *
 * Usage:
 *   node scripts/poc_loop.js <run_id> [--iteration N]
 *
 * Output: backend/outputs/test-runs/poc/<run_id>/iteration<N>/
 *   report.json, composite.png, reference_slide.png, generated_slide.png, diff_slide.png
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
const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('--')) {
  console.error('Usage: node scripts/poc_loop.js <run_id> [--iteration N]');
  process.exit(2);
}
const RUN_ID    = args[0];
const iterIdx   = args.indexOf('--iteration');
const ITERATION = iterIdx >= 0 ? parseInt(args[iterIdx + 1], 10) : 1;

const ITER_DIR = path.join(PROJECT, 'backend/outputs/test-runs/poc', RUN_ID, `iteration${ITERATION}`);
fs.mkdirSync(ITER_DIR, { recursive: true });

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🔁 POC Loop — Iteration ${ITERATION} — Run ${RUN_ID}\n`);

  let hookData, imageUrl, refPng;
  try {
    hookData = loadHookSlide(RUNS_DIR, RUN_ID);
    imageUrl = loadImageUrl(RUNS_DIR, BACKEND_ROOT, RUN_ID, hookData.hook.slide_number ?? 1);
    refPng   = path.join(RUNS_DIR, RUN_ID, 'content/angle_0/png/slide_01.png');
    if (!fs.existsSync(refPng)) throw new Error(`Reference PNG not found: ${refPng}`);
  } catch (e) {
    console.error(`❌ Setup error: ${e.message}`);
    process.exit(2);
  }

  const { hook, total, theme } = hookData;
  console.log(`  Slide:    "${(hook.title ?? '').slice(0, 60)}"`);
  console.log(`  Theme:    ${theme}  (template: ${hook.canvas_template})`);
  console.log(`  Image:    ${imageUrl ?? '(none)'}`);

  const port   = await getFreePort();
  const server = startStaticServer(BACKEND_ROOT, port);
  const baseUrl = `http://localhost:${port}`;
  console.log(`  Server:   ${baseUrl}`);

  const outRef  = path.join(ITER_DIR, 'reference_slide.png');
  const outGen  = path.join(ITER_DIR, 'generated_slide.png');
  const outDiff = path.join(ITER_DIR, 'diff_slide.png');
  const outComp = path.join(ITER_DIR, 'composite.png');
  fs.copyFileSync(refPng, outRef);

  const jsErrors = [];
  console.log(`\n  Rendering…`);

  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1080 });
  page.on('console',   m => { if (m.type() === 'error') jsErrors.push(m.text().slice(0, JS_ERROR_MAX_LENGTH)); });
  page.on('pageerror', e => jsErrors.push(e.message.slice(0, JS_ERROR_MAX_LENGTH)));

  try {
    await page.goto(`${baseUrl}/renderer/slide_render.html`, { waitUntil: 'networkidle' });
    await page.evaluate(
      async (args) => { await window.Renderer.render(args.slide, args.opts); },
      { slide: { ...hook, image_url: imageUrl }, opts: { imageBaseUrl: baseUrl, totalSlides: total } },
    );
    const dataUrl = await page.evaluate(() => document.querySelector('canvas')?.toDataURL('image/png') ?? null);
    if (dataUrl?.startsWith('data:image')) {
      fs.writeFileSync(outGen, Buffer.from(dataUrl.split(',')[1], 'base64'));
      console.log(`  ✓ Rendered → ${outGen}`);
    } else {
      jsErrors.push('canvas not found or empty');
    }
  } catch (e) {
    jsErrors.push(e.message.slice(0, JS_ERROR_MAX_LENGTH));
    console.error(`  ❌ Render error: ${e.message}`);
  }

  await browser.close();
  server.close();

  console.log(`\n  Comparing…`);
  const metrics = compareImages(outRef, outGen, outDiff);
  if (metrics.error) console.error(`  ❌ ${metrics.error}`);

  // Side-by-side composite via ImageMagick
  if (fs.existsSync(outGen) && fs.existsSync(outDiff)) {
    try { execSync(`convert "${outRef}" "${outGen}" "${outDiff}" +append "${outComp}" 2>/dev/null`); }
    catch { /* ImageMagick optional */ }
  }

  const primaryDiff = metrics.contentDiffPct ?? 100;
  const band        = scoreBand(primaryDiff);

  const report = {
    iteration: ITERATION, runId: RUN_ID,
    timestamp: new Date().toISOString(),
    slideTitle: hook.title ?? '', theme,
    score: band.label, scoreDesc: band.desc, pass: band.pass,
    contentZoneDiffPct: metrics.contentDiffPct ?? 100,
    fullCanvasDiffPct:  metrics.fullDiffPct ?? 100,
    jsErrors: jsErrors.concat(metrics.error ? [metrics.error] : []),
  };
  fs.writeFileSync(path.join(ITER_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log(`\n${'─'.repeat(65)}`);
  console.log(`📊 Iteration ${ITERATION} — ${band.label}`);
  console.log(`   Content zone: ${report.contentZoneDiffPct}%  |  Full canvas: ${report.fullCanvasDiffPct}%`);
  if (jsErrors.length) console.log(`   JS errors:    ${jsErrors[0]}`);
  if (fs.existsSync(outComp)) console.log(`   Composite:    ${outComp}`);
  console.log(`${'─'.repeat(65)}\n`);

  if (band.pass) {
    console.log(`✅ PASS — hook slide renders correctly via Fabric.js.\n`);
    process.exit(0);
  } else {
    console.log(`❌ FAIL — ${primaryDiff}% diff. Fix and re-run:`);
    console.log(`   node scripts/poc_loop.js ${RUN_ID} --iteration ${ITERATION + 1}\n`);
    process.exit(1);
  }
})();
