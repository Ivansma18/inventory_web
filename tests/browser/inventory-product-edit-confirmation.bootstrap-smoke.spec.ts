import { expect, test } from "@playwright/test";

const productUuid = "650e8400-e29b-41d4-a716-446655440000";
const inventoryUrl =
  "/inventory?page=1&search=monitor&status=inactive&stockStatus=LOW_STOCK&sort=sku&order=desc";
const productUrl = `/api/backend/products/${productUuid}`;

const product = (name: string) => ({
  uuid: productUuid,
  sku: "SKU-EDIT-01",
  name,
  description: null,
  purchasePrice: 125.5,
  salePrice: 189.99,
  categoryUuid: null,
  isActive: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
});

test("confirms an Inventory product edit without repeating the PATCH across responsive widths", async ({
  page,
}) => {
  let inventoryListRequests = 0;
  let patchRequests = 0;
  let patchBody: unknown;

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "inventory-edit-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "inventory-edit-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });
  await page.route("**/api/backend/inventory**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/movements")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], pagination: { total: 0, page: 1, limit: 1 } }),
      });
      return;
    }

    inventoryListRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            productUuid,
            sku: "SKU-EDIT-01",
            name: inventoryListRequests > 1 ? "Monitor actualizado" : "Monitor inactivo",
            categoryUuid: null,
            isActive: false,
            quantity: 2,
            minimumStock: 2,
            status: "LOW_STOCK",
            updatedAt: "2026-01-02T00:00:00.000Z",
          },
        ],
        pagination: { total: 1, page: 1, limit: 15 },
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
  await page.route(productUrl, async (route) => {
    if (route.request().method() === "PATCH") {
      patchRequests += 1;
      patchBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: product("Monitor actualizado") }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: product("Monitor inactivo") }),
    });
  });

  await page.goto(inventoryUrl);
  const row = page.getByRole("row", { name: /SKU-EDIT-01/ });
  await expect(row).toBeVisible();
  const inventoryRequestsBeforeEdit = inventoryListRequests;
  await row.getByRole("button", { name: "Editar" }).click();

  await page.getByRole("textbox", { name: "Nombre (obligatorio)" }).fill("Monitor actualizado");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page).toHaveURL(new RegExp(`${inventoryUrl.replaceAll("?", "\\?")}$`));
  const confirmation = page.locator(".inventory-page__edit-confirmation");
  await expect(confirmation).toHaveText("Producto actualizado correctamente.");
  await expect(page.getByRole("row", { name: /SKU-EDIT-01/ })).toContainText("Monitor actualizado");
  await expect.poll(() => inventoryListRequests).toBeGreaterThan(inventoryRequestsBeforeEdit);
  expect(patchRequests).toBe(1);
  expect(patchBody).toEqual({ name: "Monitor actualizado" });

  for (const width of [768, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(confirmation).toBeVisible();
    const confirmationBounds = await confirmation.boundingBox();
    expect(confirmationBounds).not.toBeNull();
    expect(confirmationBounds!.x).toBeGreaterThanOrEqual(0);
    expect(confirmationBounds!.x + confirmationBounds!.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  }
});
