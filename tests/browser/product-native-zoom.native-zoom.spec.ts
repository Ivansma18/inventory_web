import {
  chromium,
  expect,
  test as base,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const productUuid = "550e8400-e29b-41d4-a716-446655440001";
const categoryUuid = "550e8400-e29b-41d4-a716-446655440000";
const managedCategoryUuid = "550e8400-e29b-41d4-a716-446655440031";
const nativeZoomLevelFor200Percent = 3.8017840169239308;

const test = base.extend<{ context: BrowserContext }>({
  context: async ({ baseURL }, use) => {
    const userDataDir = await mkdtemp(join(tmpdir(), "inventory-native-zoom-"));
    const profileDir = join(userDataDir, "Default");
    await mkdir(profileDir, { recursive: true });
    await writeFile(
      join(profileDir, "Preferences"),
      JSON.stringify({
        partition: { default_zoom_level: { x: nativeZoomLevelFor200Percent } },
      }),
      "utf8",
    );

    let context: BrowserContext | undefined;
    try {
      context = await chromium.launchPersistentContext(userDataDir, {
        args: ["--no-first-run", "--no-default-browser-check"],
        baseURL,
        headless: false,
        viewport: { width: 1280, height: 900 },
      });
      await use(context);
    } finally {
      await context?.close();
      await rm(userDataDir, { recursive: true, force: true });
    }
  },
});

const product = {
  uuid: productUuid,
  sku: "SKU-NATIVE-ZOOM-001",
  name: "Producto de prueba con zoom nativo",
  description: "Producto simulado para comprobar acciones al ampliar el navegador.",
  purchasePrice: 25.5,
  salePrice: 31.25,
  categoryUuid,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const managedCategory = {
  uuid: managedCategoryUuid,
  name: "Herramientas de mantenimiento",
  description: "Categoría ficticia para revisar acciones al ampliar el navegador.",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const mockProductApi = async (page: Page) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "product-native-zoom-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "product-native-zoom-session", createdAt: "2026-01-01T00:00:00.000Z" },
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

const mockCategoryApi = async (page: Page) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: {
            id: "category-native-zoom-user",
            email: "operator@example.com",
            role: "OPERATOR",
          },
          session: {
            id: "category-native-zoom-session",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        },
      }),
    });
  });
  await page.route("**/api/backend/categories**", async (route) => {
    const request = route.request();
    const requestPath = new URL(request.url()).pathname;

    if (request.method() === "GET" && requestPath === "/api/backend/categories") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [managedCategory],
          pagination: { total: 1, page: 1, limit: 15 },
        }),
      });
      return;
    }

    if (
      request.method() === "GET" &&
      requestPath === `/api/backend/categories/${managedCategoryUuid}`
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: managedCategory }),
      });
      return;
    }

    await route.abort();
  });
};

const expectNoHorizontalDocumentOverflow = async (page: Page) => {
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));

  // At native zoom the body may be fractional while clientWidth is integer-rounded.
  expect(dimensions.documentWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(
    dimensions.viewportWidth,
  );
};

const expectActionAvailable = async (action: Locator, page: Page) => {
  await action.evaluate((element) =>
    element.scrollIntoView({ block: "center", inline: "nearest" }),
  );
  await expect(action).toBeVisible();
  const box = await action.boundingBox();
  const viewport = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  }));

  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);

  return {
    x: box!.x,
    y: box!.y,
    right: box!.x + box!.width,
    bottom: box!.y + box!.height,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  };
};

test("keeps primary product actions available at native browser zoom 200%", async ({ page }) => {
  await mockProductApi(page);
  await page.goto("/products");

  const zoomMetrics = await page.evaluate(() => ({
    cssViewportWidth: document.documentElement.clientWidth,
    devicePixelRatio,
    outerWidth,
    visualViewportScale: visualViewport?.scale ?? null,
  }));
  expect(zoomMetrics.cssViewportWidth).toBeLessThanOrEqual(650);
  expect(zoomMetrics.outerWidth).toBeGreaterThan(1000);
  expect(zoomMetrics.visualViewportScale).toBe(1);
  expect(zoomMetrics.devicePixelRatio).toBeGreaterThanOrEqual(1.8);

  await expect(page.getByRole("heading", { level: 1, name: "Productos" })).toBeVisible();
  await expect(page.getByRole("cell", { name: product.sku })).toBeVisible();
  await expectNoHorizontalDocumentOverflow(page);
  const editAction = page.getByRole("button", { name: "Editar" }).first();
  await expectActionAvailable(editAction, page);
  await expectActionAvailable(page.getByRole("button", { name: "Desactivar" }).first(), page);
  await editAction.click();

  await expect(page).toHaveURL(new RegExp(`/products/${productUuid}/edit`));
  await expect(page.getByRole("heading", { level: 1, name: "Editar producto" })).toBeVisible();
  await expectNoHorizontalDocumentOverflow(page);
  await expectActionAvailable(page.getByRole("button", { name: "Guardar cambios" }), page);
  await expectActionAvailable(page.getByRole("button", { name: "Cancelar" }), page);

  await page.goto("/products/new");
  await expect(page.getByRole("heading", { level: 1, name: "Crear producto" })).toBeVisible();
  await expectNoHorizontalDocumentOverflow(page);
  await expectActionAvailable(page.getByRole("button", { name: "Crear producto" }), page);
});

test("keeps primary category actions available at native browser zoom 200%", async ({
  page,
}, testInfo) => {
  await mockCategoryApi(page);
  await page.goto("/categories");

  const zoomMetrics = await page.evaluate(() => ({
    cssViewportWidth: document.documentElement.clientWidth,
    devicePixelRatio,
    outerWidth,
    outerHeight,
    screenWidth: screen.width,
    screenHeight: screen.height,
    visualViewportScale: visualViewport?.scale ?? null,
    platform: navigator.platform,
  }));
  expect(zoomMetrics.cssViewportWidth).toBeLessThanOrEqual(650);
  expect(zoomMetrics.outerWidth).toBeGreaterThan(1000);
  expect(zoomMetrics.visualViewportScale).toBe(1);
  expect(zoomMetrics.devicePixelRatio).toBeGreaterThanOrEqual(1.8);
  await mkdir(testInfo.outputDir, { recursive: true });
  const actionBounds: Record<string, Awaited<ReturnType<typeof expectActionAvailable>>> = {};

  await expect(page.getByRole("heading", { level: 1, name: "Categorías" })).toBeVisible();
  const row = page.getByRole("row", { name: /Herramientas de mantenimiento/ });
  await expect(row).toBeVisible();
  await expectNoHorizontalDocumentOverflow(page);
  const editAction = row.getByRole("button", { name: "Editar" });
  actionBounds["list.Editar"] = await expectActionAvailable(editAction, page);
  actionBounds["list.Desactivar"] = await expectActionAvailable(
    row.getByRole("button", { name: "Desactivar" }),
    page,
  );
  await page.screenshot({ path: join(testInfo.outputDir, "category-list-native-zoom-200.png") });
  await editAction.click();

  await expect(page).toHaveURL(new RegExp(`/categories/${managedCategoryUuid}/edit`));
  await expect(page.getByRole("heading", { level: 1, name: "Editar categoría" })).toBeVisible();
  await expectNoHorizontalDocumentOverflow(page);
  const name = page.getByRole("textbox", { name: "Nombre (obligatorio)" });
  await expect(name).toHaveValue(managedCategory.name);
  const saveAction = page.getByRole("button", { name: "Guardar cambios" });
  actionBounds["edit.Guardar cambios"] = await expectActionAvailable(saveAction, page);
  actionBounds["edit.Cancelar"] = await expectActionAvailable(
    page.getByRole("button", { name: "Cancelar" }),
    page,
  );
  await name.fill("Herramientas editadas");
  await expect(saveAction).toBeEnabled();
  await expectNoHorizontalDocumentOverflow(page);
  actionBounds["edit.Guardar cambios (habilitado)"] = await expectActionAvailable(saveAction, page);
  actionBounds["edit.Cancelar (borrador)"] = await expectActionAvailable(
    page.getByRole("button", { name: "Cancelar" }),
    page,
  );
  await page.screenshot({ path: join(testInfo.outputDir, "category-edit-native-zoom-200.png") });

  await page.getByRole("button", { name: "Cancelar" }).click();
  const discardDialog = page.getByRole("dialog", { name: "¿Descartar los cambios?" });
  await expect(discardDialog).toBeVisible();
  await discardDialog.getByRole("button", { name: "Descartar cambios" }).click();
  await expect(page).toHaveURL(/\/categories\?/);

  await page.goto("/categories/new");
  await expect(page.getByRole("heading", { level: 1, name: "Crear categoría" })).toBeVisible();
  await expectNoHorizontalDocumentOverflow(page);
  const createAction = page.getByRole("button", { name: "Crear categoría" });
  actionBounds["create.Crear categoría"] = await expectActionAvailable(createAction, page);
  actionBounds["create.Cancelar"] = await expectActionAvailable(
    page.getByRole("button", { name: "Cancelar" }),
    page,
  );
  await page.getByRole("textbox", { name: "Nombre (obligatorio)" }).fill("Nueva categoría");
  await expect(createAction).toBeEnabled();
  await expectNoHorizontalDocumentOverflow(page);
  actionBounds["create.Crear categoría (habilitado)"] = await expectActionAvailable(
    createAction,
    page,
  );
  actionBounds["create.Cancelar (borrador)"] = await expectActionAvailable(
    page.getByRole("button", { name: "Cancelar" }),
    page,
  );
  await page.screenshot({ path: join(testInfo.outputDir, "category-create-native-zoom-200.png") });
  await writeFile(
    join(testInfo.outputDir, "native-zoom-environment.json"),
    JSON.stringify(
      {
        browser: await page.context().browser()?.version(),
        ...zoomMetrics,
        cssViewportHeight: await page.evaluate(() => document.documentElement.clientHeight),
        actionBounds,
      },
      null,
      2,
    ),
    "utf8",
  );
});
