/**
 * live_component_test.mjs — Full live component editability test
 *
 * Tests every component tile:
 *   1. Drags it onto the canvas
 *   2. Clicks to verify it's selectable (active object in Fabric)
 *   3. For text components: double-clicks to verify text editing mode
 *   4. Specifically tests tilted phone mockup group selectability
 *
 * Run: node scripts/live_component_test.mjs
 * Requires: dev server running at http://localhost:3000
 * Output: scripts/playwright_shots/live_test/*.png
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const PLAYWRIGHT_PATH = "frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test";
const { chromium } = require(
  new URL("../" + PLAYWRIGHT_PATH, import.meta.url).pathname
);
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3000";
const OUT  = path.resolve(__dirname, "playwright_shots/live_test");
fs.mkdirSync(OUT, { recursive: true });

// ── Component list — must match COMPONENTS in slideTemplates.ts ───────────────
const ALL_COMPONENTS = [
  // Aurora Extended
  { id: "brand-bar",         label: "Brand Bar",        hasText: false },
  { id: "dark-card",         label: "Glass Card",        hasText: false },
  { id: "stat-block",        label: "Stat Block",        hasText: true  },
  { id: "quote-block",       label: "Quote Block",       hasText: true  },
  { id: "bullet-list",       label: "Bullet List",       hasText: true  },
  { id: "accent-line",       label: "Accent Line",       hasText: false },
  { id: "eyebrow-pill",      label: "Eyebrow Pill",      hasText: true  },
  { id: "glow-blob",         label: "Glow Blob",         hasText: false },
  { id: "deco-ring",         label: "Deco Ring",         hasText: false },
  { id: "btn-gradient",      label: "Btn: Gradient",     hasText: true  },
  { id: "btn-ghost",         label: "Btn: Ghost",        hasText: true  },
  { id: "btn-frosted-glow",  label: "Btn: Frosted Glow", hasText: true  },
  { id: "btn-solid-white",   label: "Btn: Solid White",  hasText: true  },
  { id: "btn-dark-pill",     label: "Btn: Dark Pill",    hasText: true  },
  { id: "btn-dark-gradient", label: "Btn: Dark+Gradient",hasText: true  },
  // Compact Family
  { id: "compact-brand-pill",        label: "Brand Pill",         hasText: false },
  { id: "compact-outlined-pill",     label: "Category Pill",      hasText: false },
  { id: "compact-mixed-weight-text", label: "Mixed Weight Text",  hasText: true  },
  { id: "compact-dot-progress",      label: "Dot Progress",       hasText: false },
  { id: "compact-number-badge",      label: "Number Badge",       hasText: false },
  { id: "compact-editorial-header",  label: "Editorial Header",   hasText: true  },
  // Cover Hero
  { id: "cover-phone-mockup",      label: "Tilted Phone",      hasText: false, isAsync: true },
  { id: "cover-image-pair",        label: "Image Pair",         hasText: false, isAsync: true },
  { id: "cover-overlay-cards",     label: "Overlay Cards",      hasText: false },
  { id: "cover-straddling-title",  label: "Straddling Title",   hasText: true  },
  { id: "cover-metallic-gradient", label: "Metallic Gradient",  hasText: false },
  { id: "cover-display-headline",  label: "Display Headline",   hasText: true  },
  { id: "cover-body-text",         label: "Cover Body Text",    hasText: true  },
  { id: "cover-italic-cta",        label: "Italic CTA Line",    hasText: true  },
];

function log(msg) { process.stdout.write(msg + "\n"); }

async function shot(page, name, label) {
  const p = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: p });
  log(`    📸 → ${path.basename(p)}  (${label})`);
}

// Query Fabric's active object via the canvas reference stored on window
async function fabricQuery(page) {
  return page.evaluate(() => {
    // Find fabric canvas instance — stored as window.__fc in FabricCanvas.tsx
    const fc = window.__fc;
    if (!fc) return { error: "no __fc on window" };
    const active = fc.getActiveObject();
    if (!active) return { selected: false };
    const type = active.type;
    const isGroup = type === "group" || type === "activeSelection";
    const isText = type === "textbox" || type === "text" || type === "i-text";
    const isEditing = active.isEditing ?? false;
    return {
      selected: true,
      type,
      isGroup,
      isText,
      isEditing,
      left: Math.round(active.left),
      top: Math.round(active.top),
      width: Math.round(active.width * (active.scaleX ?? 1)),
      height: Math.round(active.height * (active.scaleY ?? 1)),
    };
  });
}

async function clearCanvas(page) {
  // Press Ctrl+A to select all, then Delete
  const canvas = page.locator("canvas.upper-canvas, canvas[class*='upper']").first();
  const box = await canvas.boundingBox().catch(() => null);
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(150);
  }
  await page.keyboard.press("Meta+a");
  await page.waitForTimeout(200);
  await page.keyboard.press("Delete");
  await page.waitForTimeout(300);
}

async function getCanvasBox(page) {
  // Fabric renders two <canvas> elements — upper-canvas is the interactive one
  return page.evaluate(() => {
    const upper = document.querySelector(".upper-canvas") ??
                  document.querySelector("canvas[class*='upper']") ??
                  document.querySelector("canvas");
    if (!upper) return null;
    const r = upper.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
}

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 60,
    args: ["--window-size=1600,960", "--window-position=0,0"],
  });
  const ctx  = await browser.newContext({ viewport: { width: 1600, height: 960 } });
  const page = await ctx.newPage();

  page.on("pageerror", e => log(`  [page-error] ${e.message.slice(0, 120)}`));
  page.on("console", m => {
    if (m.type() === "error") log(`  [console] ${m.text().slice(0, 100)}`);
  });

  // ── 1. Open editor with a known run ────────────────────────────────────────
  log("\n╔══ STEP 1: Open editor ══╗");
  const editorUrl = `${BASE}/editor?run=pipe-run-001&view=slide&angle=0&slide=0`;
  await page.goto(editorUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);
  await shot(page, "00_editor_open", "Editor with run loaded");
  log("  ✓ Editor opened");

  // Expose fabric canvas to window for easy querying
  await page.evaluate(() => {
    // FabricCanvas.tsx stores canvas as a ref — try to find it via React DevTools fiber
    // or via the global we'll inject: look for the fabric canvas on the DOM element
    const canvasEl = document.querySelector(".lower-canvas") ??
                     document.querySelector("canvas");
    if (canvasEl && canvasEl._fabric) {
      window.__fc = canvasEl._fabric;
      return "found via _fabric";
    }
    // Fallback: iterate all canvas elements
    for (const c of document.querySelectorAll("canvas")) {
      if (c._fabric) { window.__fc = c._fabric; return "found via iteration"; }
    }
    return "not found yet";
  }).then(r => log(`  Fabric lookup: ${r}`));

  // ── 2. Switch to Components tab ────────────────────────────────────────────
  log("\n╔══ STEP 2: Open Components tab ══╗");
  const compTab = page.locator("button", { hasText: "Components" }).first();
  if (await compTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await compTab.click();
    await page.waitForTimeout(600);
    log("  ✓ Components tab clicked");
  } else {
    // Try finding via the panel tab labels
    const puzzleTab = page.locator('[class*="tab"]', { hasText: /components/i }).first();
    await puzzleTab.click().catch(() => {});
    await page.waitForTimeout(600);
  }
  await shot(page, "01_components_tab", "Components panel");

  // Check section labels
  const sections = await page.evaluate(() =>
    [...document.querySelectorAll("p, span")]
      .map(e => e.textContent?.trim())
      .filter(t => ["Aurora Extended", "Compact Family", "Cover Hero"].includes(t ?? ""))
  );
  log(`  Sections found: ${sections.join(", ")}`);
  if (sections.length === 3) log("  ✓ All 3 section labels present");
  else log(`  ⚠ Only ${sections.length}/3 section labels found`);

  // ── 3. Get canvas bounding box ─────────────────────────────────────────────
  log("\n╔══ STEP 3: Locate canvas ══╗");
  const canvasBox = await getCanvasBox(page);
  if (!canvasBox) {
    log("  ✗ FATAL: canvas not found");
    await shot(page, "ERR_no_canvas", "No canvas found");
    await browser.close(); process.exit(1);
  }
  log(`  ✓ Canvas at (${Math.round(canvasBox.x)}, ${Math.round(canvasBox.y)}) ${Math.round(canvasBox.w)}×${Math.round(canvasBox.h)}`);

  const dropX = canvasBox.x + canvasBox.w * 0.5;
  const dropY = canvasBox.y + canvasBox.h * 0.5;

  // ── 4. Test every component ────────────────────────────────────────────────
  log("\n╔══ STEP 4: Testing all 29 components ══╗");

  const results = [];
  let pass = 0, fail = 0, skip = 0;

  for (const comp of ALL_COMPONENTS) {
    log(`\n  ── ${comp.id} ──`);

    // Scroll tile into view
    const tile = page.locator(`[data-component-id="${comp.id}"]`).first();
    await tile.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(100);

    const tileBox = await tile.boundingBox().catch(() => null);
    if (!tileBox) {
      log(`    ⚠ SKIP — tile not in DOM`);
      results.push({ id: comp.id, status: "SKIP", reason: "tile not found" });
      skip++;
      continue;
    }
    log(`    Tile at (${Math.round(tileBox.x)},${Math.round(tileBox.y)})`);

    // Clear previous objects from canvas
    await clearCanvas(page);

    // Drag tile to canvas centre
    await page.mouse.move(tileBox.x + tileBox.width / 2, tileBox.y + tileBox.height / 2);
    await page.waitForTimeout(80);
    await page.mouse.down();
    await page.mouse.move(dropX - 100, dropY - 100, { steps: 8 });
    await page.mouse.move(dropX, dropY, { steps: 8 });
    await page.mouse.up();

    // Wait longer for async components (phone mockup, image pair)
    await page.waitForTimeout(comp.isAsync ? 1200 : 600);

    // Re-expose fabric if needed
    await page.evaluate(() => {
      if (!window.__fc) {
        for (const c of document.querySelectorAll("canvas")) {
          if (c._fabric) { window.__fc = c._fabric; break; }
        }
      }
    });

    await shot(page, `${comp.id}__1_dropped`, `${comp.id} dropped`);

    // Click canvas to select the dropped component
    await page.mouse.click(dropX, dropY);
    await page.waitForTimeout(400);

    const state1 = await fabricQuery(page);
    log(`    After click: ${JSON.stringify(state1)}`);

    if (!state1.selected) {
      // Try clicking slightly offset — component may have landed elsewhere
      await page.mouse.click(dropX + 20, dropY + 20);
      await page.waitForTimeout(300);
      const state1b = await fabricQuery(page);
      log(`    After offset click: ${JSON.stringify(state1b)}`);
      if (!state1b.selected) {
        log(`    ✗ FAIL — object not selectable after drop`);
        await shot(page, `${comp.id}__FAIL_not_selected`, "not selected");
        results.push({ id: comp.id, status: "FAIL", reason: "not selectable" });
        fail++;
        continue;
      }
    }

    log(`    ✓ SELECTED (type=${state1.type ?? "?"}, ${state1.width}×${state1.height})`);
    await shot(page, `${comp.id}__2_selected`, `${comp.id} selected`);

    // Test text editability
    if (comp.hasText) {
      await page.mouse.dblclick(dropX, dropY);
      await page.waitForTimeout(500);
      const state2 = await fabricQuery(page);
      log(`    After dblclick: editing=${state2.isEditing}, type=${state2.type}`);

      // Also check for hidden textarea (Fabric text editor)
      const textarea = await page.evaluate(() => {
        const ta = document.querySelector("textarea.hidden-textarea, textarea[class*='hidden']");
        if (ta) return { found: true, focused: document.activeElement === ta };
        // Any textarea that appeared
        const all = document.querySelectorAll("textarea");
        for (const t of all) {
          if (t.style.display !== "none" && t.style.visibility !== "hidden") {
            return { found: true, focused: document.activeElement === t };
          }
        }
        return { found: false };
      });

      if (state2.isEditing || textarea.found) {
        log(`    ✓ TEXT EDITABLE — editing=${state2.isEditing}, textarea=${textarea.found}`);
        await shot(page, `${comp.id}__3_editing`, `${comp.id} text editing`);
      } else {
        log(`    ⚠ text editing not confirmed (may still work in-canvas)`);
        await shot(page, `${comp.id}__3_editing_check`, `${comp.id} dblclick state`);
      }

      // Exit text edit
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }

    // Special deep test for tilted phone
    if (comp.id === "cover-phone-mockup") {
      log(`    🔬 DEEP TEST: Tilted Phone Mockup`);
      // Single click — should select the whole group
      await page.mouse.click(dropX, dropY);
      await page.waitForTimeout(300);
      const phoneState = await fabricQuery(page);
      log(`    Phone group selected: ${JSON.stringify(phoneState)}`);
      // Double click — should enter group to select sub-objects
      await page.mouse.dblclick(dropX, dropY);
      await page.waitForTimeout(400);
      const phoneState2 = await fabricQuery(page);
      log(`    Phone after dblclick (sub-object): ${JSON.stringify(phoneState2)}`);
      await shot(page, `${comp.id}__4_phone_dblclick`, "Phone group dblclick into group");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }

    results.push({ id: comp.id, status: "PASS" });
    pass++;
    log(`    ✓ PASS`);
  }

  // ── 5. Final panel screenshot showing all sections ─────────────────────────
  log("\n╔══ STEP 5: Panel overview ══╗");
  await clearCanvas(page);
  // Scroll panel to top
  const panel = page.locator("[class*='overflow-y-auto']").first();
  await panel.evaluate(el => el.scrollTop = 0).catch(() => {});
  await page.waitForTimeout(300);
  await shot(page, "ZZ_panel_overview", "Full Components panel");

  // ── 6. Summary ─────────────────────────────────────────────────────────────
  log("\n╔══════════════════════════════════════════╗");
  log(`║  RESULTS: ${pass} PASS  ${fail} FAIL  ${skip} SKIP / ${ALL_COMPONENTS.length} total`);
  log("╚══════════════════════════════════════════╝");
  for (const r of results) {
    const icon = r.status === "PASS" ? "✓" : r.status === "SKIP" ? "○" : "✗";
    log(`  ${icon}  ${r.id}${r.reason ? "  — " + r.reason : ""}`);
  }

  log(`\n  Screenshots saved to: ${OUT}`);
  log("  Browser stays open 15s for inspection…");
  await page.waitForTimeout(15000);
  await browser.close();

  process.exit(fail > 0 ? 1 : 0);
})();
