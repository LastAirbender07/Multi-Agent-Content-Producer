/**
 * Targeted audit: navigate directly to known slides in an existing run,
 * verify canvas renders + objects are selectable + right panel activates.
 * Covers all 5 previously failing cases.
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");
const OUT = "/tmp/targeted_audit2";
fs.mkdirSync(OUT, { recursive: true });

const RUN = "e82ea8ed-ada8-4940-9a86-3d5eef956875";
const ANGLE = 0;

// Map canvas_template → slide_number in the known run
const SLIDES = [
  { slide: 1,  template: "aurora-carousel-cover-hero-phone" },
  { slide: 2,  template: "aurora-compact-quote" },
  { slide: 3,  template: "aurora-compact-fact" },
  { slide: 4,  template: "aurora-cta" },
  { slide: 5,  template: "aurora-quote" },
  { slide: 7,  template: "aurora-compact-hook" },
  { slide: 8,  template: "aurora-compact-fact-compare" },
  { slide: 9,  template: "aurora-compact-step" },
  { slide: 10, template: "aurora-compact-step-index" },
];

// More click spots covering the full canvas area
const SPOTS = [
  { rx: 0.5,  ry: 0.15, label: "top" },
  { rx: 0.5,  ry: 0.30, label: "upper-mid" },
  { rx: 0.5,  ry: 0.50, label: "center" },
  { rx: 0.5,  ry: 0.70, label: "lower-mid" },
  { rx: 0.25, ry: 0.50, label: "left" },
  { rx: 0.75, ry: 0.50, label: "right" },
  { rx: 0.75, ry: 0.30, label: "right-upper" },
  { rx: 0.15, ry: 0.35, label: "far-left-upper" },
];

const results = [];

(async () => {
  const browser = await chromium.launch({ headless: true, slowMo: 60 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const { slide, template } of SLIDES) {
    console.log(`\n▶ slide ${slide} — ${template}`);
    const res = { slide, template, rendered: false, selectable: false, spot: "", panel: "", errors: [] };

    const url = `http://localhost:3000/editor?run=${RUN}&view=slide&angle=${ANGLE}&slide=${slide}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    // Check if we're already in canvas (auto-opened) or need to click edit
    let inCanvas = await page.locator("canvas").count() > 0;
    if (!inCanvas) {
      // Try clicking "Edit in canvas" / "Edit this slide"
      const editBtn = page.getByRole("button", { name: /edit.*canvas|edit.*slide/i }).first();
      if (await editBtn.count()) {
        await editBtn.click();
        await page.waitForTimeout(2500);
        inCanvas = await page.locator("canvas").count() > 0;
      }
    } else {
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: `${OUT}/${template}_canvas.png` });

    if (!inCanvas) {
      console.log(`  ✗  canvas not found`);
      res.errors.push("canvas not found");
      results.push(res);
      continue;
    }
    res.rendered = true;
    console.log(`  ✓  canvas rendered`);

    // Try all click spots
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox({ timeout: 5000 }).catch(() => null);
    if (!box) { res.errors.push("canvas bbox null"); results.push(res); continue; }

    // First deselect everything
    await page.mouse.click(box.x + 2, box.y + 2);
    await page.waitForTimeout(200);

    for (const spot of SPOTS) {
      const cx = box.x + box.width  * spot.rx;
      const cy = box.y + box.height * spot.ry;
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(400);

      const rightPanel = await page.locator(".w-56, .w-72").first().textContent({ timeout: 600 }).catch(() => "");
      if (rightPanel && !rightPanel.includes("Select an object") && rightPanel.trim().length > 10) {
        res.selectable = true;
        res.spot = spot.label;
        res.panel = rightPanel.slice(0, 100).replace(/\s+/g, " ").trim();
        console.log(`  ✓  selected at "${spot.label}" → ${res.panel.slice(0, 60)}`);
        break;
      }
    }

    if (!res.selectable) {
      console.log(`  ✗  nothing selected after ${SPOTS.length} spots`);
      res.errors.push("no selectable objects");
    }

    await page.screenshot({ path: `${OUT}/${template}_clicked.png` });
    results.push(res);
  }

  await browser.close();

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════");
  console.log("TARGETED AUDIT SUMMARY");
  console.log("══════════════════════════════════════");
  const pass   = results.filter(r => r.rendered && r.selectable);
  const fail   = results.filter(r => r.errors.length > 0 || !r.selectable);
  console.log(`\n✅  PASS (${pass.length}/${results.length}):`);
  pass.forEach(r => console.log(`   slide ${r.slide}  ${r.template}`));
  if (fail.length) {
    console.log(`\n❌  FAIL (${fail.length}):`);
    fail.forEach(r => {
      console.log(`   slide ${r.slide}  ${r.template}`);
      r.errors.forEach(e => console.log(`     → ${e}`));
      if (!r.selectable && r.rendered) console.log(`     → nothing selectable`);
    });
  }
  console.log(`\n📸  ${OUT}`);
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(results, null, 2));
})().catch(e => { console.error(e.message); process.exit(1); });
