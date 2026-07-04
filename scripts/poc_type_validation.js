/**
 * GAN-style type validation. Collects all slides of each type across ALL available
 * runs, then renders + compares them in batches organised as:
 *
 *   iteration<N>/<slide_type>/<theme>/slide<M>/
 *     reference.png, generated.png, diff.png, composite.png
 *
 * Runs --iterations times. Reports per-type × per-theme scores with trend arrows.
 *
 * Usage:
 *   node scripts/poc_type_validation.js [--iterations 3]
 */

const path         = require('path');
const fs           = require('fs');
const { execSync } = require('child_process');
const { chromium } = require(`${__dirname}/../frontend/node_modules/@playwright/test`);

const {
  scoreBand, JS_ERROR_MAX_LENGTH,
  startStaticServer, getFreePort,
  compareImages, resolveTheme,
} = require('./poc_utils');

const PROJECT      = path.resolve(__dirname, '..');
const RUNS_DIR     = `${PROJECT}/backend/outputs/runs`;
const BACKEND_ROOT = `${PROJECT}/backend`;
const VAL_ROOT     = path.join(PROJECT, 'backend/outputs/test-runs/poc/type-validation');
fs.mkdirSync(VAL_ROOT, { recursive: true });

// ── Args ──────────────────────────────────────────────────────────────────────
const rawArgs   = process.argv.slice(2);
const iterIdx   = rawArgs.indexOf('--iterations');
const MAX_ITER  = iterIdx >= 0 ? parseInt(rawArgs[iterIdx + 1], 10) : 3;

// Auto-detect the next iteration number by scanning existing iteration dirs
function detectNextIteration() {
  if (!fs.existsSync(VAL_ROOT)) return 1;
  const existing = fs.readdirSync(VAL_ROOT)
    .filter(d => /^iteration\d+$/.test(d))
    .map(d => parseInt(d.replace('iteration', ''), 10))
    .filter(n => !isNaN(n));
  return existing.length ? Math.max(...existing) + 1 : 1;
}
const START_ITER = detectNextIteration();

const SLIDE_TYPES = ['hook', 'content', 'stat', 'engage', 'quote', 'cta'];
const THEMES      = ['aurora', 'lumina'];
const MAX_SAMPLES_PER_BUCKET = 10;  // cap per type/theme to keep runs manageable

// ── Build full sample list across all runs ────────────────────────────────────

function buildSampleList() {
  const samples = {};  // { 'hook/aurora': [{runId, slideNum, slideData, imageUrl, refPng}] }

  for (const entry of fs.readdirSync(RUNS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const runId   = entry.name;
    const runDir  = path.join(RUNS_DIR, runId);
    const sf      = path.join(runDir, 'content/angle_0/slides.json');
    if (!fs.existsSync(sf)) continue;

    let data, slides, angle;
    try {
      data   = JSON.parse(fs.readFileSync(sf, 'utf8'));
      slides = Array.isArray(data) ? data : (data.slides ?? []);
      angle  = Array.isArray(data) ? {} : (data.angle ?? {});
    } catch { continue; }

    const theme = resolveTheme(angle.emotional_hook ?? '');

    for (const slide of slides) {
      const num    = slide.slide_number ?? 1;
      const padded = String(num).padStart(2, '0');
      const refPng = path.join(runDir, 'content/angle_0/png', `slide_${padded}.png`);
      if (!fs.existsSync(refPng)) continue;

      const key = `${slide.type}/${theme}`;
      if (!samples[key]) samples[key] = [];

      // Resolve image URL
      let imageUrl = null;
      const assetsPath = path.join(runDir, 'content/angle_0/image_assets.json');
      if (fs.existsSync(assetsPath)) {
        try {
          const raw    = JSON.parse(fs.readFileSync(assetsPath, 'utf8'));
          const assets = Array.isArray(raw) ? raw : (raw.image_assets ?? []);
          const asset  = assets.find(a => a.slide_number === num);
          if (asset) {
            const lp  = asset.processed_path || asset.local_raw_path;
            const ext = lp ? path.extname(lp) : '.jpg';
            const canon = path.join(runDir, 'content/angle_0/images', `slide_${padded}${ext}`);
            const resolved = fs.existsSync(canon) ? canon : (lp && fs.existsSync(lp)) ? lp : null;
            if (resolved) imageUrl = '/' + path.relative(BACKEND_ROOT, resolved).replace(/\\/g, '/');
          }
        } catch {}
      }

      // Cap at MAX_SAMPLES_PER_BUCKET — spread across runs for variety
      if ((samples[key]?.length ?? 0) >= MAX_SAMPLES_PER_BUCKET) continue;

      samples[key].push({
        runId, theme, type: slide.type, slideNum: num,
        slideData: { ...slide, _theme: theme },
        imageUrl, refPng,
        label: `${runId.slice(0,8)}-slide${padded}`,
      });
    }
  }
  return samples;
}

// ── Single iteration ──────────────────────────────────────────────────────────

async function runIteration(iteration, samples, page, baseUrl) {
  const allResults = [];

  for (const type of SLIDE_TYPES) {
    for (const theme of THEMES) {
      const key   = `${type}/${theme}`;
      const group = samples[key] ?? [];
      if (!group.length) continue;

      // Output dir: iteration<N>/<type>/<theme>/
      const typeThemeDir = path.join(VAL_ROOT, `iteration${iteration}`, type, theme);
      fs.mkdirSync(typeThemeDir, { recursive: true });

      for (const sample of group) {
        const slideDir = path.join(typeThemeDir, sample.label);
        fs.mkdirSync(slideDir, { recursive: true });

        const outRef  = path.join(slideDir, 'reference.png');
        const outGen  = path.join(slideDir, 'generated.png');
        const outDiff = path.join(slideDir, 'diff.png');
        const outComp = path.join(slideDir, 'composite.png');
        fs.copyFileSync(sample.refPng, outRef);

        // Determine total slides for this run
        const totalSlidesForRun = (samples[`hook/${theme}`] ?? [])
          .concat(samples[`content/${theme}`] ?? [])
          .concat(samples[`stat/${theme}`] ?? [])
          .concat(samples[`engage/${theme}`] ?? [])
          .concat(samples[`quote/${theme}`] ?? [])
          .concat(samples[`cta/${theme}`] ?? [])
          .filter(s => s.runId === sample.runId).length || 12;

        let rendered = false;
        const jsErrors = [];
        try {
          await page.evaluate(
            async (args) => { await window.Renderer.render(args.slide, args.opts); },
            { slide: { ...sample.slideData, image_url: sample.imageUrl }, opts: { imageBaseUrl: baseUrl, totalSlides: totalSlidesForRun } },
          );
          // 2x screenshot then downscale
          const rawPath = outGen.replace('.png', '_2x.png');
          await page.screenshot({ path: rawPath, fullPage: false });
          try { execSync(`convert "${rawPath}" -resize 1080x1080 "${outGen}" 2>/dev/null`); fs.unlinkSync(rawPath); }
          catch { fs.renameSync(rawPath, outGen); }
          rendered = fs.existsSync(outGen);
        } catch (e) {
          jsErrors.push(e.message.slice(0, JS_ERROR_MAX_LENGTH));
        }

        const metrics = compareImages(outRef, outGen, outDiff);
        const band    = scoreBand(metrics.contentDiffPct ?? 100);

        if (rendered && fs.existsSync(outDiff)) {
          try { execSync(`convert "${outRef}" "${outGen}" "${outDiff}" +append "${outComp}" 2>/dev/null`); } catch {}
        }

        allResults.push({
          type, theme, iteration,
          runId: sample.runId, slideNum: sample.slideNum, label: sample.label,
          score: band.label, pass: band.pass,
          contentZoneDiff: metrics.contentDiffPct ?? 100,
          fullCanvasDiff:  metrics.fullDiffPct ?? 100,
          jsErrors,
        });
      }
    }
  }
  return allResults;
}

// ── Print per-type × theme summary ───────────────────────────────────────────

function printSummary(iteration, results, prevResults) {
  console.log(`\n${'═'.repeat(78)}`);
  console.log(`📊 Iteration ${iteration} — Results by Type × Theme`);
  console.log(`${'─'.repeat(78)}`);

  for (const type of SLIDE_TYPES) {
    let printed = false;
    for (const theme of THEMES) {
      const group = results.filter(r => r.type === type && r.theme === theme);
      if (!group.length) continue;
      if (!printed) { console.log(`\n  ▸ ${type.toUpperCase()}`); printed = true; }

      const avg  = (group.reduce((s,r) => s+r.contentZoneDiff,0)/group.length).toFixed(1);
      const pass = group.filter(r=>r.pass).length;

      let trend = '';
      if (prevResults) {
        const pg = prevResults.filter(r=>r.type===type&&r.theme===theme);
        if (pg.length) {
          const prevAvg = pg.reduce((s,r)=>s+r.contentZoneDiff,0)/pg.length;
          const delta = parseFloat(avg) - prevAvg;
          trend = delta < -0.5 ? ` ↓${Math.abs(delta).toFixed(1)}%` : delta > 0.5 ? ` ↑${delta.toFixed(1)}%` : ' →';
        }
      }

      const passIcon = pass===group.length ? '✅' : pass>0 ? '🟡' : '🔴';
      console.log(`    ${theme.padEnd(7)} ${passIcon} avg ${avg}%${trend}  (${pass}/${group.length} pass)  n=${group.length} slides`);
      // Show worst 3
      const worst = [...group].sort((a,b)=>b.contentZoneDiff-a.contentZoneDiff).slice(0,3);
      worst.forEach(r => {
        const icon = r.pass ? '✅' : r.contentZoneDiff<25 ? '🟡' : r.contentZoneDiff<35 ? '🟠' : '🔴';
        const err  = r.jsErrors.length ? `  ⚠ ${r.jsErrors[0].slice(0,40)}` : '';
        console.log(`      ${icon} ${r.label} — ${r.contentZoneDiff}%${err}`);
      });
    }
  }

  const total  = results.length;
  const passed = results.filter(r=>r.pass).length;
  console.log(`\n${'─'.repeat(78)}`);
  console.log(`  Overall: ${passed}/${total} pass   Output: ${path.join(VAL_ROOT, `iteration${iteration}`)}`);
  console.log(`${'═'.repeat(78)}\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  console.log(`\n🔁 GAN Type Validation — ${MAX_ITER} iteration(s) starting from iteration ${START_ITER}`);
  console.log(`   Building sample list from all available runs…`);

  const samples = buildSampleList();

  // Print sample counts
  let totalSamples = 0;
  for (const type of SLIDE_TYPES) {
    for (const theme of THEMES) {
      const n = (samples[`${type}/${theme}`] ?? []).length;
      if (n) { console.log(`   ${(type+'/'+theme).padEnd(20)} ${n} slides`); totalSamples += n; }
    }
  }
  console.log(`   Total: ${totalSamples} slides\n`);

  const port   = await getFreePort();
  const server = startStaticServer(BACKEND_ROOT, port);
  const baseUrl = `http://localhost:${port}`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 2 });
  const page    = await context.newPage();
  page.on('pageerror', e => console.log(`  PageErr: ${e.message.slice(0, 60)}`));

  await page.goto(`${baseUrl}/renderer/slide_render.html`, { waitUntil: 'networkidle' });

  let prevResults = null;
  const allIterResults = [];

  for (let iter = START_ITER; iter < START_ITER + MAX_ITER; iter++) {
    console.log(`⏳ Rendering iteration ${iter}/${MAX_ITER} (${totalSamples} slides)…`);
    const results = await runIteration(iter, samples, page, baseUrl);
    printSummary(iter, results, prevResults);

    fs.writeFileSync(
      path.join(VAL_ROOT, `report_iteration${iter}.json`),
      JSON.stringify({ iteration: iter, results, timestamp: new Date().toISOString() }, null, 2),
    );

    allIterResults.push(results);
    prevResults = results;

    const passed = results.filter(r=>r.pass).length;
    if (passed === results.length) {
      console.log(`✅ ALL PASS on iteration ${iter} — done.\n`); break;
    }
  }

  await browser.close();
  server.close();

  // Trend summary
  if (allIterResults.length > 1) {
    console.log(`\n📈 TREND (iterations ${START_ITER}–${START_ITER + allIterResults.length - 1})`);
    console.log(`${'─'.repeat(55)}`);
    for (const type of SLIDE_TYPES) {
      for (const theme of THEMES) {
        const avgs = allIterResults.map(r => {
          const g = r.filter(x=>x.type===type&&x.theme===theme);
          return g.length ? (g.reduce((s,x)=>s+x.contentZoneDiff,0)/g.length).toFixed(1) : null;
        }).filter(Boolean);
        if (avgs.length > 1) {
          const first = parseFloat(avgs[0]), last = parseFloat(avgs.at(-1));
          const arrow = last < first-0.5 ? `↓ ${(first-last).toFixed(1)}% better` : last > first+0.5 ? `↑ worse` : '→ stable';
          console.log(`  ${(type+'/'+theme).padEnd(22)} ${avgs.join(' → ')}%  ${arrow}`);
        }
      }
    }
    console.log('');
  }

  process.exit(0);
})();
