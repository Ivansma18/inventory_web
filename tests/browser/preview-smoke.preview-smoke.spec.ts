import { expect, test } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const forbiddenDesignSystemMarkers = [
  "/__design-system",
  "/src/dev/design-system/",
  "Inventory — Design System",
  "Demostración del sistema de diseño",
  "design-system-demo__",
  "design-system-demo.css",
  "ART-2048",
  "Teclado compacto",
  "Ejemplo de éxito: cambios guardados.",
  "Ejemplo informativo: hay una actualización disponible.",
  "Ejemplo de advertencia: revisa este aviso.",
  "Ejemplo de error: no se completó la acción.",
  "Cargando resumen de ejemplo",
  "Descripción breve del control.",
];

const forbiddenBundleMarkers = [
  "/__auth-test",
  "Auth test harness",
  "auth-real-harness.tsx",
  "/__health-test",
  "Inventory Local Health Check",
  "health-real-client-harness.ts",
  "Inventory Session Focus Harness",
  "session-focus-harness.tsx",
  "inventory:test:refetch-session",
  "/__products-msw",
  "Inventory Product MSW E2E Harness",
  "product-msw-api.ts",
  "/__categories-msw",
  "Inventory Category MSW E2E Harness",
  "category-msw-api.ts",
  "category-msw-app.tsx",
  "/mockServiceWorker.js",
  ...forbiddenDesignSystemMarkers,
  "INVENTORY_HEALTH_E2E_HARNESS",
  "AUTH_TEST_EMAIL",
  "AUTH_TEST_PASSWORD",
  "preview-sentinel@example.invalid",
  "preview-sentinel-password",
];

const readBundleFiles = async (
  directory: string,
): Promise<Array<{ path: string; content: Buffer }>> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name);
      return entry.isDirectory()
        ? readBundleFiles(entryPath)
        : [{ path: entryPath, content: await readFile(entryPath) }];
    }),
  );

  return nestedFiles.flat();
};

test("serves the built app without development harnesses, demo, or backend access", async ({
  page,
}) => {
  const bundleFiles = await readBundleFiles(resolve(process.cwd(), "dist"));
  expect(bundleFiles.length).toBeGreaterThan(0);
  const bundle = Buffer.concat(bundleFiles.map(({ content }) => content));

  for (const marker of forbiddenBundleMarkers) {
    expect(bundle.includes(Buffer.from(marker)), `bundle must not contain ${marker}`).toBe(false);
  }
  expect(
    bundleFiles.map(({ path }) => path).filter((path) => /design-system|demo/i.test(path)),
  ).toEqual([]);

  const apiRequests: string[] = [];
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.pathname.startsWith("/api/")) {
      apiRequests.push(requestUrl.pathname);
    }
  });

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "UNAUTHORIZED", message: "No active session." } }),
    });
  });

  const previewResponse = await page.goto("/");
  expect(previewResponse).not.toBeNull();
  if (!previewResponse) {
    throw new Error("The production preview did not return the app document.");
  }

  expect(previewResponse.status()).toBe(200);
  expect(await previewResponse.text()).toMatch(/src="\/assets\/index-[^"]+\.js"/);
  await expect(page.getByRole("heading", { level: 1, name: "Sesión no iniciada" })).toBeVisible();
  expect(apiRequests).toEqual(["/api/auth/get-session"]);
  const viewport = await page.evaluate(() => ({
    documentHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  }));
  expect(viewport.documentHeight).toBeLessThanOrEqual(viewport.viewportHeight);

  const harnessResponse = await page.request.get("/__auth-test");
  expect(harnessResponse.status()).toBe(200);
  expect(harnessResponse.headers()["content-type"]).toContain("text/html");
  const harnessFallback = await harnessResponse.text();
  expect(harnessFallback).not.toContain("Auth test harness");
  expect(harnessFallback).not.toContain("auth-real-harness.tsx");
  expect(harnessFallback).not.toContain("/src/main.tsx");

  const healthHarnessResponse = await page.request.get("/__health-test");
  expect(healthHarnessResponse.status()).toBe(200);
  expect(healthHarnessResponse.headers()["content-type"]).toContain("text/html");
  const healthFallback = await healthHarnessResponse.text();
  expect(healthFallback).not.toContain("Local backend health check");
  expect(healthFallback).not.toContain("health-real-client-harness.ts");
  expect(healthFallback).not.toContain("/src/main.tsx");

  const sessionFocusHarnessResponse = await page.request.get(
    "/tests/browser/fixtures/session-focus-harness.html",
  );
  expect(sessionFocusHarnessResponse.status()).toBe(200);
  const sessionFocusHarnessFallback = await sessionFocusHarnessResponse.text();
  expect(sessionFocusHarnessFallback).not.toContain("Inventory Session Focus Harness");
  expect(sessionFocusHarnessFallback).not.toContain("session-focus-harness.tsx");
  expect(sessionFocusHarnessFallback).not.toContain("/src/main.tsx");

  const productMswHarnessResponse = await page.request.get("/__products-msw");
  expect(productMswHarnessResponse.status()).toBe(200);
  const productMswHarnessFallback = await productMswHarnessResponse.text();
  expect(productMswHarnessFallback).not.toContain("Inventory Product MSW E2E Harness");
  expect(productMswHarnessFallback).not.toContain("product-msw-app.tsx");
  expect(productMswHarnessFallback).not.toContain("/mockServiceWorker.js");

  const categoryMswHarnessResponse = await page.request.get("/__categories-msw");
  expect(categoryMswHarnessResponse.status()).toBe(200);
  expect(categoryMswHarnessResponse.headers()["content-type"]).toContain("text/html");
  const categoryMswHarnessFallback = await categoryMswHarnessResponse.text();
  expect(categoryMswHarnessFallback).not.toContain("Inventory Category MSW E2E Harness");
  expect(categoryMswHarnessFallback).not.toContain("category-msw-app.tsx");
  expect(categoryMswHarnessFallback).not.toContain("category-msw-api.ts");
  expect(categoryMswHarnessFallback).not.toContain("/mockServiceWorker.js");

  const workerResponse = await page.request.get("/mockServiceWorker.js");
  expect(workerResponse.status()).toBe(200);
  expect(workerResponse.headers()["content-type"]).toContain("text/html");
  const workerFallback = await workerResponse.text();
  expect(workerFallback).toContain('id="root"');
  expect(workerFallback).not.toContain("mockServiceWorker");
  expect(workerFallback).not.toContain("serviceWorker.register");

  const designSystemFallback = await page.request.get("/__design-system");
  expect([200, 404]).toContain(designSystemFallback.status());
  const designSystemFallbackHtml = await designSystemFallback.text();
  for (const marker of forbiddenDesignSystemMarkers) {
    expect(designSystemFallbackHtml).not.toContain(marker);
  }
});

test("renders Home from a mocked Auth session without business API requests", async ({ page }) => {
  const apiRequests: string[] = [];
  let sessionRequests = 0;
  let businessRequests = 0;

  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.pathname.startsWith("/api/")) {
      apiRequests.push(requestUrl.pathname);
    }
  });

  await page.route("**/api/auth/get-session", async (route) => {
    sessionRequests += 1;
    expect(route.request().method()).toBe("GET");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "preview-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "preview-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });
  await page.route(/\/api\/backend(?:\/|$)/, async (route) => {
    businessRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.goto("/");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();
  await expect(page.getByText("operator@example.com")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  expect(sessionRequests).toBe(1);
  expect(businessRequests).toBe(0);
  expect(apiRequests).toEqual(["/api/auth/get-session"]);
});

test("serves the product list in preview with mocked Auth and Products APIs", async ({ page }) => {
  const apiRequests: string[] = [];
  const businessRequests: string[] = [];
  const product = {
    uuid: "550e8400-e29b-41d4-a716-446655440051",
    sku: "SKU-PREVIEW-001",
    name: "Producto simulado en preview",
    description: null,
    purchasePrice: 25.5,
    salePrice: 31.25,
    categoryUuid: null,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.pathname.startsWith("/api/")) {
      apiRequests.push(requestUrl.pathname);
    }
  });

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "preview-products-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "preview-products-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });

  await page.route("**/api/backend/products**", async (route) => {
    businessRequests.push(route.request().method());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [product], pagination: { total: 1, page: 1, limit: 15 } }),
    });
  });

  const previewResponse = await page.goto("/products");
  expect(previewResponse?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Productos" })).toBeVisible();
  await expect(page.getByRole("cell", { name: product.sku })).toBeVisible();
  expect(apiRequests).toEqual(["/api/auth/get-session", "/api/backend/products"]);
  expect(businessRequests).toEqual(["GET"]);
});

test("serves the category list in preview with mocked Auth and Categories APIs", async ({
  page,
}) => {
  const apiRequests: string[] = [];
  const authMethods: string[] = [];
  const businessRequests: Array<{ method: string; path: string; origin: string }> = [];
  const category = {
    uuid: "550e8400-e29b-41d4-a716-446655440061",
    name: "Herramientas de preview",
    description: "Categoría simulada en producción",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.pathname.startsWith("/api/")) {
      apiRequests.push(requestUrl.pathname);
    }
  });

  await page.route("**/api/auth/get-session", async (route) => {
    authMethods.push(route.request().method());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "preview-categories-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "preview-categories-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });
  await page.route("**/api/backend/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const request = {
      method: route.request().method(),
      path: requestUrl.pathname,
      origin: requestUrl.origin,
    };
    businessRequests.push(request);

    if (request.method === "GET" && request.path === "/api/backend/categories") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [category], pagination: { total: 1, page: 1, limit: 15 } }),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "NOT_FOUND" } }),
    });
  });

  const previewResponse = await page.goto("/categories");
  expect(previewResponse?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Categorías" })).toBeVisible();

  const categoryRow = page.getByRole("row").filter({ hasText: category.name });
  await expect(categoryRow).toBeVisible();
  await expect(categoryRow).toContainText("Activa");

  const previewOrigin = new URL(page.url()).origin;
  expect(authMethods).toEqual(["GET"]);
  expect(businessRequests).toEqual([
    { method: "GET", path: "/api/backend/categories", origin: previewOrigin },
  ]);
  expect(apiRequests).toEqual(["/api/auth/get-session", "/api/backend/categories"]);
});
