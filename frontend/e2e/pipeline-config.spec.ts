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
  await expect(page.getByRole("heading", { name: "Pipeline", level: 1 })).toBeVisible();
}

test.describe("Pipeline Config — Mode & Freshness selectors", () => {
  test("default mode is Standard", async ({ page }) => {
    await goToPipeline(page);
    const standard = page.getByRole("button", { name: /^standard$/i });
    await expect(standard).toHaveClass(/bg-zinc-800/);
  });

  test("clicking Deep selects it and research uses mode=deep", async ({ page }) => {
    let capturedBody: any = null;
    await page.route("**/api/v1/research/run", async route => {
      capturedBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESEARCH) });
    });
    await page.route("**/api/v1/angle/**", async route => route.abort());

    await goToPipeline(page);
    await page.getByRole("button", { name: /^deep$/i }).click();
    await page.getByPlaceholder(/enter topic/i).fill("test topic");
    await page.getByRole("button", { name: /produce content/i }).click();

    await page.waitForTimeout(1500);
    expect(capturedBody?.mode).toBe("deep");
  });

  test("default angle mode is Manual", async ({ page }) => {
    await goToPipeline(page);
    const manual = page.getByRole("button", { name: /^manual$/i });
    await expect(manual).toHaveClass(/bg-zinc-800/);
  });

  test("switching to Auto sends angleMode auto in pipeline flow", async ({ page }) => {
    let angleBody: any = null;
    await page.route("**/api/v1/research/run", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESEARCH) })
    );
    await page.route("**/api/v1/angle/run", async route => {
      angleBody = JSON.parse(route.request().postData() || "{}");
      await route.abort();
    });

    await goToPipeline(page);
    await page.getByRole("button", { name: /^auto$/i }).click();
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

  test("clicking 'Show advanced settings' reveals controls", async ({ page }) => {
    await goToPipeline(page);
    await page.getByText(/show advanced settings/i).click();
    await expect(page.getByText("Max tool calls")).toBeVisible();
    await expect(page.getByText("Max sources")).toBeVisible();
    await expect(page.getByText("Max loops")).toBeVisible();
    await expect(page.getByText("Max slides")).toBeVisible();
  });

  test("advanced values are sent in research budget", async ({ page }) => {
    let capturedBody: any = null;
    await page.route("**/api/v1/research/run", async route => {
      capturedBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESEARCH) });
    });
    await page.route("**/api/v1/angle/**", async route => route.abort());

    await goToPipeline(page);
    await page.getByText(/show advanced settings/i).click();

    // Change max tools from 6 to 10
    const maxToolsInput = page.locator("input[type=number]").first();
    await maxToolsInput.fill("10");

    await page.getByPlaceholder(/enter topic/i).fill("test topic");
    await page.getByRole("button", { name: /produce content/i }).click();

    await page.waitForTimeout(1500);
    expect(capturedBody?.budget?.max_tool_calls).toBe(10);
  });
});

test.describe("Pipeline Config — LLM Mode toggle interaction with other controls", () => {
  test("turning LLM mode ON hides Research Depth and Advanced settings", async ({ page }) => {
    await goToPipeline(page);
    await expect(page.getByText("Research Depth")).toBeVisible();

    await page.getByRole("switch", { name: /llm.only mode/i }).click();
    await expect(page.getByText("Research Depth")).not.toBeVisible();
    await expect(page.getByText(/show advanced settings/i)).not.toBeVisible();
  });

  test("LLM mode state survives a pipeline reset (pressing run again)", async ({ page }) => {
    await page.route("**/api/v1/research/llm-draft", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESEARCH) })
    );

    await goToPipeline(page);
    await page.getByRole("switch", { name: /llm.only mode/i }).click();
    await expect(page.getByRole("switch", { name: /llm.only mode/i })).toHaveAttribute("aria-checked", "true");

    await page.getByPlaceholder(/enter topic/i).fill("test topic");
    await page.getByRole("button", { name: /draft research/i }).click();
    await page.waitForTimeout(1000);

    // After run, LLM mode should still be ON
    await expect(page.getByRole("switch", { name: /llm.only mode/i })).toHaveAttribute("aria-checked", "true");
  });
});
