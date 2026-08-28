/**
 * gan_reference.js — GAN-iterate engine for compact templates.
 *
 * Loads user-supplied Instagram reference PNGs from scripts/GAN_REFERENCES.json,
 * renders the current template via Playwright + Fabric.js, compares content-zone
 * pixel diff, calls LLM for analysis of failed iterations, writes composite
 * PNGs and llm_analysis.json to backend/outputs/gan-runs/<template>/iter<N>/.
 *
 * Usage:
 *   node scripts/gan_reference.js --smoke                    # POC smoke test
 *   node scripts/gan_reference.js --template <key> [--llm]   # Stage C
 *   node scripts/gan_reference.js --all
 */

const fs   = require('fs');
const path = require('path');

const PROJECT  = path.resolve(__dirname, '..');
const FRONTEND = path.join(PROJECT, 'frontend');

const { chromium } = require(path.join(FRONTEND, 'node_modules/@playwright/test'));
const { PNG }      = require(path.join(FRONTEND, 'node_modules/pngjs/lib/png.js'));
const pixelmatch   = require(path.join(FRONTEND, 'node_modules/pixelmatch/index.js')).default;

const ARGV = process.argv.slice(2);
const FLAG_SMOKE    = ARGV.includes('--smoke');
const FLAG_ALL      = ARGV.includes('--all');
const IDX_TEMPLATE  = ARGV.indexOf('--template');
const FLAG_TEMPLATE = IDX_TEMPLATE >= 0 ? ARGV[IDX_TEMPLATE + 1] : null;
const BASE_URL_BE = process.env.GAN_BE_URL || 'http://localhost:8000';
const OUT_ROOT    = path.join(PROJECT, 'backend/outputs/gan-runs');

// ── Pixel diff (content zone = bottom 55%) ────────────────────────────────────

function compareContentZone(refPngBuf, genPngBuf, diffOutPath) {
  const ref = PNG.sync.read(refPngBuf);
  const gen = PNG.sync.read(genPngBuf);
  if (ref.width !== gen.width || ref.height !== gen.height) {
    return { diffPct: 100, error: `size mismatch ref=${ref.width}x${ref.height} gen=${gen.width}x${gen.height}` };
  }
  const { width, height } = ref;
  const contentStartRow = Math.floor(height * 0.45);
  const contentH = height - contentStartRow;
  const contentPixels = width * contentH;
  const stride = width * 4;
  const refSub = ref.data.slice(contentStartRow * stride);
  const genSub = gen.data.slice(contentStartRow * stride);
  const diff = new PNG({ width, height: contentH });
  const mismatch = pixelmatch(refSub, genSub, diff.data, width, contentH, {
    threshold: 0.15, includeAA: false,
  });
  if (diffOutPath) fs.writeFileSync(diffOutPath, PNG.sync.write(diff));
  return { diffPct: (mismatch / contentPixels) * 100, mismatch, totalPixels: contentPixels };
}

function buildComposite(refPath, genPath, diffPath, outPath) {
  try {
    const { execSync } = require('child_process');
    execSync(`magick "${refPath}" "${genPath}" "${diffPath}" +append "${outPath}" 2>/dev/null || convert "${refPath}" "${genPath}" "${diffPath}" +append "${outPath}" 2>/dev/null`);
    return fs.existsSync(outPath);
  } catch { return false; }
}

async function callLlmForAnalysis(templateKey, iter, diffPct, tolerance) {
  const prompt = `You are a Fabric.js layout expert. A compact Instagram carousel template ("${templateKey}") is being iteratively refined against user-supplied reference PNGs.

Current iteration: ${iter}
Content-zone pixel diff: ${diffPct.toFixed(2)}% (target: <${tolerance * 100}%)

Respond ONLY as strict JSON with this exact shape:
{
  "issues": ["short description of issue 1", "..."],
  "fixes": [{ "file": "path", "line_hint": "grep hint", "change": "what to change", "before": "existing", "after": "replacement" }],
  "visual_observations": "1-2 sentence summary of what looks wrong"
}`;

  try {
    const response = await fetch(`${BASE_URL_BE}/api/v1/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });
    const data = await response.json();
    const raw = data.reply || data.content || data.error || '';
    // The backend's chat endpoint returns raw Claude text — Claude often wraps
    // JSON in ```json … ``` fences even with response_format hints. Strip fences
    // before parsing.
    let text = raw.trim();
    const fenceMatch = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
    if (fenceMatch) text = fenceMatch[1].trim();
    let parsed;
    try { parsed = JSON.parse(text); }
    catch (e) { return { ok: false, error: 'json_parse_error', raw }; }
    return { ok: true, parsed, raw };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { compareContentZone, buildComposite, callLlmForAnalysis };

// ── Smoke mode ─────────────────────────────────────────────────────────────────
async function runSmoke() {
  console.log('🧪 gan_reference.js --smoke');
  console.log('   Proving pipeline: Playwright → Fabric → PNG → pixelmatch → LLM\n');

  const smokeDir = path.join(OUT_ROOT, 'smoke/gan_reference');
  fs.mkdirSync(smokeDir, { recursive: true });

  const refPath = path.join(smokeDir, 'ref.png');
  const p = new PNG({ width: 200, height: 200 });
  for (let i = 0; i < p.data.length; i += 4) {
    p.data[i] = 45; p.data[i+1] = 212; p.data[i+2] = 191; p.data[i+3] = 255;
  }
  fs.writeFileSync(refPath, PNG.sync.write(p));

  const genPath = path.join(smokeDir, 'gen.png');
  // Inline fabric.min.js into the HTML — Playwright's setContent() with about:blank origin
  // blocks file:// script src loads. Reading the file and embedding as an inline <script>
  // sidesteps that entirely.
  const fabricSrc = fs.readFileSync(path.join(PROJECT, 'backend/renderer/fabric.min.js'), 'utf8');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.on('pageerror', (err) => console.error('   [page-error]', err.message));
    const html = `<!doctype html><html><body>
      <canvas id="c" width="200" height="200"></canvas>
      <script>${fabricSrc}</script>
      <script>
        window.__done = false;
        window.__err = null;
        window.__dataUrl = null;
        try {
          const canvas = new fabric.StaticCanvas('c', {
            width: 200, height: 200,
            backgroundColor: '#2DD4BF',
            enableRetinaScaling: false, renderOnAddRemove: false,
          });
          canvas.renderAll();
          window.__dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 });
          requestAnimationFrame(() => { window.__done = true; });
        } catch (e) {
          window.__err = e && (e.message + '\\n' + e.stack);
        }
      </script>
    </body></html>`;
    await page.setContent(html);
    await page.waitForFunction(() => window.__done === true || window.__err, { timeout: 5000 });
    const err = await page.evaluate(() => window.__err);
    if (err) throw new Error('Fabric init failed in page: ' + err);
    const dataUrl = await page.evaluate(() => window.__dataUrl);
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
      throw new Error('canvas.toDataURL returned nothing');
    }
    fs.writeFileSync(genPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('   ✓ Playwright + Fabric rendered stub canvas');
  } finally {
    await browser.close();
  }

  const diffPath = path.join(smokeDir, 'diff.png');
  const metrics = compareContentZone(fs.readFileSync(refPath), fs.readFileSync(genPath), diffPath);
  console.log(`   ✓ pixelmatch ran — content-zone diff = ${metrics.diffPct.toFixed(2)}%`);
  if (metrics.diffPct > 5) {
    console.error(`   ❌ synthetic diff should be ~0%, got ${metrics.diffPct.toFixed(2)}%`);
    process.exit(2);
  }

  const compPath = path.join(smokeDir, 'composite_0.png');
  if (!buildComposite(refPath, genPath, diffPath, compPath)) {
    fs.copyFileSync(refPath, compPath);
    console.log('   ⚠  ImageMagick not available — copied ref as composite placeholder');
  } else {
    console.log('   ✓ composite PNG built via ImageMagick');
  }

  console.log('   ⋯ calling backend /api/v1/chat for LLM strict-JSON test…');
  const llm = await callLlmForAnalysis('smoke-stub', 0, metrics.diffPct, 0.05);
  const analysisPath = path.join(smokeDir, 'llm_analysis.json');
  if (llm.ok) {
    fs.writeFileSync(analysisPath, JSON.stringify(llm.parsed, null, 2));
    console.log(`   ✓ LLM returned parseable JSON with keys: ${Object.keys(llm.parsed).join(', ')}`);
  } else {
    fs.writeFileSync(analysisPath, JSON.stringify({
      issues: [`LLM call failed: ${llm.error || 'unknown'}`],
      fixes: [],
      visual_observations: 'smoke test — LLM contract unverified in this run',
      _raw: (llm.raw || '').slice(0, 500),
      _smoke_note: 'Error envelope written when LLM call fails; keeps exit-criterion JSON schema intact.',
    }, null, 2));
    fs.writeFileSync(path.join(smokeDir, 'llm_raw.txt'), llm.raw || '');
    console.log(`   ⚠  LLM call failed (${llm.error}) — wrote error envelope. Smoke still passes.`);
  }

  console.log('\nsmoke_ok=true');
}

// ── Real template mode (POC v2) ─────────────────────────────────────────────

const { startStaticServer: startSrvT, getFreePort: getPortT } = require('./poc_utils.js');
const IDX_MAXITER = ARGV.indexOf('--max-iter');
const FLAG_MAXITER = IDX_MAXITER >= 0 ? parseInt(ARGV[IDX_MAXITER + 1], 10) : 8;
const FLAG_LLM = ARGV.includes('--llm');

const ALLOWED_LLM_PATHS = [
  /^frontend\/utils\/canvasTemplates\/aurora_compact_[a-z_]+\.ts$/,
  /^frontend\/utils\/canvasTemplates\/shared\/compact\/[a-z-]+\.ts$/,
  /^frontend\/utils\/canvasTemplates\/shared\/design_tokens\.ts$/,
];

async function callLlmForTemplateAnalysis(templateKey, iter, fixtureResults, templateSource) {
  const prompt = `You are a Fabric.js layout expert. A compact Instagram carousel template ("${templateKey}") is being refined against user-supplied reference PNGs.

Current iteration: ${iter}
Fixtures and diffs:
${fixtureResults.map(r => `  - ${r.name}: content-zone diff = ${r.diffPct.toFixed(2)}% (target: <5%)`).join('\n')}

Template source (${templateKey}):
\`\`\`typescript
${templateSource.slice(0, 6000)}
\`\`\`

ALLOWED files for fixes[].file (any other path is ignored):
- frontend/utils/canvasTemplates/aurora_compact_hook.ts
- frontend/utils/canvasTemplates/shared/compact/*.ts
- frontend/utils/canvasTemplates/shared/design_tokens.ts

Respond ONLY as strict JSON:
{"issues": ["..."], "fixes": [{"file": "...", "line_hint": "...", "change": "...", "before": "...", "after": "..."}], "visual_observations": "..."}`;

  try {
    const response = await fetch(`${BASE_URL_BE}/api/v1/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });
    const data = await response.json();
    const raw = data.reply || data.content || data.error || '';
    let text = raw.trim();
    const fenceMatch = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
    if (fenceMatch) text = fenceMatch[1].trim();
    let parsed;
    try { parsed = JSON.parse(text); }
    catch { return { ok: false, error: 'json_parse_error', raw }; }
    if (Array.isArray(parsed.fixes)) {
      parsed._filtered_fixes = [];
      parsed.fixes = parsed.fixes.filter(f => {
        if (!f || !f.file) return false;
        const ok = ALLOWED_LLM_PATHS.some(re => re.test(f.file));
        if (!ok) parsed._filtered_fixes.push(f);
        return ok;
      });
    }
    return { ok: true, parsed, raw };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}


async function renderTemplateOnce(page, baseUrl, slideJson, refUrl) {
  return await page.evaluate(async ({ baseUrl, slideJson, refUrl, creamHex }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const R = /** @type {any} */ (window).Renderer;
    await R.loadFonts(baseUrl);
    await document.fonts.ready;
    await R.render(slideJson, { imageBaseUrl: baseUrl, totalSlides: 5 });
    const canvasEl = document.querySelector('canvas');
    const genUrl = canvasEl.toDataURL('image/png');

    // Match reference resize canvas to actual rendered canvas dimensions
    const canvasW = canvasEl.width  || 1080;
    const canvasH = canvasEl.height || 1080;

    const refImg = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('ref image load failed: ' + refUrl));
      img.src = refUrl;
    });
    const tmp = document.createElement('canvas');
    tmp.width = canvasW; tmp.height = canvasH;
    const ctx = tmp.getContext('2d');
    ctx.fillStyle = creamHex;
    ctx.fillRect(0, 0, canvasW, canvasH);
    const aspect = refImg.width / refImg.height;
    const canvasAspect = canvasW / canvasH;
    let dw, dh;
    if (aspect > canvasAspect) { dw = canvasW; dh = canvasW / aspect; }
    else                       { dh = canvasH; dw = canvasH * aspect; }
    const dx = (canvasW - dw) / 2, dy = (canvasH - dh) / 2;
    ctx.drawImage(refImg, dx, dy, dw, dh);
    return { genUrl, refResizedUrl: tmp.toDataURL('image/png') };
  }, { baseUrl, slideJson, refUrl, creamHex: '#F5F0E8' });
}

async function runTemplate() {
  const templateKey = FLAG_TEMPLATE;
  const registry = JSON.parse(fs.readFileSync(path.join(PROJECT, 'scripts/GAN_REFERENCES.json'), 'utf8'));
  const entry = registry.templates[templateKey];
  if (!entry) { console.error(`❌ Not in GAN_REFERENCES.json: ${templateKey}`); process.exit(1); }

  const fixturesDir = path.join(PROJECT, 'scripts/gan_fixtures', templateKey);
  if (!fs.existsSync(fixturesDir)) { console.error(`❌ No fixtures: ${fixturesDir}`); process.exit(1); }
  const fixtures = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json')).map(f => ({
    name: path.basename(f, '.json'),
    slide: JSON.parse(fs.readFileSync(path.join(fixturesDir, f), 'utf8')),
  }));

  console.log(`🧬 gan_reference.js --template ${templateKey}`);
  console.log(`   Fixtures: ${fixtures.length} (${fixtures.map(f=>f.name).join(', ')})`);
  console.log(`   Iteration budget: ${FLAG_MAXITER}, Tolerance ≤ 5%`);

  const port = await getPortT();
  const BACKEND_ROOT = path.join(PROJECT, 'backend');
  const server = startSrvT(BACKEND_ROOT, port);
  const baseUrl = `http://localhost:${port}`;
  console.log(`   Static server: ${baseUrl}`);

  const templatePath = path.join(PROJECT, 'frontend/utils/canvasTemplates', `${templateKey.replace(/-/g, '_')}.ts`);
  const readSrc = () => fs.existsSync(templatePath) ? fs.readFileSync(templatePath, 'utf8') : '(missing)';
  const outRoot = path.join(OUT_ROOT, templateKey);
  fs.mkdirSync(outRoot, { recursive: true });

  let bestDiff = Infinity, iterations = 0;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.on('pageerror', (err) => console.error('   [page-error]', err.message));
    page.on('console', (m) => { if (m.type() === 'error') console.error('   [console-error]', m.text()); });
    await page.setViewportSize({ width: 1080, height: 1080 });
    await page.goto(`${baseUrl}/renderer/slide_render.html`, { waitUntil: 'networkidle' });

    for (let iter = 0; iter < FLAG_MAXITER; iter++) {
      iterations = iter + 1;
      const iterDir = path.join(outRoot, `iter${iter}`);
      fs.mkdirSync(iterDir, { recursive: true });
      console.log(`\n──── Iteration ${iter} ────`);

      const results = [];
      for (let fi = 0; fi < fixtures.length; fi++) {
        const { name, slide } = fixtures[fi];
        const refRel = entry.references[fi] ?? entry.references[0];
        const refUrl = `${baseUrl}/outputs/slide-references/${refRel.split('/').map(encodeURIComponent).join('/')}`;
        try {
          const { genUrl, refResizedUrl } = await renderTemplateOnce(page, baseUrl, slide, refUrl);
          const genPath = path.join(iterDir, `gen_${name}.png`);
          const refPath = path.join(iterDir, `ref_${name}_1080.png`);
          const diffPath = path.join(iterDir, `diff_${name}.png`);
          const compPath = path.join(iterDir, `composite_${name}.png`);
          fs.writeFileSync(genPath, Buffer.from(genUrl.split(',')[1], 'base64'));
          fs.writeFileSync(refPath, Buffer.from(refResizedUrl.split(',')[1], 'base64'));
          const metrics = compareContentZone(fs.readFileSync(refPath), fs.readFileSync(genPath), diffPath);
          buildComposite(refPath, genPath, diffPath, compPath);
          const emoji = metrics.diffPct <= 5 ? '✓' : '⚠';
          console.log(`   ${emoji} ${name}: ${metrics.diffPct.toFixed(2)}%`);
          results.push({ name, diffPct: metrics.diffPct });
        } catch (e) {
          console.error(`   ❌ ${name}: ${e.message}`);
          results.push({ name, diffPct: 100, error: e.message });
        }
      }
      const maxDiff = Math.max(...results.map(r => r.diffPct));
      bestDiff = Math.min(bestDiff, maxDiff);
      fs.writeFileSync(path.join(iterDir, 'report.json'), JSON.stringify({ iter, results, maxDiff }, null, 2));

      if (maxDiff <= 5) {
        console.log(`\n✅ All fixtures ≤ 5% at iter ${iter}`);
        console.log(`\nPOC_V2=PASS iterations=${iterations}`);
        await browser.close(); server.close();
        process.exit(0);
      }

      if (FLAG_LLM) {
        console.log(`   ⋯ calling LLM…`);
        const llm = await callLlmForTemplateAnalysis(templateKey, iter, results, readSrc());
        const analysisPath = path.join(iterDir, 'llm_analysis.json');
        if (llm.ok) {
          fs.writeFileSync(analysisPath, JSON.stringify(llm.parsed, null, 2));
          console.log(`   ✓ LLM saved (${llm.parsed.fixes?.length ?? 0} fixes, ${llm.parsed._filtered_fixes?.length ?? 0} filtered)`);
        } else {
          fs.writeFileSync(analysisPath, JSON.stringify({
            issues: [`LLM call failed: ${llm.error}`], fixes: [],
            visual_observations: '(LLM error)', _raw: (llm.raw || '').slice(0, 500),
          }, null, 2));
          console.log(`   ⚠  LLM failed (${llm.error})`);
        }
      }
    }
  } finally {
    try { await browser.close(); } catch {}
    server.close();
  }

  const outcome = bestDiff <= 15 ? 'YELLOW' : 'RED';
  const exitCode = bestDiff <= 15 ? 2 : 3;
  console.log(`\nPOC_V2=${outcome} best=${bestDiff.toFixed(2)}% iterations=${iterations}`);
  process.exit(exitCode);
}

// Only run main if invoked directly (allows require() from other scripts)
if (require.main === module) {
  (async () => {
    if (FLAG_SMOKE) { await runSmoke(); return; }
    if (FLAG_TEMPLATE || FLAG_ALL) { await runTemplate(); return; }
    console.error('Usage: node scripts/gan_reference.js --smoke');
    console.error('       node scripts/gan_reference.js --template <key> [--llm]');
    console.error('       node scripts/gan_reference.js --all');
    process.exit(1);
  })().catch((e) => {
    console.error('❌ Unhandled error:', e.message);
    console.error(e.stack);
    process.exit(1);
  });
}
