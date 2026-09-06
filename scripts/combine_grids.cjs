const path = require("path");
const fs   = require("fs");
const { chromium } = require(path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test"));

const SRC = path.join(__dirname, "playwright_shots/full_review_2026_09_06");
const GRIDS = [
  "FAMILY_Aurora_Extended","FAMILY_Compact_Clean","FAMILY_Editorial",
  "FAMILY_Nextwork_Dark","FAMILY_Cover_Hero",
  "FAMILY_Aurora_Components","FAMILY_Compact_Components","FAMILY_Cover_Components"
];

(async () => {
  const cards = GRIDS.map(name => {
    const fp = path.join(SRC, name + ".png");
    if (!fs.existsSync(fp)) return "";
    const b64 = fs.readFileSync(fp).toString("base64");
    const label = name.replace("FAMILY_","").replace(/_/g," ");
    return `<div style="margin-bottom:32px">
      <div style="font-size:11px;font-weight:700;color:#7C6EFA;margin-bottom:8px;text-transform:uppercase;letter-spacing:2px">${label}</div>
      <img src="data:image/png;base64,${b64}" style="max-width:100%;display:block;border-radius:8px">
    </div>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><style>
    body{background:#050505;margin:0;padding:24px;font-family:-apple-system,sans-serif}
    h1{color:#7C6EFA;font-size:16px;margin-bottom:4px}
    p{color:#555;font-size:11px;margin-bottom:28px}
  </style></head><body>
    <h1>Full Visual Review — All Templates & Components</h1>
    <p>24 templates · 30 components · Phase 2.5 + 2.6 + 2.7</p>
    ${cards}
  </body></html>`;

  const tmp = path.join(SRC, "_all_grids.html");
  fs.writeFileSync(tmp, html);
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1400, height: 900 });
  await p.goto("file://" + tmp, { waitUntil: "load" });
  await p.waitForFunction(() => [...document.querySelectorAll("img")].every(i=>i.complete), { timeout: 20000 });
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(SRC, "ALL_GRIDS.png"), fullPage: true });
  await b.close();
  fs.unlinkSync(tmp);
  console.log("done → ALL_GRIDS.png");
})().catch(e => { console.error(e.message); process.exit(1); });
