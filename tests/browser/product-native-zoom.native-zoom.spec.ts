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
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeVisible();
  const box = await action.boundingBox();
  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);

  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth);
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
