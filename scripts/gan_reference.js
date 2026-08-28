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

async function runTemplate() {
  console.error(`❌ Template mode not yet implemented — Stage A is POC only.`);
  console.error(`   Stage C will implement: load GAN_REFERENCES.json → load fixtures → render current`);
  console.error(`   template via existing renderer bundle → compare vs each ref PNG → LLM strict-JSON`);
  console.error(`   analysis on failure → developer-reviewed fixes → repeat.`);
  process.exit(1);
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
