import { test, expect } from "@playwright/test";

test.describe("Kuro-chan studio", () => {
  test("loads the engineering workspace without a live-preview feature", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("input-message")).toBeVisible();
    await page.getByTestId("button-more-menu").click();
    await expect(page.getByRole("menuitem", { name: /Publish to GitHub/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("sidebar-projects")).toBeVisible();
    await expect(page.getByTestId("sidebar-activity")).toBeVisible();
    await expect(page.getByTestId("sidebar-code")).toBeVisible();
    await expect(page.getByTestId("sidebar-settings")).toBeVisible();
    await page.getByTestId("sidebar-projects").click();
    await expect(page.getByRole("heading", { name: "Your projects" })).toBeVisible();
    // On phone, choosing a destination closes the drawer. Reopen it before the next navigation.
    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("sidebar-activity").click();
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("sidebar-settings").click();
    await page.getByRole("button", { name: /AI & models/i }).click();
    await expect(page.getByTestId("local-models-pane")).toBeVisible();
    await expect(page.getByTestId("tab-preview")).toHaveCount(0);
    await expect(page.getByTestId("iframe-preview")).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test("keeps chat, source inspection, and settings reachable on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/studio", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("input-message")).toBeVisible();
    await expect(page.getByTestId("tab-mobile-chat")).toHaveCount(0);
    await expect(page.getByTestId("studio-mobile-nav")).toHaveCount(0);
    await page.getByTestId("button-open-sidebar").click();
    await expect(page.getByTestId("sidebar-projects")).toBeVisible();
    await expect(page.getByTestId("sidebar-activity")).toBeVisible();
    await expect(page.getByTestId("sidebar-code")).toBeVisible();
    await expect(page.getByTestId("sidebar-settings")).toBeVisible();
    await page.getByTestId("sidebar-projects").click();
    await expect(page.getByRole("heading", { name: "Your projects" })).toBeVisible();
    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("sidebar-activity").click();
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("sidebar-code").click();
    await expect(page.getByText("Files", { exact: true })).toBeVisible();
    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("button-new-chat").click();
    await expect(page.getByTestId("input-message")).toBeVisible();
  });

  test("exports the current project as a downloadable ZIP", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await page.getByTestId("button-more-menu").click();
    const exportButton = page.getByRole("menuitem", { name: /Download project ZIP/i });
    await expect(exportButton).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.zip$/);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const archive = Buffer.concat(chunks);

    // ZIP local-file-header signature and a real project source file should be present.
    expect(archive.readUInt32LE(0)).toBe(0x04034b50);
    expect(archive.includes(Buffer.from("src/main.tsx"))).toBe(true);
  });

  test("explains GitHub setup before attempting to publish without credentials", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await page.getByTestId("button-more-menu").click();
    await page.getByRole("menuitem", { name: /Publish to GitHub/i }).click();
    await expect(page.getByText("Add a GitHub token in Keys first")).toBeVisible();
    await expect(page.getByTestId("button-publish-open-keys")).toBeVisible();
  });


  test("sends a natural chat message and renders Kuro-chan's streamed reply", async ({ page }) => {
    let requests = 0;
    await page.route("https://text.pollinations.ai/openai/chat/completions", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "authorization, content-type",
          },
        });
        return;
      }

      requests += 1;
      const body = [
        'data: {"choices":[{"delta":{"content":"Hey there! ✨ Tell me what you\'re imagining and we\'ll turn it into something real."}}]}',
        "",
        "data: [DONE]",
        "",
      ].join("\n");
      await route.fulfill({
        status: 200,
        headers: {
          "access-control-allow-origin": "*",
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
        },
        body,
      });
    });

    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    const composer = page.getByTestId("input-message");
    await composer.fill("Hey Kuro-chan, I have an idea but I'm not sure where to start.");
    await page.getByTestId("button-send").click();

    await expect(page.getByText("Hey Kuro-chan, I have an idea but I'm not sure where to start.")).toBeVisible();
    await expect(page.getByText(/Hey there!.*Tell me what you're imagining/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("button-stop")).toHaveCount(0);
    expect(requests).toBe(1);
  });

  test("shows a provider error instead of pretending a reply succeeded", async ({ page }) => {
    await page.route("https://text.pollinations.ai/openai/chat/completions", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "authorization, content-type",
          },
        });
        return;
      }

      await route.fulfill({
        status: 400,
        headers: {
          "access-control-allow-origin": "*",
          "content-type": "application/json",
        },
        body: JSON.stringify({ error: { message: "Test provider is temporarily unavailable." } }),
      });
    });

    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await page.getByTestId("input-message").fill("Can you help me make a tiny app?");
    await page.getByTestId("button-send").click();

    await expect(page.getByText(/Test provider is temporarily unavailable/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/NO_KEYS/)).toHaveCount(0);
    await expect(page.getByTestId("button-stop")).toHaveCount(0);
  });

  test("keeps substantial code changes behind a visible approval step", async ({ page }) => {
    await page.route("https://text.pollinations.ai/openai/chat/completions", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "authorization, content-type",
          },
        });
        return;
      }

      const event = {
        choices: [{
          delta: {
            tool_calls: [{
              index: 0,
              id: "call_brief_1",
              type: "function",
              function: {
                name: "propose_brief",
                arguments: JSON.stringify({
                  title: "Tiny habit tracker",
                  summary: "A calm, phone-friendly habit tracker.",
                  features: ["Create habits", "Mark daily progress", "See a weekly streak"],
                  design: "Warm, minimal, accessible",
                  backend: "none",
                  size: "full",
                }),
              },
            }],
          },
        }],
      };
      await route.fulfill({
        status: 200,
        headers: {
          "access-control-allow-origin": "*",
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
        },
        body: `data: ${JSON.stringify(event)}\n\ndata: [DONE]\n\n`,
      });
    });

    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await page.getByTestId("input-message").fill("I want a tiny habit tracker for my phone. Keep it calm and simple.");
    await page.getByTestId("button-send").click();

    await expect(page.getByTestId("card-brief")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Tiny habit tracker", { exact: true })).toBeVisible();
    await expect(page.getByTestId("button-build-it")).toBeVisible();
    await expect(page.getByText(/A calm, phone-friendly habit tracker/)).toBeVisible();
    // This test intentionally does not approve the brief: the user remains in control of code generation.
    await expect(page.getByTestId("button-stop")).toHaveCount(0);
  });
});
