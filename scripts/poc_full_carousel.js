/**
 * Full-carousel validation — renders every slide in a run via Fabric.js
 * and compares against existing Jinja2 PNGs. Covers all slide types.
 *
 * Usage: node scripts/poc_full_carousel.js <run_id> [--iteration N]
 *
 * Output: backend/outputs/test-runs/poc/carousel/<run_id>/iteration<N>/
 */

const path      = require('path');
const fs        = require('fs');
const { execSync } = require('child_process');
const { chromium } = require(`${__dirname}/../frontend/node_modules/@playwright/test`);

const {
  SCORE_BANDS, scoreBand, JS_ERROR_MAX_LENGTH,
  startStaticServer, getFreePort,
  compareImages, resolveTheme,
} = require('./poc_utils');

const PROJECT      = path.resolve(__dirname, '..');
const RUNS_DIR     = `${PROJECT}/backend/outputs/runs`;
const BACKEND_ROOT = `${PROJECT}/backend`;

// ── Args ──────────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2).filter(a => !a.startsWith('--'));
const iterIdx  = process.argv.indexOf('--iteration');
const RUN_ID   = args[0];
const ITERATION = iterIdx >= 0 ? parseInt(process.argv[iterIdx + 1], 10) : 1;

if (!RUN_ID) {
  console.error('Usage: node scripts/poc_full_carousel.js <run_id> [--iteration N]');
  process.exit(2);
}

const ITER_DIR = path.join(PROJECT, 'backend/outputs/test-runs/poc/carousel', RUN_ID, `iteration${ITERATION}`);
fs.mkdirSync(ITER_DIR, { recursive: true });

// ── Load all slides from a run ────────────────────────────────────────────────
function loadAllSlides(runId) {
  const slidesPath = path.join(RUNS_DIR, runId, 'content/angle_0/slides.json');
  const raw    = JSON.parse(fs.readFileSync(slidesPath, 'utf8'));
  const slides = Array.isArray(raw) ? raw : (raw.slides ?? []);
  const angle  = Array.isArray(raw) ? {} : (raw.angle ?? {});
  const theme  = resolveTheme(angle.emotional_hook ?? '');
  return slides.map(s => ({
    ...s,
    _theme: theme,
    // Only set canvas_template if it's already a valid stored value.
    // For null/undefined, leave unset so inferTemplate() computes the correct
    // variant (e.g. aurora-content-0 vs -1 vs -2) from image/bullets/body heuristics.
    ...(s.canvas_template ? { canvas_template: s.canvas_template } : {}),
  }));
}

function loadImageUrl(runId, slideNum) {
  const assetsPath = path.join(RUNS_DIR, runId, 'content/angle_0/image_assets.json');
  if (!fs.existsSync(assetsPath)) return null;
  const raw    = JSON.parse(fs.readFileSync(assetsPath, 'utf8'));
  const assets = Array.isArray(raw) ? raw : (raw.image_assets ?? []);
  const asset  = assets.find(a => a.slide_number === slideNum);
  if (!asset) return null;
  const localPath = asset.processed_path || asset.local_raw_path;
  if (!localPath) return null;
  const ext       = path.extname(localPath);
  const canon     = path.join(RUNS_DIR, runId, 'content/angle_0/images', `slide_${String(slideNum).padStart(2,'0')}${ext}`);
  const resolved  = fs.existsSync(canon) ? canon : fs.existsSync(localPath) ? localPath : null;
  return resolved ? '/' + path.relative(BACKEND_ROOT, resolved).replace(/\\/g, '/') : null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🔬 Full Carousel — Iteration ${ITERATION} — Run ${RUN_ID}\n`);

  let slides;
  try {
    slides = loadAllSlides(RUN_ID);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(2);
  }

  const theme = slides[0]?._theme ?? 'aurora';
  console.log(`  Theme: ${theme}  |  Slides: ${slides.length}\n`);

  const port    = await getFreePort();
  const server  = startStaticServer(BACKEND_ROOT, port);
  const baseUrl = `http://localhost:${port}`;

  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1080 });

  const jsErrors = [];
  page.on('console',   m => { if (m.type() === 'error') jsErrors.push(m.text().slice(0, JS_ERROR_MAX_LENGTH)); });
  page.on('pageerror', e => jsErrors.push(e.message.slice(0, JS_ERROR_MAX_LENGTH)));

  // Load shell once — reused for every slide
  await page.goto(`${baseUrl}/renderer/slide_render.html`, { waitUntil: 'networkidle' });

  const results = [];

  for (const slide of slides) {
    const num     = slide.slide_number ?? 1;
    const padded  = String(num).padStart(2, '0');
    const refPng  = path.join(RUNS_DIR, RUN_ID, 'content/angle_0/png', `slide_${padded}.png`);
    const imageUrl = loadImageUrl(RUN_ID, num);

    const slideDir = path.join(ITER_DIR, `slide_${padded}`);
    fs.mkdirSync(slideDir, { recursive: true });

    const outRef  = path.join(slideDir, 'reference.png');
    const outGen  = path.join(slideDir, 'generated.png');
    const outDiff = path.join(slideDir, 'diff.png');
    const outComp = path.join(slideDir, 'composite.png');

    if (!fs.existsSync(refPng)) {
      console.log(`  slide ${padded} (${slide.type}): ⚠️  no reference PNG — skipping`);
      continue;
    }
    fs.copyFileSync(refPng, outRef);

    // Render
    let rendered = false;
    try {
      await page.evaluate(
        async (args) => { await window.Renderer.render(args.slide, args.opts); },
        { slide: { ...slide, image_url: imageUrl }, opts: { imageBaseUrl: baseUrl, totalSlides: slides.length } },
      );
      const dataUrl = await page.evaluate(() => document.querySelector('canvas')?.toDataURL('image/png') ?? null);
      if (dataUrl?.startsWith('data:image')) {
        fs.writeFileSync(outGen, Buffer.from(dataUrl.split(',')[1], 'base64'));
        rendered = true;
      }
    } catch (e) {
      jsErrors.push(`slide ${padded}: ${e.message.slice(0, JS_ERROR_MAX_LENGTH)}`);
      console.log(`             ❌ Render error: ${e.message.slice(0, 120)}`);
    }

    const metrics = compareImages(outRef, outGen, outDiff);
    const band    = scoreBand(metrics.contentDiffPct ?? 100);

    if (rendered && fs.existsSync(outDiff)) {
      try { execSync(`convert "${outRef}" "${outGen}" "${outDiff}" +append "${outComp}" 2>/dev/null`); } catch {}
    }

    const result = {
      slideNum: num, type: slide.type, template: slide.canvas_template,
      score: band.label, pass: band.pass,
      contentZoneDiff: metrics.contentDiffPct ?? 100,
      fullCanvasDiff:  metrics.fullDiffPct ?? 100,
      error: metrics.error,
    };
    results.push(result);

    const indicator = band.pass ? '✅' : band.label.startsWith('🟡') ? '🟡' : band.label.startsWith('🟠') ? '🟠' : '🔴';
    console.log(`  slide ${padded} [${(slide.type).padEnd(7)}] ${indicator} ${band.label.replace(/.*? /,'')} — content ${result.contentZoneDiff}%`);
    if (metrics.error) console.log(`             ⚠️  ${metrics.error}`);
  }

  await browser.close();
  server.close();

  // ── Summary ───────────────────────────────────────────────────────────────
  const passing   = results.filter(r => r.pass);
  const byType    = {};
  for (const r of results) {
    if (!byType[r.type]) byType[r.type] = [];
    byType[r.type].push(r.contentZoneDiff);
  }

  console.log(`\n${'═'.repeat(65)}`);
  console.log(`📊 Full Carousel — Iteration ${ITERATION} — ${theme.toUpperCase()}`);
  console.log(`   Passed: ${passing.length} / ${results.length}`);
  console.log(`\n   Per slide type:`);
  for (const [type, diffs] of Object.entries(byType)) {
    const avg  = (diffs.reduce((s,d) => s+d, 0) / diffs.length).toFixed(1);
    const pass = results.filter(r => r.type === type && r.pass).length;
    console.log(`     ${type.padEnd(8)} avg ${avg}%  (${pass}/${diffs.length} pass)`);
  }
  console.log(`\n   Output: ${ITER_DIR}`);
  console.log(`${'═'.repeat(65)}\n`);

  fs.writeFileSync(
    path.join(ITER_DIR, 'report.json'),
    JSON.stringify({ iteration: ITERATION, runId: RUN_ID, theme, timestamp: new Date().toISOString(), results }, null, 2),
  );

  process.exit(passing.length === results.length ? 0 : 1);
})();
