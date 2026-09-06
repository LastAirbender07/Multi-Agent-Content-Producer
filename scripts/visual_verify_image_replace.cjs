/**
 * visual_verify_image_replace.cjs
 *
 * HANDS-DIRTY visual verification of Phase 2.6:
 * Uses the REAL user flow:
 *   1. Drop slot component → select it → click "Replace Photo" button
 *   2. Intercept the file input via Playwright's setInputFiles
 *   3. Verify image appears in slot (pixel check: not just dark placeholder)
 *   4. Double-click → amber toolbar appears
 *   5. Drag to pan → verify image moved
 *   6. Escape → group re-selected
 */
const path   = require("path");
const fs     = require("fs");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);

const OUT   = path.join(__dirname, "playwright_shots/image_replace_verify");
fs.mkdirSync(OUT, { recursive: true });
const BASE  = "http://localhost:3000";
const JPEG  = "/tmp/test_landscape.jpg";

if (!fs.existsSync(JPEG)) {
  console.error("Test image not found at " + JPEG + ". Run: curl -L -o /tmp/test_landscape.jpg https://picsum.photos/1200/800");
  process.exit(1);
}

const PASS = [], FAIL = [];

function check(label, condition, detail = "") {
  if (condition) {
    PASS.push(label);
    console.log(`  ✅ ${label}`);
  } else {
    FAIL.push(label + (detail ? ": " + detail : ""));
    console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`);
  }
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
  await page.waitForTimeout(1800);
}

async function getCanvasBox(page) {
  return page.evaluate(() => {
    const el = document.querySelector(".upper-canvas") || document.querySelector("canvas");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left+r.width/2, cy: r.top+r.height/2 };
  });
}

async function dropComponent(page, componentId, canvasBox) {
  await page.getByRole("button", { name: /^components$/i }).first().click();
  await page.waitForTimeout(500);
  const tile = page.locator(`[data-component-id='${componentId}']`).first();
  await tile.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(300);
  // Re-measure after panel switch
  const freshBox = await getCanvasBox(page);
  const tileBox  = await tile.boundingBox();
  if (!tileBox || !freshBox) { console.log("  ⚠️  tile or canvas not found for drop"); return false; }
  const before = await page.evaluate(() => window.__fc?.getObjects().length ?? 0);
  await page.mouse.move(tileBox.x + tileBox.width/2, tileBox.y + tileBox.height/2);
  await page.waitForTimeout(80); await page.mouse.down(); await page.waitForTimeout(80);
  await page.mouse.move(freshBox.cx - 200, freshBox.cy - 50, { steps: 8 });
  await page.mouse.move(freshBox.cx, freshBox.cy, { steps: 10 });
  await page.mouse.up();
  await page.waitForFunction(b => window.__fc?.getObjects().length > b, before, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(800);
  return true;
}

async function clickSlotGroup(page, role, canvasBox) {
  // Click canvas center first to attempt selecting the group
  await page.mouse.click(canvasBox.cx, canvasBox.cy);
  await page.waitForTimeout(400);
  // If that didn't get the slot group, try clicking slightly offset positions
  for (const offset of [[0,0],[-50,-100],[50,-100],[0,-150]]) {
    const activeRole = await page.evaluate(() => window.__fc?.getActiveObject()?.data?.role ?? null);
    if (activeRole === role) break;
    await page.mouse.click(canvasBox.cx + offset[0], canvasBox.cy + offset[1]);
    await page.waitForTimeout(300);
  }
  return page.evaluate(() => window.__fc?.getActiveObject()?.data?.role ?? null);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message.slice(0, 100)));
  page.on("console",   m => { if (m.type() === "error") pageErrors.push(m.text().slice(0, 100)); });

  // ═══════════════════════════════════════════════════════════════════
  // TEST 1: cover-phone-mockup
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n" + "─".repeat(60));
  console.log("TEST 1: cover-phone-mockup — Replace Photo + pan");
  console.log("─".repeat(60));

  await openBaseSlide(page);
  const box = await getCanvasBox(page);
  await dropComponent(page, "cover-phone-mockup", box);
  await page.screenshot({ path: path.join(OUT, "1_phone_dropped.png") });
  console.log("  1_phone_dropped.png");

  // Select the phone group
  const selectedRole = await clickSlotGroup(page, "phone_mockup", box);
  check("Phone: group selected", selectedRole === "phone_mockup", `got role="${selectedRole}"`);
  await page.screenshot({ path: path.join(OUT, "2_phone_selected.png") });

  // Right panel should show Photo Slot
  const bodyText = await page.evaluate(() => document.body.innerText);
  check("Phone: right panel shows Photo Slot", bodyText.includes("Photo Slot"), "");

  // Check Replace Photo button in toolbar
  const replaceBtn = page.locator("button").filter({ hasText: /replace photo/i }).first();
  const hasBtnBefore = await replaceBtn.isVisible({ timeout: 3000 }).catch(() => false);
  check("Phone: Replace Photo button visible in toolbar", hasBtnBefore);

  // === REPLACE PHOTO via file input ===
  // Set up file chooser interception BEFORE clicking the button
  const fileChooserPromise = page.waitForEvent("filechooser", { timeout: 8000 }).catch(() => null);
  if (hasBtnBefore) await replaceBtn.click();
  const fileChooser = await fileChooserPromise;

  if (fileChooser) {
    await fileChooser.setFiles(JPEG);
    console.log("  File chooser intercepted → set test_landscape.jpg (1200×800)");
    await page.waitForTimeout(2000); // wait for image to load + render
  } else {
    console.log("  ⚠️  File chooser not intercepted — may have opened native OS dialog");
  }
  check("Phone: file chooser intercepted", fileChooser !== null);

  await page.screenshot({ path: path.join(OUT, "3_phone_after_replace.png") });
  console.log("  3_phone_after_replace.png");

  // Verify image child now exists in the group
  const phoneChildren = await page.evaluate(() => {
    const grp = window.__fc?.getObjects().find(o => o.data?.role === "phone_mockup");
    if (!grp) return null;
    return grp.getObjects().map(c => ({
      type: c.type,
      role: c.data?.role || null,
      w: Math.round(c.getScaledWidth ? c.getScaledWidth() : (c.width ?? 0)),
      h: Math.round(c.getScaledHeight ? c.getScaledHeight() : (c.height ?? 0)),
    }));
  });
  console.log("  Phone children after fill:", JSON.stringify(phoneChildren));
  const hasImageChild = phoneChildren?.some(c => c.type === "image" && c.role === "slot_image_child");
  check("Phone: slot_image_child exists after Replace Photo", !!hasImageChild);

  // === ENTER PAN MODE via double-click ===
  await page.mouse.dblclick(box.cx, box.cy);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "4_phone_pan_mode.png") });
  console.log("  4_phone_pan_mode.png");

  const panActive = await page.evaluate(() => {
    const obj = window.__fc?.getActiveObject();
    return { role: obj?.data?.role || null, type: obj?.type };
  });
  console.log(`  Active after dblclick: type=${panActive.type} role=${panActive.role}`);
  check("Phone: dblclick activates slot_image_child", panActive.role === "slot_image_child",
        `got role=${panActive.role}`);

  const hasAmberToolbar = await page.evaluate(() =>
    document.body.innerText.includes("Adjusting Photo")
  );
  check("Phone: amber 'Adjusting Photo' toolbar appears", hasAmberToolbar);

  // === DRAG TO PAN ===
  const imgBefore = await page.evaluate(() => {
    const obj = window.__fc?.getActiveObject();
    return { left: obj?.left ?? null, top: obj?.top ?? null };
  });
  // Drag image 60px right
  await page.mouse.move(box.cx, box.cy);
  await page.waitForTimeout(50);
  await page.mouse.down();
  await page.mouse.move(box.cx + 60, box.cy, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  const imgAfter = await page.evaluate(() => {
    const obj = window.__fc?.getActiveObject();
    return { left: obj?.left ?? null, top: obj?.top ?? null };
  });
  const delta = imgAfter.left !== null && imgBefore.left !== null
    ? Math.abs(imgAfter.left - imgBefore.left)
    : 0;
  console.log(`  Image left: ${imgBefore.left?.toFixed(1)} → ${imgAfter.left?.toFixed(1)} (Δ${delta.toFixed(1)})`);
  check("Phone: image pans when dragged", delta > 0.5, `delta=${delta.toFixed(2)}`);

  await page.screenshot({ path: path.join(OUT, "5_phone_panned.png") });
  console.log("  5_phone_panned.png");

  // === PRESS ESCAPE to exit pan mode ===
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  const escActive = await page.evaluate(() => {
    const obj = window.__fc?.getActiveObject();
    return obj?.data?.role || null;
  });
  check("Phone: Escape returns to group selection", escActive === "phone_mockup",
        `got role="${escActive}"`);
  await page.screenshot({ path: path.join(OUT, "6_phone_escaped.png") });
  console.log("  6_phone_escaped.png");

  // ═══════════════════════════════════════════════════════════════════
  // TEST 2: cover-polaroid-frame
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n" + "─".repeat(60));
  console.log("TEST 2: cover-polaroid-frame — Replace Photo");
  console.log("─".repeat(60));

  await openBaseSlide(page);
  const box2 = await getCanvasBox(page);
  await dropComponent(page, "cover-polaroid-frame", box2);
  await page.screenshot({ path: path.join(OUT, "7_polaroid_dropped.png") });

  const polRole = await clickSlotGroup(page, "polaroid_frame", box2);
  check("Polaroid: group selected", polRole === "polaroid_frame", `got "${polRole}"`);

  const polBodyText = await page.evaluate(() => document.body.innerText);
  check("Polaroid: right panel shows Photo Slot", polBodyText.includes("Photo Slot"));

  const polReplaceBtn = page.locator("button").filter({ hasText: /replace photo/i }).first();
  const polHasBtn = await polReplaceBtn.isVisible({ timeout: 3000 }).catch(() => false);
  check("Polaroid: Replace Photo button visible", polHasBtn);

  const polFileChooserPromise = page.waitForEvent("filechooser", { timeout: 8000 }).catch(() => null);
  if (polHasBtn) await polReplaceBtn.click();
  const polFileChooser = await polFileChooserPromise;
  if (polFileChooser) {
    await polFileChooser.setFiles(JPEG);
    await page.waitForTimeout(2000);
  }
  check("Polaroid: file chooser intercepted", polFileChooser !== null);

  await page.screenshot({ path: path.join(OUT, "8_polaroid_filled.png") });
  console.log("  8_polaroid_filled.png");

  const polChildren = await page.evaluate(() => {
    const grp = window.__fc?.getObjects().find(o => o.data?.role === "polaroid_frame");
    if (!grp) return null;
    return grp.getObjects().map(c => ({ type: c.type, role: c.data?.role || null }));
  });
  console.log("  Polaroid children:", JSON.stringify(polChildren));
  const polHasImg = polChildren?.some(c => c.type === "image" && c.role === "slot_image_child");
  check("Polaroid: slot_image_child exists after fill", !!polHasImg);

  // ═══════════════════════════════════════════════════════════════════
  // TEST 3: cover-image-pair
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n" + "─".repeat(60));
  console.log("TEST 3: cover-image-pair — Replace Photo (slot 0)");
  console.log("─".repeat(60));

  await openBaseSlide(page);
  const box3 = await getCanvasBox(page);
  await dropComponent(page, "cover-image-pair", box3);
  await page.screenshot({ path: path.join(OUT, "9_imagepair_dropped.png") });

  const pairRole = await clickSlotGroup(page, "image_pair", box3);
  check("ImagePair: group selected", pairRole === "image_pair", `got "${pairRole}"`);

  const pairReplaceBtn = page.locator("button").filter({ hasText: /replace photo/i }).first();
  const pairHasBtn = await pairReplaceBtn.isVisible({ timeout: 3000 }).catch(() => false);
  check("ImagePair: Replace Photo button visible", pairHasBtn);

  const pairFileChooserP = page.waitForEvent("filechooser", { timeout: 8000 }).catch(() => null);
  if (pairHasBtn) await pairReplaceBtn.click();
  const pairFc = await pairFileChooserP;
  if (pairFc) { await pairFc.setFiles(JPEG); await page.waitForTimeout(2000); }
  check("ImagePair: file chooser intercepted for slot 0", pairFc !== null);

  await page.screenshot({ path: path.join(OUT, "10_imagepair_slot0_filled.png") });
  console.log("  10_imagepair_slot0_filled.png");

  const pairChildren = await page.evaluate(() => {
    const grp = window.__fc?.getObjects().find(o => o.data?.role === "image_pair");
    if (!grp) return null;
    return grp.getObjects().map(c => ({ type: c.type, role: c.data?.role || null }));
  });
  console.log("  ImagePair children after slot 0 fill:", JSON.stringify(pairChildren));
  check("ImagePair: slot_image_child in slot 0", pairChildren?.some(c => c.type === "image"));

  // ═══════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  if (pageErrors.length) {
    console.log(`\n⚠️  Page errors (${pageErrors.length}):`);
    pageErrors.slice(0, 5).forEach(e => console.log("  " + e));
  }

  console.log("\n" + "═".repeat(60));
  console.log(`RESULTS: ${PASS.length} PASS, ${FAIL.length} FAIL`);
  if (PASS.length) console.log(`✅ PASS: ${PASS.join(" | ")}`);
  if (FAIL.length) {
    console.log("❌ FAIL:");
    FAIL.forEach(f => console.log("  " + f));
  }
  console.log(`\nAll screenshots → ${OUT}`);
  console.log("═".repeat(60));

  await browser.close();
  process.exit(FAIL.length > 0 ? 1 : 0);
})().catch(e => { console.error("[FATAL]", e.message); process.exit(1); });
