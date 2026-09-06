/**
 * canvas_snapshots.cjs
 *
 * Captures the actual Fabric canvas content (not the DOM page) by:
 * 1. Using page.evaluate to call canvas.toDataURL()
 * 2. Saving the resulting PNG directly
 *
 * This bypasses any headless rendering issues and gets the real pixel content.
 */
const path = require("path");
const fs   = require("fs");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);

const OUT = path.join(__dirname, "playwright_shots/canvas_snapshots");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";
const JPEG = "/tmp/test_landscape.jpg";

if (!fs.existsSync(JPEG)) {
  console.error("Missing /tmp/test_landscape.jpg — run: curl -L -o /tmp/test_landscape.jpg https://picsum.photos/1200/800");
  process.exit(1);
}
const testImageB64 = "data:image/jpeg;base64," + fs.readFileSync(JPEG).toString("base64");

async function saveCanvasSnapshot(page, name) {
  const dataUrl = await page.evaluate(() => {
    const c = window.__fc;
    if (!c) return null;
    // Force a full re-render first
    c.renderAll();
    // Get the lower canvas (the actual rendered content)
    const lower = document.querySelector(".lower-canvas");
    if (lower) return lower.toDataURL("image/png");
    return null;
  });
  if (!dataUrl) { console.log(`  ⚠️  ${name}: no canvas data URL`); return; }
  const buf = Buffer.from(dataUrl.split(",")[1], "base64");
  fs.writeFileSync(path.join(OUT, name + ".png"), buf);
  console.log(`  📸 ${name}.png saved (${buf.length} bytes)`);
}

async function openBaseSlide(page) {
  await page.goto(BASE + "/editor", { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /^templates$/i }).first().click();
  await page.waitForTimeout(400);
  await page.locator("[data-slide-type='aurora-hook']").first().click();
  await page.waitForURL(/view=slide/, { timeout: 15000 });
  await page.waitForTimeout(600);
  const eb = page.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
  if (await eb.isVisible({ timeout: 5000 }).catch(() => false)) { await eb.click(); await page.waitForTimeout(400); }
  await page.waitForSelector("canvas", { timeout: 10000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
}

async function dropAndFill(page, componentId, slotRole) {
  // Drop component
  await page.getByRole("button", { name: /^components$/i }).first().click();
  await page.waitForTimeout(500);
  const tile = page.locator(`[data-component-id='${componentId}']`).first();
  await tile.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(300);
  const freshBox = await page.evaluate(() => {
    const el = document.querySelector(".upper-canvas") || document.querySelector("canvas");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left+r.width/2, cy: r.top+r.height/2 };
  });
  const tileBox = await tile.boundingBox();
  if (!tileBox || !freshBox) return null;
  const before = await page.evaluate(() => window.__fc?.getObjects().length ?? 0);
  await page.mouse.move(tileBox.x + tileBox.width/2, tileBox.y + tileBox.height/2);
  await page.waitForTimeout(80); await page.mouse.down(); await page.waitForTimeout(80);
  await page.mouse.move(freshBox.cx - 200, freshBox.cy - 50, { steps: 8 });
  await page.mouse.move(freshBox.cx, freshBox.cy, { steps: 10 });
  await page.mouse.up();
  await page.waitForFunction(b => window.__fc?.getObjects().length > b, before, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(800);

  // Click to select
  await page.mouse.click(freshBox.cx, freshBox.cy);
  await page.waitForTimeout(400);

  // Click Replace Photo
  const replBtn = page.locator("button").filter({ hasText: /replace photo/i }).first();
  const hasBtn = await replBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (!hasBtn) { console.log(`  ⚠️  Replace Photo button not visible for ${componentId}`); return freshBox; }

  const fcPromise = page.waitForEvent("filechooser", { timeout: 8000 }).catch(() => null);
  await replBtn.click();
  const fc = await fcPromise;
  if (fc) {
    await fc.setFiles(JPEG);
    await page.waitForTimeout(2500);
  } else {
    console.log(`  ⚠️  File chooser not intercepted for ${componentId}`);
  }
  return freshBox;
}

(async () => {
  const browser = await chromium.launch({
    headless: false,  // ← non-headless so canvas renders properly
    args: ["--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  page.on("pageerror", e => console.log("[err]", e.message.slice(0, 80)));

  // ── TEST 1: Phone Mockup ────────────────────────────────────────────────────
  console.log("\n── PHONE MOCKUP ──");
  await openBaseSlide(page);
  await saveCanvasSnapshot(page, "phone_1_base_slide");

  const box = await dropAndFill(page, "cover-phone-mockup", "phone_mockup");
  await page.waitForTimeout(500);
  await saveCanvasSnapshot(page, "phone_2_after_fill");

  // Double-click to enter pan mode
  if (box) {
    await page.mouse.dblclick(box.cx, box.cy);
    await page.waitForTimeout(600);
    await saveCanvasSnapshot(page, "phone_3_pan_mode");

    // Drag 80px right
    await page.mouse.move(box.cx, box.cy);
    await page.waitForTimeout(50);
    await page.mouse.down();
    await page.mouse.move(box.cx + 80, box.cy, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    await saveCanvasSnapshot(page, "phone_4_panned");

    // Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await saveCanvasSnapshot(page, "phone_5_escaped");
  }

  // ── TEST 2: Polaroid ────────────────────────────────────────────────────────
  console.log("\n── POLAROID FRAME ──");
  await openBaseSlide(page);
  const box2 = await dropAndFill(page, "cover-polaroid-frame", "polaroid_frame");
  await page.waitForTimeout(500);
  await saveCanvasSnapshot(page, "polaroid_1_after_fill");

  // ── TEST 3: Image Pair ──────────────────────────────────────────────────────
  console.log("\n── IMAGE PAIR ──");
  await openBaseSlide(page);
  const box3 = await dropAndFill(page, "cover-image-pair", "image_pair");
  await page.waitForTimeout(500);
  await saveCanvasSnapshot(page, "imagepair_1_slot0_filled");

  // Fill slot 1 as well
  if (box3) {
    await page.mouse.click(box3.cx, box3.cy);
    await page.waitForTimeout(400);
    const replBtn2 = page.locator("button").filter({ hasText: /replace photo/i }).first();
    if (await replBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
      const fc2 = page.waitForEvent("filechooser", { timeout: 8000 }).catch(() => null);
      await replBtn2.click();
      const fc = await fc2;
      if (fc) { await fc.setFiles(JPEG); await page.waitForTimeout(2500); }
    }
    await saveCanvasSnapshot(page, "imagepair_2_both_slots");
  }

  await browser.close();

  // ── Generate review HTML ──────────────────────────────────────────────────
  const shots = fs.readdirSync(OUT).filter(f => f.endsWith(".png")).sort();
  const html = `<!DOCTYPE html><html>
<head><style>
body{background:#111;color:#eee;font-family:monospace;padding:20px;margin:0}
h1{color:#f59e0b}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.card{background:#1a1a1a;border:1px solid #444;border-radius:8px;overflow:hidden}
.card img{width:100%;display:block}
.label{padding:8px;font-size:11px;color:#aaa}
</style></head>
<body><h1>Phase 2.6 — Fabric Canvas Content (real pixel data)</h1>
<div class="grid">
${shots.map(f => `<div class="card">
  <img src="${f}">
  <div class="label">${f.replace('.png','').replace(/_/g,' ')}</div>
</div>`).join('\n')}
</div>
</body></html>`;
  fs.writeFileSync(path.join(OUT, "review.html"), html);

  // Screenshot the review
  const b2 = await chromium.launch({ headless: true });
  const p2 = await b2.newPage();
  await p2.setViewportSize({ width: 1800, height: 2400 });
  await p2.goto("file://" + path.join(OUT, "review.html"), { waitUntil: "load" });
  await p2.waitForFunction(() => [...document.querySelectorAll("img")].every(i => i.complete), { timeout: 10000 });
  await p2.waitForTimeout(500);
  await p2.screenshot({ path: path.join(OUT, "REVIEW.png"), fullPage: true });
  await b2.close();

  console.log(`\n✅ Canvas snapshots → ${OUT}`);
  console.log("✅ Review grid → " + path.join(OUT, "REVIEW.png"));
})().catch(e => { console.error("[FATAL]", e.message); process.exit(1); });
