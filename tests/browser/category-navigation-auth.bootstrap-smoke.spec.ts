import { expect, test } from "@playwright/test";

const category = {
  uuid: "550e8400-e29b-41d4-a716-446655440071",
  name: "Categoría visible para VIEWER",
  description: "El backend conserva la autoridad sobre las operaciones.",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("keeps category navigation and actions visible for an authenticated VIEWER", async ({
  page,
}) => {
  let sessionRequests = 0;
  let categoryListRequests = 0;

  await page.setViewportSize({ width: 360, height: 800 });
  await page.route("**/api/auth/get-session", async (route) => {
    sessionRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "viewer-navigation-user", email: "viewer@example.com", role: "VIEWER" },
          session: { id: "viewer-navigation-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });
  await page.route("**/api/backend/categories**", async (route) => {
    categoryListRequests += 1;
    expect(route.request().method()).toBe("GET");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [category], pagination: { total: 1, page: 1, limit: 15 } }),
    });
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();
  await expect(page.getByRole("banner")).toContainText("viewer@example.com");

  await page.getByRole("button", { name: "Abrir navegación" }).click();
  const drawer = page.getByRole("dialog", { name: "Navegación principal" });
  const navigation = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(navigation.getByRole("link")).toHaveText([
    "Inicio",
    "Productos",
    "Categorías",
    "Inventario",
  ]);
  await navigation.getByRole("link", { name: "Categorías", exact: true }).click();

  const categoryHeading = page.getByRole("heading", { level: 1, name: "Categorías" });
  await expect(page).toHaveURL("/categories");
  await expect(drawer).toBeHidden();
  await expect(categoryHeading).toBeFocused();

  const categoryRow = page.getByRole("row").filter({ hasText: category.name });
  await expect(categoryRow).toBeVisible();
  await expect(categoryRow.getByRole("button", { name: "Editar" })).toBeEnabled();
  await expect(categoryRow.getByRole("button", { name: "Desactivar" })).toBeEnabled();
  expect(sessionRequests).toBe(1);
  expect(categoryListRequests).toBeGreaterThan(0);
});
