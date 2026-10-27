import { expect, test } from "@playwright/test";

test("supports direct Not Found entry, reload, and browser history to Home", async ({ page }) => {
  let sessionRequests = 0;
  const notFoundUrl = /\/not-registered\?source=direct#result$/;

  await page.route("**/api/auth/get-session", async (route) => {
    sessionRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "history-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "history-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });

  await page.goto("/not-registered?source=direct#result");
  await expect(page).toHaveURL(notFoundUrl);
  await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link"),
  ).toHaveText(["Inicio", "Productos", "Categorías"]);

  await page.reload();
  await expect(page).toHaveURL(notFoundUrl);
  await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();
  expect(sessionRequests).toBe(2);

  await page.getByRole("link", { name: "Volver a Inicio" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(notFoundUrl);
  await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();
});

test("keeps the signed-out state through browser history after confirmed logout", async ({
  page,
}) => {
  let signOutRequests = 0;

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "logout-history-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "logout-history-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });
  await page.route("**/api/auth/sign-out", async (route) => {
    signOutRequests += 1;
    await route.fulfill({ status: 204 });
  });

  await page.goto("/not-registered");
  await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();
  await page.getByRole("link", { name: "Volver a Inicio" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link"),
  ).toHaveText(["Inicio", "Productos", "Categorías"]);

  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sesión no iniciada" })).toBeVisible();
  expect(signOutRequests).toBe(1);
  await expect(page.getByRole("navigation")).toHaveCount(0);

  await page.goBack();
  await expect(page).toHaveURL(/\/not-registered$/);
  await expect(page.getByRole("heading", { level: 1, name: "Sesión no iniciada" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Cerrar sesión", exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation")).toHaveCount(0);

  await page.goForward();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Sesión no iniciada" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" })).toHaveCount(
    0,
  );
  expect(signOutRequests).toBe(1);
});
