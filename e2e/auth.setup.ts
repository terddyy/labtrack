import { expect, test as setup } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const authFile = path.resolve("playwright/.auth/super-admin.json");

setup("authenticate as Super Admin", async ({ page }) => {
  await page.goto("/");

  const dashboardHeading = page.getByRole("heading", { name: "Dashboard", exact: true });
  if (!(await dashboardHeading.isVisible().catch(() => false))) {
    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;
    if (!email || !password) {
      throw new Error("Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for the dedicated Super Admin test account.");
    }
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Continue" }).click();
  }

  // Reload once after client-side auth so the App Router server component
  // observes the refreshed Supabase session cookie.
  await dashboardHeading.waitFor({ state: "visible", timeout: 20_000 }).catch(() => undefined);
  if (!(await dashboardHeading.isVisible().catch(() => false))) {
    await page.reload();
  }
  await expect(dashboardHeading).toBeVisible({ timeout: 20_000 });
  await mkdir(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
