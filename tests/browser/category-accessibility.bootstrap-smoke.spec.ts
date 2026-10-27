import { expect, test, type Page } from "@playwright/test";

const categoriesPath = "/api/backend/categories";
const categoryUuid = (index: number) =>
  `550e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}`;

const category = (index: number, name: string, isActive: boolean, updatedAt: string) => ({
  uuid: categoryUuid(index),
  name,
  description: null,
  isActive,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt,
});

const activeCategories = Array.from({ length: 16 }, (_, index) =>
  category(
    index + 1,
    `Herramienta ${String(index + 1).padStart(2, "0")}`,
    true,
    `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
  ),
);
const inactiveCategories = [
  category(20, "Alfa inactiva", false, "2026-01-01T00:00:00.000Z"),
  category(21, "Zeta inactiva", false, "2026-02-01T00:00:00.000Z"),
];

const mockAuthenticatedSession = async (page: Page) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: {
            id: "category-accessibility-user",
            email: "operator@example.com",
            role: "OPERATOR",
          },
          session: {
            id: "category-accessibility-session",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        },
      }),
    });
  });
};

test("filters, sorts, and paginates the category list using only the keyboard", async ({
  page,
}) => {
  const categoryRequests: URL[] = [];

  await mockAuthenticatedSession(page);
  await page.route("**/api/backend/categories**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    categoryRequests.push(url);

    if (request.method() !== "GET" || url.pathname !== categoriesPath) {
      await route.abort();
      return;
    }

    const isActive = url.searchParams.get("isActive") !== "false";
    const search = (url.searchParams.get("search") ?? "").toLocaleLowerCase();
    const sort = url.searchParams.get("sort") ?? "name";
    const order = url.searchParams.get("order") ?? "asc";
    const requestedPage = Number(url.searchParams.get("page") ?? "1");
    const limit = Number(url.searchParams.get("limit") ?? "15");
    const rows = [...(isActive ? activeCategories : inactiveCategories)]
      .filter((item) => item.name.toLocaleLowerCase().includes(search))
      .sort((left, right) => {
        const leftValue = sort === "updatedAt" ? left.updatedAt : left.name;
        const rightValue = sort === "updatedAt" ? right.updatedAt : right.name;
        const comparison = leftValue.localeCompare(rightValue);
        return order === "desc" ? -comparison : comparison;
      });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: rows.slice((requestedPage - 1) * limit, requestedPage * limit),
        pagination: { total: rows.length, page: requestedPage, limit },
      }),
    });
  });

  await page.goto("/categories?page=1&status=active&sort=name&order=asc");
  await expect(page.getByRole("heading", { level: 1, name: "Categorías" })).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "16 categorías" })).toBeVisible();

  const secondPage = page.getByRole("button", { name: "Página 2" });
  await secondPage.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/page=2&status=active&sort=name&order=asc/);
  await expect(page.getByRole("row", { name: /Herramienta 16/ })).toBeVisible();
  await expect(page.getByText("Página 2 de 2")).toBeVisible();

  const status = page.getByRole("textbox", { name: "Estado de categoría" });
  await status.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Inactivas" })).toBeVisible();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(status).toHaveValue("Inactivas");
  await expect(page).toHaveURL(/page=1&status=inactive&sort=name&order=asc/);
  await expect(page.getByRole("row", { name: /Alfa inactiva/ })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "2 categorías" })).toBeVisible();

  const sort = page.getByRole("textbox", { name: "Ordenar por" });
  await sort.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Fecha de actualización" })).toBeVisible();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(sort).toHaveValue("Fecha de actualización");
  await expect(page).toHaveURL(/status=inactive&sort=updatedAt&order=asc/);
  await expect(page.getByRole("row").nth(1)).toContainText("Alfa inactiva");

  const direction = page.getByRole("textbox", { name: "Dirección del orden" });
  await direction.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Descendente" })).toBeVisible();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(direction).toHaveValue("Descendente");
  await expect(page).toHaveURL(/status=inactive&sort=updatedAt&order=desc/);
  await expect(page.getByRole("row").nth(1)).toContainText("Zeta inactiva");

  const search = page.getByRole("searchbox", { name: "Buscar categorías" });
  await search.focus();
  await page.keyboard.type("inactiva");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Buscar" })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/page=1&search=inactiva&status=inactive&sort=updatedAt&order=desc/);
  await expect(page.getByRole("row").nth(1)).toContainText("Zeta inactiva");
  await expect(page.getByRole("row").nth(2)).toContainText("Alfa inactiva");
  await expect(page.getByRole("status").filter({ hasText: "2 categorías" })).toBeVisible();
  expect(Object.fromEntries(categoryRequests.at(-1)!.searchParams)).toMatchObject({
    page: "1",
    search: "inactiva",
    isActive: "false",
    sort: "updatedAt",
    order: "desc",
  });
});

test("closes category confirmations by keyboard and restores focus when the row disappears", async ({
  page,
}) => {
  let categoryIsActive = true;
  const statusRequests: unknown[] = [];
  let releasePatch!: () => void;
  const patchGate = new Promise<void>((resolve) => {
    releasePatch = resolve;
  });

  await mockAuthenticatedSession(page);
  await page.route("**/api/backend/categories**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET" && url.pathname === categoriesPath) {
      const requestedActive = url.searchParams.get("isActive") !== "false";
      const rows =
        requestedActive === categoryIsActive
          ? [category(1, "Herramientas", true, "2026-01-01T00:00:00.000Z")]
          : [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: rows,
          pagination: { total: rows.length, page: 1, limit: 15 },
        }),
      });
      return;
    }

    if (request.method() === "PATCH" && url.pathname === `${categoriesPath}/${categoryUuid(1)}`) {
      statusRequests.push(request.postDataJSON());
      await patchGate;
      categoryIsActive = false;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: category(1, "Herramientas", false, "2026-01-01T00:00:00.000Z"),
        }),
      });
      return;
    }

    await route.abort();
  });

  await page.goto("/categories?page=1&status=active&sort=name&order=asc");
  const row = page.getByRole("row", { name: /Herramientas/ });
  await expect(row).toBeVisible();
  const statusAction = row.getByRole("button", { name: "Desactivar" });

  await statusAction.focus();
  await page.keyboard.press("Enter");
  const confirmation = page.getByRole("dialog", { name: "Confirmar desactivación" });
  await expect(confirmation).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(confirmation).toHaveCount(0);
  await expect(page.locator("[data-ui-dialog-portal] .ui-dialog")).toHaveCount(0);
  await expect(statusAction).toBeFocused();
  expect(statusRequests).toEqual([]);

  await page.keyboard.press("Enter");
  await expect(confirmation).toBeVisible();
  const confirmButton = confirmation.getByRole("button", { name: "Desactivar" });
  await confirmButton.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => statusRequests.length).toBe(1);
  await expect(confirmation.getByRole("status")).toContainText(
    "Actualizando el estado de la categoría",
  );

  const closePendingButton = confirmation.getByRole("button", { name: "Cerrar", exact: true });
  await closePendingButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-ui-dialog-portal] .ui-dialog")).toHaveCount(0);
  await expect(row).toBeVisible();
  await expect(page.getByRole("banner")).toBeFocused();

  releasePatch();

  const successAnnouncement = page
    .getByRole("status")
    .filter({ hasText: "Categoría desactivada correctamente." });
  await expect(successAnnouncement).toBeVisible();
  await expect(successAnnouncement).toHaveAttribute("aria-live", "polite");
  await expect(confirmation).toHaveCount(0);
  await expect(page.locator("[data-ui-dialog-portal] .ui-dialog")).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Herramientas/ })).toHaveCount(0);
  await expect(page.getByText("No hay categorías para mostrar.")).toBeVisible();
  await expect(page.getByRole("banner")).toBeFocused();
  expect(statusRequests).toEqual([{ isActive: false }]);
});

test("does not let a delayed status announcement change route or steal focus", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  let categoryIsActive = true;
  let patchRequestCount = 0;
  let releasePatch!: () => void;
  const patchGate = new Promise<void>((resolve) => {
    releasePatch = resolve;
  });

  await mockAuthenticatedSession(page);
  await page.route("**/api/backend/categories**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET" && url.pathname === categoriesPath) {
      const requestedActive = url.searchParams.get("isActive") !== "false";
      const rows =
        requestedActive === categoryIsActive
          ? [category(1, "Herramientas", true, "2026-01-01T00:00:00.000Z")]
          : [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: rows,
          pagination: { total: rows.length, page: 1, limit: 15 },
        }),
      });
      return;
    }

    if (request.method() === "PATCH" && url.pathname === `${categoriesPath}/${categoryUuid(1)}`) {
      patchRequestCount += 1;
      await patchGate;
      categoryIsActive = false;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: category(1, "Herramientas", false, "2026-01-01T00:00:00.000Z"),
        }),
      });
      return;
    }

    await route.abort();
  });

  await page.goto("/categories?page=1&status=active&sort=name&order=asc");
  const row = page.getByRole("row", { name: /Herramientas/ });
  await expect(row).toBeVisible();
  const statusAction = row.getByRole("button", { name: "Desactivar" });
  await statusAction.focus();
  await page.keyboard.press("Enter");

  const confirmation = page.getByRole("dialog", { name: "Confirmar desactivación" });
  await expect(confirmation).toBeVisible();
  const confirmButton = confirmation.getByRole("button", { name: "Desactivar" });
  await confirmButton.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => patchRequestCount).toBe(1);
  await expect(confirmation.getByRole("status")).toContainText(
    "Actualizando el estado de la categoría",
  );

  const closeButton = confirmation.getByRole("button", { name: "Cerrar", exact: true });
  await closeButton.focus();
  await page.keyboard.press("Enter");
  await expect(confirmation).toHaveCount(0);
  await expect(page.locator("[data-ui-dialog-portal] .ui-dialog")).toHaveCount(0);

  const navigationOpener = page.getByRole("button", { name: "Abrir navegación" });
  await navigationOpener.focus();
  await page.keyboard.press("Enter");
  const navigation = page.getByRole("dialog", { name: "Navegación principal" });
  const homeLink = navigation.getByRole("link", { name: "Inicio", exact: true });
  await homeLink.focus();
  await page.keyboard.press("Enter");
  const homeHeading = page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" });
  await expect(navigation).toBeHidden();
  await expect(homeHeading).toBeFocused();
  const locationBeforeResponse = page.url();

  releasePatch();

  const successAnnouncement = page
    .getByRole("status")
    .filter({ hasText: "Categoría desactivada correctamente." });
  await expect(successAnnouncement).toBeVisible();
  await expect(successAnnouncement).toHaveAttribute("aria-live", "polite");
  await expect(page).toHaveURL(locationBeforeResponse);
  await expect(homeHeading).toBeFocused();
  expect(patchRequestCount).toBe(1);
});
