import { test, expect } from "@playwright/test";

test.describe("Kuro-chan studio", () => {
  test("loads the desktop studio and its main workspace", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("input-message")).toBeVisible();
    await expect(page.getByTestId("button-publish")).toBeVisible();
    await expect(page.getByTestId("tab-preview")).toBeVisible();
    await expect(page.getByTestId("iframe-preview")).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("keeps chat and preview reachable on a phone-sized viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/studio", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("input-message")).toBeVisible();
    await expect(page.getByTestId("tab-mobile-preview")).toBeVisible();
    await page.getByTestId("tab-mobile-preview").click();
    await expect(page.getByTestId("iframe-preview")).toBeVisible();
    await page.getByTestId("tab-mobile-chat").click();
    await expect(page.getByTestId("input-message")).toBeVisible();
  });

  test("renders the generated starter app inside the real preview iframe", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    const preview = page.frameLocator('[data-testid="iframe-preview"]');
    await expect(preview.locator("h1")).toBeVisible({ timeout: 30000 });
    await expect(preview.locator("h1")).toHaveText("My App");
    expect(pageErrors).toEqual([]);
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
  });

  test("explains GitHub setup before attempting to publish without credentials", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await page.getByTestId("button-publish").click();
    await expect(page.getByText("Add a GitHub token in Keys first")).toBeVisible();
    await expect(page.getByTestId("button-publish-open-keys")).toBeVisible();
  });

});
