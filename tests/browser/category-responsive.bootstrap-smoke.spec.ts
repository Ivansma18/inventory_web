import { expect, test, type Locator, type Page } from "@playwright/test";

const categoryUuid = "550e8400-e29b-41d4-a716-446655440031";
const categoriesPath = "/api/backend/categories";

const category = {
  uuid: categoryUuid,
  name: "Herramientas de mantenimiento",
  description: "Categoría ficticia para comprobar las vistas en distintos anchos.",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const mockCategoryApi = async (page: Page) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "category-responsive-user", email: "operator@example.com", role: "OPERATOR" },
          session: {
            id: "category-responsive-session",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        },
      }),
    });
  });

  await page.route("**/api/backend/categories**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (request.method() === "GET" && path === categoriesPath) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [category], pagination: { total: 1, page: 1, limit: 15 } }),
      });
      return;
    }

    if (request.method() === "GET" && path === `${categoriesPath}/${categoryUuid}`) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: category }),
      });
      return;
    }

    await route.abort();
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

const expectTableToScrollLocally = async (page: Page) => {
  const tableRegion = page.locator(".ui-data-table-viewport");
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
};

for (const width of [360, 768, 1280]) {
  test(`keeps category list and forms usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockCategoryApi(page);

    await page.goto("/categories");
    await expect(page.getByRole("heading", { level: 1, name: "Categorías" })).toBeVisible();
    const row = page.getByRole("row", { name: /Herramientas de mantenimiento/ });
    await expect(row).toBeVisible();
    await expectNoHorizontalDocumentOverflow(page);

    if (width <= 768) {
      await expectTableToScrollLocally(page);
    }

    const editAction = row.getByRole("button", { name: "Editar" });
    await expectActionWithinViewport(editAction, width);
    await expect(editAction).toBeEnabled();
    await expectActionWithinViewport(row.getByRole("button", { name: "Desactivar" }), width);
    await expectNoHorizontalDocumentOverflow(page);
    await editAction.click();

    await expect(page).toHaveURL(new RegExp(`/categories/${categoryUuid}/edit`));
    await expect(page.getByRole("heading", { level: 1, name: "Editar categoría" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Nombre (obligatorio)" })).toHaveValue(
      category.name,
    );
    await expectNoHorizontalDocumentOverflow(page);
    await expectActionWithinViewport(page.getByRole("button", { name: "Cancelar" }), width);
    const saveAction = page.getByRole("button", { name: "Guardar cambios" });
    await expectActionWithinViewport(saveAction, width);
    await page.getByRole("textbox", { name: "Nombre (obligatorio)" }).fill("Herramientas editadas");
    await expect(saveAction).toBeEnabled();
    await expectNoHorizontalDocumentOverflow(page);

    await page.goto("/categories/new");
    await expect(page.getByRole("heading", { level: 1, name: "Crear categoría" })).toBeVisible();
    await expectNoHorizontalDocumentOverflow(page);
    const createAction = page.getByRole("button", { name: "Crear categoría" });
    await expectActionWithinViewport(page.getByRole("button", { name: "Cancelar" }), width);
    await expectActionWithinViewport(createAction, width);
    await page.getByRole("textbox", { name: "Nombre (obligatorio)" }).fill("Nueva categoría");
    await expect(createAction).toBeEnabled();
    await expectNoHorizontalDocumentOverflow(page);
  });
}
