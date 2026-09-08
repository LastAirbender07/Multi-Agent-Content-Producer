/**
 * view_all_slides.cjs — View ALL slides from both E2E runs, full resolution, one by one
 * Shows every slide at 540×540 so text is actually readable
 */
const path = require("path");
const fs   = require("fs");
const { chromium } = require(path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test"));

const RUNS = [
  { id: "dc0ebfb3-32fd-4b5b-9ab6-2a5119668e81", label: "OPINION — Hustle Culture",   family: "aurora-lite (dark, should be big type, minimal text)" },
  { id: "dcf6efee-da0e-4f73-a109-14d64bc4e576", label: "FACTS — Sleep & Memory",     family: "compact-clean (cream, Inter Black)" },
];

const BASE = path.join(__dirname, "../backend/outputs/runs");
const OUT  = path.join(__dirname, "playwright_shots/all_slides");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  for (const run of RUNS) {
    for (const angle of ["angle_0", "angle_1", "angle_2"]) {
      const pngDir = path.join(BASE, run.id, "content", angle, "png");
      if (!fs.existsSync(pngDir)) continue;

      const slidesPath = path.join(BASE, run.id, "content", angle, "slides.json");
      let slides = [];
      if (fs.existsSync(slidesPath)) {
        slides = JSON.parse(fs.readFileSync(slidesPath, "utf8")).slides || [];
      }

      const pngs = fs.readdirSync(pngDir).filter(f => f.endsWith(".png")).sort();
      if (!pngs.length) continue;

      let html = `<!DOCTYPE html><html><head><style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; padding: 20px; font-family: monospace; }
        h2 { color: #f59e0b; font-size: 13px; margin-bottom: 4px; }
        h3 { color: #7C6EFA; font-size: 11px; margin-bottom: 16px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .card { background: #111; border: 1px solid #222; border-radius: 8px; overflow: hidden; }
        .card img { width: 100%; display: block; }
        .info { padding: 6px 8px; }
        .slide-num { font-size: 10px; color: #7C6EFA; font-weight: 700; }
        .template { font-size: 9px; color: #555; margin-top: 2px; }
        .content { font-size: 9px; color: #888; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      </style></head><body>
        <h2>${run.label}</h2>
        <h3>Expected: ${run.family} | ${angle}</h3>
        <div class="grid">`;

      for (const png of pngs) {
        const num = parseInt(png.replace("slide_","").replace(".png",""));
        const slide = slides.find(s => s.slide_number === num) || {};
        const b64 = fs.readFileSync(path.join(pngDir, png)).toString("base64");
        const tmpl = slide.canvas_template || "?";
        const title = (slide.title || "").slice(0, 45);
        const type  = slide.type || "?";

        html += `<div class="card">
          <img src="data:image/png;base64,${b64}">
          <div class="info">
            <div class="slide-num">Slide ${num} [${type}]</div>
            <div class="template">${tmpl}</div>
            <div class="content">"${title}"</div>
          </div>
        </div>`;
      }

      html += `</div></body></html>`;

      const tmp = path.join(OUT, `_tmp.html`);
      fs.writeFileSync(tmp, html);

      const b = await chromium.launch({ headless: true });
      const p = await b.newPage();
      await p.setViewportSize({ width: 1600, height: 2400 });
      await p.goto("file://" + tmp, { waitUntil: "load" });
      await p.waitForFunction(() => [...document.querySelectorAll("img")].every(i => i.complete && i.naturalWidth > 0), { timeout: 20000 });
      await p.waitForTimeout(400);

      const outFile = path.join(OUT, `${run.id.slice(0,8)}_${angle}.png`);
      await p.screenshot({ path: outFile, fullPage: true });
      await b.close();
      fs.unlinkSync(tmp);
      console.log(`saved: ${outFile}`);
    }
  }
  console.log("All done → " + OUT);
})().catch(e => { console.error(e.message); process.exit(1); });
