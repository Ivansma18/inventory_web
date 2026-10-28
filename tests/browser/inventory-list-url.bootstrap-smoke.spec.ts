import { expect, test, type Page } from "@playwright/test";

const sharedInventoryUrl =
  "/inventory?page=2&search=desk&status=inactive&stockStatus=LOW_STOCK&sort=updatedAt&order=desc";

const inventoryItem = (index: number, name = `Desk product ${index}`) => ({
  productUuid: `550e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}`,
  sku: `DESK-${String(index).padStart(3, "0")}`,
  name,
  categoryUuid: null,
  isActive: false,
  quantity: 2,
  minimumStock: 2,
  status: "LOW_STOCK",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const mockAuthenticatedSession = async (page: Page) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "inventory-url-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "inventory-url-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });
};

test("restores a shared inventory URL after reload and through browser history", async ({
  page,
}) => {
  const inventoryRequests: URL[] = [];

  await mockAuthenticatedSession(page);
  await page.route("**/api/backend/inventory**", async (route) => {
    const url = new URL(route.request().url());
    inventoryRequests.push(url);
    const search = url.searchParams.get("search");
    const changed = search === "changed";
    const requestedPage = Number(url.searchParams.get("page"));

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [inventoryItem(changed ? 1 : 16, changed ? "Changed inventory item" : undefined)],
        pagination: {
          total: changed ? 1 : 16,
          page: requestedPage,
          limit: 15,
        },
      }),
    });
  });

  await page.goto(sharedInventoryUrl);
  await expect(page.getByRole("row", { name: /DESK-016/ })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Buscar productos" })).toHaveValue("desk");
  await expect(page.getByRole("textbox", { name: "Actividad del producto" })).toHaveValue(
    "Inactivos",
  );
  await expect(page.getByRole("textbox", { name: "Estado de existencias" })).toHaveValue(
    "Stock bajo",
  );
  await expect(page.getByRole("textbox", { name: "Ordenar por" })).toHaveValue(
    "Fecha de actualización",
  );
  await expect(page.getByRole("textbox", { name: "Dirección del orden" })).toHaveValue(
    "Descendente",
  );
  expect(Object.fromEntries(inventoryRequests[0]!.searchParams)).toEqual({
    page: "2",
    limit: "15",
    search: "desk",
    isActive: "false",
    status: "LOW_STOCK",
    sort: "updatedAt",
    order: "desc",
  });

  const requestsBeforeReload = inventoryRequests.length;
  await page.reload();
  await expect(page).toHaveURL(sharedInventoryUrl);
  await expect(page.getByRole("row", { name: /DESK-016/ })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Buscar productos" })).toHaveValue("desk");
  await expect(page.getByRole("textbox", { name: "Actividad del producto" })).toHaveValue(
    "Inactivos",
  );
  await expect(page.getByRole("textbox", { name: "Estado de existencias" })).toHaveValue(
    "Stock bajo",
  );
  await expect(page.getByRole("textbox", { name: "Ordenar por" })).toHaveValue(
    "Fecha de actualización",
  );
  await expect(page.getByRole("textbox", { name: "Dirección del orden" })).toHaveValue(
    "Descendente",
  );
  await expect.poll(() => inventoryRequests.length).toBeGreaterThan(requestsBeforeReload);

  await page.getByRole("searchbox", { name: "Buscar productos" }).fill(" changed ");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(
    /\/inventory\?page=1&search=changed&status=inactive&stockStatus=LOW_STOCK&sort=updatedAt&order=desc$/,
  );
  await expect(page.getByRole("row", { name: /DESK-001/ })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(sharedInventoryUrl);
  await expect(page.getByRole("searchbox", { name: "Buscar productos" })).toHaveValue("desk");
  await expect(page.getByRole("textbox", { name: "Actividad del producto" })).toHaveValue(
    "Inactivos",
  );
  await expect(page.getByRole("textbox", { name: "Estado de existencias" })).toHaveValue(
    "Stock bajo",
  );
  await expect(page.getByRole("textbox", { name: "Ordenar por" })).toHaveValue(
    "Fecha de actualización",
  );
  await expect(page.getByRole("textbox", { name: "Dirección del orden" })).toHaveValue(
    "Descendente",
  );
  await expect(page.getByRole("row", { name: /DESK-016/ })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(
    /\/inventory\?page=1&search=changed&status=inactive&stockStatus=LOW_STOCK&sort=updatedAt&order=desc$/,
  );
  await expect(page.getByRole("searchbox", { name: "Buscar productos" })).toHaveValue("changed");
  await expect(page.getByRole("row", { name: /DESK-001/ })).toBeVisible();
});

test("normalizes invalid and duplicate criteria with replace without resetting valid page state", async ({
  page,
}) => {
  const inventoryRequests: URL[] = [];

  await mockAuthenticatedSession(page);
  await page.route("**/api/backend/inventory**", async (route) => {
    const url = new URL(route.request().url());
    inventoryRequests.push(url);
    const requestedPage = Number(url.searchParams.get("page"));

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [inventoryItem(16)],
        pagination: { total: 16, page: requestedPage, limit: 15 },
      }),
    });
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();

  await page.goto(
    "/inventory?page=2&search=desk&search=chair&status=archived&stockStatus=LOW_STOCK&sort=unknown&order=desc",
  );
  const canonicalUrl = "/inventory?page=2&status=active&stockStatus=LOW_STOCK&sort=name&order=desc";
  await expect(page).toHaveURL(new RegExp(`${canonicalUrl.replaceAll("?", "\\?")}$`));
  await expect(page.getByRole("row", { name: /DESK-016/ })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Buscar productos" })).toHaveValue("");
  await expect(page.getByRole("textbox", { name: "Actividad del producto" })).toHaveValue(
    "Activos",
  );
  await expect(page.getByRole("textbox", { name: "Estado de existencias" })).toHaveValue(
    "Stock bajo",
  );
  await expect(page.getByRole("textbox", { name: "Ordenar por" })).toHaveValue("Nombre");
  await expect(page.getByRole("textbox", { name: "Dirección del orden" })).toHaveValue(
    "Descendente",
  );
  expect(inventoryRequests.length).toBeGreaterThan(0);
  for (const request of inventoryRequests) {
    expect(Object.fromEntries(request.searchParams)).toEqual({
      page: "2",
      limit: "15",
      isActive: "true",
      status: "LOW_STOCK",
      sort: "name",
      order: "desc",
    });
  }

  await page.goBack({ waitUntil: "commit" });
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`${canonicalUrl.replaceAll("?", "\\?")}$`));
  await expect(page.getByRole("row", { name: /DESK-016/ })).toBeVisible();
});
