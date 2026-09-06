/**
 * test_real_image.cjs
 *
 * Tests Replace Photo with rajini-thalapathy.png (1672×941 wide landscape)
 * on all 3 slot components. Captures canvas snapshots at each step.
 */
const path = require("path");
const fs   = require("fs");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);

const IMAGE_PATH = "/Users/i750332/Library/CloudStorage/OneDrive-SAPSE/projects/learnings/Multi-Agent-Content-Producer/backend/outputs/slide-references/rajini-thalapathy.png";
const OUT = path.join(__dirname, "playwright_shots/rajini_test");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

if (!fs.existsSync(IMAGE_PATH)) {
  console.error("Image not found: " + IMAGE_PATH);
  process.exit(1);
}
console.log("Image: rajini-thalapathy.png (1672×941 wide landscape)");

async function saveCanvas(page, name) {
  const dataUrl = await page.evaluate(() => {
    const c = window.__fc;
    if (!c) return null;
    c.renderAll();
    const lower = document.querySelector(".lower-canvas");
    return lower ? lower.toDataURL("image/png") : null;
  });
  if (!dataUrl) { console.log(`  ⚠️  no canvas for ${name}`); return; }
  const buf = Buffer.from(dataUrl.split(",")[1], "base64");
  fs.writeFileSync(path.join(OUT, name + ".png"), buf);
  console.log(`  📸 ${name}.png`);
}

async function openBase(page) {
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

async function drop(page, componentId) {
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
  return freshBox;
}

async function selectAndReplace(page, role, box) {
  // Try clicking to select the slot group
  for (const [ox, oy] of [[0,0],[-60,-120],[60,-120],[0,-150],[-80,-80],[80,-80]]) {
    await page.mouse.click(box.cx + ox, box.cy + oy);
    await page.waitForTimeout(350);
    const activeRole = await page.evaluate(() => window.__fc?.getActiveObject()?.data?.role ?? null);
    if (activeRole === role) break;
  }

  const activeRole = await page.evaluate(() => window.__fc?.getActiveObject()?.data?.role ?? null);
  console.log(`  Selected: ${activeRole}`);

  const replBtn = page.locator("button").filter({ hasText: /replace photo/i }).first();
  const hasBtn = await replBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (!hasBtn) { console.log("  ⚠️  Replace Photo button not visible"); return false; }

  const fcPromise = page.waitForEvent("filechooser", { timeout: 8000 }).catch(() => null);
  await replBtn.click();
  const fc = await fcPromise;
  if (fc) {
    await fc.setFiles(IMAGE_PATH);
    console.log("  ✅ File set: rajini-thalapathy.png");
    await page.waitForTimeout(3000); // wait for large image to load
    return true;
  }
  console.log("  ❌ File chooser not intercepted");
  return false;
}

(async () => {
  const browser = await chromium.launch({
    headless: false, // non-headless for proper canvas rendering
    args: ["--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  page.on("pageerror", e => console.log("[page-err]", e.message.slice(0,80)));
  page.on("console",   m => { if (m.type()==="error") console.log("[con-err]", m.text().slice(0,80)); });

  // ═══════════════════════════════════════════════════════
  // 1. PHONE MOCKUP
  // ═══════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(55));
  console.log("1. cover-phone-mockup + rajini-thalapathy.png");
  console.log("═".repeat(55));

  await openBase(page);
  const phoneBox = await drop(page, "cover-phone-mockup");
  await saveCanvas(page, "phone_01_dropped");

  if (phoneBox) {
    const ok = await selectAndReplace(page, "phone_mockup", phoneBox);
    await saveCanvas(page, "phone_02_filled");

    if (ok) {
      // Double-click to enter pan mode
      await page.mouse.dblclick(phoneBox.cx, phoneBox.cy);
      await page.waitForTimeout(600);
      const panRole = await page.evaluate(() => window.__fc?.getActiveObject()?.data?.role ?? null);
      console.log(`  Pan mode active: ${panRole === "slot_image_child" ? "✅ yes" : "⚠️  " + panRole}`);
      await saveCanvas(page, "phone_03_pan_mode");

      // Try to find the actual phone position and drag within it
      const phonePos = await page.evaluate((b) => {
        const grp = window.__fc?.getObjects().find(o => o.data?.role === "phone_mockup");
        if (!grp) return null;
        const br = grp.getBoundingRect();
        const scaleX = b.w / (window.__fc?.width ?? 1080);
        const scaleY = b.h / (window.__fc?.height ?? 1080);
        return {
          screenX: b.x + (br.left + br.width/2) * scaleX,
          screenY: b.y + (br.top  + br.height/2) * scaleY,
          w: br.width * scaleX,
          h: br.height * scaleY,
        };
      }, phoneBox);

      if (phonePos) {
        console.log(`  Phone on screen: center=(${Math.round(phonePos.screenX)},${Math.round(phonePos.screenY)}) size=${Math.round(phonePos.w)}×${Math.round(phonePos.h)}`);
        // Click to activate the image child first
        await page.mouse.click(phonePos.screenX, phonePos.screenY);
        await page.waitForTimeout(300);
        // Now double-click specifically on the phone
        await page.mouse.dblclick(phonePos.screenX, phonePos.screenY);
        await page.waitForTimeout(600);
        const panRole2 = await page.evaluate(() => window.__fc?.getActiveObject()?.data?.role ?? null);
        console.log(`  Pan mode (precise click): ${panRole2}`);
        await saveCanvas(page, "phone_04_pan_precise");

        // Drag upward to reveal Rajini's face (landscape → show upper portion)
        await page.mouse.move(phonePos.screenX, phonePos.screenY);
        await page.waitForTimeout(50);
        await page.mouse.down();
        await page.mouse.move(phonePos.screenX, phonePos.screenY - 60, { steps: 15 });
        await page.mouse.up();
        await page.waitForTimeout(400);
        await saveCanvas(page, "phone_05_panned_up");

        // Escape
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
        await saveCanvas(page, "phone_06_final");
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // 2. POLAROID FRAME
  // ═══════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(55));
  console.log("2. cover-polaroid-frame + rajini-thalapathy.png");
  console.log("═".repeat(55));

  await openBase(page);
  const polBox = await drop(page, "cover-polaroid-frame");
  await saveCanvas(page, "polaroid_01_dropped");

  if (polBox) {
    const polOk = await selectAndReplace(page, "polaroid_frame", polBox);
    await saveCanvas(page, "polaroid_02_filled");

    if (polOk) {
      // Find polaroid on screen precisely
      const polPos = await page.evaluate((b) => {
        const grp = window.__fc?.getObjects().find(o => o.data?.role === "polaroid_frame");
        if (!grp) return null;
        const br = grp.getBoundingRect();
        const scaleX = b.w / (window.__fc?.width ?? 1080);
        const scaleY = b.h / (window.__fc?.height ?? 1080);
        return {
          screenX: b.x + (br.left + br.width/2) * scaleX,
          screenY: b.y + (br.top  + br.height/2) * scaleY,
        };
      }, polBox);

      if (polPos) {
        await page.mouse.dblclick(polPos.screenX, polPos.screenY - 30); // click in photo area not caption
        await page.waitForTimeout(600);
        const panRole = await page.evaluate(() => window.__fc?.getActiveObject()?.data?.role ?? null);
        console.log(`  Pan mode: ${panRole}`);
        await saveCanvas(page, "polaroid_03_pan_mode");

        // Pan left to reveal different part of landscape
        await page.mouse.move(polPos.screenX, polPos.screenY - 30);
        await page.waitForTimeout(50);
        await page.mouse.down();
        await page.mouse.move(polPos.screenX - 80, polPos.screenY - 30, { steps: 15 });
        await page.mouse.up();
        await page.waitForTimeout(400);
        await saveCanvas(page, "polaroid_04_panned");

        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
        await saveCanvas(page, "polaroid_05_final");
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // 3. IMAGE PAIR
  // ═══════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(55));
  console.log("3. cover-image-pair + rajini-thalapathy.png");
  console.log("═".repeat(55));

  await openBase(page);
  const pairBox = await drop(page, "cover-image-pair");
  await saveCanvas(page, "imagepair_01_dropped");

  if (pairBox) {
    // Fill slot 0
    const pair0ok = await selectAndReplace(page, "image_pair", pairBox);
    await saveCanvas(page, "imagepair_02_slot0_filled");

    if (pair0ok) {
      // Re-select and fill slot 1
      for (const [ox,oy] of [[0,0],[-80,-60],[80,-60],[0,-80]]) {
        await page.mouse.click(pairBox.cx + ox, pairBox.cy + oy);
        await page.waitForTimeout(300);
        const r = await page.evaluate(() => window.__fc?.getActiveObject()?.data?.role ?? null);
        if (r === "image_pair") break;
      }
      const replBtn2 = page.locator("button").filter({ hasText: /replace photo/i }).first();
      if (await replBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
        const fc2Promise = page.waitForEvent("filechooser", { timeout: 8000 }).catch(() => null);
        await replBtn2.click();
        const fc2 = await fc2Promise;
        if (fc2) {
          await fc2.setFiles(IMAGE_PATH);
          console.log("  ✅ Slot 1 filled");
          await page.waitForTimeout(3000);
        }
      }
      await saveCanvas(page, "imagepair_03_both_slots");
    }
  }

  await browser.close();

  // ═══════════════════════════════════════════════════════
  // Build review HTML
  // ═══════════════════════════════════════════════════════
  const snapshots = fs.readdirSync(OUT).filter(f => f.endsWith(".png")).sort();

  // Crop coords for each component type
  const cropFor = (name) => {
    if (name.startsWith("phone"))    return { x:250, y:80,  w:540, h:440 };
    if (name.startsWith("polaroid")) return { x:100, y:430, w:880, h:560 };
    if (name.startsWith("imagepair"))return { x:80,  y:150, w:920, h:620 };
    return { x:0, y:0, w:1080, h:1080 };
  };

  const cards = snapshots.map(f => {
    const crop = cropFor(f);
    const b64 = fs.readFileSync(path.join(OUT, f)).toString("base64");
    const dispW = 340;
    const scale = dispW / crop.w;
    const dispH = Math.round(crop.h * scale);
    return `<div style="border:1px solid #333;border-radius:8px;overflow:hidden;display:inline-block;vertical-align:top">
      <div style="width:${dispW}px;height:${dispH}px;
        background:url('data:image/png;base64,${b64}') no-repeat;
        background-size:${Math.round(1080*scale)}px ${Math.round(1080*scale)}px;
        background-position:-${Math.round(crop.x*scale)}px -${Math.round(crop.y*scale)}px"></div>
      <div style="padding:6px 10px;font-size:10px;color:#aaa;background:#111">${f.replace('.png','').replace(/_/g,' ')}</div>
    </div>`;
  }).join('\n');

  const html = `<!DOCTYPE html><html><head><style>
    body{background:#0a0a0a;color:#eee;font-family:monospace;padding:24px;margin:0}
    h1{color:#f59e0b;font-size:15px}
    p{color:#666;font-size:11px;margin-bottom:20px}
    .grid{display:flex;flex-wrap:wrap;gap:12px}
  </style></head><body>
  <h1>Phase 2.6 — rajini-thalapathy.png (1672×941 landscape) in all 3 slot types</h1>
  <p>Real user image test: wide landscape photo in portrait phone slot, polaroid, and image pair</p>
  <div class="grid">${cards}</div>
  </body></html>`;

  const htmlPath = path.join(OUT, "review.html");
  fs.writeFileSync(htmlPath, html);

  const { chromium: cr2 } = require(path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test"));
  const b2 = await cr2.launch({ headless: true });
  const p2 = await b2.newPage();
  await p2.setViewportSize({ width: 1600, height: 3200 });
  await p2.goto("file://" + htmlPath, { waitUntil: "load" });
  await p2.waitForFunction(() => [...document.querySelectorAll("img")].every(i => i.complete), { timeout: 15000 });
  await p2.waitForTimeout(600);
  await p2.screenshot({ path: path.join(OUT, "REVIEW.png"), fullPage: true });
  await b2.close();
  console.log("\n✅ All done → " + path.join(OUT, "REVIEW.png"));
})().catch(e => { console.error("[FATAL]", e.message); process.exit(1); });
