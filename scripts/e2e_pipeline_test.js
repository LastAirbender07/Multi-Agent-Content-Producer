/**
 * Full E2E Pipeline Test
 * Tests both normal (web) mode and LLM mode through the full UI.
 * Topic: "How did Chinese/Japanese/Korean food become popular in India?"
 *
 * Usage: node scripts/e2e_pipeline_test.js
 */

const path = require('path');
const fs   = require('fs');
const PROJECT  = path.resolve(__dirname, '..');
const FRONTEND = path.join(PROJECT, 'frontend');
const { chromium } = require(path.join(FRONTEND, 'node_modules/@playwright/test'));

const BASE_URL = 'http://localhost:3000';
const TOPIC    = 'How did Chinese, Japanese and Korean food become popular in India?';
const OUT_DIR  = path.join(PROJECT, 'backend/outputs/test-runs/e2e');
fs.mkdirSync(OUT_DIR, { recursive: true });

const POLL_INTERVAL  = 8000;   // ms between status polls
const PIPELINE_TIMEOUT = 600000; // 10 min max per run

async function waitForPipeline(page, runLabel) {
  const start = Date.now();
  let lastPct = -1;

  while (Date.now() - start < PIPELINE_TIMEOUT) {
    await page.waitForTimeout(POLL_INTERVAL);

    // Check for completion indicators — order matters: check angle selection, slides, or done text
    const done = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Choose Your Narrative') ||   // angle selection reached
             text.includes('Choose your angle') ||
             text.includes('View in Editor') ||
             text.includes('Open in Editor') ||
             text.includes('Open in editor') ||
             text.includes('COMPLETE') ||
             text.includes('slides generated') ||
             text.includes('carousel ready') ||
             text.includes('Generated Carousels') && text.includes('DONE') ||
             text.includes('Select an angle');
    });

    if (done) {
      console.log(`\n  [${runLabel}] Pipeline reached completion stage! (${Math.round((Date.now()-start)/1000)}s)`);
      return true;
    }

    // Check for hard failure
    const failed = await page.evaluate(() => {
      const text = document.body.innerText;
      return (text.includes('Error') && text.includes('failed')) ||
             text.includes('Pipeline failed') ||
             text.includes('error occurred');
    });
    if (failed) {
      console.log(`\n  [${runLabel}] Pipeline FAILED`);
      return false;
    }

    // Log progress if visible
    const pct = await page.evaluate(() => {
      const els = [...document.querySelectorAll('*')];
      for (const el of els) {
        const m = el.textContent?.match(/(\d+)%/);
        if (m && el.children.length === 0) return parseInt(m[1]);
      }
      return null;
    });
    if (pct !== null && pct !== lastPct) {
      lastPct = pct;
      process.stdout.write(`  [${runLabel}] Progress: ${pct}%\r`);
    }
  }
  console.log(`\n  [${runLabel}] Timed out after ${PIPELINE_TIMEOUT/1000}s`);
  return false;
}

async function runPipelineTest(browser, mode) {
  const label  = mode === 'web' ? 'NORMAL (Web)' : 'LLM';
  const outPfx = path.join(OUT_DIR, `${mode}`);
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶  E2E Test: ${label} mode`);
  console.log(`   Topic: "${TOPIC}"`);
  console.log(`${'─'.repeat(60)}`);

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 120)); });
  page.on('pageerror', err => errors.push(err.message.slice(0, 120)));

  try {
    // ── Step 1: Navigate to pipeline page ────────────────────────────────────
    console.log(`  Step 1: Loading pipeline page`);
    await page.goto(`${BASE_URL}/pipeline`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${outPfx}_01_loaded.png` });

    // ── Step 2: Enter topic ───────────────────────────────────────────────────
    console.log(`  Step 2: Entering topic`);
    const topicInput = page.locator('input[placeholder*="topic"], textarea[placeholder*="topic"], input[placeholder*="content"], textarea[placeholder*="content"]').first();
    await topicInput.waitFor({ timeout: 10000 });
    await topicInput.fill(TOPIC);
    await page.screenshot({ path: `${outPfx}_02_topic.png` });

    // ── Step 3: Set mode (toggle Web/LLM if needed) ───────────────────────────
    if (mode === 'llm') {
      console.log(`  Step 3: Switching to LLM mode`);
      // Look for LLM toggle — usually a toggle button or "LLM" pill
      const llmToggle = page.locator('button:has-text("LLM"), [role="switch"], button:has-text("llm")').first();
      if (await llmToggle.count() > 0) {
        await llmToggle.click();
        await page.waitForTimeout(500);
      } else {
        // Try toggling the Web/LLM switch
        const webToggle = page.locator('[class*="toggle"], [class*="switch"]').first();
        if (await webToggle.count() > 0) await webToggle.click();
      }
    } else {
      console.log(`  Step 3: Confirming Web mode (default)`);
    }
    await page.screenshot({ path: `${outPfx}_03_mode.png` });

    // ── Step 4: Launch pipeline ───────────────────────────────────────────────
    console.log(`  Step 4: Clicking launch button`);
    // In web mode: "Produce Content". In LLM mode: "Draft Research"
    const produceBtn = page.locator('button:has-text("Produce Content"), button:has-text("Draft Research"), button:has-text("Produce")').first();
    await produceBtn.waitFor({ timeout: 8000, state: 'visible' });
    // Wait for button to become enabled
    await page.waitForFunction(() => {
      const btns = [...document.querySelectorAll('button')];
      return btns.some(b =>
        (b.textContent?.includes('Produce Content') || b.textContent?.includes('Draft Research')) &&
        !b.disabled
      );
    }, { timeout: 10000 }).catch(() => {});
    await produceBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${outPfx}_04_started.png` });

    // ── Step 5: Wait for pipeline to complete ─────────────────────────────────
    console.log(`  Step 5: Waiting for pipeline completion...`);
    const success = await waitForPipeline(page, label);
    await page.screenshot({ path: `${outPfx}_05_${success ? 'complete' : 'failed'}.png` });

    if (!success) {
      return { mode, success: false, errors, screenshots: [1,2,3,4,5].map(n => `${outPfx}_0${n}_*.png`) };
    }

    // ── Step 6: Screenshot final state ───────────────────────────────────────
    console.log(`  Step 6: Capturing final state`);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${outPfx}_06_final.png`, fullPage: true });

    // ── Step 7: Navigate to editor if possible ───────────────────────────────
    console.log(`  Step 7: Checking editor link`);
    const editorLink = page.locator('a:has-text("Editor"), button:has-text("Editor"), a:has-text("View"), button:has-text("View")').first();
    let editorScreenshot = null;
    if (await editorLink.count() > 0) {
      await editorLink.click();
      await page.waitForTimeout(4000);
      await page.screenshot({ path: `${outPfx}_07_editor.png` });
      editorScreenshot = `${outPfx}_07_editor.png`;
      console.log(`  Step 7: Editor opened`);
    }

    // ── Extract run_id from URL ───────────────────────────────────────────────
    const url = page.url();
    const runIdMatch = url.match(/run=([a-f0-9-]{36})/);
    const runId = runIdMatch?.[1] ?? 'unknown';
    console.log(`  Run ID: ${runId}`);

    // ── Check generated slides on disk ───────────────────────────────────────
    let slideCount = 0;
    if (runId !== 'unknown') {
      const slidesPath = `${PROJECT}/backend/outputs/runs/${runId}/content/angle_0/png`;
      if (fs.existsSync(slidesPath)) {
        slideCount = fs.readdirSync(slidesPath).filter(f => f.endsWith('.png')).length;
        console.log(`  Slides generated: ${slideCount}`);
      }
    }

    return {
      mode, success: true, runId, slideCount,
      consoleErrors: errors.slice(0, 5),
      screenshots: {
        loaded:    `${outPfx}_01_loaded.png`,
        started:   `${outPfx}_04_started.png`,
        complete:  `${outPfx}_05_complete.png`,
        final:     `${outPfx}_06_final.png`,
        editor:    editorScreenshot,
      },
    };
  } catch (err) {
    console.error(`  [${label}] Unexpected error:`, err.message);
    await page.screenshot({ path: `${outPfx}_error.png` }).catch(() => {});
    return { mode, success: false, error: err.message, consoleErrors: errors };
  } finally {
    await page.close();
    await context.close();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  CONTENT STUDIO AI — Full E2E Pipeline Test`);
  console.log(`  Topic: "${TOPIC}"`);
  console.log(`  Output: ${OUT_DIR}`);
  console.log(`${'═'.repeat(60)}`);

  const browser = await chromium.launch({ headless: true });
  const results  = [];

  // Run normal (web) mode first
  results.push(await runPipelineTest(browser, 'web'));

  // Run LLM mode second
  results.push(await runPipelineTest(browser, 'llm'));

  await browser.close();

  // ── Final report ─────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  E2E TEST RESULTS`);
  console.log(`${'═'.repeat(60)}`);
  for (const r of results) {
    const statusIcon = r.success ? '✅' : '❌';
    console.log(`\n  ${statusIcon} Mode: ${r.mode.toUpperCase()}`);
    if (r.success) {
      console.log(`     Run ID:   ${r.runId}`);
      console.log(`     Slides:   ${r.slideCount}`);
      if (r.consoleErrors?.length) console.log(`     JS errors: ${r.consoleErrors.length}`);
    } else {
      console.log(`     FAILED: ${r.error ?? 'pipeline did not complete'}`);
      if (r.consoleErrors?.length) console.log(`     JS errors: ${r.consoleErrors[0]}`);
    }
  }

  const reportPath = path.join(OUT_DIR, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    topic: TOPIC,
    timestamp: new Date().toISOString(),
    results,
  }, null, 2));
  console.log(`\n  Full report: ${reportPath}`);
  console.log(`${'═'.repeat(60)}\n`);

  process.exit(results.every(r => r.success) ? 0 : 1);
})();
