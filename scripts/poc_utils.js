/**
 * Shared utilities for poc_loop.js and poc_batch.js.
 * Centralises: static server, pixel comparison, scoring, theme resolution, data loading.
 */

const path = require('path');
const fs   = require('fs');
const http = require('http');
const net  = require('net');

// Resolve project root relative to this script's location (scripts/ → project root)
const PROJECT = path.resolve(__dirname, '..');

const { PNG }    = require(`${PROJECT}/frontend/node_modules/pngjs/lib/png.js`);
const pixelmatch = require(`${PROJECT}/frontend/node_modules/pixelmatch/index.js`).default;

// ── Constants ─────────────────────────────────────────────────────────────────

// Pixel-level tolerance for pixelmatch comparisons.
// 0.15 = allow 15% brightness difference per pixel before counting as mismatch.
// Accounts for font antialiasing and sub-pixel rendering differences.
const PIXELMATCH_THRESHOLD = 0.15;

// Fraction of canvas height to skip from the top before scoring begins.
// 0.45 = score only the bottom 55% of the canvas, avoiding background image noise.
const CONTENT_START_Y_FRACTION = 0.45;

// Max JS console error string length stored per error (avoid huge report files)
const JS_ERROR_MAX_LENGTH = 120;

const SCORE_BANDS = [
  { max: 5,   label: '🏆 EXCELLENT', desc: '<5% — near-pixel-perfect',    pass: true  },
  { max: 15,  label: '✅ GREAT',     desc: '5-15% — visually equivalent', pass: true  },
  { max: 25,  label: '🟡 GOOD',      desc: '15-25% — minor layout diff',  pass: false },
  { max: 35,  label: '🟠 FAIR',      desc: '25-35% — noticeable diff',    pass: false },
  { max: 100, label: '🔴 BROKEN',    desc: '>35% — layout broken',        pass: false },
];

function scoreBand(pct) {
  return SCORE_BANDS.find(b => pct < b.max) ?? SCORE_BANDS.at(-1);
}

// ── Theme resolution — mirrors carousel_generator.py _TEMPLATE_MAP exactly ──
// EXACT key match (not prefix) to produce the same theme as Jinja2.

const THEME_MAP = {
  Anger: 'aurora', Fear: 'aurora', Urgency: 'aurora',
  Controversy: 'aurora', Surprise: 'aurora',
  Hope: 'lumina', Inspiration: 'lumina', Curiosity: 'lumina',
};

function resolveTheme(emotionalHook) {
  return THEME_MAP[emotionalHook] ?? 'aurora';
}

// ── Static file server ────────────────────────────────────────────────────────
// Serves the entire backend/ directory so fonts, images, and the renderer
// bundle are accessible from Playwright without needing FastAPI running.

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.ttf':  'font/ttf',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
};

function startStaticServer(rootDir, port) {
  const server = http.createServer((req, res) => {
    const filePath = path.join(rootDir, decodeURIComponent(req.url.split('?')[0]));
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const mime = MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(fs.readFileSync(filePath));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  server.listen(port);
  return server;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

// ── Pixel comparison ──────────────────────────────────────────────────────────
// Returns full-canvas diff and content-zone diff (bottom 55% — avoids
// background image noise in the top area).

function compareImages(refPath, genPath, diffPath) {
  if (!fs.existsSync(genPath)) {
    return { error: 'generated file missing', fullDiffPct: 100, contentDiffPct: 100 };
  }

  let refPng, genPng;
  try {
    refPng = PNG.sync.read(fs.readFileSync(refPath));
    genPng = PNG.sync.read(fs.readFileSync(genPath));
  } catch (e) {
    return { error: `PNG parse error: ${e.message}`, fullDiffPct: 100, contentDiffPct: 100 };
  }

  const { width, height } = refPng;

  // Full canvas
  const fullDiffImg  = new PNG({ width, height });
  const fullMismatch = pixelmatch(refPng.data, genPng.data, fullDiffImg.data, width, height, {
    threshold: PIXELMATCH_THRESHOLD, includeAA: false,
  });
  if (diffPath) fs.writeFileSync(diffPath, PNG.sync.write(fullDiffImg));
  const fullDiffPct = (fullMismatch / (width * height)) * 100;

  // Content zone: bottom 55%
  const zoneTop    = Math.floor(height * CONTENT_START_Y_FRACTION);
  const zoneHeight = height - zoneTop;
  const refZone    = new PNG({ width, height: zoneHeight });
  const genZone    = new PNG({ width, height: zoneHeight });
  for (let y = 0; y < zoneHeight; y++) {
    const srcOffset = (zoneTop + y) * width * 4;
    const dstOffset = y * width * 4;
    refPng.data.copy(refZone.data, dstOffset, srcOffset, srcOffset + width * 4);
    genPng.data.copy(genZone.data, dstOffset, srcOffset, srcOffset + width * 4);
  }
  const zoneDiffImg   = new PNG({ width, height: zoneHeight });
  const zoneMismatch  = pixelmatch(refZone.data, genZone.data, zoneDiffImg.data, width, zoneHeight, {
    threshold: PIXELMATCH_THRESHOLD, includeAA: false,
  });
  const contentDiffPct = (zoneMismatch / (width * zoneHeight)) * 100;

  return {
    fullDiffPct:    Math.round(fullDiffPct * 100) / 100,
    contentDiffPct: Math.round(contentDiffPct * 100) / 100,
  };
}

// ── Run data loading ──────────────────────────────────────────────────────────

function loadHookSlide(runsDir, runId) {
  const slidesPath = path.join(runsDir, runId, 'content/angle_0/slides.json');
  if (!fs.existsSync(slidesPath)) throw new Error(`slides.json not found: ${slidesPath}`);

  const raw    = JSON.parse(fs.readFileSync(slidesPath, 'utf8'));
  const slides = Array.isArray(raw) ? raw : (raw.slides ?? []);
  const angle  = Array.isArray(raw) ? {} : (raw.angle ?? {});
  const hook   = slides.find(s => s.type === 'hook');
  if (!hook) throw new Error('no hook slide in run');

  const theme = resolveTheme(angle.emotional_hook ?? '');
  return {
    hook:  { ...hook, _theme: theme, canvas_template: `${theme}-hook` },
    total: slides.length,
    theme,
  };
}

function loadImageUrl(runsDir, backendRoot, runId, slideNum) {
  const assetsPath = path.join(runsDir, runId, 'content/angle_0/image_assets.json');
  if (!fs.existsSync(assetsPath)) return null;

  const raw    = JSON.parse(fs.readFileSync(assetsPath, 'utf8'));
  const assets = Array.isArray(raw) ? raw : (raw.image_assets ?? []);
  const asset  = assets.find(a => a.slide_number === slideNum);
  if (!asset) return null;

  const localPath = asset.processed_path || asset.local_raw_path;
  if (!localPath) return null;

  // Try canonical path first (content migrated to runs/ directory)
  const ext         = path.extname(localPath);
  const canonPath   = path.join(runsDir, runId, 'content/angle_0/images', `slide_${String(slideNum).padStart(2, '0')}${ext}`);
  const resolvedPath = fs.existsSync(canonPath) ? canonPath
                      : fs.existsSync(localPath) ? localPath
                      : null;

  return resolvedPath
    ? '/' + path.relative(backendRoot, resolvedPath).replace(/\\/g, '/')
    : null;
}

module.exports = {
  SCORE_BANDS,
  JS_ERROR_MAX_LENGTH,
  scoreBand,
  resolveTheme,
  startStaticServer,
  getFreePort,
  compareImages,
  loadHookSlide,
  loadImageUrl,
};
