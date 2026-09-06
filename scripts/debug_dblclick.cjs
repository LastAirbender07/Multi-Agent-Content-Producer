/**
 * debug_dblclick.cjs — diagnose why double-click doesn't enter crop mode
 */
const path = require("path");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);

const TEST_IMG_URL = "http://localhost:8000/assets/images/rajini-test.png";

(async () => {
  const b = await chromium.launch({ headless: false, args: ["--window-size=1440,900"] });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });
  p.on("pageerror", e => console.log("[page-err]", e.message.slice(0, 100)));
  p.on("console",   m => {
    const t = m.type();
    if (t === "error" || t === "warn") console.log(`[${t}]`, m.text().slice(0, 120));
  });

  // Open editor
  await p.goto("http://localhost:3000/editor", { waitUntil: "networkidle", timeout: 25000 });
  await p.waitForTimeout(400);
  await p.getByRole("button", { name: /^templates$/i }).first().click();
  await p.waitForTimeout(400);
  await p.locator("[data-slide-type='aurora-hook']").first().click();
  await p.waitForURL(/view=slide/, { timeout: 15000 });
  await p.waitForTimeout(600);
  const eb = p.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
  if (await eb.isVisible({ timeout: 5000 }).catch(() => false)) { await eb.click(); await p.waitForTimeout(400); }
  await p.waitForSelector("canvas", { timeout: 10000 });
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(2000);

  // Add image via drop
  const imgResult = await p.evaluate(async (imgUrl) => {
    if (!window.__fc) return { error: "no __fc" };
    const outer = document.querySelector(".flex-1.relative.overflow-hidden.flex") ||
                  document.querySelectorAll("div[class]")[10];
    // Find by looking for the div that wraps the canvas
    const canvasEl = document.querySelector("canvas");
    if (!canvasEl) return { error: "no canvas" };
    const outerDiv = canvasEl.closest("div.flex-1") || canvasEl.parentElement;
    if (!outerDiv) return { error: "no outer div" };
    const r = outerDiv.getBoundingClientRect();
    const dt = new DataTransfer();
    dt.setData("imageUrl", imgUrl);
    outerDiv.dispatchEvent(new DragEvent("drop", {
      bubbles: true, cancelable: true, dataTransfer: dt,
      clientX: r.left + r.width/2, clientY: r.top + r.height/2,
    }));
    await new Promise(res => setTimeout(res, 1500));
    const imgs = window.__fc.getObjects().filter(o => o.type === "image");
    return { added: imgs.length, objs: window.__fc.getObjects().map(o => ({ type: o.type, role: o.data?.role })) };
  }, TEST_IMG_URL);

  console.log("After drop:", JSON.stringify(imgResult, null, 2));

  if (!imgResult.added) {
    // Try a different approach - find the container by looking at all divs
    const divInfo = await p.evaluate(() => {
      const canvasEl = document.querySelector("canvas");
      const parent1 = canvasEl?.parentElement;
      const parent2 = parent1?.parentElement;
      const parent3 = parent2?.parentElement;
      return {
        p1class: parent1?.className.slice(0,80),
        p2class: parent2?.className.slice(0,80),
        p3class: parent3?.className.slice(0,80),
        p1tag: parent1?.tagName,
        p2tag: parent2?.tagName,
        p3tag: parent3?.tagName,
      };
    });
    console.log("Canvas DOM ancestry:", JSON.stringify(divInfo, null, 2));
    await b.close();
    return;
  }

  // Get image screen coords
  const box = await p.evaluate(() => {
    const fc = window.__fc;
    const img = fc.getObjects().find(o => o.type === "image");
    if (!img) return null;
    const el = document.querySelector(".upper-canvas") || document.querySelector("canvas");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const scaleX = r.width / (fc.width || 1080);
    const scaleY = r.height / (fc.height || 1080);
    const br = img.getBoundingRect();
    return {
      sx: r.left + (br.left + br.width/2) * scaleX,
      sy: r.top  + (br.top  + br.height/2) * scaleY,
      canvasLeft: br.left, canvasTop: br.top,
      imgLeft: img.left, imgTop: img.top,
    };
  });
  console.log("Image screen coords:", box);

  // Install a debug listener on the canvas for mouse:dblclick
  await p.evaluate(() => {
    window.__dblClickLog = [];
    window.__fc.on("mouse:dblclick", (e) => {
      window.__dblClickLog.push({
        targetType: e.target?.type || "none",
        targetRole: e.target?.data?.role || "none",
        hasTarget: !!e.target,
      });
    });
    console.log("[debug] mouse:dblclick listener installed");
  });

  // Single click first to select
  await p.mouse.click(box.sx, box.sy);
  await p.waitForTimeout(400);
  const afterClick = await p.evaluate(() => {
    const obj = window.__fc.getActiveObject();
    return obj ? { type: obj.type, role: obj.data?.role } : null;
  });
  console.log("After single click:", afterClick);

  // Double click
  await p.mouse.dblclick(box.sx, box.sy);
  await p.waitForTimeout(600);

  const afterDblClick = await p.evaluate(() => {
    return {
      active: (() => {
        const obj = window.__fc.getActiveObject();
        return obj ? { type: obj.type, role: obj.data?.role, hasMlc: !!obj.controls?.mlc } : null;
      })(),
      dblClickLog: window.__dblClickLog,
    };
  });
  console.log("After double-click:");
  console.log("  active:", JSON.stringify(afterDblClick.active));
  console.log("  dblclick events fired:", JSON.stringify(afterDblClick.dblClickLog));

  // Check if crop mode activated
  const cropCheck = await p.evaluate(() => {
    const obj = window.__fc.getActiveObject();
    return {
      type: obj?.type,
      hasMlc: !!obj?.controls?.mlc,
      controlKeys: obj ? Object.keys(obj.controls || {}) : [],
    };
  });
  console.log("Crop mode check:", cropCheck);

  await b.close();
})().catch(e => { console.error("[FATAL]", e.message); process.exit(1); });
