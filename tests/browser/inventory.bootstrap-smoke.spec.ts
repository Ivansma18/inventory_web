import { expect, test } from "@playwright/test";

test("renders the minimal Inventory page in Chromium", async ({ page }) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "bootstrap-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "bootstrap-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });

  await page.goto("/");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();
  await expect(page.getByText("Aquí empieza tu jornada de trabajo.")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);

  const harnessResponse = await page.request.get("/__auth-test");
  const harnessHtml = await harnessResponse.text();
  expect(harnessHtml).not.toContain("Auth test harness");
});
