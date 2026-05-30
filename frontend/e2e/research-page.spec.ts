/**
 * E2E tests for the standalone Research Explorer page (/research).
 * Covers: query refinement step, research request params, results display, error states.
 */

import { test, expect, Page } from "@playwright/test";

const MOCK_PROCESSED_QUERY = {
  cleaned_topic: "Agentic AI enterprise software 2026",
  entities: ["Agentic AI", "SAP", "Enterprise"],
  search_queries: ["agentic AI enterprise 2026", "SAP AI agents ERP"],
  freshness_hint: "recent",
  content_intent: "explainer",
};

const MOCK_RESEARCH = {
  run_id: "res-page-001", status: "success", topic: "Agentic AI enterprise software 2026",
  route_plan: { selected_tools: ["news_api", "ddgs_news"], crawl_urls: [], query_variants: [], rationale: [], selection_mode_used: "auto" },
  evidence: [
    { evidence: "SAP deploys 200+ AI agents.", source_type: "news", title: "SAP AI 2026", url: "https://sap.com/ai", snippet: "SAP deploys 200+ AI agents", credibility_score: 0.9, relevance_score: 0.95 },
    { evidence: "McKinsey: 40% productivity gains.", source_type: "web_search", title: "McKinsey AI Report", url: "https://mckinsey.com/ai", snippet: "40% productivity gains", credibility_score: 0.85, relevance_score: 0.88 },
  ],
  synthesis: {
    summary: "Agentic AI is fundamentally reshaping enterprise software with autonomous agents delivering measurable ROI.",
    key_points: ["SAP 200+ agents deployed", "40% productivity gains", "ERP market shifting"],
    contradictions: ["Some analysts note hype vs reality gap"],
    implications: ["ERP vendors must adapt or lose market share"],
    confidence_score: 0.9, gaps: ["Long-term ROI data unavailable"],
  },
  evaluation: { passed: true, should_refine: false, reason: "High confidence", source_count: 15, coverage_score: 0.9, source_diversity_score: 0.85, llm_content_score: 0.87, source_score: 1.0, combined_confidence: 0.92 },
  tool_traces: [], skipped_tools: [], degraded_flags: [], errors: [], output_path: "",
};

async function goToResearch(page: Page) {
  await page.goto("/research");
  await expect(page.getByText("Deep Research")).toBeVisible();
}

async function runResearch(page: Page) {
  await page.getByPlaceholder(/what do you want to learn/i).fill("Agentic AI enterprise");
  await page.getByRole("button", { name: /start research/i }).click();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Research Page — Query Refinement", () => {
  test("query refinement runs before research and results are shown", async ({ page }) => {
    let researchBody: any = null;
    await page.route("**/api/v1/tools/query-refine", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PROCESSED_QUERY) })
    );
    await page.route("**/api/v1/research/run", async route => {
      researchBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESEARCH) });
    });

    await goToResearch(page);
    await runResearch(page);

    // The cleaned_topic from query-refine should be used as the research topic
    await expect(page.getByText(/agentic ai is fundamentally/i)).toBeVisible({ timeout: 8000 });
    expect(researchBody?.topic).toBe("Agentic AI enterprise software 2026");
  });

  test("research still runs even if query-refine fails", async ({ page }) => {
    await page.route("**/api/v1/tools/query-refine", async route =>
      route.fulfill({ status: 500, body: "error" })
    );
    await page.route("**/api/v1/research/run", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESEARCH) })
    );

    await goToResearch(page);
    await runResearch(page);

    await expect(page.getByText(/agentic ai is fundamentally/i)).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Research Page — Results Display", () => {
  test("confidence score, synthesis summary and key points are shown", async ({ page }) => {
    await page.route("**/api/v1/tools/query-refine", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PROCESSED_QUERY) })
    );
    await page.route("**/api/v1/research/run", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESEARCH) })
    );

    await goToResearch(page);
    await runResearch(page);

    await expect(page.getByText(/92%|90%/).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/agentic ai is fundamentally/i)).toBeVisible();
    await expect(page.getByText("SAP 200+ agents deployed")).toBeVisible();
  });

  test("evidence cards are shown with source titles", async ({ page }) => {
    await page.route("**/api/v1/tools/query-refine", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PROCESSED_QUERY) })
    );
    await page.route("**/api/v1/research/run", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESEARCH) })
    );

    await goToResearch(page);
    await runResearch(page);

    await expect(page.getByText("SAP AI 2026")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("McKinsey AI Report")).toBeVisible();
  });
});

test.describe("Research Page — Error Handling", () => {
  test("no results are shown when research API fails (stays in loading→idle)", async ({ page }) => {
    await page.route("**/api/v1/tools/query-refine", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PROCESSED_QUERY) })
    );
    await page.route("**/api/v1/research/run", async route =>
      route.fulfill({ status: 500, body: "Internal Server Error" })
    );

    await goToResearch(page);
    await runResearch(page);

    // Button returns to idle state after failure
    await expect(page.getByRole("button", { name: /start research/i })).toBeVisible({ timeout: 8000 });
    // No synthesis result appears
    await expect(page.getByText(/agentic ai is fundamentally/i)).not.toBeVisible();
  });
});
