import { expect, test } from "@playwright/test";

test.describe("controlled CRUD mutations", () => {
  const mutationTargetConfirmed = process.env.E2E_ALLOW_MUTATIONS === "true"
    && process.env.E2E_TARGET === "dedicated-test"
    && Boolean(process.env.E2E_BASE_URL);

  test.skip(
    !mutationTargetConfirmed,
    "Requires E2E_ALLOW_MUTATIONS=true, E2E_TARGET=dedicated-test, and E2E_BASE_URL for a dedicated test environment."
  );

  test("creates, edits, and deletes an asset", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const initialName = `E2E Asset ${suffix}`;
    const updatedName = `${initialName} Updated`;

    await page.goto("/");
    await page.getByRole("button", { name: "Assets & QR", exact: true }).click();
    await page.getByRole("button", { name: "New asset" }).click();
    await page.getByLabel("Asset name").fill(initialName);

    await page.locator("#category").click();
    await page.getByRole("option").first().click();
    await page.locator("#location").click();
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: "Create asset" }).click();

    await expect(page.getByText(initialName, { exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByText(initialName, { exact: true }).click();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Asset name").fill(updatedName);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: `Delete ${updatedName}`, exact: true }).click();
    await page.getByRole("button", { name: "Delete asset", exact: true }).click();
    await expect(page.getByText(updatedName, { exact: true })).toHaveCount(0, { timeout: 15_000 });
  });
});
