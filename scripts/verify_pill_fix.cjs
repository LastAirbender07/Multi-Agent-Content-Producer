/**
 * Verifies that brand pill and outlined pill children are now selectable/interactive
 */
const path = require("path");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);

const CHECKS = [
  { template: "aurora-compact-clean-cta",    role: "compact_brand_pill",    expectTextSelectable: true },
  { template: "aurora-compact-clean-cta",    role: "compact_category_pill", expectTextSelectable: true },
  { template: "aurora-compact-hook",         role: "compact_brand_pill",    expectTextSelectable: true },
  { template: "aurora-compact-hook",         role: "compact_category_pill", expectTextSelectable: true },
  { template: "aurora-nextwork-dark-cta",    role: "dark_brand_pill",       expectTextSelectable: true },
  { template: "aurora-nextwork-dark-cta",    role: "dark_cta_pill",         expectTextSelectable: true },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  page.on("pageerror", e => console.log("[err]", e.message.slice(0, 80)));

  const results = [];

  for (const check of CHECKS) {
    await page.goto("http://localhost:3000/editor", { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(400);
    const tb = page.getByRole("button", { name: /^templates$/i }).first();
    await tb.click(); await page.waitForTimeout(400);
    const tile = page.locator(`[data-slide-type='${check.template}']`).first();
    await tile.scrollIntoViewIfNeeded().catch(()=>{});
    await tile.click();
    await page.waitForURL(/view=slide/, { timeout: 15000 });
    await page.waitForTimeout(500);
    const eb = page.locator("button").filter({ hasText: /open in canvas|edit in canvas/i }).first();
    if (await eb.isVisible({ timeout: 5000 }).catch(() => false)) { await eb.click(); await page.waitForTimeout(400); }
    await page.waitForSelector("canvas", { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const info = await page.evaluate((role) => {
      if (!window.__fc) return { error: "no __fc" };
      const grp = window.__fc.getObjects().find(o => o.data?.role === role);
      if (!grp) return { error: `role "${role}" not found on canvas` };
      const children = grp.getObjects ? grp.getObjects() : [];
      return {
        groupInteractive: grp.interactive,
        groupSubTargetCheck: grp.subTargetCheck,
        children: children.map((c, i) => ({
          i,
          type: c.type,
          selectable: c.selectable,
          evented: c.evented,
          text: c.text ? c.text.slice(0, 25) : null,
          fill: typeof c.fill === "string" ? c.fill : "(gradient)",
        })),
      };
    }, check.role);

    if (info.error) {
      console.log(`❌ ${check.template} / ${check.role}: ${info.error}`);
      results.push({ ...check, pass: false, error: info.error });
      continue;
    }

    // Find the text child
    const textChild = (info.children || []).find(c => c.type === "text" || c.type === "textbox");
    const textSelectable = textChild?.selectable === true;
    const groupInteractive = info.groupInteractive === true;
    const pass = textSelectable && groupInteractive;

    const icon = pass ? "✅" : "❌";
    console.log(`${icon} ${check.template} / ${check.role}`);
    console.log(`   group.interactive=${info.groupInteractive} subTargetCheck=${info.groupSubTargetCheck}`);
    (info.children || []).forEach(c => {
      const sel = c.selectable ? "✅ selectable" : "🔒 locked";
      console.log(`   [${c.i}] ${c.type} ${sel} text="${c.text || ""}"`);
    });

    results.push({ ...check, pass, textSelectable, groupInteractive });
  }

  const allPass = results.every(r => r.pass);
  console.log(`\n${"═".repeat(55)}`);
  console.log(allPass
    ? "✅ ALL PASS — pills are now interactive and text-selectable"
    : "❌ SOME FAILURES — see above");
  console.log(`${"═".repeat(55)}`);

  await browser.close();
  process.exit(allPass ? 0 : 1);
})().catch(e => { console.error("[FATAL]", e.message); process.exit(1); });
