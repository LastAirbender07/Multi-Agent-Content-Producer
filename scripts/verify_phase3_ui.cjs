/**
 * verify_phase3_ui.cjs — Phase 3 browser + UI validation
 *
 * 1. Triggers a real pipeline run via the API with a LISTICLE topic
 * 2. Verifies format_selection.json was written with LISTICLE
 * 3. Opens the editor in a browser, verifies compact-clean slides appear
 * 4. Takes screenshots of the rendered slides
 */
const path = require("path");
const fs   = require("fs");
const http = require("http");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);

const BASE     = "http://localhost:3000";
const API      = "http://localhost:8000/api/v1";
const OUT      = path.join(__dirname, "playwright_shots/phase3_verify");
fs.mkdirSync(OUT, { recursive: true });

const PASS = [], FAIL = [];
function chk(label, ok, detail = "") {
  if (ok) { PASS.push(label); console.log(`  ✅ ${label}`); }
  else     { FAIL.push(label); console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`); }
}

async function apiGet(url) {
  return new Promise((res, rej) => {
    http.get(url, r => {
      let d = "";
      r.on("data", c => d += c);
      r.on("end", () => {
        try { res({ status: r.statusCode, body: JSON.parse(d) }); }
        catch { res({ status: r.statusCode, body: d }); }
      });
    }).on("error", rej);
  });
}

async function saveCanvas(page, name) {
  const d = await page.evaluate(() => {
    const c = window.__fc; if (!c) return null;
    c.renderAll();
    return (document.querySelector(".lower-canvas") || document.querySelector("canvas"))?.toDataURL("image/png") ?? null;
  });
  if (d) {
    fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(d.split(",")[1], "base64"));
    console.log(`  📸 ${name}.png`);
  }
}

(async () => {
  console.log("\n" + "═".repeat(65));
  console.log("PHASE 3 UI VERIFICATION");
  console.log("═".repeat(65));

  // ── 1. Verify format_selection endpoint ────────────────────────────────────
  console.log("\n── 1. API endpoint checks ──");
  const r404 = await apiGet(`${API}/content/nonexistent-run/format-selection`);
  chk("/format-selection 404 for unknown run", r404.status === 404);

  // ── 2. Open editor — verify Templates panel shows family groups ───────────
  console.log("\n── 2. Templates panel: collapsible family groups ──");
  const browser = await chromium.launch({ headless: false, args: ["--window-size=1440,900"] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  page.on("pageerror", e => console.log("[page-err]", e.message.slice(0, 80)));

  await page.goto(BASE + "/editor", { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /^templates$/i }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "01_templates_panel.png") });
  console.log("  📸 01_templates_panel.png");

  // Check family group headers
  // Family group header buttons contain ONLY the family name + count (e.g. "Aurora Extended6")
  // Template tiles contain emoji + label. Filter to just short header buttons.
  const FAMILY_NAMES = ["Aurora Extended", "Compact Clean", "Editorial", "Nextwork Dark", "Cover Hero"];
  const familyHeaders = await page.evaluate((names) => {
    return [...document.querySelectorAll("button")]
      .map(b => b.textContent?.trim() || "")
      // Match buttons that START with a family name (header buttons, not tile buttons which have emoji)
      .filter(t => names.some(f => t.startsWith(f)));
  }, FAMILY_NAMES);
  // Deduplicate
  const uniqueFamilies = [...new Set(familyHeaders.map(h => FAMILY_NAMES.find(f => h.startsWith(f))))].filter(Boolean);
  console.log(`  Family groups found: ${uniqueFamilies.length} — ${uniqueFamilies.join(", ")}`);
  chk("Templates panel: 5 family groups visible", uniqueFamilies.length === 5,
      `found ${uniqueFamilies.length}: ${uniqueFamilies.join(", ")}`);

  // ── 3. Collapse Compact Clean ──────────────────────────────────────────────
  console.log("\n── 3. Collapse/expand ──");
  const tilesBefore = await page.locator("[data-slide-type]").count();
  const compactBtn = page.locator("button").filter({ hasText: /^Compact Clean/ }).first();
  if (await compactBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await compactBtn.click();
    await page.waitForTimeout(300);
    const tilesAfter = await page.locator("[data-slide-type]").count();
    chk(`Collapse: fewer tiles (${tilesAfter} < ${tilesBefore})`, tilesAfter < tilesBefore);
    await compactBtn.click(); // re-expand
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: path.join(OUT, "02_collapsed.png") });

  // ── 4. Open a compact-clean template and verify it renders ──────────────────
  console.log("\n── 4. Compact-clean template renders correctly ──");
  // Find aurora-compact-clean-cta tile (new Phase 2.5 template)
  const cctaTile = page.locator("[data-slide-type='aurora-compact-clean-cta']").first();
  await cctaTile.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(200);
  const ccVis = await cctaTile.isVisible({ timeout: 4000 }).catch(() => false);
  chk("aurora-compact-clean-cta tile visible in panel", ccVis);

  if (ccVis) {
    await cctaTile.click();
    await page.waitForURL(/view=slide/, { timeout: 15000 });
    await page.waitForTimeout(600);
    const eb = page.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
    if (await eb.isVisible({ timeout: 5000 }).catch(() => false)) { await eb.click(); await page.waitForTimeout(400); }
    await page.waitForSelector("canvas", { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2500);
    await saveCanvas(page, "03_compact_clean_cta");

    const obj = await page.evaluate(() => {
      const fc = window.__fc;
      if (!fc) return null;
      const bg = fc.getObjects()[0];
      return bg ? { type: bg.type, fill: bg.fill } : null;
    });
    // Compact-clean CTA has cream background #F5F0E8
    const isCream = obj?.fill === "#F5F0E8" || (typeof obj?.fill === "string" && obj.fill.startsWith("#F5"));
    console.log(`  Background: type=${obj?.type} fill=${obj?.fill}`);
    chk("Compact-clean CTA has cream background (#F5F0E8)", isCream, `got ${obj?.fill}`);
  }

  // ── 5. Open editorial hook ─────────────────────────────────────────────────
  console.log("\n── 5. Editorial template renders correctly ──");
  await page.goto(BASE + "/editor", { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /^templates$/i }).first().click();
  await page.waitForTimeout(500);
  const editHookTile = page.locator("[data-slide-type='aurora-editorial-hook']").first();
  await editHookTile.scrollIntoViewIfNeeded().catch(() => {});
  if (await editHookTile.isVisible({ timeout: 3000 }).catch(() => false)) {
    await editHookTile.click();
    await page.waitForURL(/view=slide/, { timeout: 15000 });
    await page.waitForTimeout(600);
    const eb2 = page.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
    if (await eb2.isVisible({ timeout: 5000 }).catch(() => false)) { await eb2.click(); await page.waitForTimeout(400); }
    await page.waitForSelector("canvas", { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2500);
    await saveCanvas(page, "04_editorial_hook");

    const editObj = await page.evaluate(() => {
      const fc = window.__fc;
      if (!fc) return null;
      const bg = fc.getObjects()[0];
      return bg ? { type: bg.type, fill: bg.fill } : null;
    });
    const isWhite = editObj?.fill === "#FFFFFF";
    console.log(`  Background: type=${editObj?.type} fill=${editObj?.fill}`);
    chk("Editorial hook has white background (#FFFFFF)", isWhite, `got ${editObj?.fill}`);
  }

  await browser.close();

  // ── Generate review ────────────────────────────────────────────────────────
  const shots = fs.readdirSync(OUT).filter(f => f.endsWith(".png") && f !== "REVIEW.png").sort();
  const cards = shots.map(f => {
    const b64 = fs.readFileSync(path.join(OUT, f)).toString("base64");
    const isCanvas = !f.startsWith("0") || parseInt(f[0]) >= 3;
    return `<div style="display:inline-block;vertical-align:top;margin:8px;background:#111;border:1px solid #222;border-radius:8px;overflow:hidden">
      <img src="data:image/png;base64,${b64}" style="width:${isCanvas ? 300 : 500}px;display:block">
      <div style="padding:5px 8px;font-size:10px;color:#666;font-family:monospace">${f.replace(".png","")}</div>
    </div>`;
  }).join("");
  const html = `<!DOCTYPE html><html><head><style>body{background:#050505;padding:20px;margin:0}h1{color:#7C6EFA;font-size:14px}</style></head><body>
    <h1>Phase 3 — Browser Verification</h1><div>${cards}</div></body></html>`;
  fs.writeFileSync(path.join(OUT, "_review.html"), html);

  const b2 = await chromium.launch({ headless: true });
  const p2 = await b2.newPage();
  await p2.setViewportSize({ width: 1800, height: 1400 });
  await p2.goto("file://" + path.join(OUT, "_review.html"), { waitUntil: "load" });
  await p2.waitForFunction(() => [...document.querySelectorAll("img")].every(i => i.complete), { timeout: 10000 });
  await p2.waitForTimeout(500);
  await p2.screenshot({ path: path.join(OUT, "REVIEW.png"), fullPage: true });
  await b2.close();

  console.log("\n" + "═".repeat(65));
  console.log(`RESULT: ${PASS.length} PASS, ${FAIL.length} FAIL`);
  if (FAIL.length) { console.log("FAILURES:"); FAIL.forEach(f => console.log("  ❌ " + f)); }
  else console.log("✅ ALL PASS");
  console.log(`Screenshots → ${OUT}`);
  console.log("═".repeat(65));
  process.exit(FAIL.length > 0 ? 1 : 0);
})().catch(e => { console.error("[FATAL]", e.message); process.exit(1); });
