/**
 * Crops the canvas snapshots to show just the relevant component area
 * and builds a side-by-side comparison grid
 */
const path = require("path");
const fs   = require("fs");
const { chromium } = require(
  path.join(__dirname, "../frontend/node_modules/.pnpm/@playwright+test@1.60.0/node_modules/@playwright/test")
);

const SRC = path.join(__dirname, "playwright_shots/canvas_snapshots");
const OUT = path.join(__dirname, "playwright_shots/canvas_snapshots");

const COMPARISONS = [
  {
    label: "Phone Mockup: before → after fill → after pan",
    files: ["phone_1_base_slide", "phone_2_after_fill", "phone_4_panned", "phone_5_escaped"],
    // crop: phone sits at roughly x=320-680, y=130-430 on the 1080×1080 canvas
    crop: { x: 280, y: 100, w: 460, h: 380 },
  },
  {
    label: "Polaroid: after fill",
    files: ["polaroid_1_after_fill"],
    // polaroid dropped at center, 380×460 frame
    crop: { x: 300, y: 260, w: 480, h: 520 },
  },
  {
    label: "Image Pair: slot0 → both slots",
    files: ["imagepair_1_slot0_filled", "imagepair_2_both_slots"],
    // image pair spans roughly x=200-850, y=200-650
    crop: { x: 160, y: 180, w: 720, h: 500 },
  },
];

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();

  // Build an HTML page that shows all canvas snapshots cropped to focus areas
  const sections = COMPARISONS.map(({ label, files, crop }) => {
    const imgs = files.map(f => {
      const fp = path.join(SRC, f + ".png");
      if (!fs.existsSync(fp)) return `<div class="missing">${f} not found</div>`;
      const b64 = fs.readFileSync(fp).toString("base64");
      // Use CSS background-position to crop the image
      const scale = 280 / crop.w;  // display width
      const dispH = Math.round(crop.h * scale);
      return `<div class="crop-card">
        <div class="crop-view" style="
          width:280px; height:${dispH}px; overflow:hidden; position:relative;
          background: url('data:image/png;base64,${b64}') no-repeat;
          background-size: ${Math.round(1080 * scale)}px ${Math.round(1080 * scale)}px;
          background-position: -${Math.round(crop.x * scale)}px -${Math.round(crop.y * scale)}px;
        "></div>
        <div class="caption">${f.replace(/_/g,' ')}</div>
      </div>`;
    }).join('');
    return `<div class="section">
      <h2>${label}</h2>
      <div class="row">${imgs}</div>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html>
<head><style>
* { box-sizing: border-box; }
body { background: #0a0a0a; color: #eee; font-family: monospace; padding: 24px; margin: 0; }
h1 { color: #f59e0b; font-size: 16px; margin-bottom: 8px; }
p { color: #666; font-size: 11px; margin-bottom: 24px; }
h2 { color: #7c6efa; font-size: 12px; border-bottom: 1px solid #222; padding-bottom: 6px; margin-bottom: 12px; }
.section { margin-bottom: 32px; }
.row { display: flex; gap: 12px; flex-wrap: wrap; }
.crop-card { border: 1px solid #333; border-radius: 6px; overflow: hidden; }
.crop-view { border-bottom: 1px solid #333; }
.caption { padding: 6px 8px; font-size: 10px; color: #aaa; background: #111; }
.missing { width: 280px; height: 160px; background: #1a1a1a; color: #555; display: flex; align-items: center; justify-content: center; font-size: 10px; border: 1px solid #333; border-radius: 6px; }
</style></head>
<body>
<h1>Phase 2.6 — Canvas Snapshot Crop Review</h1>
<p>Cropped to show only the relevant component area. 1080×1080 canvas, component region extracted.</p>
${sections}
</body></html>`;

  const htmlPath = path.join(OUT, "crop_review.html");
  fs.writeFileSync(htmlPath, html);

  await p.setViewportSize({ width: 1400, height: 2400 });
  await p.goto("file://" + htmlPath, { waitUntil: "load" });
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, "CROP_REVIEW.png"), fullPage: true });
  await b.close();
  console.log("Crop review → " + path.join(OUT, "CROP_REVIEW.png"));
})().catch(e => { console.error(e.message); process.exit(1); });
