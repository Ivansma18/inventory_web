import { expect, test } from "@playwright/test";

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

test("confirms product identity and preserves state when a deactivation is cancelled", async ({
  page,
}) => {
  const statusMutationRequests: string[] = [];

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "product-status-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "product-status-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });

  await page.route("**/api/backend/products**", async (route) => {
    const method = route.request().method();

    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [product(1, true)],
          pagination: { total: 1, page: 1, limit: 15 },
        }),
      });
      return;
    }

    statusMutationRequests.push(method);
    await route.fulfill({ status: 204 });
  });

  await page.goto("/products");

  const productRow = page.getByRole("row", { name: /SKU-001/ });
  await expect(productRow.getByRole("button", { name: "Desactivar" })).toBeVisible();
  await productRow.getByRole("button", { name: "Desactivar" }).click();

  const dialog = page.getByRole("dialog", { name: "Confirmar desactivación" });
  await expect(dialog).toContainText("Producto 001");
  await expect(dialog).toContainText("SKU-001");
  await expect(dialog).toContainText("El producto se conservará en el catálogo");
  await dialog.getByRole("button", { name: "Cancelar" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("row", { name: /SKU-001/ })).toContainText("Activo");
  expect(statusMutationRequests).toEqual([]);
});
