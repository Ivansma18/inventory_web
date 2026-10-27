import { expect, test, type Page } from "@playwright/test";

const categoryUuid = "550e8400-e29b-41d4-a716-446655440052";
const categoriesPath = "/api/backend/categories";

const category = (isActive = true) => ({
  uuid: categoryUuid,
  name: "Herramientas",
  description: "Para mantenimiento",
  isActive,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const mockAuthenticatedSession = async (page: Page) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "category-motion-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "category-motion-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });
};

const readBeforeUnloadEvent = async (page: Page) =>
  page.evaluate(() => {
    const event = new Event("beforeunload", { cancelable: true });
    let providedText: unknown = "not-set";
    Object.defineProperty(event, "returnValue", {
      configurable: true,
      get: () => providedText,
      set: (value: unknown) => {
        providedText = value;
      },
    });
    window.dispatchEvent(event);
    return { defaultPrevented: event.defaultPrevented, providedText };
  });

test("completes category confirmation and discard flows with reduced motion", async ({ page }) => {
  let isActive = true;
  let releaseStatusChange!: () => void;
  const statusChangeGate = new Promise<void>((resolve) => {
    releaseStatusChange = resolve;
  });
  let statusPayload: unknown;

  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockAuthenticatedSession(page);
  await page.route("**/api/backend/categories**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET" && url.pathname === categoriesPath) {
      const requestedActive = url.searchParams.get("isActive") !== "false";
      const rows = requestedActive === isActive ? [category(isActive)] : [];
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

    if (request.method() === "PATCH" && url.pathname === `${categoriesPath}/${categoryUuid}`) {
      statusPayload = request.postDataJSON();
      await statusChangeGate;
      isActive = false;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: category(false) }),
      });
      return;
    }

    await route.abort();
  });

  await page.goto("/categories/new");
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
    true,
  );
  const createAction = page.getByRole("button", { name: "Crear categoría" });
  const transitionDuration = await createAction.evaluate((element) =>
    getComputedStyle(element)
      .transitionDuration.split(",")
      .map((duration) => {
        const value = duration.trim();
        return value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000;
      })
      .reduce((longest, duration) => Math.max(longest, duration), 0),
  );
  expect(transitionDuration).toBeLessThanOrEqual(0.01);

  const name = page.getByRole("textbox", { name: "Nombre (obligatorio)" });
  await name.fill("Repuestos");
  await page.getByRole("button", { name: "Cancelar" }).click();
  const discardDialog = page.getByRole("dialog", { name: "¿Descartar los cambios?" });
  await expect(discardDialog).toBeVisible();
  await discardDialog.getByRole("button", { name: "Continuar editando" }).click();
  await expect(discardDialog).toHaveCount(0);
  await expect(name).toHaveValue("Repuestos");

  await page.getByRole("button", { name: "Cancelar" }).click();
  await discardDialog.getByRole("button", { name: "Descartar cambios" }).click();
  await expect(page).toHaveURL(/\/categories\?/);

  const row = page.getByRole("row", { name: /Herramientas/ });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Desactivar" }).click();
  const statusDialog = page.getByRole("dialog", { name: "Confirmar desactivación" });
  await expect(statusDialog).toBeVisible();
  await statusDialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(statusDialog).toHaveCount(0);
  expect(statusPayload).toBeUndefined();
  await expect(row.getByRole("button", { name: "Desactivar" })).toBeVisible();

  await row.getByRole("button", { name: "Desactivar" }).click();
  await statusDialog.getByRole("button", { name: "Desactivar" }).click();
  await expect(statusDialog.getByRole("status")).toHaveText(
    "Actualizando el estado de la categoría…",
  );
  await expect.poll(() => statusPayload).toEqual({ isActive: false });
  releaseStatusChange();
  await expect(page.getByText("Categoría desactivada correctamente.").first()).toBeVisible();
  await expect(page.getByText("No hay categorías para mostrar.")).toBeVisible();
});

test("keeps loading, error, empty and form validation feedback in Spanish", async ({ page }) => {
  let releaseFirstListRequest!: () => void;
  const firstListRequestGate = new Promise<void>((resolve) => {
    releaseFirstListRequest = resolve;
  });
  let shouldFailListRequest = true;

  await mockAuthenticatedSession(page);
  await page.route("**/api/backend/categories**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET" && url.pathname === categoriesPath) {
      if (shouldFailListRequest) {
        await firstListRequestGate;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Service unavailable" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], pagination: { total: 0, page: 1, limit: 15 } }),
      });
      return;
    }

    await route.abort();
  });

  await page.goto("/categories");
  await expect(page.getByRole("status").filter({ hasText: "Cargando datos..." })).toBeVisible();
  releaseFirstListRequest();
  await expect(
    page.getByRole("alert").filter({ hasText: "No se pudieron cargar las categorías." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  shouldFailListRequest = false;
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "No hay categorías para mostrar." }),
  ).toBeVisible();

  await page.goto("/categories/new");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("textbox", { name: "Nombre (obligatorio)" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Descripción (opcional)" })).toBeVisible();
  await page.getByRole("button", { name: "Crear categoría" }).click();
  await expect(page.getByText("El nombre es obligatorio.")).toBeVisible();
});

test.describe("native beforeunload warning", () => {
  test.use({ locale: "en-US" });

  test("leaves reload warning language to the browser while app copy stays Spanish", async ({
    page,
  }) => {
    await mockAuthenticatedSession(page);
    await page.goto("/categories/new");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    expect(await page.evaluate(() => navigator.language)).toBe("en-US");

    const name = page.getByRole("textbox", { name: "Nombre (obligatorio)" });
    await name.fill("Borrador sin guardar");
    expect(await readBeforeUnloadEvent(page)).toEqual({ defaultPrevented: true, providedText: "" });

    const dialogPromise = page.waitForEvent("dialog");
    const reloadPromise = page.reload();
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe("beforeunload");
    expect(dialog.message()).not.toContain("Borrador sin guardar");
    expect(dialog.message()).not.toContain("Hay cambios sin guardar");
    await dialog.dismiss();
    void reloadPromise.catch(() => undefined);
    await expect(name).toHaveValue("Borrador sin guardar");
  });
});
