/**
 * full_visual_review.cjs
 *
 * Fresh-eyes visual audit from a user perspective.
 * Screenshots every template and every component drop at full 1080×1080 canvas resolution.
 * Non-headless so canvas renders with proper GPU acceleration.
 * Groups output by family for easy review.
 */
const path = require("path");
const fs   = require("fs");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);

const OUT = path.join(__dirname, "playwright_shots/full_review_2026_09_06");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

// ── All templates grouped by family ──────────────────────────────────────────
const FAMILIES = [
  {
    name: "Aurora Extended",
    color: "#7C6EFA",
    templates: ["aurora-hook","aurora-content-0","aurora-stat","aurora-quote","aurora-cta","aurora-engage"],
  },
  {
    name: "Compact Clean",
    color: "#E8CBA3",
    templates: [
      "aurora-compact-hook","aurora-compact-fact","aurora-compact-fact-compare",
      "aurora-compact-step","aurora-compact-step-index","aurora-compact-step-detail",
      "aurora-compact-stat-hero","aurora-compact-list-item","aurora-compact-quote",
      "aurora-compact-clean-cta","aurora-compact-clean-quote","aurora-compact-clean-engage",
    ],
  },
  {
    name: "Editorial",
    color: "#1B1B1B",
    templates: ["aurora-editorial-hook","aurora-editorial-cta"],
  },
  {
    name: "Nextwork Dark",
    color: "#0D0D0D",
    templates: ["aurora-nextwork-dark-cta","aurora-nextwork-dark-engage"],
  },
  {
    name: "Cover Hero",
    color: "#C8956C",
    templates: ["aurora-carousel-cover-hero-phone","aurora-carousel-cover-hero-images"],
  },
];

// ── All components grouped by section ────────────────────────────────────────
const COMPONENT_SECTIONS = [
  {
    name: "Aurora Extended",
    components: ["brand-bar","dark-card","stat-block","quote-block","bullet-list",
                 "accent-line","eyebrow-pill","glow-blob","deco-ring",
                 "btn-gradient","btn-ghost","btn-frosted-glow","btn-solid-white",
                 "btn-dark-pill","btn-dark-gradient"],
  },
  {
    name: "Compact Family",
    components: ["compact-brand-pill","compact-outlined-pill","compact-mixed-weight-text",
                 "compact-dot-progress","compact-number-badge","compact-editorial-header"],
  },
  {
    name: "Cover Hero",
    components: ["cover-phone-mockup","cover-image-pair","cover-overlay-cards",
                 "cover-straddling-title","cover-metallic-gradient","cover-display-headline",
                 "cover-body-text","cover-italic-cta","cover-polaroid-frame"],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getCanvasDataUrl(page) {
  return page.evaluate(() => {
    const c = window.__fc; if (!c) return null;
    c.renderAll();
    return (document.querySelector(".lower-canvas") || document.querySelector("canvas"))?.toDataURL("image/png") ?? null;
  });
}

async function saveCanvasSnapshot(page, name) {
  const dataUrl = await getCanvasDataUrl(page);
  if (!dataUrl) return false;
  fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(dataUrl.split(",")[1], "base64"));
  return true;
}

async function openTemplate(page, templateId) {
  await page.goto(BASE + "/editor", { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(300);
  const tb = page.getByRole("button", { name: /^templates$/i }).first();
  await tb.click(); await page.waitForTimeout(400);
  const tile = page.locator(`[data-slide-type='${templateId}']`).first();
  await tile.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(200);
  const vis = await tile.isVisible({ timeout: 4000 }).catch(() => false);
  if (!vis) return false;
  await tile.click();
  await page.waitForURL(/view=slide/, { timeout: 15000 });
  await page.waitForTimeout(500);
  const eb = page.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
  if (await eb.isVisible({ timeout: 5000 }).catch(() => false)) { await eb.click(); await page.waitForTimeout(400); }
  await page.waitForSelector("canvas", { timeout: 10000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2200);
  return true;
}

async function dropComponent(page, componentId) {
  await page.getByRole("button", { name: /^components$/i }).first().click();
  await page.waitForTimeout(500);
  const tile = page.locator(`[data-component-id='${componentId}']`).first();
  await tile.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(300);
  const freshBox = await page.evaluate(() => {
    const el = document.querySelector(".upper-canvas") || document.querySelector("canvas");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width/2, cy: r.top + r.height/2 };
  });
  const tb = await tile.boundingBox();
  if (!tb || !freshBox) return false;
  const before = await page.evaluate(() => window.__fc?.getObjects().length ?? 0);
  await page.mouse.move(tb.x + tb.width/2, tb.y + tb.height/2);
  await page.waitForTimeout(80); await page.mouse.down(); await page.waitForTimeout(80);
  await page.mouse.move(freshBox.cx - 200, freshBox.cy - 50, { steps: 8 });
  await page.mouse.move(freshBox.cx, freshBox.cy, { steps: 10 });
  await page.mouse.up();
  await page.waitForFunction(b => window.__fc?.getObjects().length > b, before, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(800);
  return true;
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ["--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  page.on("pageerror", e => console.log("[ERR]", e.message.slice(0,80)));

  const results = { templates: {}, components: {} };

  // ── PHASE 1: Templates ────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(65));
  console.log("PHASE 1 — TEMPLATES");
  console.log("═".repeat(65));

  for (const family of FAMILIES) {
    console.log(`\n── ${family.name} ──`);
    for (const tmpl of family.templates) {
      const ok = await openTemplate(page, tmpl);
      if (!ok) { console.log(`  ⚠️  ${tmpl}: tile not found`); continue; }
      const saved = await saveCanvasSnapshot(page, `tmpl_${tmpl}`);
      results.templates[tmpl] = { family: family.name, saved };
      console.log(`  📸 ${tmpl} → tmpl_${tmpl}.png`);
    }
  }

  // ── PHASE 2: Components on a blank aurora-hook base ───────────────────────
  console.log("\n" + "═".repeat(65));
  console.log("PHASE 2 — COMPONENTS");
  console.log("═".repeat(65));

  for (const section of COMPONENT_SECTIONS) {
    console.log(`\n── ${section.name} ──`);
    for (const compId of section.components) {
      // Fresh base slide for each component
      await openTemplate(page, "aurora-hook");
      await saveCanvasSnapshot(page, `comp_${compId}_before`);
      const ok = await dropComponent(page, compId);
      if (!ok) { console.log(`  ⚠️  ${compId}: drop failed`); continue; }
      const saved = await saveCanvasSnapshot(page, `comp_${compId}`);
      results.components[compId] = { section: section.name, saved };
      console.log(`  📸 ${compId} → comp_${compId}.png`);
    }
  }

  await browser.close();

  // ── Build Review HTML ─────────────────────────────────────────────────────
  let html = `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<title>Full Visual Review — ${new Date().toISOString().slice(0,10)}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0a0a0a; color: #eee; font-family: -apple-system, sans-serif; padding: 24px; }
h1 { color: #7C6EFA; font-size: 20px; margin-bottom: 4px; }
.meta { color: #666; font-size: 12px; margin-bottom: 32px; }
.section { margin-bottom: 40px; }
.section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.section-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.section-title { font-size: 14px; font-weight: 700; color: #eee; }
.section-count { font-size: 11px; color: #555; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.card { background: #111; border: 1px solid #222; border-radius: 10px; overflow: hidden; cursor: pointer; transition: border-color 0.15s; }
.card:hover { border-color: #444; }
.card img { width: 100%; display: block; aspect-ratio: 1; object-fit: cover; }
.card-label { padding: 8px 10px; }
.card-id { font-size: 10px; color: #7C6EFA; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-desc { font-size: 10px; color: #555; margin-top: 2px; }
.divider { height: 1px; background: #1a1a1a; margin: 40px 0; }
/* Lightbox */
#lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 100; align-items: center; justify-content: center; }
#lightbox.active { display: flex; }
#lightbox img { max-width: 90vw; max-height: 90vh; border-radius: 8px; }
#lightbox-close { position: absolute; top: 20px; right: 20px; font-size: 24px; cursor: pointer; color: #999; }
#lightbox-label { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); font-size: 13px; color: #aaa; background: #111; padding: 6px 14px; border-radius: 20px; }
</style>
</head><body>
<h1>Full Visual Review — Editor Templates & Components</h1>
<p class="meta">${new Date().toLocaleString()} · Phase 2.5 + 2.6 + 2.7 implemented · User-perspective audit</p>
<div id="lightbox"><span id="lightbox-close" onclick="document.getElementById('lightbox').classList.remove('active')">✕</span><img id="lightbox-img" src=""><div id="lightbox-label"></div></div>
<script>
function showLightbox(src, label) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox-label').textContent = label;
  document.getElementById('lightbox').classList.add('active');
}
document.addEventListener('keydown', e => { if(e.key==='Escape') document.getElementById('lightbox').classList.remove('active'); });
</script>
`;

  // Templates by family
  html += `<div class="section"><div class="section-header"><div class="section-dot" style="background:#7C6EFA"></div><div class="section-title">TEMPLATES — BY FAMILY</div></div>`;
  for (const family of FAMILIES) {
    const color = family.color === "#0D0D0D" ? "#333" : family.color;
    html += `<div style="margin-bottom:28px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="width:6px;height:6px;border-radius:50%;background:${color}"></div>
        <span style="font-size:12px;font-weight:600;color:${color === "#1B1B1B" ? "#999" : color}">${family.name}</span>
        <span style="font-size:10px;color:#444">${family.templates.length} slides</span>
      </div>
      <div class="grid">`;
    for (const tmpl of family.templates) {
      const f = `tmpl_${tmpl}.png`;
      if (fs.existsSync(path.join(OUT, f))) {
        html += `<div class="card" onclick="showLightbox('${f}','${tmpl}')">
          <img src="${f}" loading="lazy">
          <div class="card-label"><div class="card-id">${tmpl.replace("aurora-","")}</div></div>
        </div>`;
      }
    }
    html += `</div></div>`;
  }
  html += `</div><div class="divider">`;

  // Components by section
  html += `<div class="section"><div class="section-header"><div class="section-dot" style="background:#10b981"></div><div class="section-title">COMPONENTS — BY SECTION</div></div>`;
  for (const section of COMPONENT_SECTIONS) {
    html += `<div style="margin-bottom:28px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="width:6px;height:6px;border-radius:50%;background:#10b981"></div>
        <span style="font-size:12px;font-weight:600;color:#10b981">${section.name}</span>
        <span style="font-size:10px;color:#444">${section.components.length} components</span>
      </div>
      <div class="grid">`;
    for (const comp of section.components) {
      const f = `comp_${comp}.png`;
      if (fs.existsSync(path.join(OUT, f))) {
        html += `<div class="card" onclick="showLightbox('${f}','${comp}')">
          <img src="${f}" loading="lazy">
          <div class="card-label"><div class="card-id">${comp}</div></div>
        </div>`;
      }
    }
    html += `</div></div>`;
  }
  html += `</div></body></html>`;

  fs.writeFileSync(path.join(OUT, "index.html"), html);
  console.log(`\n✅ Review HTML → ${path.join(OUT, "index.html")}`);

  // Generate overview screenshot
  const b2 = await chromium.launch({ headless: true });
  const p2 = await b2.newPage();
  await p2.setViewportSize({ width: 1800, height: 6000 });
  await p2.goto("file://" + path.join(OUT, "index.html"), { waitUntil: "load" });
  await p2.waitForFunction(() => document.querySelectorAll("img").length > 5, { timeout: 15000 });
  await p2.waitForTimeout(1500);
  await p2.screenshot({ path: path.join(OUT, "OVERVIEW.png"), fullPage: true });
  await b2.close();
  console.log(`✅ Overview → ${path.join(OUT, "OVERVIEW.png")}`);
})().catch(e => { console.error("[FATAL]", e.message); process.exit(1); });
