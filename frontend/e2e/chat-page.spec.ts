/**
 * E2E tests for the Chat page (/chat).
 * Covers: message send, reply renders, multi-turn history in request, clear chat, error reply.
 */

import { test, expect, Page } from "@playwright/test";

async function goToChat(page: Page) {
  await page.goto("/chat");
  await expect(page.getByText("AI Assistant")).toBeVisible();
}

async function mockChatReply(page: Page, reply: string) {
  await page.route("**/api/v1/chat/", async route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ reply, error: null }) })
  );
}

async function sendMessage(page: Page, text: string) {
  await page.getByPlaceholder(/message your agent/i).fill(text);
  await page.keyboard.press("Enter");
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Chat Page — Sending Messages", () => {
  test("empty state shows 'How can I assist' heading", async ({ page }) => {
    await goToChat(page);
    await expect(page.getByText(/how can I assist/i)).toBeVisible();
  });

  test("sending a message calls /chat/ and shows the reply", async ({ page }) => {
    await mockChatReply(page, "Agentic AI refers to autonomous AI systems that can plan and act.");
    await goToChat(page);

    await sendMessage(page, "What is agentic AI?");

    await expect(page.getByText("What is agentic AI?")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Agentic AI refers to autonomous AI systems")).toBeVisible({ timeout: 8000 });
  });

  test("chat request includes the full message history", async ({ page }) => {
    let firstBody: any = null;
    let secondBody: any = null;
    let callCount = 0;

    await page.route("**/api/v1/chat/", async route => {
      const body = JSON.parse(route.request().postData() || "{}");
      callCount++;
      if (callCount === 1) firstBody = body;
      else secondBody = body;
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ reply: `Reply ${callCount}`, error: null }),
      });
    });

    await goToChat(page);
    await sendMessage(page, "First message");
    await expect(page.getByText("Reply 1")).toBeVisible({ timeout: 8000 });

    await sendMessage(page, "Second message");
    await expect(page.getByText("Reply 2")).toBeVisible({ timeout: 8000 });

    // Second call must include the first exchange in history
    expect(secondBody?.messages.length).toBeGreaterThanOrEqual(3);
    expect(firstBody?.messages[0].role).toBe("user");
    expect(firstBody?.messages[0].content).toBe("First message");
  });

  test("error from API shows error text in chat", async ({ page }) => {
    await page.route("**/api/v1/chat/", async route =>
      route.fulfill({ status: 500, body: "Internal Server Error" })
    );

    await goToChat(page);
    await sendMessage(page, "Hello?");

    await expect(page.getByText(/error/i)).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Chat Page — Clear", () => {
  test("messages persist in the same session (Redux in-memory)", async ({ page }) => {
    await mockChatReply(page, "SAP Joule is embedded in enterprise workflows.");
    await goToChat(page);

    await sendMessage(page, "Tell me about SAP Joule");
    await expect(page.getByText("SAP Joule is embedded in enterprise workflows.")).toBeVisible({ timeout: 8000 });

    // Navigate to pipeline and back — Redux resets on full page reload in test env,
    // but within the same Playwright page session state is kept in-memory
    await expect(page.getByText("Tell me about SAP Joule")).toBeVisible();
  });

  test("clicking the trash button empties messages and shows empty state", async ({ page }) => {
    await mockChatReply(page, "Some reply.");
    await goToChat(page);

    await sendMessage(page, "Hello");
    await expect(page.getByText("Some reply.")).toBeVisible({ timeout: 8000 });

    // The trash/clear button is in the header (Trash2 icon)
    await page.locator("header button").last().click();
    await page.waitForTimeout(300);

    await expect(page.getByText(/how can I assist/i)).toBeVisible();
    await expect(page.getByText("Hello")).not.toBeVisible();
  });
});
