import { expect, test, type Page } from "@playwright/test";

const initialProductUuid = "550e8400-e29b-41d4-a716-446655440041";
const createdProductUuid = "550e8400-e29b-41d4-a716-446655440043";
const categoryUuid = "550e8400-e29b-41d4-a716-446655440042";
const initialProductSku = "SKU-WORKFLOW-001";
const createdProductSku = "SKU-WORKFLOW-NEW";

interface ProductMswRequest {
  method: string;
  path: string;
  body?: unknown;
}

const getMockRequests = (page: Page) =>
  page.evaluate(() => {
    const pageWindow = window as Window & { __productMswRequests?: ProductMswRequest[] };
    return pageWindow.__productMswRequests ?? [];
  });

test("covers listing, creation, edit return, and status change through browser MSW", async ({
  page,
}) => {
  const apiOrigins: string[] = [];
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.pathname.startsWith("/api/")) {
      apiOrigins.push(requestUrl.origin);
    }
  });

  await page.goto("/__products-msw");
  await expect(page).toHaveURL(/\/products\/new$/);

  await page.getByRole("textbox", { name: "SKU (obligatorio)" }).fill(createdProductSku);
  await page
    .getByRole("textbox", { name: "Nombre (obligatorio)" })
    .fill("Producto creado desde MSW");
  await page.getByRole("textbox", { name: "Precio de compra (obligatorio)" }).fill("10.25");
  await page.getByRole("textbox", { name: "Precio de venta (obligatorio)" }).fill("12.50");

  const categorySelect = page.getByRole("textbox", { name: "Categoría (obligatorio)" });
  await expect(categorySelect).toBeEnabled();
  await categorySelect.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Crear producto" }).click();

  await expect(page).toHaveURL(/\/products\?page=1&status=active&sort=name&order=asc$/);
  await expect(page.getByRole("cell", { name: createdProductSku })).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Producto creado correctamente." }),
  ).toBeVisible();

  const listSearch = page.getByRole("searchbox", { name: "Buscar productos" });
  await listSearch.fill(initialProductSku);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(
    /\/products\?page=1&search=SKU-WORKFLOW-001&status=active&sort=name&order=asc$/,
  );

  const initialProductRow = page.getByRole("row").filter({ hasText: initialProductSku });
  await expect(initialProductRow).toBeVisible();
  await initialProductRow.getByRole("button", { name: "Editar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Editar producto" })).toBeVisible();

  const editUrl = new URL(page.url());
  expect(editUrl.pathname).toBe(`/products/${initialProductUuid}/edit`);
  expect(editUrl.searchParams.get("returnTo")).toBe(
    "/products?page=1&search=SKU-WORKFLOW-001&status=active&sort=name&order=asc",
  );

  await page
    .getByRole("textbox", { name: "Nombre (obligatorio)" })
    .fill("Producto editado desde MSW");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page).toHaveURL(
    /\/products\?page=1&search=SKU-WORKFLOW-001&status=active&sort=name&order=asc$/,
  );
  await expect(page.getByRole("row").filter({ hasText: initialProductSku })).toContainText(
    "Producto editado desde MSW",
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Producto actualizado correctamente." }),
  ).toBeVisible();

  await listSearch.fill("");
  await page.getByRole("button", { name: "Buscar" }).click();
  const createdProductRow = page.getByRole("row").filter({ hasText: createdProductSku });
  await expect(createdProductRow).toBeVisible();
  await createdProductRow.getByRole("button", { name: "Desactivar" }).click();

  const confirmation = page.getByRole("dialog", { name: "Confirmar desactivación" });
  await expect(confirmation).toContainText(createdProductSku);
  await confirmation.getByRole("button", { name: "Desactivar" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "Producto desactivado correctamente." }),
  ).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: createdProductSku })).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: initialProductSku })).toBeVisible();

  const requests = await getMockRequests(page);
  expect(requests).toContainEqual({
    method: "POST",
    path: "/api/backend/products",
    body: {
      sku: createdProductSku,
      name: "Producto creado desde MSW",
      purchasePrice: 10.25,
      salePrice: 12.5,
      categoryUuid,
    },
  });
  expect(
    requests.some(
      (request) =>
        request.method === "GET" && request.path === `/api/backend/products/${initialProductUuid}`,
    ),
  ).toBe(true);
  expect(
    requests.some(
      (request) =>
        request.method === "PATCH" &&
        request.path === `/api/backend/products/${initialProductUuid}` &&
        (request.body as { name?: string } | undefined)?.name === "Producto editado desde MSW",
    ),
  ).toBe(true);
  expect(
    requests.some(
      (request) =>
        request.method === "DELETE" &&
        request.path === `/api/backend/products/${createdProductUuid}`,
    ),
  ).toBe(true);
  expect(requests.some((request) => request.path === "/api/auth/get-session")).toBe(true);
  expect(requests.some((request) => request.path === "/api/backend/categories")).toBe(true);
  expect(apiOrigins.every((origin) => origin === new URL(page.url()).origin)).toBe(true);
});
