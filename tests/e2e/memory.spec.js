import { test, expect } from "@playwright/test";

test.describe("Kuro-chan project memory", () => {
  test("lets a user add, edit, and delete project memory without an AI provider", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await page.getByTestId("sidebar-memory").click();
    await expect(page.getByRole("heading", { name: "Project memory" })).toBeVisible();

    await page.getByTestId("memory-entry-input").fill("Keep this project compatible with Android WebView.");
    await page.getByTestId("memory-add-entry").click();
    const fact = page.getByTestId("memory-fact-0");
    await expect(fact).toContainText("Keep this project compatible with Android WebView.");
    await expect(fact).toContainText("Confirmed by you");

    await fact.getByRole("button", { name: "Edit fact 1" }).click();
    await page.getByTestId("memory-edit-input").fill("Keep this project compatible with Android WebView and low-memory phones.");
    await page.getByTestId("memory-save-edit").click();
    await expect(fact).toContainText("low-memory phones");

    await fact.getByRole("button", { name: "Delete fact 1" }).click();
    await expect(page.getByTestId("memory-fact-0")).toHaveCount(0);
    await expect(page.getByText("Nothing saved here yet.").first()).toBeVisible();
  });

  test("requires confirmation before clearing project memory and filters credential-like text", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await page.getByTestId("sidebar-memory").click();

    await page.getByTestId("memory-entry-input").fill("Remember that the project uses React.");
    await page.getByTestId("memory-add-entry").click();
    await expect(page.getByTestId("memory-fact-0")).toBeVisible();

    await page.getByTestId("memory-clear").click();
    await expect(page.getByRole("alert")).toContainText("Confirm clearing all memory");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId("memory-fact-0")).toBeVisible();

    await page.getByTestId("memory-entry-input").fill("api_key=supersecret123456789");
    await page.getByTestId("memory-add-entry").click();
    await expect(page.getByText("This looks like a secret")).toBeVisible();
    await expect(page.getByTestId("memory-fact-1")).toHaveCount(0);

    await page.getByTestId("memory-clear").click();
    await page.getByTestId("memory-clear").click();
    await expect(page.getByTestId("memory-fact-0")).toHaveCount(0);
    await expect(page.getByText("Project files and conversation history were not changed.")).toBeVisible();
  });

  test("keeps memory isolated when switching projects", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    const originalProject = await page.locator('[data-testid^="sidebar-project-"]').first().getAttribute("data-testid");
    expect(originalProject).toBeTruthy();

    await page.getByTestId("sidebar-memory").click();
    await page.getByTestId("memory-entry-input").fill("This memory belongs to the original project only.");
    await page.getByTestId("memory-add-entry").click();
    await expect(page.getByTestId("memory-fact-0")).toBeVisible();
    await page.getByLabel("Project summary").fill("UNSAVED SUMMARY FROM THE ORIGINAL PROJECT");

    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("button-new-chat").click();
    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("sidebar-memory").click();
    await expect(page.getByTestId("memory-fact-0")).toHaveCount(0);
    await expect(page.getByLabel("Project summary")).toHaveValue("");

    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId(originalProject).click();
    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("sidebar-memory").click();
    await expect(page.getByTestId("memory-fact-0")).toContainText("This memory belongs to the original project only.");
  });

  test("keeps a running task's completion summary in the project where it started", async ({ page }) => {
    let releaseFirst;
    let requestStarted;
    const firstRequestStarted = new Promise<void>((resolve) => { requestStarted = resolve; });
    const release = new Promise<void>((resolve) => { releaseFirst = resolve; });
    let requestCount = 0;
    const reply = [
      'data: {"choices":[{"delta":{"content":"I reviewed the project and completed the requested task."}}]}',
      "",
      "data: [DONE]",
      "",
    ].join("\n");

    await page.route("https://text.pollinations.ai/openai/chat/completions", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "authorization, content-type" } });
        return;
      }
      requestCount += 1;
      if (requestCount === 1) {
        requestStarted();
        await release;
      }
      await route.fulfill({
        status: 200,
        headers: { "access-control-allow-origin": "*", "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" },
        body: reply,
      });
    });

    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    const originalProject = await page.locator('[data-testid^="sidebar-project-"]').first().getAttribute("data-testid");
    expect(originalProject).toBeTruthy();

    // Create a second workspace before the model request so the test can switch
    // between existing projects while the first request is held open.
    const newChat = page.getByTestId("button-new-chat");
    if (!(await newChat.isVisible())) await page.getByTestId("button-open-sidebar").click();
    await newChat.click();
    if (!(await page.getByTestId(originalProject!).isVisible())) await page.getByTestId("button-open-sidebar").click();
    const projectIds = await page.locator('[data-testid^="sidebar-project-"]').evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-testid")).filter((value): value is string => Boolean(value)),
    );
    const secondProject = projectIds.find((id) => id !== originalProject);
    expect(secondProject).toBeTruthy();
    await page.getByTestId(originalProject!).click();
    if (!(await page.getByTestId("input-message").isVisible())) await page.getByTestId("button-open-sidebar").click();

    await page.getByTestId("input-message").fill("Please inspect this project and tell me what you completed.");
    await page.getByTestId("button-send").click();
    await firstRequestStarted;

    // Switch while the provider response is pending, as a user might when
    // moving between project chats during a longer task.
    if (!(await page.getByTestId(secondProject!).isVisible())) await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId(secondProject!).click();
    releaseFirst();

    await expect(page.getByText(/I reviewed the project and completed the requested task/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("button-stop")).toHaveCount(0, { timeout: 15_000 });
    if (!(await page.getByTestId("sidebar-memory").isVisible())) await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("sidebar-memory").click();
    await expect(page.getByLabel("Project summary")).toHaveValue("");

    if (!(await page.getByTestId(originalProject!).isVisible())) await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId(originalProject!).click();
    if (!(await page.getByTestId("sidebar-memory").isVisible())) await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("sidebar-memory").click();
    await expect(page.getByLabel("Project summary")).not.toHaveValue("", { timeout: 15_000 });
  });
});
