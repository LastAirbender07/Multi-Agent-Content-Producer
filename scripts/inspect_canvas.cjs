const path = require("path");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);

const TEMPLATE = process.argv[2] || "aurora-compact-clean-cta";

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });
  page_errors = [];
  p.on("pageerror", e => page_errors.push(e.message.slice(0,100)));
  p.on("console",   m => { if (m.type()==="error") console.log("[console-err]", m.text().slice(0,100)); });

  await p.goto("http://localhost:3000/editor", { waitUntil: "networkidle", timeout: 20000 });
  await p.waitForTimeout(400);
  const tb = p.getByRole("button", { name: /^templates$/i }).first();
  await tb.click(); await p.waitForTimeout(400);
  const tile = p.locator(`[data-slide-type='${TEMPLATE}']`).first();
  await tile.scrollIntoViewIfNeeded().catch(()=>{});
  await tile.click();
  await p.waitForURL(/view=slide/, { timeout: 15000 });
  await p.waitForTimeout(600);
  const eb = p.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
  if (await eb.isVisible({ timeout: 5000 }).catch(()=>false)) { await eb.click(); await p.waitForTimeout(400); }
  await p.waitForSelector("canvas", { timeout: 10000 });
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(2200);

  const info = await p.evaluate(() => {
    if (!window.__fc) return { error: "no __fc" };
    const objs = window.__fc.getObjects();
    return {
      total: objs.length,
      canvasW: window.__fc.width,
      canvasH: window.__fc.height,
      objects: objs.map((o, i) => ({
        i,
        type: o.type,
        role: (o.data && o.data.role) || null,
        left: Math.round(o.left ?? 0),
        top:  Math.round(o.top  ?? 0),
        width:  Math.round(o.getScaledWidth  ? o.getScaledWidth()  : (o.width  ?? 0)),
        height: Math.round(o.getScaledHeight ? o.getScaledHeight() : (o.height ?? 0)),
        visible: o.visible !== false,
        opacity: o.opacity ?? 1,
        fill: typeof o.fill === "string" ? o.fill : "(gradient)",
        stroke: o.stroke || null,
      }))
    };
  });

  console.log(`\nTemplate: ${TEMPLATE}`);
  console.log(`Canvas: ${info.canvasW}×${info.canvasH}`);
  console.log(`Objects: ${info.total}`);
  console.log();
  (info.objects || []).forEach(o => {
    const visible = o.visible && o.opacity > 0 && o.width > 0 && o.height > 0;
    const flag = visible ? "✅" : "⚠️ ";
    console.log(`  ${flag} [${o.i}] ${o.type} role=${o.role} | left=${o.left} top=${o.top} w=${o.width} h=${o.height} | fill=${o.fill} stroke=${o.stroke}`);
  });

  if (page_errors.length) {
    console.log("\n⚠️  Page errors:", page_errors);
  }

  await b.close();
})().catch(e => { console.error("[FATAL]", e.message); process.exit(1); });
