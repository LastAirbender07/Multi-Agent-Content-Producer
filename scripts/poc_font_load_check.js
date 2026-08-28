/**
 * poc_font_load_check.js — verifies both new fonts load in headless Chromium
 * from the backend static-file mount at http://localhost:8000/assets/fonts/.
 *
 * Success: STDOUT contains `inter=true playfair=true` within 500 ms of
 * document.fonts.ready. Exit 0.
 *
 * Failure: exit 1 with a diagnostic line pointing at which font failed.
 */

const path = require('path');
const PROJECT  = path.resolve(__dirname, '..');
const FRONTEND = path.join(PROJECT, 'frontend');
const { chromium } = require(path.join(FRONTEND, 'node_modules/@playwright/test'));

const BASE_URL_BE = process.env.GAN_BE_URL || 'http://localhost:8000';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const html = `<!doctype html><html><body>
      <style>
        @font-face {
          font-family: 'Inter';
          font-style: normal;
          font-weight: 900;
          src: url('${BASE_URL_BE}/assets/fonts/Inter-Black.woff2') format('woff2');
        }
        @font-face {
          font-family: 'Playfair Display';
          font-style: italic;
          font-weight: 700;
          src: url('${BASE_URL_BE}/assets/fonts/PlayfairDisplay-BoldItalic.woff2') format('woff2');
        }
        .inter-probe { font-family: 'Inter'; font-weight: 900; }
        .playfair-probe { font-family: 'Playfair Display'; font-weight: 700; font-style: italic; }
      </style>
      <span class="inter-probe">A</span>
      <span class="playfair-probe">A</span>
    </body></html>`;
    await page.setContent(html);
    const t0 = Date.now();

    // Kick both @font-face rules off manually with FontFace API so we can measure timing
    const result = await page.evaluate(async () => {
      const t0 = performance.now();
      await Promise.race([
        document.fonts.ready,
        new Promise((r) => setTimeout(r, 2000)),
      ]);
      const inter    = document.fonts.check("900 16px 'Inter'");
      const playfair = document.fonts.check("italic 700 16px 'Playfair Display'");
      return { inter, playfair, elapsed_ms: Math.round(performance.now() - t0) };
    });

    const dt = Date.now() - t0;
    console.log(`inter=${result.inter} playfair=${result.playfair} elapsed_ms=${result.elapsed_ms} wall_ms=${dt}`);
    if (!result.inter)    console.error('❌ Inter Black (weight 900) failed to load — check /assets/fonts/Inter-Black.woff2');
    if (!result.playfair) console.error('❌ Playfair Display (italic 700) failed to load — check /assets/fonts/PlayfairDisplay-BoldItalic.woff2');
    if (result.inter && result.playfair) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error('❌ Unhandled error:', e.message);
  process.exit(1);
});
