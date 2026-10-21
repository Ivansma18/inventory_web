import { expect, test, type Page } from "@playwright/test";

const categoryUuid = "550e8400-e29b-41d4-a716-446655440000";
const categoriesPath = "/api/backend/categories";

const category = (overrides: Record<string, unknown> = {}) => ({
  uuid: categoryUuid,
  name: "Herramientas",
  description: "Para mantenimiento",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const mockAuthenticatedSession = async (page: Page) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "category-unsaved-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "category-unsaved-session", createdAt: "2026-01-01T00:00:00.000Z" },
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

const expectReloadWarning = async (page: Page, inputName: string, value: string) => {
  expect(await readBeforeUnloadEvent(page)).toEqual({ defaultPrevented: true, providedText: "" });

  const dialogPromise = page.waitForEvent("dialog");
  const reloadPromise = page.reload();
  const dialog = await dialogPromise;

  expect(dialog.type()).toBe("beforeunload");
  expect(dialog.message()).not.toContain(value);
  await dialog.dismiss();
  void reloadPromise.catch(() => undefined);
  await expect(page.getByRole("textbox", { name: inputName })).toHaveValue(value);
};

const expectNoReloadWarning = async (page: Page) => {
  const dialogs: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.type());
    await dialog.dismiss();
  });

  await page.reload();
  expect(dialogs).toEqual([]);
  expect(await readBeforeUnloadEvent(page)).toEqual({
    defaultPrevented: false,
    providedText: "not-set",
  });
};

test("warns before reloading a dirty category creation form, then stops after save", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await page.route("**/api/backend/categories**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === categoriesPath && request.method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: category({ name: "Repuestos", description: null }) }),
      });
      return;
    }

    if (pathname === categoriesPath && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [category()], pagination: { total: 1, page: 1, limit: 15 } }),
      });
      return;
    }

    await route.abort();
  });

  await page.goto("/categories/new");
  const name = page.getByRole("textbox", { name: "Nombre (obligatorio)" });
  await name.fill("Repuestos");
  await expectReloadWarning(page, "Nombre (obligatorio)", "Repuestos");

  await page.getByRole("button", { name: "Crear categoría" }).click();
  await expect(page.getByText("Categoría creada correctamente.")).toBeVisible();
  await expect(page).toHaveURL(/\/categories\?page=1&status=active&sort=name&order=asc$/);
  await expectNoReloadWarning(page);
});

test("warns before reloading a dirty category edit form, then stops after save", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await page.route("**/api/backend/categories**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const detailPath = `${categoriesPath}/${categoryUuid}`;

    if (pathname === categoriesPath && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [category()], pagination: { total: 1, page: 1, limit: 15 } }),
      });
      return;
    }

    if (pathname === detailPath && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: category() }),
      });
      return;
    }

    if (pathname === detailPath && request.method() === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: category({ name: "Herramientas manuales" }) }),
      });
      return;
    }

    await route.abort();
  });

  await page.goto(`/categories/${categoryUuid}/edit`);
  const name = page.getByRole("textbox", { name: "Nombre (obligatorio)" });
  await expect(name).toHaveValue("Herramientas");
  await name.fill("Herramientas manuales");
  await expectReloadWarning(page, "Nombre (obligatorio)", "Herramientas manuales");

  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Categoría actualizada correctamente.")).toBeVisible();
  await expect(page).toHaveURL(/\/categories\?page=1&status=active&sort=name&order=asc$/);
  await expectNoReloadWarning(page);
});
