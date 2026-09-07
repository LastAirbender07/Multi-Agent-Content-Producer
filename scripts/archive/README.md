# Scripts Archive — Visual Test Reference

These scripts were written during Phases 2.5–3.5 as one-off verification tools.
They are archived here as **reference implementations** for writing future visual tests.

> **Do NOT run these directly** — they reference hard-coded run IDs and paths that
> may no longer exist. Use them as patterns to write new tests.

---

## Templates & Components

| File | Phase | What it does | Key patterns |
|---|---|---|---|
| `visual_audit.cjs` | 2.5 | Screenshots all 24 templates at 1080×1080 via canvas.toDataURL() | Full template screenshot loop, canvas snapshot approach |
| `canvas_snapshots.cjs` | 2.6 | Captures Fabric canvas content via `lower-canvas.toDataURL()` — bypasses DOM rendering issues | **USE THIS PATTERN** for getting real canvas pixels |
| `snapshot_new_templates.cjs` | 2.5 | Snapshots Phase 2.5 new templates specifically | Targeted template screenshot pattern |
| `aurora_lite_review.cjs` | 3.5 | Side-by-side comparison: aurora-lite vs aurora-extended | Comparison grid generation pattern |

## Component Tests

| File | Phase | What it does | Key patterns |
|---|---|---|---|
| `test_brand_bar_fix.cjs` | 2.7 | Verifies brand bar selectability after pill interactive fix | `window.__fc` inspection, group child selectability check |
| `live_component_test.mjs` | 2.5 | Live component drop test (mjs version) | Drop + inspect pattern |
| `live_component_test2.cjs` | 2.5 | Live component drop test (cjs version) | Same but CJS |
| `playwright_verify.mjs` | 2.5 | Playwright template verification | Basic template open + screenshot |

## Image Replace & Crop Tests

| File | Phase | What it does | Key patterns |
|---|---|---|---|
| `visual_verify_image_replace.cjs` | 2.6 | Tests Replace Photo flow with real file picker interception | **File chooser interception pattern**: `page.waitForEvent("filechooser")` then `setFiles()` |
| `test_real_image.cjs` | 2.6 | Tests all 3 slot components (phone, polaroid, image-pair) with `rajini-thalapathy.png` | Complete image slot test with real user image |
| `verify_pan_mode.cjs` | 2.6 | Structural verification that pan mode objects exist on canvas | `window.__fc.getObjects()` role inspection |
| `verify_2_6.cjs` | 2.6 | Phase 2.6 verification: drop phone mockup, check Photo Slot panel | Component drop + right panel check pattern |

## Phase Verification

| File | Phase | What it does | Key patterns |
|---|---|---|---|
| `verify_2_9.cjs` | 2.9 | Verifies photo-bg templates render real photos, cover hero has text | Template open + canvas object inspection |
| `verify_phase3_ui.cjs` | 3 | Browser UI: 5 family groups visible, collapse/expand, template backgrounds | **Collapsible panel test pattern** |
| `screenshot_review.cjs` | 2.5 | Generates HTML grid review from screenshots | Grid HTML generation from base64 PNGs |

## Utility / Export

| File | Phase | What it does |
|---|---|---|
| `export_specs.py` | 2.8 | Python-based export of templateContentSpecs.ts → JSON (alternative to .cjs version) |
| `playwright_verify.mjs` | 2.5 | Basic Playwright template verification (early version) |

---

## Key Patterns to Reuse

### 1. Get real canvas pixels (NOT DOM screenshot)
```javascript
// In canvas_snapshots.cjs — use this instead of page.screenshot() for canvas content
const dataUrl = await page.evaluate(() => {
  const c = window.__fc; if (!c) return null;
  c.renderAll();
  return (document.querySelector(".lower-canvas") || document.querySelector("canvas"))
    ?.toDataURL("image/png") ?? null;
});
if (dataUrl) fs.writeFileSync(outPath, Buffer.from(dataUrl.split(",")[1], "base64"));
```

### 2. Intercept file picker for Replace Photo
```javascript
// In visual_verify_image_replace.cjs
const fcPromise = page.waitForEvent("filechooser", { timeout: 8000 }).catch(() => null);
await replacePhotoButton.click();
const fc = await fcPromise;
if (fc) {
  await fc.setFiles("/path/to/test/image.jpg");
  await page.waitForTimeout(2500); // wait for FabricImage.fromURL
}
```

### 3. Inspect Fabric canvas objects
```javascript
// In verify_pill_fix.cjs / verify_2_6.cjs
const info = await page.evaluate((groupRole) => {
  const grp = window.__fc?.getObjects().find(o => o.data?.role === groupRole);
  if (!grp) return null;
  return {
    interactive: grp.interactive,
    subTargetCheck: grp.subTargetCheck,
    children: grp.getObjects?.().map(c => ({
      type: c.type, selectable: c.selectable, text: c.text?.slice(0,25)
    }))
  };
}, "compact_brand_pill");
```

### 4. Drop a component onto canvas
```javascript
// In verify_2_6.cjs — get canvas box AFTER switching to Components tab
const freshBox = await page.evaluate(() => {
  const el = document.querySelector(".upper-canvas") || document.querySelector("canvas");
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { cx: r.left + r.width/2, cy: r.top + r.height/2 };
});
const tileBox = await tile.boundingBox();
// Drag: move to tile, down, move to canvas, up
await page.mouse.move(tileBox.x + tileBox.width/2, tileBox.y + tileBox.height/2);
await page.waitForTimeout(80); await page.mouse.down(); await page.waitForTimeout(80);
await page.mouse.move(freshBox.cx - 200, freshBox.cy - 50, { steps: 8 });
await page.mouse.move(freshBox.cx, freshBox.cy, { steps: 10 });
await page.mouse.up();
await page.waitForFunction(b => window.__fc?.getObjects().length > b, before, { timeout: 4000 });
```

### 5. Open a template and enter canvas
```javascript
// Common pattern across all scripts
await page.goto("http://localhost:3000/editor", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /^templates$/i }).first().click();
const tile = page.locator(`[data-slide-type='${templateId}']`).first();
await tile.scrollIntoViewIfNeeded();
await tile.click();
await page.waitForURL(/view=slide/, { timeout: 15000 });
const eb = page.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
if (await eb.isVisible({ timeout: 5000 }).catch(() => false)) await eb.click();
await page.waitForSelector("canvas", { timeout: 10000 });
await page.waitForLoadState("networkidle");
await page.waitForTimeout(2200); // fonts + Fabric render settle
```
