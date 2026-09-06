const path = require("path");
const { chromium } = require(path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test"));
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto("http://localhost:3000/editor", { waitUntil: "networkidle", timeout: 25000 });
  await p.waitForTimeout(400);
  await p.getByRole("button", { name: /^templates$/i }).first().click();
  await p.waitForTimeout(500);
  const tile = p.locator("[data-slide-type='aurora-carousel-cover-hero-images']").first();
  await tile.scrollIntoViewIfNeeded().catch(()=>{});
  await tile.click();
  await p.waitForURL(/view=slide/, { timeout: 15000 });
  await p.waitForTimeout(800);
  const eb = p.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
  if (await eb.isVisible({ timeout: 5000 }).catch(()=>false)) { await eb.click(); await p.waitForTimeout(400); }
  await p.waitForSelector("canvas", { timeout: 10000 });
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(3000);
  const objs = await p.evaluate(() => {
    const c = window.__fc; if (!c) return [];
    return c.getObjects().map(o => ({
      type: o.type, role: o.data?.role, sel: o.selectable,
      top: Math.round(o.top||0), w: Math.round(o.width||0), h: Math.round(o.height||0),
      text: o.text?.slice(0,40) || null
    }));
  });
  console.log("Objects on cover-images canvas:");
  objs.forEach(o => console.log(JSON.stringify(o)));
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
