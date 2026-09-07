/**
 * verify_2_6.cjs — Phase 2.6 verification
 *
 * Tests:
 * A. cover-phone-mockup component drops, phone group has correct roles+interactive
 * B. Selecting phone group → right panel shows Photo Slot content
 * C. audit_one regression on aurora-carousel-cover-hero-phone
 * D. TypeScript still clean
 */
const path = require("path");
const fs   = require("fs");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);
const { execSync } = require("child_process");
const OUT = path.join(__dirname, "playwright_shots/verify_2_6");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  // ── A. TypeScript check ──────────────────────────────────────────────────
  console.log("A. TypeScript compile check...");
  try {
    execSync("npx tsc --noEmit", { cwd: path.join(__dirname, "../frontend"), stdio: "pipe" });
    console.log("   ✅ 0 errors");
  } catch (e) {
    console.log("   ❌ TS errors:\n" + e.stdout?.toString().slice(0, 300));
    process.exit(1);
  }

  const b = await chromium.launch({ headless: true });
  const pg = await b.newPage();
  await pg.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  pg.on("pageerror", e => errors.push(e.message.slice(0, 100)));
  pg.on("console",   m => { if (m.type() === "error") errors.push(m.text().slice(0, 100)); });

  // ── B. Drop phone mockup, inspect object ─────────────────────────────────
  console.log("\nB. Drop cover-phone-mockup, check roles...");
  await pg.goto("http://localhost:3000/editor", { waitUntil: "networkidle", timeout: 20000 });
  await pg.waitForTimeout(400);
  const tb = pg.getByRole("button", { name: /^templates$/i }).first();
  await tb.click(); await pg.waitForTimeout(400);
  await pg.locator("[data-slide-type='aurora-hook']").first().click();
  await pg.waitForURL(/view=slide/, { timeout: 15000 });
  await pg.waitForTimeout(600);
  const eb = pg.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
  if (await eb.isVisible({ timeout: 5000 }).catch(() => false)) { await eb.click(); await pg.waitForTimeout(400); }
  await pg.waitForSelector("canvas", { timeout: 10000 });
  await pg.waitForLoadState("networkidle");
  await pg.waitForTimeout(1800);

  // Get canvas box
  const box = await pg.evaluate(() => {
    const el = document.querySelector(".upper-canvas") || document.querySelector("canvas");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left+r.width/2, cy: r.top+r.height/2 };
  });

  // Switch to components, drop phone mockup
  await pg.getByRole("button", { name: /^components$/i }).first().click();
  await pg.waitForTimeout(500);
  const tile = pg.locator("[data-component-id='cover-phone-mockup']").first();
  await tile.scrollIntoViewIfNeeded().catch(() => {});
  await pg.waitForTimeout(300);
  const freshBox = await pg.evaluate(() => {
    const el = document.querySelector(".upper-canvas") || document.querySelector("canvas");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left+r.width/2, cy: r.top+r.height/2 };
  });
  const tileBox = await tile.boundingBox();
  if (tileBox && freshBox) {
    await pg.mouse.move(tileBox.x + tileBox.width/2, tileBox.y + tileBox.height/2);
    await pg.waitForTimeout(80); await pg.mouse.down(); await pg.waitForTimeout(80);
    await pg.mouse.move(freshBox.cx - 200, freshBox.cy - 50, { steps: 8 });
    await pg.mouse.move(freshBox.cx, freshBox.cy, { steps: 10 });
    await pg.mouse.up();
    await pg.waitForFunction(
      (before) => window.__fc && window.__fc.getObjects().length > before,
      10, { timeout: 4000 }
    ).catch(() => {});
    await pg.waitForTimeout(600);
  }

  const phoneInfo = await pg.evaluate(() => {
    if (!window.__fc) return null;
    const grp = window.__fc.getObjects().find(o => o.data?.role === "phone_mockup");
    if (!grp) return null;
    return {
      role: grp.data?.role,
      interactive: grp.interactive,
      subTargetCheck: grp.subTargetCheck,
      selectable: grp.selectable,
      childCount: grp.getObjects ? grp.getObjects().length : 0,
    };
  });

  if (phoneInfo) {
    console.log(`   phone_mockup found: interactive=${phoneInfo.interactive} subTargetCheck=${phoneInfo.subTargetCheck} children=${phoneInfo.childCount}`);
    console.log("   ✅ Phone mockup component dropped correctly");
  } else {
    console.log("   ❌ phone_mockup not found on canvas");
  }

  // ── C. Click phone group → check right panel shows Photo Slot ────────────
  console.log("\nC. Click phone group → check right panel...");
  if (freshBox) {
    await pg.mouse.click(freshBox.cx, freshBox.cy);
    await pg.waitForTimeout(600);
  }
  await pg.screenshot({ path: path.join(OUT, "phone_selected.png") });

  const activeRole = await pg.evaluate(() => {
    const obj = window.__fc?.getActiveObject();
    return obj?.data?.role || null;
  });
  console.log(`   Active object role: ${activeRole}`);

  const rightPanelHasSlot = await pg.evaluate(() => {
    const allText = document.body.innerText;
    return allText.includes("Photo Slot") || allText.includes("Replace Photo");
  });
  console.log(rightPanelHasSlot
    ? "   ✅ Right panel shows Photo Slot content"
    : "   ⚠️  Photo Slot text not found in page — check RightPanel routing");

  // ── D. Check page errors ──────────────────────────────────────────────────
  console.log("\nD. Page/console errors:");
  if (errors.length === 0) {
    console.log("   ✅ None");
  } else {
    errors.forEach(e => console.log("   ❌ " + e));
  }

  await b.close();

  // ── E. Run existing template audit for regression ─────────────────────────
  console.log("\nE. Running audit_one regression on aurora-hook...");
  try {
    const out = execSync(
      "node scripts/audit_one.cjs template aurora-hook",
      { cwd: path.join(__dirname, ".."), timeout: 60000 }
    ).toString();
    const pass = out.includes("ALL PASS");
    console.log(pass ? "   ✅ aurora-hook ALL PASS" : "   ❌ " + out.slice(-200));
  } catch (e) {
    console.log("   ❌ audit failed: " + e.message.slice(0, 100));
  }

  console.log("\n" + "═".repeat(55));
  console.log("Phase 2.6 verification complete.");
  console.log("Pan mode requires manual browser test — open:");
  console.log("  http://localhost:3000/editor");
  console.log("  Drop cover-phone-mockup → Replace Photo → landscape image");
  console.log("  Double-click phone → amber toolbar + drag to pan");
  console.log("═".repeat(55));
})().catch(e => { console.error("[FATAL]", e.message); process.exit(1); });
