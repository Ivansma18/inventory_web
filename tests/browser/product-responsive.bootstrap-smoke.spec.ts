import { expect, test, type Locator, type Page } from "@playwright/test";

const productUuid = "550e8400-e29b-41d4-a716-446655440001";
const categoryUuid = "550e8400-e29b-41d4-a716-446655440000";

const product = {
  uuid: productUuid,
  sku: "SKU-RESPONSIVE-001",
  name: "Producto de prueba responsive",
  description: "Producto simulado para revisar el diseño responsive.",
  purchasePrice: 25.5,
  salePrice: 31.25,
  categoryUuid,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockProductApi = async (page: Page) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "product-responsive-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "product-responsive-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });

  await page.route("**/api/backend/categories**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            uuid: categoryUuid,
            name: "Categoría de prueba",
            description: null,
            isActive: true,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        pagination: { total: 1, page: 1, limit: 15 },
      }),
    });
  });

  await page.route("**/api/backend/products**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const isDetailRequest = requestUrl.pathname.endsWith(`/${productUuid}`);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        isDetailRequest
          ? { data: product }
          : { data: [product], pagination: { total: 1, page: 1, limit: 15 } },
      ),
    });
  });
};

const expectNoHorizontalDocumentOverflow = async (page: Page) => {
  const dimensions = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));

  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
};

const expectActionWithinViewport = async (action: Locator, width: number) => {
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeVisible();
  const box = await action.boundingBox();

  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width);
};

// 640px is a viewport equivalent for a 1280px window at 200% zoom, not native zoom.
for (const width of [360, 640, 768, 1280]) {
  test(`keeps product list and forms usable at ${width}px${width === 640 ? " (200% zoom viewport equivalent)" : ""}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockProductApi(page);

    await page.goto("/products");
    await expect(page.getByRole("heading", { level: 1, name: "Productos" })).toBeVisible();
    await expect(page.getByRole("cell", { name: product.sku })).toBeVisible();
    await expectNoHorizontalDocumentOverflow(page);

    const tableRegion = page.locator(".ui-data-table-viewport");
    if (width <= 768) {
      const getLocalScrollState = () =>
        tableRegion.evaluate((element) => {
          const candidates = [element, ...element.querySelectorAll<HTMLElement>("*")];
          const scrollable = candidates.filter((candidate) => {
            const overflowX = getComputedStyle(candidate).overflowX;
            return candidate.scrollWidth > candidate.clientWidth && /auto|scroll/.test(overflowX);
          });

          return {
            hasLocalOverflow: scrollable.length > 0,
            hasLocalScrollMovement: scrollable.some((candidate) => candidate.scrollLeft > 0),
          };
        });

      await expect.poll(getLocalScrollState).toMatchObject({ hasLocalOverflow: true });
      await tableRegion.hover();
      await page.mouse.wheel(700, 0);
      await expect.poll(getLocalScrollState).toMatchObject({ hasLocalScrollMovement: true });
    }

    const editAction = page.getByRole("button", { name: "Editar" }).first();
    await expectActionWithinViewport(editAction, width);
    await expectActionWithinViewport(
      page.getByRole("button", { name: "Desactivar" }).first(),
      width,
    );
    await expectNoHorizontalDocumentOverflow(page);
    await editAction.scrollIntoViewIfNeeded();
    await editAction.click();

    await expect(page).toHaveURL(new RegExp(`/products/${productUuid}/edit`));
    await expect(page.getByRole("heading", { level: 1, name: "Editar producto" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "SKU (obligatorio)" })).toHaveValue(product.sku);
    await expectNoHorizontalDocumentOverflow(page);
    await expectActionWithinViewport(page.getByRole("button", { name: "Guardar cambios" }), width);
    await expectActionWithinViewport(page.getByRole("button", { name: "Cancelar" }), width);

    await page.goto("/products/new");
    await expect(page.getByRole("heading", { level: 1, name: "Crear producto" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "SKU (obligatorio)" })).toBeVisible();
    await expectNoHorizontalDocumentOverflow(page);
    await expectActionWithinViewport(page.getByRole("button", { name: "Crear producto" }), width);
  });
}
