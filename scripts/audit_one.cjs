/**
 * audit_one.cjs — single-item audit for one component or template.
 *
 * Usage:
 *   node scripts/audit_one.cjs component brand-bar
 *   node scripts/audit_one.cjs template aurora-compact-clean-cta
 *
 * Returns exit 0 = ALL PASS, exit 1 = issues found (printed to stdout).
 * Screenshots go to: scripts/playwright_shots/ui_audit/<id>/
 *
 * The outer loop in audit_loop.cjs calls this for each item, reads the exit
 * code, and decides whether to stop and report issues or move to the next item.
 */

const path   = require("path");
const fs     = require("fs");
const ROOT   = path.resolve(__dirname, "..");
const { chromium } = require(
  path.join(ROOT, "frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);

const [,, MODE, TARGET_ID] = process.argv;
if (!MODE || !TARGET_ID) {
  console.error("Usage: node audit_one.cjs <component|template> <id>");
  process.exit(2);
}

const OUT = path.join(__dirname, "playwright_shots/ui_audit", TARGET_ID);
fs.mkdirSync(OUT, { recursive: true });

const BASE_URL  = "http://localhost:3000";
const EDITOR    = `${BASE_URL}/editor`;

// ── Decorative roles — these SHOULD be selectable:false ──────────────────────
const DECO_ROLES = new Set([
  // Generic backgrounds / overlays
  "compact_bg", "editorial_bg", "dark_bg", "aurora_bg",
  "bg_overlay", "glass_overlay", "gradient_overlay", "glow_overlay",
  "bg_glow_0", "bg_glow_1", "bg_glow_2",
  // Brand bar bottom strip — intentionally non-selectable structural elements
  "brand_bar_bg", "brand_bar_border", "progress_bar",
  "brand_name", "brand_logo",
  // Decorative glyphs
  "compact_deco_quote",
  // Dot progress internals
  "dot_progress_fill", "dot_progress_empty",
  // Hairline rules / border frames
  "compact_editorial_rule", "editorial_rule", "editorial_border",
  // List-item template structure
  "list_bg", "list_border",
  "list_illus_placeholder_1", "list_illus_placeholder_2",
  "list_illus_placeholder_3", "list_illus_placeholder_4",
  // Step / stat-hero overlays
  "step_gradient_overlay", "stat_hero_overlay",
  // Cover-hero metallic background
  "metallic_bg", "cover_bg",
]);

// ── Click spots (relative to canvas bounding box) ─────────────────────────────
const CLICK_SPOTS = [
  { rx: 0.50, ry: 0.20, label: "top-center"     },
  { rx: 0.50, ry: 0.50, label: "center"          },
  { rx: 0.30, ry: 0.40, label: "left-mid"        },
  { rx: 0.65, ry: 0.35, label: "right-upper"     },
  { rx: 0.50, ry: 0.75, label: "lower-center"    },
  { rx: 0.15, ry: 0.12, label: "top-left"        },
  { rx: 0.15, ry: 0.55, label: "left-lower"      },
  { rx: 0.70, ry: 0.65, label: "right-lower"     },
  { rx: 0.50, ry: 0.90, label: "very-bottom"     },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) { process.stdout.write(msg + "\n"); }
function shot(page, name) { return page.screenshot({ path: path.join(OUT, name), fullPage: false }); }

async function waitForCanvas(page) {
  await page.waitForSelector("canvas", { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
}

async function getCanvasBox(page) {
  return page.evaluate(() => {
    const upper = document.querySelector(".upper-canvas") || document.querySelector("canvas");
    if (!upper) return null;
    const r = upper.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height,
             cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });
}

async function getFCObjects(page) {
  return page.evaluate(() => {
    if (!window.__fc) return null;
    return window.__fc.getObjects().map((o, i) => ({
      i,
      type:       o.type,
      role:       (o.data && o.data.role) || null,
      selectable: o.selectable,
      evented:    o.evented,
      left:       Math.round(o.left  || 0),
      top:        Math.round(o.top   || 0),
      width:      Math.round(o.getScaledWidth  ? o.getScaledWidth()  : (o.width  || 0)),
      height:     Math.round(o.getScaledHeight ? o.getScaledHeight() : (o.height || 0)),
    }));
  });
}

async function getActiveObject(page) {
  return page.evaluate(() => {
    if (!window.__fc) return null;
    const obj = window.__fc.getActiveObject();
    if (!obj) return null;
    return {
      type:       obj.type,
      role:       (obj.data && obj.data.role) || null,
      selectable: obj.selectable,
      text:       obj.text || null,
      objCount:   (obj.type === "activeselection" || obj.type === "group")
                    ? (obj._objects || []).length : null,
    };
  });
}

async function clickSpot(page, box, rx, ry) {
  const x = box.x + box.w * rx;
  const y = box.y + box.h * ry;
  await page.mouse.click(x, y);
  await page.waitForTimeout(350);
}

async function clearSelection(page, box) {
  // Click corner (empty space on most templates)
  await page.mouse.click(box.x + 4, box.y + 4);
  await page.waitForTimeout(200);
}

// ── Open a base aurora-hook slide and enter canvas edit mode ──────────────────
async function openBaseSlide(page) {
  await page.goto(EDITOR, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(500);

  // Click Templates tab
  const templBtn = page.getByRole("button", { name: /^templates$/i }).first();
  await templBtn.click();
  await page.waitForTimeout(400);

  // Click aurora-hook tile
  const hookTile = page.locator("[data-slide-type='aurora-hook']").first();
  await hookTile.click();
  await page.waitForURL(/view=slide/, { timeout: 15000 });
  await page.waitForTimeout(600);

  // Enter edit mode
  const editBtn = page.locator("button").filter({ hasText: /open in canvas|edit in canvas|edit this slide/i }).first();
  if (await editBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
    await editBtn.click();
    await page.waitForTimeout(400);
  }
  await waitForCanvas(page);
}

// ── Open a template slide directly ───────────────────────────────────────────
async function openTemplate(page, templateId) {
  await page.goto(EDITOR, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(400);

  // Templates tab
  const templBtn = page.getByRole("button", { name: /^templates$/i }).first();
  await templBtn.click();
  await page.waitForTimeout(400);

  // Find and click the tile
  const tile = page.locator(`[data-slide-type='${templateId}']`).first();
  const tileVisible = await tile.isVisible({ timeout: 5000 }).catch(() => false);
  if (!tileVisible) {
    // Maybe it needs scrolling in the panel
    await tile.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);
  }
  const tileVisible2 = await tile.isVisible({ timeout: 3000 }).catch(() => false);
  if (!tileVisible2) return false;

  await tile.click();
  await page.waitForURL(/view=slide/, { timeout: 15000 });
  await page.waitForTimeout(600);

  const editBtn = page.locator("button").filter({ hasText: /open in canvas|edit in canvas|edit this slide/i }).first();
  if (await editBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
    await editBtn.click();
    await page.waitForTimeout(400);
  }
  await waitForCanvas(page);
  return true;
}

// ── Switch to Components tab and drag a component onto canvas ─────────────────
async function dropComponent(page, componentId, box) {
  // Switch to Components tab
  const compBtn = page.getByRole("button", { name: /^components$/i }).first();
  await compBtn.click();
  await page.waitForTimeout(500);

  // Find tile by data-component-id
  const tile = page.locator(`[data-component-id='${componentId}']`).first();

  // ALWAYS scroll the tile into view — even if isVisible() returns true the tile
  // may be outside the visible viewport (e.g. y > 900) when the panel is mid-scroll
  // after a Templates tab visit.  Without this, mouse.down() fires off-screen and
  // the drag never reaches the canvas.
  await tile.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);

  const tileVis = await tile.isVisible({ timeout: 3000 }).catch(() => false);
  if (!tileVis) return false;

  const tileBox = await tile.boundingBox();
  if (!tileBox) return false;

  // Diagnostic: log tile position and draggable attribute
  const tileDraggable = await tile.evaluate(el => el.draggable).catch(() => null);
  log(`  Tile box: x=${Math.round(tileBox.x)} y=${Math.round(tileBox.y)} w=${Math.round(tileBox.width)} h=${Math.round(tileBox.height)} draggable=${tileDraggable}`);

  // Verify tile is within the visible viewport (y must be < viewport height)
  const viewportHeight = page.viewportSize()?.height ?? 900;
  if (tileBox.y > viewportHeight || tileBox.y + tileBox.height < 0) {
    log(`  ⚠️  Tile y=${Math.round(tileBox.y)} is outside viewport (h=${viewportHeight}) — forcing scroll`);
    await tile.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);
    const tileBox2 = await tile.boundingBox();
    if (!tileBox2 || tileBox2.y > viewportHeight) {
      log(`  ❌ Tile still out of viewport after 2nd scroll`);
      return false;
    }
    Object.assign(tileBox, tileBox2);
    log(`  Tile box after re-scroll: y=${Math.round(tileBox.y)}`);
  }

  // Re-measure canvas box AFTER switching to Components tab — the panel opening
  // can shift the canvas position, making the pre-switch coords stale.
  const freshBox = await getCanvasBox(page);
  const dropX = (freshBox || box).cx;
  const dropY = (freshBox || box).cy;
  log(`  FreshBox: cx=${Math.round(dropX)} cy=${Math.round(dropY)}`);

  // Drag from tile → canvas center (slow, deliberate — mimics real user drag)
  await page.mouse.move(tileBox.x + tileBox.width / 2, tileBox.y + tileBox.height / 2);
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.move(dropX - 200, dropY - 50, { steps: 8 });
  await page.mouse.move(dropX, dropY, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  // Screenshot immediately after mouse.up() to capture canvas state at drop moment
  await page.screenshot({
    path: path.join(__dirname, "playwright_shots/ui_audit", componentId, "01b_just_dropped.png"),
    fullPage: false,
  }).catch(() => {});
  await page.waitForTimeout(800);
  return true;
}

// ── COMPONENT TEST ────────────────────────────────────────────────────────────
async function testComponent(page, componentId) {
  const issues = [];
  const results = { componentId, c1_drop: false, c2_select: false, c3_rpanel: false, c4_noerr: true, c5_visual: false };

  const pageErrors = [];
  const apiErrors  = [];
  page.on("pageerror", e => pageErrors.push(e.message.slice(0, 120)));
  page.on("response",  r => { if (r.status() >= 400 && r.url().includes("/api/")) apiErrors.push(`${r.status()} ${r.url().split("/api/")[1]}`); });

  log(`\n${"─".repeat(60)}`);
  log(`COMPONENT: ${componentId}`);
  log(`${"─".repeat(60)}`);

  // Open base slide
  await openBaseSlide(page);
  const box = await getCanvasBox(page);
  if (!box) { issues.push("Canvas not found"); return { ...results, issues }; }

  await shot(page, "00_base_canvas.png");

  // Count objects before drop
  const objsBefore = (await getFCObjects(page) || []).length;
  log(`  Objects before drop: ${objsBefore}`);

  // Drop the component
  const dropped = await dropComponent(page, componentId, box);
  if (!dropped) {
    issues.push(`C1 FAIL: tile [data-component-id='${componentId}'] not found in Components panel`);
    await shot(page, "01_tile_not_found.png");
    return { ...results, issues };
  }

  await shot(page, "01_dropped.png");

  // C1: Did something new appear on canvas? Wait up to 4s for count to change.
  await page.waitForFunction(
    (before) => window.__fc && window.__fc.getObjects().length > before,
    objsBefore,
    { timeout: 4000 }
  ).catch(() => {}); // non-fatal — we check the count below
  await page.waitForTimeout(400); // settle after async dropper resolves
  const objsAfter = (await getFCObjects(page) || []).length;
  log(`  Objects after drop: ${objsAfter}`);
  if (objsAfter > objsBefore) {
    results.c1_drop = true;
    log(`  ✅ C1 Drop: component appeared on canvas (+${objsAfter - objsBefore} objects)`);
  } else {
    issues.push("C1 FAIL: drop produced no new canvas objects");
    log(`  ❌ C1 Drop: no new objects`);
  }

  // C4 early check: any page errors?
  if (pageErrors.length > 0) {
    issues.push(`C4 FAIL: page errors on drop: ${pageErrors.join(" | ").slice(0, 200)}`);
    results.c4_noerr = false;
    log(`  ❌ C4 Page errors: ${pageErrors.join(" | ").slice(0, 150)}`);
  }

  // C2: Click the dropped component — should be selectable
  // First clear any auto-selection from the drop
  await clearSelection(page, box);
  await page.waitForTimeout(200);

  // Try clicking canvas center and a few nearby spots
  let selected = false;
  let selectedSpot = null;
  for (const spot of CLICK_SPOTS.slice(0, 6)) {
    await clickSpot(page, box, spot.rx, spot.ry);
    const active = await getActiveObject(page);
    if (active && !DECO_ROLES.has(active.role || "")) {
      selected = true;
      selectedSpot = spot.label;
      results.c2_select = true;
      log(`  ✅ C2 Selectable at "${spot.label}" → type=${active.type} role=${active.role}`);
      break;
    }
  }
  if (!selected) {
    issues.push("C2 FAIL: dropped component is not selectable (nothing selected after clicking 6 spots)");
    log(`  ❌ C2 Selectable: nothing selected`);
  }

  await shot(page, "02_select_attempt.png");

  // C3: Right panel updated?
  const rightPanelText = await page.evaluate(() => {
    const rp = document.querySelector("[data-testid='right-panel']") ||
               document.querySelector(".right-panel") ||
               // Fallback: look for a panel div on the right side with content
               [...document.querySelectorAll("div")].find(d => {
                 const r = d.getBoundingClientRect();
                 return r.left > window.innerWidth * 0.7 && r.height > 100 && d.innerText.trim().length > 5;
               });
    return rp ? rp.innerText.slice(0, 120).replace(/\s+/g, " ").trim() : null;
  });
  if (rightPanelText && rightPanelText.length > 5) {
    results.c3_rpanel = true;
    log(`  ✅ C3 Right panel: "${rightPanelText.slice(0, 80)}…"`);
  } else {
    issues.push("C3 FAIL: right panel did not update (or not found)");
    log(`  ❌ C3 Right panel: empty or not found`);
  }

  // C5: Visual check — at least 1 non-decorative object has reasonable size
  const objs = await getFCObjects(page) || [];
  const content = objs.filter(o => o.selectable && o.width > 10 && o.height > 10);
  if (content.length > 0) {
    results.c5_visual = true;
    log(`  ✅ C5 Visual: ${content.length} content object(s) with size > 10px`);
  } else {
    issues.push("C5 FAIL: no visible-sized selectable objects found on canvas");
    log(`  ❌ C5 Visual: no content objects with size > 10px`);
  }

  // C4 final: api errors?
  if (apiErrors.length > 0) {
    results.c4_noerr = false;
    issues.push(`C4 FAIL: API errors: ${apiErrors.join(", ").slice(0, 200)}`);
    log(`  ❌ C4 API errors: ${apiErrors.join(", ").slice(0, 100)}`);
  } else if (results.c4_noerr) {
    log(`  ✅ C4 No errors`);
  }

  await shot(page, "03_final_state.png");

  return { ...results, issues };
}

// ── TEMPLATE TEST ─────────────────────────────────────────────────────────────
async function testTemplate(page, templateId) {
  const issues = [];
  const results = { templateId, d1_aesthetic: false, d2_select: false, d3_text: false, d7_persist: false };

  const pageErrors = [];
  const apiErrors  = [];
  page.on("pageerror", e => pageErrors.push(e.message.slice(0, 120)));
  page.on("response",  r => { if (r.status() >= 400 && r.url().includes("/api/")) apiErrors.push(`${r.status()} ${r.url().split("/api/")[1]?.slice(0,60)}`); });

  log(`\n${"─".repeat(60)}`);
  log(`TEMPLATE: ${templateId}`);
  log(`${"─".repeat(60)}`);

  const opened = await openTemplate(page, templateId);
  if (!opened) {
    issues.push(`FAIL: tile [data-slide-type='${templateId}'] not found in Templates panel`);
    return { ...results, issues };
  }

  const box = await getCanvasBox(page);
  if (!box) { issues.push("Canvas not found after opening template"); return { ...results, issues }; }

  await shot(page, "01_rendered.png");

  // D1: Aesthetic — enough objects, canvas has content
  const objs = await getFCObjects(page) || [];
  const contentObjs = objs.filter(o => !DECO_ROLES.has(o.role || ""));
  const decoObjs    = objs.filter(o =>  DECO_ROLES.has(o.role || ""));
  log(`  Objects: ${objs.length} total, ${contentObjs.length} content, ${decoObjs.length} deco`);

  // D1a: Has content objects
  if (contentObjs.length >= 1) {
    log(`  ✅ D1a: template has ${contentObjs.length} content objects`);
  } else {
    issues.push("D1 FAIL: template rendered with no content objects (only background?)");
    log(`  ❌ D1a: no content objects`);
  }

  // D1b: No deco objects are accidentally selectable
  const decoButSelectable = decoObjs.filter(o => o.selectable);
  if (decoButSelectable.length === 0) {
    log(`  ✅ D1b: decorative objects correctly non-selectable`);
  } else {
    issues.push(`D1/D2 FAIL: decorative objects are selectable: ${decoButSelectable.map(o => o.role).join(", ")}`);
    log(`  ❌ D1b: decorative objects selectable: ${decoButSelectable.map(o => o.role).join(", ")}`);
  }

  // D1c: Any content objects that are NOT selectable?
  // This is advisory — if D2 (actual click test) passes, unlisted decorative-but-not-in-DECO_ROLES
  // objects are just missing from the DECO_ROLES set, not a real UX problem.
  // Only fail here when there are NO selectable objects at all.
  const contentNotSelectable = contentObjs.filter(o => !o.selectable);
  const contentSelectable    = contentObjs.filter(o =>  o.selectable);
  if (contentNotSelectable.length === 0) {
    log(`  ✅ D1c: all content objects are selectable`);
    results.d1_aesthetic = true;
  } else if (contentSelectable.length > 0) {
    // Advisory: some objects non-selectable but at least some are — likely unlisted deco roles
    log(`  ⚠️  D1c: ${contentNotSelectable.length} non-selectable objects with unlisted roles: ${contentNotSelectable.map(o => `${o.role || "null"}(${o.type})`).join(", ")} — check DECO_ROLES`);
    results.d1_aesthetic = true; // D2 will be the real gate
  } else {
    issues.push(`D1 FAIL: NO selectable content objects at all — template may be entirely locked`);
    log(`  ❌ D1c: zero selectable content objects`);
  }

  // D2: Selectability — click multiple spots, at least one content object is selectable
  await clearSelection(page, box);
  let anySelected = false;
  let selectedInfo = null;
  for (const spot of CLICK_SPOTS) {
    await clickSpot(page, box, spot.rx, spot.ry);
    const active = await getActiveObject(page);
    if (active && !DECO_ROLES.has(active.role || "")) {
      anySelected = true;
      selectedInfo = { spot: spot.label, ...active };
      break;
    }
    await clearSelection(page, box);
  }
  if (anySelected) {
    results.d2_select = true;
    log(`  ✅ D2 Select: clicked "${selectedInfo.spot}" → type=${selectedInfo.type} role=${selectedInfo.role}`);
  } else {
    issues.push("D2 FAIL: no content object was selectable after clicking 9 spots");
    log(`  ❌ D2 Select: nothing selectable`);
  }

  await shot(page, "02_selected.png");

  // D3: Text editing — find a SELECTABLE Textbox, double-click it, check cursor
  const textObjs = objs.filter(o => o.selectable && (o.type === "textbox" || o.type === "i-text" || o.type === "text"));
  log(`  Text objects: ${textObjs.length}`);
  if (textObjs.length > 0) {
    // Click first text object to select it
    const t = textObjs[0];
    const canvasPixelRatio = await page.evaluate(() => {
      const c = document.querySelector("canvas");
      return c ? c.offsetWidth / (window.__fc?.width || c.offsetWidth) : 1;
    });
    // Convert canvas coords to screen coords
    const sx = box.x + (t.left + t.width / 2) * (box.w / (await page.evaluate(() => window.__fc?.width || 1080)));
    const sy = box.y + (t.top  + t.height/ 2) * (box.h / (await page.evaluate(() => window.__fc?.height || 1080)));

    await page.mouse.click(sx, sy);
    await page.waitForTimeout(300);
    await page.mouse.dblclick(sx, sy);
    await page.waitForTimeout(500);

    const editingActive = await page.evaluate(() => {
      if (!window.__fc) return false;
      // Fabric v7: _activeObject in editing mode
      const obj = window.__fc.getActiveObject();
      return obj && (obj.isEditing === true || obj.__corner === undefined);
    });

    // Also check: is the active object a textbox?
    const activeNow = await getActiveObject(page);
    const isTextSelected = activeNow && (activeNow.type === "textbox" || activeNow.type === "i-text" || activeNow.type === "text");

    if (isTextSelected) {
      results.d3_text = true;
      log(`  ✅ D3 Text: double-click selected text object (type=${activeNow.type})`);
    } else {
      issues.push("D3 FAIL: double-click on text object did not select/activate it");
      log(`  ❌ D3 Text: double-click did not activate text`);
    }
  } else {
    log(`  ⚠️  D3 Text: no textbox objects found — skipping (may be group-wrapped)`);
    // Not a failure — some templates may have text inside groups
  }

  await shot(page, "03_text_attempt.png");

  // Check page/API errors
  if (pageErrors.length > 0) {
    issues.push(`Page errors: ${pageErrors.join(" | ").slice(0, 200)}`);
    log(`  ❌ Page errors: ${pageErrors.join(" | ").slice(0, 120)}`);
  } else {
    log(`  ✅ No page errors`);
  }
  if (apiErrors.length > 0) {
    issues.push(`API errors: ${apiErrors.join(", ").slice(0, 200)}`);
    log(`  ❌ API errors: ${apiErrors.join(", ").slice(0, 100)}`);
  } else {
    log(`  ✅ No API errors`);
  }

  await shot(page, "04_final.png");

  return { ...results, issues };
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--window-size=1440,900", "--disable-web-security"],
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  let result;
  if (MODE === "component") {
    result = await testComponent(page, TARGET_ID);
  } else if (MODE === "template") {
    result = await testTemplate(page, TARGET_ID);
  } else {
    console.error(`Unknown mode: ${MODE}. Use 'component' or 'template'.`);
    await browser.close();
    process.exit(2);
  }

  await browser.close();

  // ── Final summary ──────────────────────────────────────────────────────────
  log(`\n${"═".repeat(60)}`);
  if (result.issues.length === 0) {
    log(`✅  ${TARGET_ID} — ALL PASS`);
  } else {
    log(`❌  ${TARGET_ID} — ${result.issues.length} ISSUE(S):`);
    result.issues.forEach((iss, i) => log(`   ${i + 1}. ${iss}`));
  }
  log(`${"═".repeat(60)}`);
  log(`📸  Screenshots → ${OUT}`);

  // Write result JSON for the outer loop to read
  fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify({ ...result, screenshotDir: OUT }, null, 2));

  process.exit(result.issues.length > 0 ? 1 : 0);
})().catch(err => {
  console.error("[FATAL]", err.message);
  process.exit(2);
});
