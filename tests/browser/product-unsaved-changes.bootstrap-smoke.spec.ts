import { expect, test, type Page } from "@playwright/test";

const mockAuthenticatedSession = async (page: Page) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "product-unsaved-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "product-unsaved-session", createdAt: "2026-01-01T00:00:00.000Z" },
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
            uuid: "550e8400-e29b-41d4-a716-446655440000",
            name: "Oficina",
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
};

test("confirms internal navigation and preserves a dirty product form until discard", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await page.goto("/products/new");

  const sku = page.getByRole("textbox", { name: "SKU (obligatorio)" });
  await sku.fill("SKU-DRAFT");
  await page.getByRole("link", { name: "Inicio", exact: true }).click();

  const prompt = page.getByRole("dialog", { name: "¿Descartar los cambios?" });
  await expect(prompt).toBeVisible();
  await prompt.getByRole("button", { name: "Continuar editando" }).click();
  await expect(prompt).toHaveCount(0);
  await expect(page).toHaveURL(/\/products\/new$/);
  await expect(sku).toHaveValue("SKU-DRAFT");

  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  await page
    .getByRole("dialog", { name: "¿Descartar los cambios?" })
    .getByRole("button", { name: "Descartar cambios" })
    .click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Bienvenido a Inventory" })).toBeVisible();
});

test("shows the browser beforeunload warning for an unsaved product form", async ({ page }) => {
  await mockAuthenticatedSession(page);
  await page.goto("/products/new");
  await page.getByRole("textbox", { name: "SKU (obligatorio)" }).fill("SKU-DRAFT");

  const dialogPromise = page.waitForEvent("dialog");
  const closePromise = page.close({ runBeforeUnload: true });
  const dialog = await dialogPromise;

  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await closePromise;

  await expect(page.getByRole("textbox", { name: "SKU (obligatorio)" })).toHaveValue("SKU-DRAFT");
});
