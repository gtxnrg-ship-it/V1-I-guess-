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

  test("keeps a running build's files and summary in the project where it started", async ({ page }) => {
    let releaseBuilder;
    let builderRequestStarted;
    const builderStarted = new Promise((resolve) => { builderRequestStarted = resolve; });
    const holdBuilder = new Promise((resolve) => { releaseBuilder = resolve; });
    let requestCount = 0;
    const eventStream = (event) => `data: ${JSON.stringify(event)}\n\ndata: [DONE]\n\n`;
    const brief = {
      choices: [{ delta: { tool_calls: [{
        index: 0, id: "call_brief_project_scope", type: "function",
        function: { name: "propose_brief", arguments: JSON.stringify({
          title: "Project-scoped file test",
          summary: "Create one small source file to verify project isolation.",
          features: ["Create a single TypeScript file"],
          design: "Minimal and clear",
          backend: "none",
          size: "quick",
        }) },
      }] } }],
    };
    const writeFile = {
      choices: [{ delta: { tool_calls: [{
        index: 0, id: "call_write_project_scope", type: "function",
        function: { name: "write_file", arguments: JSON.stringify({
          path: "src/origin-project-only.ts",
          content: 'export const originProjectOnly = "first";',
        }) },
      }] } }],
    };
    const textReply = {
      choices: [{ delta: { content: "The requested change is complete and ready for review." } }],
    };

    await page.route("https://text.pollinations.ai/openai/chat/completions", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "authorization, content-type" } });
        return;
      }
      requestCount += 1;
      if (requestCount === 1) {
        await route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" }, body: eventStream(brief) });
        return;
      }
      if (requestCount === 2) {
        builderRequestStarted();
        await holdBuilder;
        await route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" }, body: eventStream(writeFile) });
        return;
      }
      await route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" }, body: eventStream(textReply) });
    });

    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    const originalProject = await page.locator('[data-testid^="sidebar-project-"]').first().getAttribute("data-testid");
    expect(originalProject).toBeTruthy();
    const originalProjectId = String(originalProject).replace(/^sidebar-project-/, "");
    await page.evaluate((id) => localStorage.removeItem(`kuro_last_summary_${id}`), originalProjectId);

    // Create a second workspace before starting the build.
    const newChat = page.getByTestId("button-new-chat");
    if (!(await newChat.isVisible())) await page.getByTestId("button-open-sidebar").click();
    await newChat.click();
    if (!(await page.getByTestId(originalProject).isVisible())) await page.getByTestId("button-open-sidebar").click();
    const projectIds = await page.locator('[data-testid^="sidebar-project-"]').evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-testid")).filter(Boolean),
    );
    const secondProject = projectIds.find((id) => id !== originalProject);
    expect(secondProject).toBeTruthy();
    await page.getByTestId(originalProject).click();

    await page.getByTestId("input-message").fill("Please create the tiny source file described in the brief.");
    await page.getByTestId("button-send").click();
    await expect(page.getByTestId("button-build-it")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("button-build-it").click();
    await builderStarted;

    // Switch projects while the Builder's provider response is still pending.
    if (!(await page.getByTestId(secondProject).isVisible())) await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId(secondProject).click();
    releaseBuilder();

    await page.waitForFunction((id) => Boolean(localStorage.getItem(`kuro_last_summary_${id}`)), originalProjectId, { timeout: 20_000 });

    // The second workspace must have neither the file nor the summary.
    if (!(await page.getByTestId("button-more-menu").isVisible())) throw new Error("Project menu should remain available");
    await page.getByTestId("button-more-menu").click();
    await page.getByRole("menuitem", { name: "Code", exact: true }).click();
    await expect(page.getByTestId("code-file-src/origin-project-only.ts")).toHaveCount(0);

    if (!(await page.getByTestId("button-open-sidebar").isVisible())) throw new Error("Sidebar toggle should be available");
    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("sidebar-memory").click();
    await expect(page.getByLabel("Project summary")).toHaveValue("");

    // Returning to the original workspace should reveal both the file and summary.
    if (!(await page.getByTestId(originalProject).isVisible())) await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId(originalProject).click();
    await page.getByTestId("button-more-menu").click();
    await page.getByRole("menuitem", { name: "Code", exact: true }).click();
    await page.getByTestId("code-file-src/origin-project-only.ts").click();
    await expect(page.getByText('export const originProjectOnly = "first";', { exact: true })).toBeVisible();
    if (!(await page.getByTestId("button-open-sidebar").isVisible())) throw new Error("Sidebar toggle should be available");
    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("sidebar-memory").click();
    await expect(page.getByLabel("Project summary")).not.toHaveValue("", { timeout: 10_000 });
  });
});
