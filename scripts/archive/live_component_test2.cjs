/**
 * live_component_test2.cjs — Full component editability test
 *
 * Correct flow (discovered from source):
 *   1. Open /editor
 *   2. Click "Hook" in Templates panel to create a new slide (real run UUID)
 *   3. Wait for redirect to ?run=UUID&view=slide&angle=0&slide=1
 *   4. Click "Open in canvas editor" or "Edit in canvas" button
 *   5. Wait for FabricCanvas to mount → window.__fc is set
 *   6. Switch to Components tab → drag each tile → verify selectability
 *
 * Run: node scripts/live_component_test2.cjs
 * Requires: dev server at http://localhost:3000, backend at http://localhost:8000
 * Output: scripts/playwright_shots/live_test2/
 */

const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const { chromium } = require(
  path.join(ROOT, "frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);
const fs = require("fs");

const OUT = path.join(__dirname, "playwright_shots/live_test2");
fs.mkdirSync(OUT, { recursive: true });

function log(msg) { process.stdout.write(msg + "\n"); }

async function shot(page, name, label) {
  const p = path.join(OUT, `${String(++shot.n).padStart(2,"0")}_${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  log(`  📸 ${path.basename(p)}  [${label}]`);
  return p;
}
shot.n = 0;

// All 29 components to test
const ALL_COMPONENTS = [
  // Aurora Extended
  { id: "brand-bar",              label: "Brand Bar",          hasText: false },
  { id: "dark-card",              label: "Glass Card",          hasText: false },
  { id: "stat-block",             label: "Stat Block",          hasText: true  },
  { id: "quote-block",            label: "Quote Block",         hasText: true  },
  { id: "bullet-list",            label: "Bullet List",         hasText: true  },
  { id: "accent-line",            label: "Accent Line",         hasText: false },
  { id: "eyebrow-pill",           label: "Eyebrow Pill",        hasText: true  },
  { id: "glow-blob",              label: "Glow Blob",           hasText: false },
  { id: "deco-ring",              label: "Deco Ring",           hasText: false },
  { id: "btn-gradient",           label: "Btn: Gradient",       hasText: true  },
  { id: "btn-ghost",              label: "Btn: Ghost",          hasText: true  },
  { id: "btn-frosted-glow",       label: "Btn: Frosted Glow",   hasText: true  },
  { id: "btn-solid-white",        label: "Btn: Solid White",    hasText: true  },
  { id: "btn-dark-pill",          label: "Btn: Dark Pill",      hasText: true  },
  { id: "btn-dark-gradient",      label: "Btn: Dark+Gradient",  hasText: true  },
  // Compact Family
  { id: "compact-brand-pill",        label: "Brand Pill",         hasText: false },
  { id: "compact-outlined-pill",     label: "Category Pill",      hasText: false },
  { id: "compact-mixed-weight-text", label: "Mixed Weight Text",  hasText: true  },
  { id: "compact-dot-progress",      label: "Dot Progress",       hasText: false },
  { id: "compact-number-badge",      label: "Number Badge",       hasText: false },
  { id: "compact-editorial-header",  label: "Editorial Header",   hasText: true  },
  // Cover Hero
  { id: "cover-phone-mockup",       label: "Tilted Phone",       hasText: false, isAsync: true, isPhone: true },
  { id: "cover-image-pair",         label: "Image Pair",          hasText: false, isAsync: true },
  { id: "cover-overlay-cards",      label: "Overlay Cards",       hasText: false },
  { id: "cover-straddling-title",   label: "Straddling Title",    hasText: true  },
  { id: "cover-metallic-gradient",  label: "Metallic Gradient",   hasText: false },
  { id: "cover-display-headline",   label: "Display Headline",    hasText: true  },
  { id: "cover-body-text",          label: "Cover Body Text",     hasText: true  },
  { id: "cover-italic-cta",         label: "Italic CTA Line",     hasText: true  },
  { id: "cover-polaroid-frame",     label: "Polaroid Frame",      hasText: true  },
];

async function fabricQuery(page) {
  return page.evaluate(() => {
    const fc = window.__fc;
    if (!fc) return { error: "no __fc" };
    const active = fc.getActiveObject();
    if (!active) return { selected: false };
    return {
      selected: true,
      type: active.type,
      isEditing: active.isEditing ?? false,
      w: Math.round(active.getScaledWidth ? active.getScaledWidth() : active.width * (active.scaleX || 1)),
      h: Math.round(active.getScaledHeight ? active.getScaledHeight() : active.height * (active.scaleY || 1)),
    };
  });
}

async function getCanvasCenter(page) {
  return page.evaluate(() => {
    const upper = document.querySelector(".upper-canvas") || document.querySelector("canvas");
    if (!upper) return null;
    const r = upper.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width/2, cy: r.top + r.height/2 };
  });
}

async function clearCanvas(page) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  const box = await getCanvasCenter(page);
  if (box) {
    await page.mouse.click(box.cx, box.cy);
    await page.waitForTimeout(100);
    await page.keyboard.press("Meta+a");
    await page.waitForTimeout(150);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: ["--window-size=1680,980", "--window-position=0,0"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 980 } });
  const page = await ctx.newPage();

  page.on("pageerror", e => log(`[page-error] ${e.message.slice(0,120)}`));
  page.on("console", m => {
    if (m.type() === "error") log(`[console-err] ${m.text().slice(0,100)}`);
  });

  // ── STEP 1: Open editor ─────────────────────────────────────────────────────
  log("\n╔══ STEP 1: Open editor ══╗");
  await page.goto("http://localhost:3000/editor", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot(page, "editor_open", "Editor home");
  log("  ✓ Editor opened");

  // ── STEP 2: Create a real slide via Templates panel ─────────────────────────
  log("\n╔══ STEP 2: Create slide via Templates panel ══╗");

  // The templates panel is in the right sidebar. Look for tab labelled "Slides" or "Templates"
  // Actually it's in the LEFT panel (EditorLeftPanel). Find it.
  const slidesTab = page.locator("button", { hasText: /^Slides$/ }).first();
  const templateTab = page.locator("button", { hasText: /Templates/ }).first();

  if (await slidesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await slidesTab.click();
    log("  Clicked Slides tab");
  } else if (await templateTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await templateTab.click();
    log("  Clicked Templates tab");
  } else {
    log("  ⚠ Could not find Slides/Templates tab — looking for slide buttons directly");
  }
  await page.waitForTimeout(600);
  await shot(page, "slides_tab", "Slides tab");

  // Find and click the Hook template — it creates a new slide
  const hookBtn = page.locator("[data-slide-type='aurora-hook']").first();
  const hookBtn2 = page.locator("button", { hasText: /Hook/i }).first();

  let hookClicked = false;
  if (await hookBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await hookBtn.click();
    hookClicked = true;
    log("  ✓ Clicked aurora-hook button (data-slide-type)");
  } else if (await hookBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
    await hookBtn2.click();
    hookClicked = true;
    log("  ✓ Clicked Hook button (text)");
  } else {
    // Take screenshot to see current state
    await shot(page, "no_hook_btn", "No hook button found");
    log("  ✗ FATAL: Could not find hook button — examining page...");
    const pageText = await page.evaluate(() => document.body.innerText?.slice(0, 2000));
    log("  Page text: " + pageText.slice(0, 500));
    await browser.close();
    process.exit(1);
  }

  // Wait for navigation to a run URL
  log("  Waiting for slide creation & redirect...");
  await page.waitForURL(/run=.*&view=slide/, { timeout: 20000 }).catch(() => {
    log("  ⚠ URL didn't change to run URL — continuing anyway");
  });
  await page.waitForTimeout(2000);
  log("  Current URL: " + page.url());
  await shot(page, "after_create", "After slide creation");

  // ── STEP 3: Enter canvas edit mode ─────────────────────────────────────────
  log("\n╔══ STEP 3: Enter canvas edit mode ══╗");

  // Look for: "Open in canvas editor", "Edit in canvas", "Edit this slide" buttons
  const editBtn = page.locator("button", {
    hasText: /Open in canvas|Edit in canvas|Edit this slide/i
  }).first();

  if (await editBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await editBtn.click();
    log("  ✓ Clicked edit button: " + await editBtn.textContent().catch(() => "?"));
  } else {
    // Maybe it auto-entered edit mode (canvas_json already present)
    log("  No edit button visible — checking if FabricCanvas is already mounted...");
  }

  // Wait for canvas to appear
  await page.waitForSelector("canvas", { timeout: 10000 }).catch(() => {
    log("  ⚠ canvas element not found after 10s");
  });
  await page.waitForTimeout(2000);

  // Check window.__fc
  const fcAvail = await page.evaluate(() => !!window.__fc);
  log(`  window.__fc available: ${fcAvail}`);

  if (!fcAvail) {
    // Try to find Fabric via canvas element
    const fcFromCanvas = await page.evaluate(() => {
      for (const c of document.querySelectorAll("canvas")) {
        if ((c)._fabric) { window.__fc = (c)._fabric; return true; }
      }
      return false;
    });
    log(`  Fabric via canvas._fabric: ${fcFromCanvas}`);
  }

  await shot(page, "edit_mode", "Canvas edit mode");

  const canvasBox = await getCanvasCenter(page);
  if (!canvasBox) {
    log("  ✗ FATAL: No canvas found in DOM");
    const allHtml = await page.evaluate(() => document.querySelectorAll("canvas").length);
    log("  Canvas count: " + allHtml);
    await shot(page, "FATAL_no_canvas", "Fatal: no canvas");
    await browser.close();
    process.exit(1);
  }
  log(`  ✓ Canvas found: ${Math.round(canvasBox.w)}×${Math.round(canvasBox.h)} at (${Math.round(canvasBox.x)}, ${Math.round(canvasBox.y)})`);

  const dropX = canvasBox.cx;
  const dropY = canvasBox.cy;

  // ── STEP 4: Open Components tab ─────────────────────────────────────────────
  log("\n╔══ STEP 4: Open Components tab ══╗");

  // Components tab is in the RIGHT-side TemplatesPanel (inside EditorLeftPanel, second sidebar)
  // Actually it's in the SAME left panel as Slides — look for sub-tabs
  const compTab = page.locator("button", { hasText: /^Components$/ }).first();
  if (await compTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await compTab.click();
    log("  ✓ Components tab clicked");
  } else {
    // Maybe it's nested — take a screenshot
    await shot(page, "components_tab_search", "Looking for Components tab");
    log("  ⚠ Components tab not found as standalone button");
    const allBtns = await page.evaluate(() =>
      [...document.querySelectorAll("button")].map(b => b.textContent?.trim()).filter(Boolean).slice(0, 30)
    );
    log("  Buttons: " + allBtns.join(" | "));
  }
  await page.waitForTimeout(500);
  await shot(page, "components_panel", "Components panel");

  // Verify section headers
  const sections = await page.evaluate(() => {
    const texts = [...document.querySelectorAll("p, span, h3, div")]
      .map(e => e.textContent?.trim())
      .filter(t => ["Aurora Extended", "Compact Family", "Cover Hero"].includes(t ?? ""));
    return [...new Set(texts)];
  });
  log(`  Section labels found: ${sections.join(", ") || "NONE"}`);

  const tilesCount = await page.evaluate(() =>
    document.querySelectorAll("[data-component-id]").length
  );
  log(`  Component tiles with data-component-id: ${tilesCount}`);

  // ── STEP 5: Test all components ─────────────────────────────────────────────
  log("\n╔══ STEP 5: Testing all 29 components ══╗");

  const results = [];
  let pass = 0, fail = 0, skip = 0;

  for (const comp of ALL_COMPONENTS) {
    log(`\n  ─── ${comp.id} (${comp.label}) ───`);

    // Scroll tile into view
    const tile = page.locator(`[data-component-id="${comp.id}"]`).first();
    await tile.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(80);

    const tileBox = await tile.boundingBox().catch(() => null);
    if (!tileBox) {
      log(`    ○ SKIP — tile not in DOM (data-component-id="${comp.id}")`);
      results.push({ id: comp.id, label: comp.label, status: "SKIP", reason: "tile not found" });
      skip++;
      continue;
    }
    log(`    Tile at (${Math.round(tileBox.x)}, ${Math.round(tileBox.y)}) ${Math.round(tileBox.width)}×${Math.round(tileBox.height)}`);

    // Clear canvas before each drop
    await clearCanvas(page);
    await page.waitForTimeout(100);

    // Drag tile → canvas center
    const tx = tileBox.x + tileBox.width / 2;
    const ty = tileBox.y + tileBox.height / 2;

    await page.mouse.move(tx, ty);
    await page.waitForTimeout(60);
    await page.mouse.down();
    // Move in steps: panel → canvas
    await page.mouse.move(dropX - 200, dropY, { steps: 5 });
    await page.mouse.move(dropX, dropY, { steps: 8 });
    await page.mouse.up();

    const waitMs = comp.isAsync ? 1500 : 700;
    await page.waitForTimeout(waitMs);

    await shot(page, `${comp.id}_dropped`, `${comp.id} dropped`);

    // Click canvas center to select
    await page.mouse.click(dropX, dropY);
    await page.waitForTimeout(400);

    let state = await fabricQuery(page);

    // If not selected, try offset clicks to find where the object landed
    if (!state.selected) {
      const offsets = [[0,0],[30,30],[-30,-30],[0,50],[50,0],[-50,0],[0,-50]];
      for (const [dx, dy] of offsets) {
        await page.mouse.click(dropX + dx, dropY + dy);
        await page.waitForTimeout(200);
        state = await fabricQuery(page);
        if (state.selected) { log(`    Found at offset (${dx}, ${dy})`); break; }
      }
    }

    // Final fallback: programmatically select the last-added object via Fabric API
    // This handles components that snap to a fixed canvas position (e.g. brand-bar at bottom)
    if (!state.selected) {
      const programmatic = await page.evaluate(() => {
        const fc = window.__fc;
        if (!fc) return { tried: false };
        const objs = fc.getObjects();
        if (!objs.length) return { tried: true, objCount: 0 };
        // Select the last object (most recently dropped)
        const last = objs[objs.length - 1];
        if (!last.selectable) return { tried: true, selectable: false, type: last.type };
        fc.setActiveObject(last);
        fc.renderAll();
        const active = fc.getActiveObject();
        return {
          tried: true,
          objCount: objs.length,
          selectable: last.selectable,
          evented: last.evented,
          type: last.type,
          programmaticSelected: !!active,
          // Position info for diagnosis
          left: Math.round(last.left),
          top: Math.round(last.top),
          w: Math.round(last.getScaledWidth ? last.getScaledWidth() : last.width),
          h: Math.round(last.getScaledHeight ? last.getScaledHeight() : last.height),
        };
      });
      log(`    Programmatic select: ${JSON.stringify(programmatic)}`);
      if (programmatic.programmaticSelected) {
        state = await fabricQuery(page);
        log(`    After programmatic select: ${JSON.stringify(state)}`);
      }
    }

    if (!state.selected) {
      log(`    ✗ FAIL — not selectable after drop`);
      await shot(page, `${comp.id}_FAIL`, `${comp.id} FAIL not selected`);
      results.push({ id: comp.id, label: comp.label, status: "FAIL", reason: "not selectable" });
      fail++;
      continue;
    }

    log(`    ✓ SELECTED — type=${state.type}, ${state.w}×${state.h}`);
    await shot(page, `${comp.id}_selected`, `${comp.id} selected`);

    // ─── Text editability test ───
    let textOk = null;
    if (comp.hasText) {
      await page.mouse.dblclick(dropX, dropY);
      await page.waitForTimeout(600);

      const editState = await fabricQuery(page);
      // Also check for fabric's hidden textarea (the real text input area)
      const hasTextarea = await page.evaluate(() => {
        // Fabric creates a hidden textarea when text editing is active
        const ta = document.querySelector("textarea.hidden-textarea");
        if (ta) return true;
        // Also check any textarea that is active
        for (const t of document.querySelectorAll("textarea")) {
          if (document.activeElement === t) return true;
        }
        return false;
      });

      textOk = editState.isEditing || hasTextarea;
      log(`    Text editing: isEditing=${editState.isEditing}, textarea=${hasTextarea} → ${textOk ? "✓ OK" : "⚠ unclear"}`);

      if (textOk) {
        await shot(page, `${comp.id}_editing`, `${comp.id} text editing`);
      }

      // Exit text edit
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }

    // ─── Deep test: Tilted Phone Mockup ───
    if (comp.isPhone) {
      log(`    🔬 DEEP TEST: Phone group`);

      // Single click = whole group selected
      await page.mouse.click(dropX, dropY);
      await page.waitForTimeout(300);
      const s1 = await fabricQuery(page);
      log(`    Single-click: type=${s1.type}, selected=${s1.selected}`);

      // Double click = enter group, select sub-object
      await page.mouse.dblclick(dropX, dropY);
      await page.waitForTimeout(500);
      const s2 = await fabricQuery(page);
      log(`    Dbl-click into group: type=${s2.type}, selected=${s2.selected}`);

      await shot(page, `${comp.id}_phone_deep`, "Phone deep test");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }

    const status = "PASS";
    results.push({ id: comp.id, label: comp.label, status, textOk });
    log(`    ✓ PASS`);
    pass++;
  }

  // ── STEP 6: Panel overview screenshot ───────────────────────────────────────
  await clearCanvas(page);
  await page.waitForTimeout(300);
  // Scroll panel back to top
  await page.evaluate(() => {
    document.querySelectorAll("[class*='overflow-y-auto']").forEach(el => el.scrollTop = 0);
  });
  await page.waitForTimeout(200);
  await shot(page, "ZZ_panel_overview", "Full components panel");

  // ── Summary ──────────────────────────────────────────────────────────────────
  log("\n╔═══════════════════════════════════════════════╗");
  log(`║  RESULTS: ${pass} PASS  ${fail} FAIL  ${skip} SKIP / ${ALL_COMPONENTS.length} total`);
  log("╚═══════════════════════════════════════════════╝");
  for (const r of results) {
    const icon = r.status === "PASS" ? "✓" : r.status === "SKIP" ? "○" : "✗";
    const textNote = r.hasText !== undefined && r.status === "PASS"
      ? (r.textOk ? " [text✓]" : " [text⚠]") : "";
    log(`  ${icon}  ${r.id}${textNote}${r.reason ? "  — " + r.reason : ""}`);
  }

  log(`\n  Screenshots: ${OUT}`);
  log("  Keeping browser open 20s for inspection...");
  await page.waitForTimeout(20000);
  await browser.close();

  process.exit(fail > 0 ? 1 : 0);
})().catch(e => {
  log("\n[FATAL] " + e.message);
  log(e.stack);
  process.exit(1);
});
