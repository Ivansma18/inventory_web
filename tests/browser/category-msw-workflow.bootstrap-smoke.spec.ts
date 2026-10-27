import { expect, test, type Page } from "@playwright/test";

const categoriesPath = "/api/backend/categories";
const editableCategoryUuid = "550e8400-e29b-41d4-a716-446655440055";
const createdCategoryUuid = "550e8400-e29b-41d4-a716-446655440056";
const associatedCategoryUuid = "550e8400-e29b-41d4-a716-446655440057";
const listAfterCriteria =
  "/categories?page=1&search=herramientas&status=active&sort=name&order=asc";

interface CategoryMswRequest {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
}

const getMswRequests = (page: Page) =>
  page.evaluate(() => {
    const pageWindow = window as Window & { __categoryMswRequests?: CategoryMswRequest[] };
    return pageWindow.__categoryMswRequests ?? [];
  });

test("covers category criteria, creation, edit return and status outcomes through browser MSW", async ({
  page,
}) => {
  const apiOrigins: string[] = [];
  const apiRequestMethods: string[] = [];
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.pathname.startsWith("/api/")) {
      apiOrigins.push(requestUrl.origin);
      apiRequestMethods.push(request.method());
    }
  });

  await page.goto("/__categories-msw?route=%2Fcategories%2Fnew");
  await expect(page).toHaveURL(/\/categories\/new$/);

  await page.getByRole("textbox", { name: "Nombre (obligatorio)" }).fill("Categoría E2E creada");
  await page
    .getByRole("textbox", { name: "Descripción (opcional)" })
    .fill("Creada mediante el harness MSW");
  await page.getByRole("button", { name: "Crear categoría" }).click();

  await expect(page).toHaveURL(/\/categories\?page=1&status=active&sort=name&order=asc$/);
  await expect(
    page.getByRole("status").filter({ hasText: "Categoría creada correctamente." }),
  ).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Categoría E2E creada" })).toBeVisible();

  await page.getByRole("searchbox", { name: "Buscar categorías" }).fill("herramientas");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/search=herramientas&status=active&sort=name&order=asc$/);

  const toolsRow = page.getByRole("row").filter({ hasText: "Herramientas" });
  await expect(toolsRow).toBeVisible();
  await toolsRow.getByRole("button", { name: "Editar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Editar categoría" })).toBeVisible();

  const editUrl = new URL(page.url());
  expect(editUrl.pathname).toBe(`/categories/${editableCategoryUuid}/edit`);
  expect(editUrl.searchParams.get("returnTo")).toBe(listAfterCriteria);
  await page.getByRole("textbox", { name: "Nombre (obligatorio)" }).fill("Herramientas manuales");
  await page
    .getByRole("textbox", { name: "Descripción (opcional)" })
    .fill("Herramientas actualizadas desde el flujo E2E");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page).toHaveURL(listAfterCriteria);
  await expect(
    page.getByRole("status").filter({ hasText: "Categoría actualizada correctamente." }),
  ).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Herramientas manuales" })).toBeVisible();

  await page.getByRole("searchbox", { name: "Buscar categorías" }).fill("");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/\/categories\?page=1&status=active&sort=name&order=asc$/);

  const createdRow = page.getByRole("row").filter({ hasText: "Categoría E2E creada" });
  await createdRow.getByRole("button", { name: "Desactivar" }).click();
  const createdConfirmation = page.getByRole("dialog", { name: "Confirmar desactivación" });
  await expect(createdConfirmation).toContainText("Categoría E2E creada");
  await createdConfirmation.getByRole("button", { name: "Desactivar" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Categoría desactivada correctamente." }),
  ).toBeVisible();
  await expect(createdRow).toHaveCount(0);

  const associatedRow = page
    .getByRole("row")
    .filter({ hasText: "Material con productos asociados" });
  await expect(associatedRow).toBeVisible();
  await associatedRow.getByRole("button", { name: "Desactivar" }).click();
  const associatedConfirmation = page.getByRole("dialog", { name: "Confirmar desactivación" });
  await associatedConfirmation.getByRole("button", { name: "Desactivar" }).click();
  await expect(associatedConfirmation.getByRole("alert")).toHaveText(
    "No se puede desactivar la categoría porque tiene productos asociados. La categoría seguirá activa. Esta acción no reasigna productos.",
  );
  await associatedConfirmation.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(associatedRow).toContainText("Activa");

  const requests = await getMswRequests(page);
  expect(requests).toContainEqual({
    method: "POST",
    path: categoriesPath,
    body: {
      name: "Categoría E2E creada",
      description: "Creada mediante el harness MSW",
    },
  });
  expect(requests).toContainEqual({
    method: "PATCH",
    path: `${categoriesPath}/${editableCategoryUuid}`,
    body: {
      name: "Herramientas manuales",
      description: "Herramientas actualizadas desde el flujo E2E",
    },
  });
  expect(
    requests.some(
      (request) =>
        request.method === "GET" && request.path === `${categoriesPath}/${editableCategoryUuid}`,
    ),
  ).toBe(true);
  expect(requests).toContainEqual({
    method: "PATCH",
    path: `${categoriesPath}/${createdCategoryUuid}`,
    body: { isActive: false },
  });
  expect(requests).toContainEqual({
    method: "PATCH",
    path: `${categoriesPath}/${associatedCategoryUuid}`,
    body: { isActive: false },
  });
  expect(
    requests
      .filter(
        (request) =>
          request.method === "GET" &&
          request.path === categoriesPath &&
          request.query?.search === "herramientas",
      )
      .at(-1)?.query,
  ).toEqual({
    page: "1",
    limit: "15",
    search: "herramientas",
    isActive: "true",
    sort: "name",
    order: "asc",
  });
  expect(requests.some((request) => request.method === "DELETE")).toBe(false);
  expect(requests.some((request) => request.path === "/api/auth/get-session")).toBe(true);
  expect(
    requests.every(
      ({ path }) =>
        path === "/api/auth/get-session" ||
        path === categoriesPath ||
        path.startsWith(`${categoriesPath}/`),
    ),
  ).toBe(true);
  expect(apiRequestMethods).not.toContain("DELETE");
  expect(apiOrigins.every((origin) => origin === new URL(page.url()).origin)).toBe(true);
});
