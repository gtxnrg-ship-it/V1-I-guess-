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

});
