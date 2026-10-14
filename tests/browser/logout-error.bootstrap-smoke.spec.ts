import { expect, test } from "@playwright/test";

test("shows the logout error without mobile overflow", async ({ page }) => {
  const width = 360;
  await page.setViewportSize({ width, height: 800 });
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "logout-error-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "logout-error-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });
  await page.route("**/api/auth/sign-out", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "INTERNAL", message: "Internal error." } }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();

  await expect(page.getByRole("alert")).toHaveText("No se pudo cerrar sesión. Inténtalo de nuevo.");
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    width,
  );
});
