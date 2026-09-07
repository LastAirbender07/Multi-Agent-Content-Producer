const path = require("path");
const fs   = require("fs");
const { chromium } = require(path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test"));

const SRC = path.join(__dirname, "playwright_shots/aurora_lite");

const files = [
  { f: "aurora_lite_content.png",          label: "Aurora LITE Content (NEW)", sub: "Dark + 64pt title + one idea + NO bullets" },
  { f: "aurora_lite_quote.png",             label: "Aurora LITE Quote (NEW)",   sub: "Dark + 50pt italic quote + NO insight bullets" },
  { f: "aurora_extended_content_dense.png", label: "Aurora EXTENDED Content (OLD for comparison)", sub: "Dense: 48pt + 23pt body + 3-5 bullets" },
];

const html = `<!DOCTYPE html><html><head><style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #050505; padding: 24px; font-family: monospace; }
h1 { color: #f59e0b; font-size: 15px; margin-bottom: 6px; }
p { color: #555; font-size: 11px; margin-bottom: 24px; }
.row { display: flex; gap: 20px; align-items: flex-start; }
.card { border-radius: 10px; overflow: hidden; flex: 1; }
.card.new { border: 2px solid #7C6EFA; }
.card.old { border: 2px solid #444; }
.card img { width: 100%; display: block; }
.label { padding: 10px 12px; background: #0d0d0d; }
.label strong { display: block; font-size: 11px; color: #7C6EFA; margin-bottom: 3px; }
.label.old strong { color: #666; }
.label span { font-size: 10px; color: #444; }
</style></head><body>
<h1>Phase 3.5 -- Aurora Lite Family</h1>
<p>Two new templates: aurora-lite-content (64pt, no bullets) and aurora-lite-quote (50pt, no insight bullets). Right: old dense aurora-extended for comparison.</p>
<div class="row">
${files.map(({f, label, sub}) => {
  const fp = path.join(SRC, f);
  if (!fs.existsSync(fp)) return `<div style="color:red">Missing: ${f}</div>`;
  const b64 = fs.readFileSync(fp).toString("base64");
  const isNew = !f.includes("extended");
  return `<div class="card ${isNew ? 'new' : 'old'}">
    <img src="data:image/png;base64,${b64}">
    <div class="label ${isNew ? '' : 'old'}">
      <strong>${label}</strong>
      <span>${sub}</span>
    </div>
  </div>`;
}).join('\n')}
</div>
</body></html>`;

const tmp = path.join(SRC, "_r.html");
fs.writeFileSync(tmp, html);

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1600, height: 900 });
  await p.goto("file://" + tmp, { waitUntil: "load" });
  await p.waitForFunction(()=>[...document.querySelectorAll("img")].every(i=>i.complete&&i.naturalWidth>0), {timeout:12000});
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(SRC, "FINAL.png"), fullPage: true });
  await b.close();
  fs.unlinkSync(tmp);
  console.log("done");
})().catch(e => { console.error(e.message); process.exit(1); });
