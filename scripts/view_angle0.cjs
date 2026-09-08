const path = require("path");
const fs   = require("fs");
const { chromium } = require(path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test"));

const RUNS = [
  { id: "dc0ebfb3-32fd-4b5b-9ab6-2a5119668e81", label: "OPINION — Hustle Culture — aurora-lite (re-rendered)", angles: ["angle_0"] },
];

const BASE = path.join(__dirname, "../backend/outputs/runs");
const OUT  = path.join(__dirname, "playwright_shots/rerendered");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch({ headless: true });
  for (const run of RUNS) {
    for (const angle of run.angles) {
      const pngDir = path.join(BASE, run.id, "content", angle, "png");
      if (!fs.existsSync(pngDir)) continue;
      const slidesPath = path.join(BASE, run.id, "content", angle, "slides.json");
      let slides = [];
      if (fs.existsSync(slidesPath)) slides = JSON.parse(fs.readFileSync(slidesPath,"utf8")).slides||[];
      const pngs = fs.readdirSync(pngDir).filter(f=>f.endsWith(".png")).sort();

      let html = `<!DOCTYPE html><html><head><style>
        body{background:#0a0a0a;padding:20px;font-family:monospace}
        h2{color:#f59e0b;font-size:13px;margin-bottom:16px}
        .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .card{border:1px solid #222;border-radius:8px;overflow:hidden;background:#111}
        .card img{width:100%;display:block}
        .info{padding:6px 8px}
        .num{font-size:10px;color:#7C6EFA;font-weight:700}
        .tmpl{font-size:9px;color:#555;margin-top:1px}
        .title{font-size:9px;color:#888;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      </style></head><body>
      <h2>${run.label} | ${angle}</h2>
      <div class="grid">`;

      for (const png of pngs) {
        const num = parseInt(png.replace("slide_","").replace(".png",""));
        const slide = slides.find(s=>s.slide_number===num)||{};
        const b64 = fs.readFileSync(path.join(pngDir,png)).toString("base64");
        html += `<div class="card">
          <img src="data:image/png;base64,${b64}">
          <div class="info">
            <div class="num">Slide ${num} [${slide.type||"?"}]</div>
            <div class="tmpl">${slide.canvas_template||"?"}</div>
            <div class="title">${(slide.title||"").slice(0,50)}</div>
          </div>
        </div>`;
      }
      html += `</div></body></html>`;

      const tmp = path.join(OUT,"_t.html");
      fs.writeFileSync(tmp, html);
      const p = await b.newPage();
      await p.setViewportSize({width:1600,height:2400});
      await p.goto("file://"+tmp,{waitUntil:"load"});
      await p.waitForFunction(()=>[...document.querySelectorAll("img")].every(i=>i.complete&&i.naturalWidth>0),{timeout:20000});
      await p.waitForTimeout(400);
      const out = path.join(OUT,`${run.id.slice(0,8)}_${angle}_NEW.png`);
      await p.screenshot({path:out,fullPage:true});
      await p.close();
      fs.unlinkSync(tmp);
      console.log("saved: "+out);
    }
  }
  await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
