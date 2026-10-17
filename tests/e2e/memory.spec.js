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
    await expect(page.getByText("Nothing saved here yet.")).toBeVisible();
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

    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("button-new-chat").click();
    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("sidebar-memory").click();
    await expect(page.getByTestId("memory-fact-0")).toHaveCount(0);

    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId(originalProject).click();
    await page.getByTestId("button-open-sidebar").click();
    await page.getByTestId("sidebar-memory").click();
    await expect(page.getByTestId("memory-fact-0")).toContainText("This memory belongs to the original project only.");
  });
});
