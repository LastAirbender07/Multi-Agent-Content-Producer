import { test, expect } from "@playwright/test";
import * as path from "path";

const SCREENSHOT_DIR = path.join(__dirname, "../e2e-screenshots");

test.setTimeout(90_000);

test("aurora-carousel-cover-hero renders both variants", async ({ page }) => {
  await page.goto("/dev/template-preview");

  // Wait until BOTH canvases have finished rendering
  await page.waitForFunction(
    () => document.querySelectorAll('canvas[data-render-complete="true"]').length === 2,
    { timeout: 80_000 },
  );

  await expect(page.locator('canvas[data-render-complete="true"]')).toHaveCount(2);

  const canvases = page.locator('canvas[data-render-complete="true"]');

  await canvases.nth(0).screenshot({
    path: path.join(SCREENSHOT_DIR, "aurora-carousel-cover-hero-fake-post.png"),
  });
  await canvases.nth(1).screenshot({
    path: path.join(SCREENSHOT_DIR, "aurora-carousel-cover-hero-google-trick.png"),
  });

  // ── GAN acceptance checks ─────────────────────────────────────────────────────
  // These checks run against the rendered canvas pixels using Playwright evaluate.

  // Helper: sample a pixel colour at (x, y) normalised [0-1] on a given canvas
  async function samplePixel(canvasNth: number, nx: number, ny: number) {
    return page.evaluate(
      ({ n, nx, ny }) => {
        const canvases = document.querySelectorAll<HTMLCanvasElement>(
          'canvas[data-render-complete="true"]',
        );
        const c = canvases[n];
        const ctx = c.getContext("2d");
        if (!ctx) return null;
        const x = Math.round(nx * c.width);
        const y = Math.round(ny * c.height);
        const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
        return { r, g, b };
      },
      { n: canvasNth, nx, ny },
    );
  }

  for (const variantIdx of [0, 1]) {
    const label = variantIdx === 0 ? "Fake Post" : "Google Trick";

    // Check 1 — white inner card: sample centre of canvas — should be near-white
    const centre = await samplePixel(variantIdx, 0.5, 0.5);
    expect(centre, `[${label}] GAN #1: white card — centre pixel should be near-white`).toBeTruthy();
    expect((centre!.r + centre!.g + centre!.b) / 3).toBeGreaterThan(200);

    // Check 2 — outer bg visible (corners should be warm-brown, not white)
    const corner = await samplePixel(variantIdx, 0.02, 0.02);
    expect(corner, `[${label}] GAN #2: outer bg visible in corner`).toBeTruthy();
    // Warm brown: red channel dominant, not pure white (255,255,255)
    const isNotWhite = corner!.r < 250 || corner!.g < 250 || corner!.b < 250;
    expect(isNotWhite).toBe(true);

    // Check 3 — chip area (top-centre ~y=5%) should be non-white (warm brown fill)
    const chipSample = await samplePixel(variantIdx, 0.5, 0.049);
    expect(chipSample, `[${label}] GAN #3: chip visible at top-centre`).toBeTruthy();
    // The chip fill is warm brown (~208,191,160); it's definitely not pure white
    const chipIsNonWhite = chipSample!.r < 245 || chipSample!.g < 245 || chipSample!.b < 245;
    expect(chipIsNonWhite).toBe(true);

    // Check 4 — left column (mockup area): should have non-white pixels in the left 40%
    const leftSample = await samplePixel(variantIdx, 0.2, 0.55);
    expect(leftSample, `[${label}] GAN #4: mockup present in left column`).toBeTruthy();
    // Left column should NOT be pure white (there's a phone or image there)
    const leftIsNonWhite = leftSample!.r < 250 || leftSample!.g < 250 || leftSample!.b < 250;
    expect(leftIsNonWhite).toBe(true);

    // Check 5 — right column (body text area): right 45% should be mostly white (text on white card)
    const rightBg = await samplePixel(variantIdx, 0.82, 0.25);
    expect(rightBg, `[${label}] GAN #5: right column is within white card`).toBeTruthy();
    // Right-column bg is the white card — should be near-white
    expect((rightBg!.r + rightBg!.g + rightBg!.b) / 3).toBeGreaterThan(210);
  }

  console.log("\n✅ All 5 GAN checks × 2 variants passed\n");
  console.log("Screenshots written to e2e-screenshots/");
});
