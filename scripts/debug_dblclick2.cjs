const path = require("path");
const { chromium } = require(path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test"));
const TEST_IMG_URL = "http://localhost:8000/assets/images/rajini-test.png";
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });
  p.on("console", m => { if (m.type() === "log") console.log("[page]", m.text().slice(0,150)); });
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

  await p.evaluate(async (imgUrl) => {
    const outer = document.querySelector(".flex-1.bg-zinc-950.overflow-hidden") || document.querySelector("canvas")?.closest("div.flex-1");
    const dt = new DataTransfer(); dt.setData("imageUrl", imgUrl);
    outer.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt, clientX: outer.getBoundingClientRect().left + 400, clientY: outer.getBoundingClientRect().top + 400 }));
    await new Promise(res => setTimeout(res, 2000));
    window.__fc.on("mouse:dblclick", (e) => {
      console.log("[dblclick] target:", e.target?.type, "sel:", e.target?.selectable, "mlcBefore:", !!e.target?.controls?.mlc);
    });
    console.log("[debug] images on canvas:", window.__fc.getObjects().filter(o => o.type === "image").map(o => ({role: o.data?.role, sel: o.selectable})));
  }, TEST_IMG_URL);

  const box = await p.evaluate(() => {
    const el = document.querySelector(".upper-canvas"); if (!el) return null;
    const r = el.getBoundingClientRect();
    const fc = window.__fc;
    const img = fc.getObjects().find(o => o.type === "image" && o.selectable !== false);
    if (!img) return null;
    const sc = r.width / (fc.width || 1080);
    const br = img.getBoundingRect();
    return { sx: r.left + (br.left + br.width/2)*sc, sy: r.top + (br.top + br.height/2)*sc };
  });
  console.log("Box:", box);
  if (!box) { await b.close(); return; }
  await p.mouse.click(box.sx, box.sy); await p.waitForTimeout(400);
  await p.mouse.dblclick(box.sx, box.sy); await p.waitForTimeout(600);
  const state = await p.evaluate(() => {
    const obj = window.__fc.getActiveObject();
    return { type: obj?.type, mlc: !!obj?.controls?.mlc, controlKeys: Object.keys(obj?.controls || {}) };
  });
  console.log("After dblclick:", state);
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
