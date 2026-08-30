/**
 * Full editor audit:
 *  - Opens /editor
 *  - Opens Templates tab
 *  - Clicks every template tile
 *  - Enters canvas editor
 *  - Clicks multiple spots to test selectability
 *  - Screenshots: preview, canvas, clicked states
 *  - Reports: API errors, selection success, right-panel content
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const OUT = "/tmp/editor_audit";
fs.mkdirSync(OUT, { recursive: true });

const ALL_TEMPLATES = [
  // Legacy aurora
  "aurora-hook",
  "aurora-content-0",
  "aurora-content-3",
  "aurora-content-1",
  "aurora-content-2",
  "aurora-content-text",
  "aurora-stat",
  "aurora-quote",
  "aurora-cta",
  "aurora-engage",
  // Compact aurora
  "aurora-compact-hook",
  "aurora-compact-fact",
  "aurora-compact-fact-compare",
  "aurora-compact-step",
  "aurora-compact-step-index",
  "aurora-compact-step-detail",
  "aurora-compact-stat-hero",
  "aurora-compact-list-item",
  "aurora-compact-quote",
  // Cover hero
  "aurora-carousel-cover-hero-phone",
  "aurora-carousel-cover-hero-images",
];

// Click positions to try (relative to canvas bounding box)
// Broad coverage: top-left headings, right-column body text, center stats, etc.
const CLICK_SPOTS = [
  { rx: 0.5,  ry: 0.3,  label: "top-center"      },
  { rx: 0.5,  ry: 0.5,  label: "center"           },
  { rx: 0.35, ry: 0.4,  label: "left-mid"         },
  { rx: 0.6,  ry: 0.6,  label: "right-lower"      },
  { rx: 0.15, ry: 0.12, label: "top-left"         },  // headings top-left
  { rx: 0.15, ry: 0.35, label: "left-upper"       },  // step names
  { rx: 0.65, ry: 0.35, label: "right-upper"      },  // right-column body text
  { rx: 0.65, ry: 0.55, label: "right-center"     },  // right-column lower
  { rx: 0.5,  ry: 0.15, label: "very-top-center"  },  // top chips / headlines
];

const results = [];

(async () => {
  const browser = await chromium.launch({ headless: true, slowMo: 80 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── Open editor & Templates tab ───────────────────────────────────────────
  await page.goto("http://localhost:3000/editor", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/00_initial.png` });

  const templatesBtn = page.getByRole("button", { name: /templates/i }).first();
  await templatesBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/01_templates_tab.png` });

  // Count tiles visible
  const tileCount = await page.locator("[data-slide-type]").count();
  console.log(`\n📋 Templates tab — ${tileCount} tiles visible\n`);

  // ── Cycle every template ──────────────────────────────────────────────────
  for (const tmpl of ALL_TEMPLATES) {
    const res = { template: tmpl, tileFound: false, apiErrors: [], selected: false, rightPanel: "", issues: [] };
    console.log(`▶ ${tmpl}`);

    // Intercept API errors
    const apiErrors = [];
    const onResp = resp => {
      if (!resp.ok() && (resp.url().includes(":8000") || resp.url().includes("/api/"))) {
        apiErrors.push(`${resp.status()} ${resp.url().split("?")[0]}`);
      }
    };
    page.on("response", onResp);

    // Find tile
    const tile = page.locator(`[data-slide-type='${tmpl}']`).first();
    if (!await tile.count()) {
      console.log(`  ⚠  tile NOT found`);
      res.issues.push("tile not found in Templates panel");
      results.push(res);
      page.off("response", onResp);
      continue;
    }
    res.tileFound = true;

    // Scroll tile into view and click it
    await tile.scrollIntoViewIfNeeded();
    await tile.click();
    // Wait for URL to include slide= (navigation to new slide), then settle
    try {
      await page.waitForURL(url => url.toString().includes("slide="), { timeout: 15000 });
    } catch {
      // No navigation happened (tile may have errored or we're already on a slide)
    }
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(400); // small React re-render settle
    await page.screenshot({ path: `${OUT}/${tmpl}_1_preview.png` });

    // Enter canvas editor
    // First check if we're already in canvas mode (auto-opened) or need to click
    const hasCanvas = await page.locator("canvas").count() > 0;
    if (!hasCanvas) {
      const editBtn = page.getByRole("button", { name: /edit in canvas|edit this slide|open in canvas/i }).first();
      if (await editBtn.count()) {
        await editBtn.click();
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(600); // canvas init settle
      } else {
        console.log(`  ⚠  No 'Edit in canvas' button`);
        res.issues.push("no edit-in-canvas button");
        results.push(res);
        page.off("response", onResp);
        continue;
      }
    } else {
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(600); // canvas init settle
    }

    await page.screenshot({ path: `${OUT}/${tmpl}_2_canvas.png` });

    // Try clicking multiple spots in the canvas to find selectable objects
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox({ timeout: 5000 }).catch(() => null);
    if (!box) {
      console.log(`  ⚠  canvas element not found`);
      res.issues.push("canvas element not found");
      results.push(res);
      page.off("response", onResp);
      continue;
    }

    let selectedSpot = null;
    for (const spot of CLICK_SPOTS) {
      const cx = box.x + box.width  * spot.rx;
      const cy = box.y + box.height * spot.ry;
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(350);

      // Check right panel for any active content (not "Select an object")
      const panelText = await page.locator(".w-56, .w-72").first().textContent({ timeout: 800 }).catch(() => "");
      if (panelText && !panelText.includes("Select an object")) {
        selectedSpot = spot.label;
        res.selected = true;
        res.rightPanel = panelText.slice(0, 120).replace(/\s+/g, " ").trim();
        break;
      }
    }

    if (res.selected) {
      console.log(`  ✓  Selected at "${selectedSpot}" — panel: ${res.rightPanel.slice(0, 60)}…`);
    } else {
      console.log(`  ✗  Nothing selectable after clicking ${CLICK_SPOTS.length} spots`);
      res.issues.push("no selectable objects found");
    }

    await page.screenshot({ path: `${OUT}/${tmpl}_3_clicked.png` });

    res.apiErrors = [...apiErrors];
    if (apiErrors.length) {
      console.log(`  ✗  API errors: ${apiErrors.join(", ")}`);
      res.issues.push(`API errors: ${apiErrors.join(", ")}`);
    } else {
      console.log(`  ✓  No API errors`);
    }

    results.push(res);
    page.off("response", onResp);

    // Navigate back to editor root so templates panel is fresh for next tile
    await page.goto("http://localhost:3000/editor", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    await templatesBtn.click();
    await page.waitForTimeout(400);
  }

  await browser.close();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════════");
  console.log("AUDIT SUMMARY");
  console.log("════════════════════════════════════════════");
  const ok     = results.filter(r => r.tileFound && r.selected && !r.apiErrors.length);
  const broken = results.filter(r => r.issues.length > 0);

  console.log(`\n✅  PASS (${ok.length}/${results.length}):`);
  ok.forEach(r => console.log(`   ${r.template}`));

  if (broken.length) {
    console.log(`\n❌  ISSUES (${broken.length}):`);
    broken.forEach(r => {
      console.log(`   ${r.template}`);
      r.issues.forEach(i => console.log(`     → ${i}`));
    });
  }

  console.log(`\n📸  Screenshots → ${OUT}`);

  // Write JSON report
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(results, null, 2));
  console.log(`📄  Full report → ${OUT}/report.json`);

  if (broken.length > 0) process.exit(1);
})().catch(err => { console.error(err.message); process.exit(1); });
