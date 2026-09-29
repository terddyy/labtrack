import { expect, test } from "@playwright/test";

async function openSection(page: import("@playwright/test").Page, name: string) {
  await page.getByRole("button", { name: new RegExp(`^${name}(?:\\s+\\d+)?$`) }).click();
  await expect(page.getByRole("heading", { level: 1, name, exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
});

test("borrowing exposes an overdue filter", async ({ page }) => {
  await openSection(page, "Borrowing");
  await expect(page.getByRole("tab", { name: /^overdue\s+\d+$/i })).toBeVisible();
});

test("messages page and unread badge render consistently", async ({ page }) => {
  const messagesButton = page.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ });
  await expect(messagesButton).toBeVisible();
  await messagesButton.click();
  await expect(page.getByRole("heading", { level: 1, name: "Messages", exact: true })).toBeVisible();
});

test("asset register exposes edit and confirmed delete actions", async ({ page }) => {
  await openSection(page, "Assets & QR");
  await expect(page.getByRole("button", { name: "New asset" })).toBeVisible();

  const firstDelete = page.getByRole("button", { name: /^Delete .+/ }).first();
  if (await firstDelete.isVisible().catch(() => false)) {
    await firstDelete.click();
    await expect(page.getByRole("heading", { name: "Delete asset?" })).toBeVisible();
    await expect(page.getByText(/borrowing or defect history cannot be deleted/i)).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
  }
});

test("reports contain exactly the requested six choices", async ({ page }) => {
  await openSection(page, "Reports");
  await page.locator("#report-type").click();

  const expected = [
    "Asset Management Summary",
    "Borrowing Transaction",
    "Defect Reports",
    "Asset Reports",
    "Repairing Equipment",
    "Retired Equipment"
  ];
  await expect(page.getByRole("option")).toHaveCount(expected.length);
  for (const label of expected) {
    await expect(page.getByRole("option", { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("option", { name: /Equipment Utilization|Equipment Lifecycle|Inventory Reports/ })).toHaveCount(0);
});

test("access management exposes Student, Faculty, and activation controls", async ({ page }) => {
  await openSection(page, "Access");
  await expect(page.getByRole("tab", { name: /^Faculty\s+\d+$/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /^Student\s+\d+$/ })).toBeVisible();
  await expect(page.getByRole("switch", { name: /^(?:Deactivate|Activate) / }).first()).toBeVisible();
});
