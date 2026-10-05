import { expect, test } from "@playwright/test";

test("runs the proxy-contract browser project without an auth account", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Inventory" })).toBeVisible();
});
