import { expect, test } from "@playwright/test";

const sharedCategoryListUrl =
  "/categories?page=2&search=oficina&status=inactive&sort=updatedAt&order=desc";

const category = (name: string) => ({
  uuid: "550e8400-e29b-41d4-a716-446655440016",
  name,
  description: null,
  isActive: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
});

test("restores a shared category-list URL after reload and through browser history", async ({
  page,
}) => {
  const categoryRequests: URL[] = [];

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "category-url-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "category-url-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });

  await page.route("**/api/backend/categories**", async (route) => {
    const url = new URL(route.request().url());
    categoryRequests.push(url);
    const search = url.searchParams.get("search");
    const changed = search === "changed";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [category(changed ? "Categoría changed" : "Oficina en página dos")],
        pagination: {
          total: changed ? 1 : 16,
          page: Number(url.searchParams.get("page")),
          limit: 15,
        },
      }),
    });
  });

  await page.goto(sharedCategoryListUrl);
  await expect(page.getByRole("row", { name: /Oficina en página dos/ })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Buscar categorías" })).toHaveValue("oficina");
  await expect(page.getByRole("textbox", { name: "Estado de categoría" })).toHaveValue("Inactivas");
  await expect(page.getByRole("textbox", { name: "Ordenar por" })).toHaveValue(
    "Fecha de actualización",
  );
  await expect(page.getByRole("textbox", { name: "Dirección del orden" })).toHaveValue(
    "Descendente",
  );
  expect(Object.fromEntries(categoryRequests[0]!.searchParams)).toEqual({
    page: "2",
    limit: "15",
    search: "oficina",
    isActive: "false",
    sort: "updatedAt",
    order: "desc",
  });
  const requestsBeforeReload = categoryRequests.length;

  await page.reload();
  await expect(page).toHaveURL(sharedCategoryListUrl);
  await expect(page.getByRole("row", { name: /Oficina en página dos/ })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Buscar categorías" })).toHaveValue("oficina");
  await expect.poll(() => categoryRequests.length).toBeGreaterThan(requestsBeforeReload);

  await page.getByRole("searchbox", { name: "Buscar categorías" }).fill(" changed ");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(
    /\/categories\?page=1&search=changed&status=inactive&sort=updatedAt&order=desc$/,
  );
  await expect(page.getByRole("row", { name: /Categoría changed/ })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(sharedCategoryListUrl);
  await expect(page.getByRole("searchbox", { name: "Buscar categorías" })).toHaveValue("oficina");
  await expect(page.getByRole("row", { name: /Oficina en página dos/ })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(
    /\/categories\?page=1&search=changed&status=inactive&sort=updatedAt&order=desc$/,
  );
  await expect(page.getByRole("searchbox", { name: "Buscar categorías" })).toHaveValue("changed");
  await expect(page.getByRole("row", { name: /Categoría changed/ })).toBeVisible();
});

test("replaces invalid category-list criteria instead of adding a history entry", async ({
  page,
}) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "category-url-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "category-url-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });
  await page.route("**/api/backend/categories**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], pagination: { total: 0, page: 1, limit: 15 } }),
    });
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();
  await page.goto("/categories?page=0&search=%20%20&status=archived&sort=unknown&order=sideways");
  await expect(page).toHaveURL(/\/categories\?page=1&status=active&sort=name&order=asc$/);
  await expect(page.getByText("No hay categorías para mostrar.")).toBeVisible();

  await page.goBack({ waitUntil: "commit" });
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();
});
