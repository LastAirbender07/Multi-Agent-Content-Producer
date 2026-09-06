const path = require("path");
const fs   = require("fs");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);
const SRC = path.join(__dirname, "playwright_shots/canvas_snapshots");
const OUT = path.join(__dirname, "playwright_shots/canvas_snapshots");

const SECTIONS = [
  {
    title: "Phone Mockup — image replace + pan + escape",
    items: [
      { file: "phone_2_after_fill", label: "After Replace Photo", crop: { x:250, y:100, w:520, h:420 } },
      { file: "phone_4_panned",     label: "After Pan (drag right)", crop: { x:250, y:100, w:520, h:420 } },
      { file: "phone_5_escaped",    label: "After Escape (group re-selected)", crop: { x:250, y:100, w:520, h:420 } },
    ]
  },
  {
    title: "Polaroid Frame — photo fill",
    items: [
      { file: "polaroid_1_after_fill", label: "After Replace Photo", crop: { x:120, y:480, w:840, h:520 } },
    ]
  },
  {
    title: "Image Pair — slot 0 then both slots",
    items: [
      { file: "imagepair_1_slot0_filled", label: "Slot 0 filled (left)", crop: { x:100, y:150, w:880, h:620 } },
      { file: "imagepair_2_both_slots",   label: "Both slots filled",    crop: { x:100, y:150, w:880, h:620 } },
    ]
  },
];

(async () => {
  const sections = SECTIONS.map(({ title, items }) => {
    const cards = items.map(({ file, label, crop }) => {
      const fp = path.join(SRC, file + ".png");
      if (!fs.existsSync(fp)) return `<div style="color:#f87171;padding:8px">${file} not found</div>`;
      const b64 = fs.readFileSync(fp).toString("base64");
      const dispW = 380;
      const scale  = dispW / crop.w;
      const dispH  = Math.round(crop.h * scale);
      const bgW    = Math.round(1080 * scale);
      const bgH    = Math.round(1080 * scale);
      const bgX    = -Math.round(crop.x * scale);
      const bgY    = -Math.round(crop.y * scale);
      return `<div style="border:1px solid #333;border-radius:8px;overflow:hidden;display:inline-block">
        <div style="width:${dispW}px;height:${dispH}px;
          background:url('data:image/png;base64,${b64}') no-repeat;
          background-size:${bgW}px ${bgH}px;
          background-position:${bgX}px ${bgY}px"></div>
        <div style="padding:6px 10px;font-size:11px;color:#aaa;background:#111">${label}</div>
      </div>`;
    }).join('');
    return `<div style="margin-bottom:36px">
      <h2 style="color:#7c6efa;font-size:13px;border-bottom:1px solid #222;padding-bottom:8px;margin-bottom:14px">${title}</h2>
      <div style="display:flex;gap:14px;flex-wrap:wrap">${cards}</div>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><style>
    *{box-sizing:border-box}
    body{background:#0a0a0a;color:#eee;font-family:monospace;padding:28px;margin:0}
    h1{color:#f59e0b;font-size:15px;margin-bottom:6px}
    p{color:#666;font-size:11px;margin-bottom:28px}
  </style></head><body>
  <h1>Phase 2.6 — Visual Verification (actual Fabric canvas pixels)</h1>
  <p>Canvas content captured via canvas.toDataURL() — real rendered pixels, not DOM screenshots</p>
  ${sections}
  </body></html>`;

  const htmlPath = path.join(OUT, "final_review.html");
  fs.writeFileSync(htmlPath, html);

  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1500, height: 3200 });
  await p.goto("file://" + htmlPath, { waitUntil: "load" });
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, "FINAL_REVIEW.png"), fullPage: true });
  await b.close();
  console.log("done → " + path.join(OUT, "FINAL_REVIEW.png"));
})().catch(e => { console.error(e.message); process.exit(1); });
