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

  const productRow = page.locator('[role="row"]').filter({ hasText: "SKU-001" });
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

test("keeps the product active until the backend confirms deactivation", async ({ page }) => {
  let releaseMutation!: () => void;
  const mutationGate = new Promise<void>((resolve) => {
    releaseMutation = resolve;
  });
  let listRequests = 0;
  let statusMutationRequests = 0;
  let deactivationConfirmed = false;

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
      listRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: deactivationConfirmed ? [] : [product(1, true)],
          pagination: { total: deactivationConfirmed ? 0 : 1, page: 1, limit: 15 },
        }),
      });
      return;
    }

    statusMutationRequests += 1;
    await mutationGate;
    deactivationConfirmed = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { uuid: product(1, true).uuid, isActive: false } }),
    });
  });

  await page.goto("/products?page=1&search=SKU-001&status=active&sort=sku&order=desc");

  const productRow = page.locator('[role="row"]').filter({ hasText: "SKU-001" });
  await expect(productRow).toBeVisible();
  const initialListRequests = listRequests;
  await productRow.getByRole("button", { name: "Desactivar" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirmar desactivación" });
  await dialog.getByRole("button", { name: "Desactivar" }).click();

  const pendingButton = dialog.getByRole("button", { name: "Desactivando…" });
  await expect(pendingButton).toBeDisabled();
  await expect(dialog.getByRole("status")).toContainText("Desactivando producto SKU-001");
  await expect(productRow).toContainText("Activo");
  await expect.poll(() => statusMutationRequests).toBe(1);
  expect(listRequests).toBe(initialListRequests);

  releaseMutation();

  await expect(
    page.getByRole("status").filter({ hasText: "Producto desactivado correctamente." }),
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("No se encontraron productos con esta búsqueda.")).toBeVisible();
  expect(statusMutationRequests).toBe(1);
  expect(listRequests).toBe(initialListRequests + 1);
});

test("offers a manual retry after a recoverable status failure while the product remains listed", async ({
  page,
}) => {
  let listRequests = 0;
  let statusMutationRequests = 0;
  let deactivationConfirmed = false;

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
    if (route.request().method() === "GET") {
      listRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: deactivationConfirmed ? [] : [product(1, true)],
          pagination: { total: deactivationConfirmed ? 0 : 1, page: 1, limit: 15 },
        }),
      });
      return;
    }

    statusMutationRequests += 1;
    if (statusMutationRequests === 1) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "INTERNAL_ERROR", message: "Internal server details" },
        }),
      });
      return;
    }

    deactivationConfirmed = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { uuid: product(1, true).uuid, isActive: false } }),
    });
  });

  await page.goto("/products");

  const productRow = page.locator('[role="row"]').filter({ hasText: "SKU-001" });
  await expect(productRow).toBeVisible();
  const initialListRequests = listRequests;
  await productRow.getByRole("button", { name: "Desactivar" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirmar desactivación" });
  await dialog.getByRole("button", { name: "Desactivar" }).click();

  await expect(dialog.getByRole("alert")).toContainText(
    "No se pudo confirmar el resultado del cambio de estado.",
  );
  await expect(dialog.getByRole("alert")).not.toContainText("Internal server details");
  await expect(dialog.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await expect(productRow).toContainText("Activo");
  expect(statusMutationRequests).toBe(1);
  expect(listRequests).toBe(initialListRequests);

  await dialog.getByRole("button", { name: "Reintentar" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "Producto desactivado correctamente." }),
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("No hay productos activos para mostrar.")).toBeVisible();
  expect(statusMutationRequests).toBe(2);
  expect(listRequests).toBe(initialListRequests + 1);
});
