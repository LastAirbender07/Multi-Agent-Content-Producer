/**
 * Inspect the children of a named group on the canvas
 */
const path = require("path");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);

const TEMPLATE = process.argv[2] || "aurora-compact-clean-cta";
const GROUP_ROLE = process.argv[3] || "compact_category_pill";

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });

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

  const info = await p.evaluate((groupRole) => {
    if (!window.__fc) return { error: "no __fc" };
    const group = window.__fc.getObjects().find(o => o.data?.role === groupRole);
    if (!group) return { error: `Group with role "${groupRole}" not found` };

    const children = group.getObjects ? group.getObjects() : [];
    return {
      groupRole,
      groupLeft: Math.round(group.left ?? 0),
      groupTop: Math.round(group.top ?? 0),
      groupW: Math.round(group.getScaledWidth ? group.getScaledWidth() : (group.width ?? 0)),
      groupH: Math.round(group.getScaledHeight ? group.getScaledHeight() : (group.height ?? 0)),
      groupVisible: group.visible !== false,
      groupOpacity: group.opacity ?? 1,
      childCount: children.length,
      children: children.map((c, i) => ({
        i,
        type: c.type,
        left: Math.round(c.left ?? 0),
        top:  Math.round(c.top  ?? 0),
        width:  Math.round(c.width  ?? 0),
        height: Math.round(c.height ?? 0),
        originX: c.originX,
        originY: c.originY,
        fill: typeof c.fill === "string" ? c.fill : "(gradient/object)",
        stroke: c.stroke || null,
        strokeWidth: c.strokeWidth || 0,
        opacity: c.opacity ?? 1,
        visible: c.visible !== false,
        text: c.text ? c.text.slice(0, 30) : null,
        fontFamily: c.fontFamily || null,
        fontSize: c.fontSize || null,
      }))
    };
  }, GROUP_ROLE);

  console.log(`\nTemplate: ${TEMPLATE} | Group role: ${GROUP_ROLE}`);
  if (info.error) { console.log("ERROR:", info.error); await b.close(); return; }

  console.log(`Group: left=${info.groupLeft} top=${info.groupTop} w=${info.groupW} h=${info.groupH} visible=${info.groupVisible} opacity=${info.groupOpacity}`);
  console.log(`Children (${info.childCount}):`);
  (info.children || []).forEach(c => {
    console.log(`  [${c.i}] ${c.type} | left=${c.left} top=${c.top} w=${c.width} h=${c.height} origin=${c.originX}/${c.originY} | fill="${c.fill}" stroke="${c.stroke}" strokeW=${c.strokeWidth} | visible=${c.visible} opacity=${c.opacity}${c.text ? ` | text="${c.text}"` : ""}${c.fontSize ? ` | ${c.fontFamily} ${c.fontSize}pt` : ""}`);
  });

  await b.close();
})().catch(e => { console.error("[FATAL]", e.message); process.exit(1); });
