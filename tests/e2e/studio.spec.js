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
});
