/**
 * E2E tests for pipeline configuration controls.
 * Verifies mode/freshness/image source selectors, advanced settings, and
 * that config values are correctly sent in API requests.
 */

import { test, expect, Page } from "@playwright/test";

const MOCK_RESEARCH = {
  run_id: "cfg-run-001", status: "success", topic: "test",
  route_plan: { selected_tools: [], crawl_urls: [], query_variants: [], rationale: [], selection_mode_used: "auto" },
  evidence: [],
  synthesis: { summary: "Test.", key_points: ["Point 1"], contradictions: [], implications: [], confidence_score: 0.9, gaps: [] },
  evaluation: { passed: true, should_refine: false, reason: "OK", source_count: 5, coverage_score: 0.9, source_diversity_score: 0.9, llm_content_score: 0.9, source_score: 0.9, combined_confidence: 0.9 },
  tool_traces: [], skipped_tools: [], degraded_flags: [], errors: [], output_path: "",
};

async function goToPipeline(page: Page) {
  await page.goto("/pipeline");
  await expect(page.getByPlaceholder(/enter topic/i)).toBeVisible();
}

test.describe("Pipeline Config — Mode & Freshness selectors", () => {
  test("default mode chip shows Standard", async ({ page }) => {
    await goToPipeline(page);
    // Depth chip button should display "Standard" as current value
    await expect(page.getByRole("button", { name: /^standard$/i }).first()).toBeVisible();
  });

  test("clicking Deep in dropdown selects it and research uses mode=deep", async ({ page }) => {
    let capturedBody: any = null;
    await page.route("**/api/v1/research/run", async route => {
      capturedBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESEARCH) });
    });
    await page.route("**/api/v1/angle/**", async route => route.abort());

    await goToPipeline(page);
    // Open the depth dropdown (chip shows current value "Standard")
    await page.getByRole("button", { name: /^standard$/i }).first().click();
    // Pick "Deep" from the dropdown list (accessible name includes description)
    await page.getByRole("button", { name: /^deep/i }).click();
    await page.getByPlaceholder(/enter topic/i).fill("test topic");
    await page.getByRole("button", { name: /produce content/i }).click();

    await page.waitForTimeout(1500);
    expect(capturedBody?.mode).toBe("deep");
  });

  test("default angle mode chip shows Manual angles", async ({ page }) => {
    await goToPipeline(page);
    await expect(page.getByRole("button", { name: /manual angles/i })).toBeVisible();
  });

  test("switching to Auto angles sends angleMode auto in pipeline flow", async ({ page }) => {
    let angleBody: any = null;
    await page.route("**/api/v1/research/run", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESEARCH) })
    );
    await page.route("**/api/v1/angle/run", async route => {
      angleBody = JSON.parse(route.request().postData() || "{}");
      await route.abort();
    });

    await goToPipeline(page);
    // Open the Angles dropdown then pick Auto angles
    await page.getByRole("button", { name: /manual angles/i }).click();
    await page.getByRole("button", { name: /^auto angles/i }).click();
    await page.getByPlaceholder(/enter topic/i).fill("test topic");
    await page.getByRole("button", { name: /produce content/i }).click();

    await page.waitForTimeout(2000);
    expect(angleBody?.mode).toBe("auto");
  });
});

test.describe("Pipeline Config — Advanced Settings", () => {
  test("advanced settings panel is hidden by default", async ({ page }) => {
    await goToPipeline(page);
    await expect(page.getByText("Max tool calls")).not.toBeVisible();
  });

  test("clicking Config button reveals advanced controls", async ({ page }) => {
    await goToPipeline(page);
    await page.getByTitle("Advanced settings").click();
    await expect(page.getByText("Max tool calls")).toBeVisible();
    await expect(page.getByText("Max sources")).toBeVisible();
    await expect(page.getByText("Max refinement loops")).toBeVisible();
    await expect(page.getByText("Slides per carousel")).toBeVisible();
  });

  test("advanced values are sent in research budget", async ({ page }) => {
    let capturedBody: any = null;
    await page.route("**/api/v1/research/run", async route => {
      capturedBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESEARCH) });
    });
    await page.route("**/api/v1/angle/**", async route => route.abort());

    await goToPipeline(page);
    await page.getByTitle("Advanced settings").click();
    await page.waitForTimeout(300);

    // Settings panel opens. Max tool calls is the first setting.
    // Its "+" button is identifiable by being next to the "Max tool calls" label.
    // We locate by text proximity: find all "+" buttons that appear after "Max tool calls"
    // The stepper renders as: − [value] + inside a flex row next to the label
    // Simplest approach: grab all "+" buttons on page and click the first 4 times (default=6 → 10)
    const plusButtons = page.getByRole("button", { name: "+" });
    for (let i = 0; i < 4; i++) await plusButtons.first().click();

    await page.getByPlaceholder(/enter topic/i).fill("test topic");
    await page.getByTitle("Advanced settings").click();
    await page.getByRole("button", { name: /produce content/i }).click();

    await page.waitForTimeout(1500);
    expect(capturedBody?.budget?.max_tool_calls).toBe(10);
  });
});

test.describe("Pipeline Config — LLM Mode toggle interaction with other controls", () => {
  test("turning LLM mode ON hides Research Depth and Config settings", async ({ page }) => {
    await goToPipeline(page);
    // Depth chip visible (shows "Standard")
    await expect(page.getByRole("button", { name: /^standard$/i }).first()).toBeVisible();

    await page.getByRole("switch", { name: /llm.only mode/i }).click();
    // Depth chip gone, Config button gone
    await expect(page.getByRole("button", { name: /^standard$/i }).first()).not.toBeVisible();
    await expect(page.getByTitle("Advanced settings")).not.toBeVisible();
  });

  test("LLM mode state survives a pipeline reset (pressing run again)", async ({ page }) => {
    await page.route("**/api/v1/research/llm-draft", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESEARCH) })
    );

    await goToPipeline(page);
    await page.getByRole("switch", { name: /llm.only mode/i }).click();
    await expect(page.getByRole("switch", { name: /llm.only mode/i })).toHaveAttribute("aria-checked", "true");

    await page.getByPlaceholder(/enter topic/i).fill("test topic");
    await page.getByRole("button", { name: /draft/i }).click();
    await page.waitForTimeout(1000);

    await expect(page.getByRole("switch", { name: /llm.only mode/i })).toHaveAttribute("aria-checked", "true");
  });
});
