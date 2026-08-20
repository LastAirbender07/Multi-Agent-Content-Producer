/**
 * Real E2E test — no mocks.
 *
 * Flow:
 *   1. Open /pipeline
 *   2. Find the orphaned run 39620f27 (web 3.0 research) in the Recent Runs section
 *   3. Click "Recover →" to hydrate the pipeline store with the saved research result
 *   4. Expand the Angle Selection card → click "Continue → Generate Angles & Carousel"
 *   5. Wait for the HITL "Choose Your Narrative" modal (real LLM call)
 *   6. Select the first 3 angle cards
 *   7. Click "Generate Content for 3 Angles"
 *   8. Wait for content generation to complete ("Pipeline complete")
 *   9. Screenshot at every major step → frontend/e2e-screenshots/recover-NN-*.png
 *
 * Prerequisites (must be running before executing this spec):
 *   - Backend:  cd backend && uvicorn main:app --port 8000 --reload
 *   - Frontend: cd frontend && pnpm dev   (port 3000)
 */

import { test, expect, Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

// ── Constants ─────────────────────────────────────────────────────────────────

const RUN_ID = "39620f27-b982-4f6e-9927-d4e7269eba58";
const FRONTEND_URL = "http://localhost:3000";
const SCREENSHOTS_DIR = path.join(__dirname, "../e2e-screenshots");

// Absolute path to the run's output directory on disk.
// We clean angles/ and content/ before each test so the run always starts
// in "research only" state — otherwise a previous test run's generated data
// would cause recoverRun() to restore a fully-complete pipeline, skipping
// the angle-generation step we're trying to exercise.
// __dirname = <project>/frontend/e2e  →  ../../  = <project>
const RUN_OUTPUT_DIR = path.resolve(
  __dirname,
  "../../backend/outputs/runs",
  RUN_ID
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureDir(): void {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

async function shot(page: Page, name: string): Promise<void> {
  ensureDir();
  const filePath = path.join(SCREENSHOTS_DIR, `recover-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`📸  ${name}.png`);
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe("Recover Run → Angle Generation → Select 3 → Content E2E", () => {
  /**
   * 10 minutes:
   *   - angle generation LLM call can take up to 4-5 min on a cold model
   *   - content generation can take up to 3 min
   */
  test.setTimeout(600_000);

  // Reset the run to "research only" state before each run so the test is
  // repeatable even if a previous run already generated angles + content.
  test.beforeEach(() => {
    for (const subDir of ["angles", "content"]) {
      const dirPath = path.join(RUN_OUTPUT_DIR, subDir);
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`🧹  Cleaned ${subDir}/ from test fixture`);
      }
    }
  });

  test("recovers run 39620f27, generates angles, selects 3, generates content", async ({ page }) => {
    // ── Step 1: Navigate to pipeline page ────────────────────────────────────
    await page.goto(`${FRONTEND_URL}/pipeline`);
    await page.waitForLoadState("networkidle");
    await shot(page, "01-initial-page");

    // ── Step 2: Find and click "Recover →" on the orphaned run card ──────────
    // The OrphanedRunCard shows the topic text and a "Recover →" button.
    // Wait for the backend runs list to load (api.getRunsList fetches on mount).
    // Use a unique substring of run 39620f27's actual topic to avoid matching
    // other "web 3.0" runs that already have angles/content on disk.
    await expect(
      page.getByText(/how is the adoption/i).first()
    ).toBeVisible({ timeout: 15_000 });

    await shot(page, "02-orphaned-run-visible");

    // Find the specific orphaned card for run 39620f27.
    // Filter by unique topic text so we don't accidentally recover the wrong run.
    const orphanCard = page
      .locator("div")
      .filter({ has: page.getByText(/how is the adoption of web 3/i) })
      .filter({ has: page.getByRole("button", { name: /recover/i }) })
      .last(); // .last() selects the most-specific (innermost) matching ancestor

    await expect(orphanCard).toBeVisible({ timeout: 5_000 });
    await orphanCard.getByRole("button", { name: /recover/i }).click();

    console.log("⏳  Recovering run from disk…");
    await shot(page, "03-recovery-triggered");

    // ── Step 3: Wait for research stage to appear as "done" ──────────────────
    // After loadRun() dispatch, stage status becomes "done" → card auto-expands.
    await expect(
      page.getByText("Angle Selection")
    ).toBeVisible({ timeout: 15_000 });

    await shot(page, "04-research-recovered-angle-card-visible");

    // ── Step 4: Expand the Angle Selection card (Stage 2) ────────────────────
    // StageCard's header is a <button> containing an <h3> with the card title.
    // Filter by the h3 content — this is the most specific, unambiguous selector
    // since no other button on the page contains an h3 "Angle Selection".
    const angleToggleBtn = page
      .getByRole("button")
      .filter({ has: page.locator("h3", { hasText: "Angle Selection" }) });
    await expect(angleToggleBtn).toBeVisible({ timeout: 5_000 });
    await angleToggleBtn.click();

    // Give the animation time to complete (250 ms CSS transition + buffer)
    await page.waitForTimeout(500);
    await shot(page, "05-angle-card-expanded");

    // ── Step 5: Click "Continue → Generate Angles & Carousel" ────────────────
    // The button is rendered inside the now-open accordion body.
    const continueBtn = page.getByRole("button", { name: /generate angles.*carousel/i });
    await expect(continueBtn).toBeVisible({ timeout: 8_000 });
    await continueBtn.click();

    console.log("⏳  Angle generation running (real LLM call)…");
    await shot(page, "06-angle-generation-started");

    // ── Step 6: Wait for HITL modal ───────────────────────────────────────────
    // Manual mode: once angles are ready the selector opens automatically.
    await expect(
      page.getByRole("heading", { name: /choose your narrative/i })
    ).toBeVisible({ timeout: 90_000 }); // 90 s — angle LLM call

    await shot(page, "07-angle-modal-open");

    // Count available angle cards (real backend may return 3-7 angles).
    // Angle cards have Tailwind class "rounded-3xl" (the confirm button uses "rounded-2xl").
    // This is the most reliable CSS selector — no dependency on inner element classes.
    const angleCards = page.locator("button.rounded-3xl");
    const totalAngles = await angleCards.count();
    console.log(`✅  ${totalAngles} angles generated by the LLM`);
    expect(totalAngles).toBeGreaterThanOrEqual(3);

    // ── Step 7: Select the first 3 angles ────────────────────────────────────
    // Wait for the cards to be fully rendered and stable before each click
    await angleCards.nth(0).waitFor({ state: "visible" });
    await angleCards.nth(0).click();
    await page.waitForTimeout(350); // allow React state update + transition (300ms)
    await angleCards.nth(1).waitFor({ state: "visible" });
    await angleCards.nth(1).click();
    await page.waitForTimeout(350);
    await angleCards.nth(2).waitFor({ state: "visible" });
    await angleCards.nth(2).click();
    await page.waitForTimeout(350);

    await shot(page, "08-three-angles-selected");

    // Confirm button should now read "Generate Content for 3 Angles"
    const confirmBtn = page.getByRole("button", { name: /generate content for 3/i });
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeEnabled();

    // ── Step 8: Confirm and start content generation ─────────────────────────
    await confirmBtn.click();
    console.log("⏳  Content generation running (carousel rendering)…");
    await shot(page, "09-content-generation-started");

    // ── Step 9: Wait for pipeline to complete ────────────────────────────────
    // ContentStageCard shows a cyan "Done" badge in its header once content
    // finishes. We locate the content card by its static "Generate Carousels"
    // header text and wait for a "Done" badge to appear inside it.
    const contentCardWait = page.locator("div").filter({ hasText: /generate carousels/i }).first();
    await expect(contentCardWait.getByText(/^done$/i).first()).toBeVisible({ timeout: 240_000 });

    await shot(page, "10-pipeline-complete");
    console.log("🎉  Pipeline completed successfully — all 3 angles processed!");

    // ── Assertions ───────────────────────────────────────────────────────────
    // Verify content stage shows "Done" status badge
    const contentCard = page.locator("div").filter({ hasText: /generate carousels/i }).first();
    await expect(contentCard.getByText(/^done$/i).first()).toBeVisible({ timeout: 5_000 });

    // Verify angle stage also shows "Done"
    const angleCardResult = page.locator("div").filter({ hasText: /angle selection/i }).first();
    await expect(angleCardResult.getByText(/^done$/i).first()).toBeVisible({ timeout: 5_000 });

    await shot(page, "11-final-state-verified");
    console.log("✅  All stage cards show Done — test passed.");
  });
});