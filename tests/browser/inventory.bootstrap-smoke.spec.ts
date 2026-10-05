import { expect, test } from "@playwright/test";

test("renders the minimal Inventory page in Chromium", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Inventory" })).toBeVisible();
  await expect(page.getByText("Frontend base para la gestión de inventario.")).toBeVisible();
});
