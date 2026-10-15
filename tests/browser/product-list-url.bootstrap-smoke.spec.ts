import { expect, test } from "@playwright/test";

const sharedProductListUrl = "/products?page=2&search=keyboard&status=inactive&sort=sku&order=desc";

const product = (index: number, isActive: boolean) => ({
  uuid: `550e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}`,
  sku: `SKU-${String(index).padStart(3, "0")}`,
  name: `Producto ${String(index).padStart(3, "0")}`,
  description: null,
  purchasePrice: 25.5,
  salePrice: 31.25,
  categoryUuid: "550e8400-e29b-41d4-a716-446655440000",
  isActive,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

test("restores a shared product-list URL after reload and through browser history", async ({
  page,
}) => {
  const productRequests: URL[] = [];

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "product-url-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "product-url-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });

  await page.route("**/api/backend/products**", async (route) => {
    const url = new URL(route.request().url());
    productRequests.push(url);
    const requestedPage = Number(url.searchParams.get("page"));
    const search = url.searchParams.get("search");
    const data = search === "changed" ? [product(7, false)] : [product(16, false)];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data,
        pagination: {
          total: search === "changed" ? 1 : 16,
          page: requestedPage,
          limit: 15,
        },
      }),
    });
  });

  await page.goto(sharedProductListUrl);
  await expect(page.getByRole("cell", { name: "SKU-016" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Buscar productos" })).toHaveValue("keyboard");
  await expect(page.getByRole("textbox", { name: "Estado del producto" })).toHaveValue("Inactivos");
  await expect(page.getByRole("textbox", { name: "Ordenar por" })).toHaveValue("SKU");
  await expect(page.getByRole("textbox", { name: "Dirección del orden" })).toHaveValue(
    "Descendente",
  );
  const requestsBeforeReload = productRequests.length;

  await page.reload();
  await expect(page).toHaveURL(new RegExp(`${sharedProductListUrl.replaceAll("?", "\\?")}$`));
  await expect(page.getByRole("cell", { name: "SKU-016" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Buscar productos" })).toHaveValue("keyboard");
  await expect.poll(() => productRequests.length).toBeGreaterThan(requestsBeforeReload);

  await page.getByRole("searchbox", { name: "Buscar productos" }).fill(" changed ");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(
    /\/products\?page=1&search=changed&status=inactive&sort=sku&order=desc$/,
  );
  await expect(page.getByRole("cell", { name: "SKU-007" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(sharedProductListUrl);
  await expect(page.getByRole("searchbox", { name: "Buscar productos" })).toHaveValue("keyboard");
  await expect(page.getByRole("cell", { name: "SKU-016" })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(
    /\/products\?page=1&search=changed&status=inactive&sort=sku&order=desc$/,
  );
  await expect(page.getByRole("searchbox", { name: "Buscar productos" })).toHaveValue("changed");
  await expect(page.getByRole("cell", { name: "SKU-007" })).toBeVisible();
});

test("replaces invalid list parameters instead of adding a browser history entry", async ({
  page,
}) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "product-url-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "product-url-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });
  await page.route("**/api/backend/products**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], pagination: { total: 0, page: 1, limit: 15 } }),
    });
  });

  await page.goto("/");
  await page.goto("/products?page=0&search=%20%20&status=archived&sort=unknown&order=sideways");
  await expect(page).toHaveURL(/\/products\?page=1&status=active&sort=name&order=asc$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();
});
