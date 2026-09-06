/**
 * Generates one grid image per family for clear visual review
 */
const path = require("path");
const fs   = require("fs");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);

const SRC = path.join(__dirname, "playwright_shots/full_review_2026_09_06");
const OUT = SRC;

const FAMILIES = [
  { name:"Aurora Extended",   color:"#7C6EFA", slides:["aurora-hook","aurora-content-0","aurora-stat","aurora-quote","aurora-cta","aurora-engage"] },
  { name:"Compact Clean",     color:"#E8CBA3", slides:["aurora-compact-hook","aurora-compact-fact","aurora-compact-fact-compare","aurora-compact-step","aurora-compact-step-index","aurora-compact-step-detail","aurora-compact-stat-hero","aurora-compact-list-item","aurora-compact-quote","aurora-compact-clean-cta","aurora-compact-clean-quote","aurora-compact-clean-engage"] },
  { name:"Editorial",         color:"#888",    slides:["aurora-editorial-hook","aurora-editorial-cta"] },
  { name:"Nextwork Dark",     color:"#555",    slides:["aurora-nextwork-dark-cta","aurora-nextwork-dark-engage"] },
  { name:"Cover Hero",        color:"#C8956C", slides:["aurora-carousel-cover-hero-phone","aurora-carousel-cover-hero-images"] },
  { name:"Aurora Components", color:"#7C6EFA", slides:["brand-bar","dark-card","stat-block","quote-block","bullet-list","accent-line","eyebrow-pill","glow-blob","deco-ring","btn-gradient","btn-ghost","btn-frosted-glow","btn-solid-white","btn-dark-pill","btn-dark-gradient"], prefix:"comp_" },
  { name:"Compact Components",color:"#E8CBA3", slides:["compact-brand-pill","compact-outlined-pill","compact-mixed-weight-text","compact-dot-progress","compact-number-badge","compact-editorial-header"], prefix:"comp_" },
  { name:"Cover Components",  color:"#C8956C", slides:["cover-phone-mockup","cover-image-pair","cover-overlay-cards","cover-straddling-title","cover-metallic-gradient","cover-display-headline","cover-body-text","cover-italic-cta","cover-polaroid-frame"], prefix:"comp_" },
];

(async () => {
  for (const family of FAMILIES) {
    const prefix = family.prefix || "tmpl_aurora-";
    const images = family.slides.map(s => {
      const key = family.prefix ? `${family.prefix}${s}` : `tmpl_${s}`;
      const fp = path.join(SRC, key + ".png");
      return { key, s, exists: fs.existsSync(fp) };
    }).filter(x => x.exists);

    if (images.length === 0) continue;

    const cols = Math.min(images.length, 4);
    const cardW = 260, cardH = 290;
    const padX = 24, padY = 24, gap = 14;
    const rows = Math.ceil(images.length / cols);
    const totalW = padX*2 + cols*cardW + (cols-1)*gap;
    const totalH = padY*2 + 50 + rows*(cardH+gap);

    const cards = images.map(({key,s}) => {
      const b64 = fs.readFileSync(path.join(SRC, key+".png")).toString("base64");
      const scale = cardW/1080;
      return `<div style="display:inline-block;width:${cardW}px;vertical-align:top;margin-right:${gap}px;margin-bottom:${gap}px;background:#111;border-radius:8px;overflow:hidden;border:1px solid #222">
        <div style="width:${cardW}px;height:${cardH-30}px;overflow:hidden">
          <img src="data:image/png;base64,${b64}" style="width:${cardW}px;height:${cardW}px;object-fit:cover;object-position:top left">
        </div>
        <div style="padding:5px 8px;font-size:9px;font-family:monospace;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s}</div>
      </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><style>body{background:#0a0a0a;margin:0;padding:${padY}px ${padX}px;font-family:-apple-system,sans-serif}</style></head><body>
      <div style="margin-bottom:12px;display:flex;align-items:center;gap:8px">
        <div style="width:8px;height:8px;border-radius:50%;background:${family.color}"></div>
        <span style="font-size:13px;font-weight:700;color:${family.color}">${family.name}</span>
        <span style="font-size:10px;color:#444">${images.length} items</span>
      </div>
      <div>${cards}</div>
    </body></html>`;

    const tmpHtml = path.join(OUT, `_tmp_${family.name.replace(/ /g,'_')}.html`);
    fs.writeFileSync(tmpHtml, html);

    const b = await chromium.launch({ headless: true });
    const p = await b.newPage();
    await p.setViewportSize({ width: totalW + 20, height: totalH + 20 });
    await p.goto("file://" + tmpHtml, { waitUntil: "load" });
    await p.waitForFunction(() => [...document.querySelectorAll("img")].every(i=>i.complete), { timeout: 15000 });
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, `FAMILY_${family.name.replace(/ /g,'_')}.png`), fullPage: true });
    await b.close();
    fs.unlinkSync(tmpHtml);
    console.log(`✅ ${family.name}`);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
