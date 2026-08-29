const { chromium } = require("@playwright/test");
const fs = require("fs");
const OUT = "/tmp/slide_debug";
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch({ headless: true, slowMo: 100 });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });

  const slides = [29, 32, 34, 35];
  const run = "e82ea8ed-ada8-4940-9a86-3d5eef956875";

  for (const slide of slides) {
    const url = `http://localhost:3000/editor?run=${run}&view=slide&angle=0&slide=${slide}`;
    await p.goto(url, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/slide_${slide}_preview.png` });

    const editBtn = p.getByRole("button", { name: /edit in canvas/i });
    if (await editBtn.count()) {
      await editBtn.click();
      await p.waitForTimeout(2500);
      await p.screenshot({ path: `${OUT}/slide_${slide}_canvas.png` });

      // Click center of canvas to test selectability
      const canvas = p.locator("canvas").first();
      const box = await canvas.boundingBox({ timeout: 5000 }).catch(() => null);
      if (box) {
        await p.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4);
        await p.waitForTimeout(400);
        await p.screenshot({ path: `${OUT}/slide_${slide}_clicked.png` });
      }
    }
    console.log("done slide", slide);
  }

  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
