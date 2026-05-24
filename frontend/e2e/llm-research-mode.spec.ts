/**
 * E2E tests for the LLM-only research mode feature.
 *
 * All backend API calls are intercepted via page.route() so tests are
 * deterministic and don't depend on a running LLM backend.
 */

import { test, expect, Page } from "@playwright/test";

// ── Fixtures ────────────────────────────────────────────────────────────────────

const MOCK_DRAFT_RESPONSE = {
  run_id: "test-llm-run-001",
  status: "success",
  topic: "Sengottaiyan controversies",
  route_plan: {
    selected_tools: ["llm_knowledge"],
    crawl_urls: [],
    query_variants: [],
    rationale: ["LLM-only research mode"],
    selection_mode_used: "manual",
  },
  evidence: [
    {
      evidence:
        "Sengottaiyan has been associated with multiple land acquisition controversies in Tamil Nadu.",
      source_type: "llm_knowledge",
      title: "Land Acquisition Controversies",
      url: "llm://knowledge/sengottaiyan/1",
      snippet: "Sengottaiyan has been associated with multiple land acquisition controversies",
      credibility_score: 0.8,
      relevance_score: 0.9,
    },
    {
      evidence: "In 2019, allegations surfaced regarding irregularities in government contracts.",
      source_type: "llm_knowledge",
      title: "2019 Contract Irregularities",
      url: "llm://knowledge/sengottaiyan/2",
      snippet: "In 2019, allegations surfaced regarding irregularities",
      credibility_score: 0.75,
      relevance_score: 0.85,
    },
  ],
  synthesis: {
    summary:
      "Sengottaiyan, the new TVK minister, has a controversial political history marked by land acquisition disputes and allegations of corruption. This research examines the key incidents and their implications.",
    key_points: [
      "Multiple land acquisition controversies during his tenure",
      "2019 corruption probe by the Enforcement Directorate",
      "Allegations of favouring contractors in public works",
    ],
    contradictions: ["Sengottaiyan denies all allegations citing lack of evidence"],
    implications: ["Raises questions about ministerial accountability in Tamil Nadu"],
    confidence_score: 0.85,
    gaps: ["Court documents not yet publicly available"],
  },
  evaluation: {
    passed: true,
    should_refine: false,
    reason: "LLM-generated research",
    source_count: 2,
    coverage_score: 0.85,
    source_diversity_score: 1.0,
    llm_content_score: 0.85,
    source_score: 0.85,
    combined_confidence: 0.85,
  },
  tool_traces: [],
  skipped_tools: [],
  degraded_flags: [],
  errors: [],
  output_path: "/tmp/test/research",
};

const MOCK_REFINED_RESPONSE = {
  ...MOCK_DRAFT_RESPONSE,
  synthesis: {
    ...MOCK_DRAFT_RESPONSE.synthesis,
    summary:
      "REFINED: This updated research focuses specifically on the 2019 Enforcement Directorate probe and subsequent land grab allegations, providing a sharper narrative.",
    key_points: [
      "REFINED: ED probe in 2019 found discrepancies worth ₹48 crore",
      "REFINED: Land acquired at below-market rates in Vellore district",
      "REFINED: Three PILs filed against him remain pending in Madras HC",
    ],
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────────

async function interceptAPIs(
  page: Page,
  opts: { refinedResponse?: boolean } = {}
) {
  await page.route("**/api/v1/research/llm-draft", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_DRAFT_RESPONSE),
    });
  });

  await page.route("**/api/v1/research/llm-refine", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        opts.refinedResponse ? MOCK_REFINED_RESPONSE : MOCK_DRAFT_RESPONSE
      ),
    });
  });
}

async function goToPipeline(page: Page) {
  await page.goto("/pipeline");
  // Use the specific h1 heading inside the PipelineConfig sidebar
  await expect(page.getByRole("heading", { name: "Pipeline", level: 1 })).toBeVisible();
}

async function enableLlmMode(page: Page) {
  const toggle = page.getByRole("switch", { name: /llm.only mode/i });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
}

async function enterTopic(page: Page, topic: string) {
  await page.getByPlaceholder(/enter topic/i).fill(topic);
}

// ── Tests ────────────────────────────────────────────────────────────────────────

test.describe("LLM Research Mode — Toggle UI", () => {
  test("LLM-only toggle is visible on pipeline page", async ({ page }) => {
    await goToPipeline(page);
    await expect(page.getByRole("switch", { name: /llm.only mode/i })).toBeVisible();
  });

  test("toggle is OFF by default", async ({ page }) => {
    await goToPipeline(page);
    const toggle = page.getByRole("switch", { name: /llm.only mode/i });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  test("enabling toggle changes button label to 'Draft Research'", async ({ page }) => {
    await goToPipeline(page);
    await enableLlmMode(page);
    await expect(page.getByRole("button", { name: /draft research/i })).toBeVisible();
  });

  test("disabling toggle restores 'Produce Content' label", async ({ page }) => {
    await goToPipeline(page);
    const toggle = page.getByRole("switch", { name: /llm.only mode/i });
    await toggle.click(); // ON
    await toggle.click(); // OFF
    await expect(page.getByRole("button", { name: /produce content/i })).toBeVisible();
  });

  test("Research Depth selector hidden when LLM mode is ON", async ({ page }) => {
    await goToPipeline(page);
    await expect(page.getByText("Research Depth")).toBeVisible();
    await enableLlmMode(page);
    await expect(page.getByText("Research Depth")).not.toBeVisible();
  });

  test("hint text appears when LLM mode is ON", async ({ page }) => {
    await goToPipeline(page);
    await enableLlmMode(page);
    await expect(page.getByText(/no web search/i)).toBeVisible();
  });
});

test.describe("LLM Research Mode — Draft Flow", () => {
  test("clicking Draft Research calls llm-draft and shows Stage 1 results", async ({
    page,
  }) => {
    await interceptAPIs(page);
    await goToPipeline(page);
    await enableLlmMode(page);
    await enterTopic(page, "Sengottaiyan controversies");

    await page.getByRole("button", { name: /draft research/i }).click();

    // Stage 1 should expand and show research summary
    await expect(page.getByText(/sengottaiyan.*controversial political history/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("llm-draft request contains the topic", async ({ page }) => {
    let capturedBody: any = null;
    await page.route("**/api/v1/research/llm-draft", async (route) => {
      capturedBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DRAFT_RESPONSE),
      });
    });

    await goToPipeline(page);
    await enableLlmMode(page);
    await enterTopic(page, "Sengottaiyan controversies");
    await page.getByRole("button", { name: /draft research/i }).click();

    await expect(page.getByText(/sengottaiyan/i)).toBeVisible({ timeout: 10000 });
    expect(capturedBody?.topic).toBe("Sengottaiyan controversies");
  });

  test("'Satisfied → Generate Angles' button appears after draft completes", async ({
    page,
  }) => {
    await interceptAPIs(page);
    await goToPipeline(page);
    await enableLlmMode(page);
    await enterTopic(page, "Sengottaiyan controversies");
    await page.getByRole("button", { name: /draft research/i }).click();

    await expect(
      page.getByRole("button", { name: /satisfied.*generate angles/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("normal pipeline does NOT show 'Generate Angles' button", async ({ page }) => {
    await goToPipeline(page);
    // LLM mode is OFF by default
    await expect(
      page.getByRole("button", { name: /satisfied.*generate angles/i })
    ).not.toBeVisible();
  });
});

test.describe("LLM Research Mode — Refine Panel", () => {
  test("Refine Research panel appears in Stage 1 after draft", async ({ page }) => {
    await interceptAPIs(page);
    await goToPipeline(page);
    await enableLlmMode(page);
    await enterTopic(page, "Sengottaiyan controversies");
    await page.getByRole("button", { name: /draft research/i }).click();

    await expect(page.getByText("Refine Research")).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByPlaceholder(/focus on land acquisition/i)
    ).toBeVisible();
  });

  test("Refine button is disabled when feedback is empty", async ({ page }) => {
    await interceptAPIs(page);
    await goToPipeline(page);
    await enableLlmMode(page);
    await enterTopic(page, "Sengottaiyan controversies");
    await page.getByRole("button", { name: /draft research/i }).click();

    await expect(page.getByText("Refine Research")).toBeVisible({ timeout: 10000 });
    const refineBtn = page.getByRole("button", { name: /refine with llm/i });
    await expect(refineBtn).toBeDisabled();
  });

  test("Refine button enables after typing feedback", async ({ page }) => {
    await interceptAPIs(page);
    await goToPipeline(page);
    await enableLlmMode(page);
    await enterTopic(page, "Sengottaiyan controversies");
    await page.getByRole("button", { name: /draft research/i }).click();

    await expect(page.getByText("Refine Research")).toBeVisible({ timeout: 10000 });
    await page
      .getByPlaceholder(/focus on land acquisition/i)
      .fill("Focus on the 2019 corruption probe specifically");

    await expect(page.getByRole("button", { name: /refine with llm/i })).toBeEnabled();
  });

  test("clicking Refine calls llm-refine with feedback and updates synthesis", async ({
    page,
  }) => {
    await interceptAPIs(page, { refinedResponse: true });
    await goToPipeline(page);
    await enableLlmMode(page);
    await enterTopic(page, "Sengottaiyan controversies");
    await page.getByRole("button", { name: /draft research/i }).click();

    await expect(page.getByText("Refine Research")).toBeVisible({ timeout: 10000 });

    await page
      .getByPlaceholder(/focus on land acquisition/i)
      .fill("Focus on the 2019 ED probe, ignore generic biography");

    await page.getByRole("button", { name: /refine with llm/i }).click();

    // Synthesis should update to the refined version
    await expect(
      page.getByText(/REFINED.*ED probe in 2019/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("llm-refine request includes topic, feedback, and current_result", async ({ page }) => {
    let capturedBody: any = null;
    await page.route("**/api/v1/research/llm-draft", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DRAFT_RESPONSE),
      });
    });
    await page.route("**/api/v1/research/llm-refine", async (route) => {
      capturedBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_REFINED_RESPONSE),
      });
    });

    await goToPipeline(page);
    await enableLlmMode(page);
    await enterTopic(page, "Sengottaiyan controversies");
    await page.getByRole("button", { name: /draft research/i }).click();

    await expect(page.getByText("Refine Research")).toBeVisible({ timeout: 10000 });
    await page
      .getByPlaceholder(/focus on land acquisition/i)
      .fill("Focus only on the ED probe");
    await page.getByRole("button", { name: /refine with llm/i }).click();

    await expect(page.getByText(/REFINED/i).first()).toBeVisible({ timeout: 10000 });

    expect(capturedBody?.topic).toBe("Sengottaiyan controversies");
    expect(capturedBody?.feedback).toBe("Focus only on the ED probe");
    expect(capturedBody?.current_result).toBeTruthy();
    expect(capturedBody?.current_result?.run_id).toBe("test-llm-run-001");
  });

  test("feedback textarea clears after successful refine", async ({ page }) => {
    await interceptAPIs(page, { refinedResponse: true });
    await goToPipeline(page);
    await enableLlmMode(page);
    await enterTopic(page, "Sengottaiyan controversies");
    await page.getByRole("button", { name: /draft research/i }).click();

    await expect(page.getByText("Refine Research")).toBeVisible({ timeout: 10000 });
    const textarea = page.getByPlaceholder(/focus on land acquisition/i);
    await textarea.fill("Focus on ED probe");
    await page.getByRole("button", { name: /refine with llm/i }).click();

    await expect(page.getByText(/REFINED/i).first()).toBeVisible({ timeout: 10000 });
    await expect(textarea).toHaveValue("");
  });

  test("refine can be run multiple times (run_id stays constant)", async ({ page }) => {
    let refineCallCount = 0;
    let lastRunId: string | null = null;

    await page.route("**/api/v1/research/llm-draft", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DRAFT_RESPONSE),
      });
    });
    await page.route("**/api/v1/research/llm-refine", async (route) => {
      refineCallCount++;
      const body = JSON.parse(route.request().postData() || "{}");
      lastRunId = body.current_result?.run_id;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...MOCK_REFINED_RESPONSE, run_id: "test-llm-run-001" }),
      });
    });

    await goToPipeline(page);
    await enableLlmMode(page);
    await enterTopic(page, "Sengottaiyan controversies");
    await page.getByRole("button", { name: /draft research/i }).click();
    await expect(page.getByText("Refine Research")).toBeVisible({ timeout: 10000 });

    // First refine
    await page.getByPlaceholder(/focus on land acquisition/i).fill("Focus on ED probe");
    await page.getByRole("button", { name: /refine with llm/i }).click();
    await page.waitForTimeout(500);

    // Second refine
    await page.getByPlaceholder(/focus on land acquisition/i).fill("Add court case details");
    await page.getByRole("button", { name: /refine with llm/i }).click();
    await page.waitForTimeout(500);

    expect(refineCallCount).toBe(2);
    expect(lastRunId).toBe("test-llm-run-001"); // same run_id throughout
  });
});

test.describe("LLM Research Mode — Generate Angles Flow", () => {
  test("'Generate Angles' button triggers angle API call", async ({ page }) => {
    let angleCallMade = false;

    await interceptAPIs(page);
    await page.route("**/api/v1/angle/run", async (route) => {
      angleCallMade = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          run_id: "test-llm-run-001",
          status: "success",
          angles: [
            {
              statement: "Sengottaiyan's corruption exposed",
              emotional_hook: "anger",
              supporting_evidence: "ED probe findings",
            },
          ],
          selected_angles: [],
          selection_reasoning: "",
          errors: [],
          output_path: "",
        }),
      });
    });

    await goToPipeline(page);
    await enableLlmMode(page);
    await enterTopic(page, "Sengottaiyan controversies");
    await page.getByRole("button", { name: /draft research/i }).click();

    const generateBtn = page.getByRole("button", { name: /satisfied.*generate angles/i });
    await expect(generateBtn).toBeVisible({ timeout: 10000 });
    await generateBtn.click();

    await page.waitForTimeout(1000);
    expect(angleCallMade).toBe(true);
  });

  test("angle request uses run_id from LLM draft result", async ({ page }) => {
    let capturedAngleBody: any = null;

    await interceptAPIs(page);
    await page.route("**/api/v1/angle/run", async (route) => {
      capturedAngleBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          run_id: "test-llm-run-001",
          status: "success",
          angles: [],
          selected_angles: [],
          selection_reasoning: "",
          errors: [],
          output_path: "",
        }),
      });
    });

    await goToPipeline(page);
    await enableLlmMode(page);
    await enterTopic(page, "Sengottaiyan controversies");
    await page.getByRole("button", { name: /draft research/i }).click();

    const generateBtn = page.getByRole("button", { name: /satisfied.*generate angles/i });
    await expect(generateBtn).toBeVisible({ timeout: 10000 });
    await generateBtn.click();

    await page.waitForTimeout(1000);
    expect(capturedAngleBody?.run_id).toBe("test-llm-run-001");
    expect(capturedAngleBody?.topic).toBe("Sengottaiyan controversies");
  });
});

test.describe("Normal pipeline — unaffected by LLM mode flag", () => {
  test("normal research still uses /research/run when LLM mode is OFF", async ({ page }) => {
    let normalResearchCalled = false;
    let llmDraftCalled = false;

    await page.route("**/api/v1/research/run", async (route) => {
      normalResearchCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...MOCK_DRAFT_RESPONSE,
          route_plan: {
            ...MOCK_DRAFT_RESPONSE.route_plan,
            selected_tools: ["news_api", "ddgs_news"],
          },
        }),
      });
    });
    await page.route("**/api/v1/research/llm-draft", async (route) => {
      llmDraftCalled = true;
      await route.abort();
    });

    await goToPipeline(page);
    // LLM mode OFF (default)
    await enterTopic(page, "some topic");
    await page.getByRole("button", { name: /produce content/i }).click();

    await page.waitForTimeout(1500);
    expect(normalResearchCalled).toBe(true);
    expect(llmDraftCalled).toBe(false);
  });
});
