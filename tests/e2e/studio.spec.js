import { test, expect } from "@playwright/test";

test.describe("Kuro-chan studio", () => {
  test("loads the engineering workspace without a live-preview feature", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("input-message")).toBeVisible();
    await expect(page.getByTestId("button-publish")).toBeVisible();
    await expect(page.getByTestId("tab-code")).toBeVisible();
    await expect(page.getByTestId("tab-keys")).toBeVisible();
    await expect(page.getByTestId("tab-delivery")).toBeVisible();
    await expect(page.getByTestId("local-models-pane")).toBeVisible();
    await expect(page.getByTestId("tab-preview")).toHaveCount(0);
    await expect(page.getByTestId("iframe-preview")).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test("keeps chat, source inspection, and settings reachable on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/studio", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("input-message")).toBeVisible();
    await expect(page.getByTestId("tab-mobile-code")).toBeVisible();
    await expect(page.getByTestId("tab-mobile-keys")).toBeVisible();
    await expect(page.getByTestId("tab-mobile-delivery")).toBeVisible();
    await expect(page.getByTestId("tab-mobile-preview")).toHaveCount(0);
    await page.getByTestId("tab-mobile-code").click();
    await expect(page.getByText("Files", { exact: true })).toBeVisible();
    await page.getByTestId("tab-mobile-chat").click();
    await expect(page.getByTestId("input-message")).toBeVisible();
  });

  test("builds a persistent repository intelligence report in the delivery center", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await page.getByTestId("tab-delivery").click();
    await expect(page.getByTestId("delivery-pane")).toBeVisible();
    await page.getByTestId("button-analyze-project").click();
    await expect(page.getByText(/Analyzed \d+ files/)).toBeVisible();
    await expect(page.getByText("Available scripts")).toBeVisible();
    await expect(page.getByTestId("button-refresh-delivery")).toBeVisible();
  });

  test("exports the current project as a downloadable ZIP", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    const exportButton = page.getByTestId("button-export-zip");
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
    await page.getByTestId("button-publish").click();
    await expect(page.getByText("Add a GitHub token in Keys first")).toBeVisible();
    await expect(page.getByTestId("button-publish-open-keys")).toBeVisible();
  });

});
