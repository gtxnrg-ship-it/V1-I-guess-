import { test, expect } from "@playwright/test";

test.describe("Kuro-chan studio", () => {
  test("loads the engineering workspace and isolated live preview", async ({ page }) => {
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
    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("sidebar-preview").click();
    await expect(page.getByTestId("project-preview")).toBeVisible();
    const previewFrame = page.getByTestId("project-preview-frame");
    await expect(previewFrame).toBeVisible({ timeout: 10_000 });
    await expect(previewFrame).toHaveAttribute("sandbox", "allow-scripts");
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
    await page.getByTestId("sidebar-preview").click();
    await expect(page.getByTestId("project-preview-frame")).toBeVisible({ timeout: 10_000 });
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


  test("persists a new project's conversation across an app reload", async ({ page }) => {
    const userMessage = "Persistence acceptance check: keep this garden plan after reload.";
    const assistantReply = "Saved in this project workspace; we can continue the garden plan.";

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
        status: 200,
        headers: {
          "access-control-allow-origin": "*",
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
        },
        body: [
          `data: ${JSON.stringify({ choices: [{ delta: { content: assistantReply } }] })}`,
          "",
          "data: [DONE]",
          "",
        ].join("\n"),
      });
    });

    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await page.getByTestId("sidebar-projects").click();
    await page.getByTestId("button-projects-new").click();
    await expect(page.getByTestId("input-message")).toBeVisible();

    await page.getByTestId("input-message").fill(userMessage);
    await page.getByTestId("button-send").click();
    await expect(page.getByText(userMessage)).toBeVisible();
    await expect(page.getByText(assistantReply)).toBeVisible({ timeout: 10_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("input-message")).toBeVisible();
    await expect(page.getByText(userMessage)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(assistantReply)).toBeVisible();
  });

  test("handles two natural turns in one conversation without dropping or duplicating messages", async ({ page }) => {
    let requests = 0;
    const payloads = [];
    const replies = [
      "Ooh, a tiny garden planner. Let's keep the first version simple and lovely.",
      "Nice, then we'll add sunlight reminders as the next small feature.",
    ];

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

      payloads.push(route.request().postDataJSON());
      const index = requests++;
      const reply = replies[index] ?? "I received the extra turn.";
      await route.fulfill({
        status: 200,
        headers: {
          "access-control-allow-origin": "*",
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
        },
        body: [
          `data: ${JSON.stringify({ choices: [{ delta: { content: reply } }] })}`,
          "",
          "data: [DONE]",
          "",
        ].join("\n"),
      });
    });

    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    const composer = page.getByTestId("input-message");

    await composer.fill("I'm thinking of a tiny garden planner.");
    await page.getByTestId("button-send").click();
    await expect(page.getByText(replies[0], { exact: true })).toBeVisible({ timeout: 10_000 });

    await composer.fill("Could we add sunlight reminders later?");
    await page.getByTestId("button-send").click();
    await expect(page.getByText(replies[1], { exact: true })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText("I'm thinking of a tiny garden planner.", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Could we add sunlight reminders later?", { exact: true })).toHaveCount(1);
    await expect(page.getByText(replies[0], { exact: true })).toHaveCount(1);
    await expect(page.getByText(replies[1], { exact: true })).toHaveCount(1);
    expect(requests).toBe(2);
    const secondTurnMessages = payloads[1]?.messages ?? [];
    expect(secondTurnMessages.some((message) => message.role === "user" && String(message.content).includes("tiny garden planner"))).toBe(true);
    expect(secondTurnMessages.some((message) => message.role === "assistant" && String(message.content).includes("first version simple and lovely"))).toBe(true);
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

  test("saves conversation personality preferences and keeps them after navigation", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await page.getByTestId("sidebar-settings").click();
    await page.getByRole("button", { name: /Personality & chat/i }).click();

    const playfulness = page.getByRole("slider", { name: "Playfulness" });
    await expect(playfulness).toHaveValue("2");
    await playfulness.focus();
    await playfulness.press("End");
    await page.getByLabel("Reply length").selectOption("detailed");
    const memory = page.getByRole("switch", { name: "Use saved project memory" });
    await memory.click();
    await expect(memory).toHaveAttribute("aria-checked", "false");

    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("sidebar-projects").click();
    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("sidebar-settings").click();
    await page.getByRole("button", { name: /Personality & chat/i }).click();

    await expect(page.getByRole("slider", { name: "Playfulness" })).toHaveValue("3");
    await expect(page.getByLabel("Reply length")).toHaveValue("detailed");
    await expect(page.getByRole("switch", { name: "Use saved project memory" })).toHaveAttribute("aria-checked", "false");
  });

  test("exposes the local voice option and makes offline preference functional", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await page.getByTestId("sidebar-settings").click();
    await page.getByRole("button", { name: /Voice & speech/i }).click();

    const provider = page.getByLabel("Voice output provider");
    await expect(provider.locator("option[value='kokoro']")).toHaveText("Local Kokoro voice");
    await provider.selectOption("kokoro");
    await expect(page.getByLabel("Kokoro voice")).toHaveValue("af_heart");
    await page.getByLabel("Kokoro voice").selectOption("af_bella");
    await expect(page.getByLabel("Kokoro voice")).toHaveValue("af_bella");

    const offline = page.getByRole("switch", { name: "Prefer offline voice" });
    await expect(offline).toHaveAttribute("aria-checked", "true");
    await offline.click();
    await expect(provider).toHaveValue("browser");
    await expect(offline).toHaveAttribute("aria-checked", "false");

    // Exercise the actual settings surface and verify the preferences survive a full reload.
    await provider.selectOption("openai");
    await page.getByLabel("Speech speed").fill("1.15");
    const autoSpeak = page.getByRole("switch", { name: "Speak completed replies" });
    await autoSpeak.click();
    const autoSend = page.getByRole("switch", { name: "Auto-send recognized voice turns" });
    await autoSend.click();
    await expect(autoSpeak).toHaveAttribute("aria-checked", "false");
    await expect(autoSend).toHaveAttribute("aria-checked", "true");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByTestId("sidebar-settings").click();
    await page.getByRole("button", { name: /Voice & speech/i }).click();
    await expect(page.getByLabel("Voice output provider")).toHaveValue("openai");
    await expect(page.getByLabel("Speech speed")).toHaveValue("1.15");
    await expect(page.getByRole("switch", { name: "Speak completed replies" })).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("switch", { name: "Auto-send recognized voice turns" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByLabel("Kokoro voice")).toHaveCount(0);
  });

  test("auto-sends a spoken turn when browser speech recognition ends", async ({ page }) => {
    await page.addInitScript(() => {
      class MockRecognition {
        onstart = null;
        onresult = null;
        onend = null;
        onerror = null;
        lang = "en-US";
        continuous = true;
        interimResults = true;
        maxAlternatives = 1;
        start() { window.__kuroMockRecognition = this; this.onstart?.(); }
        stop() { this.onend?.(); }
        abort() { this.onend?.(); }
        emitTranscript(text) { this.onresult?.({ results: [{ 0: { transcript: text }, length: 1 }] }); }
        finish() { this.onend?.(); }
      }
      window.SpeechRecognition = MockRecognition;
      window.webkitSpeechRecognition = MockRecognition;
      const synthesis = window.speechSynthesis;
      if (synthesis) synthesis.speak = (utterance) => { utterance.onstart?.(); utterance.onend?.(); };
    });
    let providerRequests = 0;
    await page.route("https://text.pollinations.ai/openai/chat/completions", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "authorization, content-type" } });
        return;
      }
      providerRequests += 1;
      const event = { choices: [{ delta: { tool_calls: [{ index: 0, id: "call_voice_brief", type: "function", function: { name: "propose_brief", arguments: JSON.stringify({ title: "Tiny voice demo", summary: "A tiny app requested by voice.", features: ["One screen", "Large controls"], design: "Calm and accessible", backend: "none", size: "full" }) } }] } }] };
      const body = "data: " + JSON.stringify(event) + "\n\ndata: [DONE]\n\n";
      await route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" }, body });
    });

    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await page.getByTestId("sidebar-settings").click();
    await page.getByRole("button", { name: /Voice & speech/i }).click();
    await page.getByRole("switch", { name: "Auto-send recognized voice turns" }).click();
    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId(/^sidebar-project-/).first().click();
    await expect(page.getByTestId("button-mic")).toHaveAttribute("aria-label", "Speak and send when finished");

    await page.getByTestId("button-mic").click();
    await page.evaluate(() => window.__kuroMockRecognition.emitTranscript("I want a tiny voice demo app"));
    await expect(page.getByText("I want a tiny voice demo app")).toBeVisible({ timeout: 10_000 });
    // End the turn through the same mic-stop path a phone user can tap.
    await page.getByTestId("button-mic").click();

    await expect(page.getByText("I want a tiny voice demo app")).toBeVisible({ timeout: 10_000 });
    await expect.poll(() => providerRequests, { timeout: 10_000 }).toBeGreaterThan(0);
  });

  test("creates and restores a checkpoint safely", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await page.getByTestId("sidebar-checkpoints").click();
    await expect(page.getByRole("heading", { name: "Checkpoints", exact: true })).toBeVisible();

    await page.locator("#checkpoint-label").fill("Before recovery test");
    await page.getByRole("button", { name: "Save checkpoint" }).click();

    const checkpoint = page.locator("article").filter({ hasText: "Before recovery test" });
    await expect(checkpoint).toBeVisible();
    await checkpoint.getByRole("button", { name: "Restore" }).click();
    await expect(checkpoint.getByText(/Replace current files\?/)).toBeVisible();
    await checkpoint.getByRole("button", { name: "Confirm restore" }).click();

    await expect(page.getByText("Before restore", { exact: true })).toBeVisible();
    await expect(page.getByText(/A safety checkpoint of the previous files was created first/)).toBeVisible();
  });

  test("does not invent a RAM estimate when the browser hides device memory", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "deviceMemory", { configurable: true, value: undefined });
    });
    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await page.getByTestId("sidebar-settings").click();
    await page.getByRole("button", { name: /AI & models/i }).click();

    const ram = page.getByTestId("local-model-ram");
    await expect(ram).toHaveValue("unknown");
    await expect(page.getByTestId("local-model-recommendation")).toContainText("Memory information isn't exposed");
    await ram.selectOption("4");
    await expect(page.getByTestId("local-model-recommendation")).toContainText("Try tiny models first");

    await page.getByRole("button", { name: "Red" }).click();
    await expect(page.getByTestId("local-model-qwen3-4b")).toBeVisible();
    await expect(page.getByTestId("local-model-qwen3-0.6b")).toHaveCount(0);
  });

  test("detects a seeded syntax failure, repairs it, and verifies the repaired app", async ({ page }) => {
    let requestCount = 0;
    const eventStream = (event) => "data: " + JSON.stringify(event) + "\n\ndata: [DONE]\n\n";
    const toolEvent = (id, name, args) => ({
      choices: [{ delta: { tool_calls: [{
        index: 0, id, type: "function",
        function: { name, arguments: JSON.stringify(args) },
      }] } }],
    });
    const brief = toolEvent("call_repair_brief", "propose_brief", {
      title: "Failure recovery smoke test",
      summary: "Create a tiny app, catch an intentional syntax error, and repair it.",
      features: ["One small screen"],
      design: "Minimal and clear",
      backend: "none",
      size: "full",
    });
    const research = toolEvent("call_repair_research", "save_research", {
      notes: "This is a controlled recovery test. No dependencies or backend are needed.",
    });
    const plan = toolEvent("call_repair_plan", "submit_plan", {
      title: "Build and verify one screen",
      steps: [{
        title: "Create the screen",
        detail: "Write src/App.tsx, then verify and repair any syntax error.",
        files: ["src/App.tsx"],
      }],
    });
    const broken = toolEvent("call_seed_broken_file", "write_file", {
      path: "src/App.tsx",
      content: "export default function App() { return <main>; }",
    });
    const verify = toolEvent("call_verify_seeded_failure", "verify_project", {});
    const repaired = toolEvent("call_repair_file", "write_file", {
      path: "src/App.tsx",
      content: "export default function App() { return <main>Repair succeeded</main>; }",
    });
    const verifyClean = toolEvent("call_verify_repaired_app", "verify_project", {});
    const finalReply = {
      choices: [{ delta: { content: "I caught the seeded syntax error, repaired the screen, and verified the result." } }],
    };

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

      requestCount += 1;
      const events = [brief, research, plan, broken, verify, repaired, verifyClean, finalReply];
      const event = events[requestCount - 1] || finalReply;
      await route.fulfill({
        status: 200,
        headers: {
          "access-control-allow-origin": "*",
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
        },
        body: eventStream(event),
      });
    });

    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await page.getByTestId("input-message").fill("Build a tiny screen. If the first version has an error, fix it and verify the final result.");
    await page.getByTestId("button-send").click();
    await expect(page.getByTestId("button-build-it")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("button-build-it").click();

    await expect(page.getByText(/BUILD ERRORS:/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Builds and runs cleanly.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/I caught the seeded syntax error, repaired the screen/)).toBeVisible({ timeout: 30_000 });
    // The ninth request is the final Talker wrap-up after the pipeline's own final QA pass.
    expect(requestCount).toBe(9);

    await page.getByTestId("sidebar-preview").click();
    const preview = page.frameLocator('[data-testid="project-preview-frame"]');
    await expect(preview.getByText("Repair succeeded")).toBeVisible({ timeout: 10_000 });
  });

});
