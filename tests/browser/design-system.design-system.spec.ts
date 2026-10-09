import { expect, test } from "@playwright/test";

test("exercises the development Design System without contacting the backend", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.pathname.startsWith("/api/")) {
      apiRequests.push(requestUrl.pathname);
    }
  });

  const response = await page.goto("/__design-system");

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { level: 1, name: "Demostración del sistema de diseño" }),
  ).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  for (const primitive of [
    "Badge",
    "Button",
    "DataTable",
    "Dialog",
    "Icon",
    "Input",
    "Select",
    "Skeleton",
    "Textarea",
    "Toast",
    "Tooltip",
  ]) {
    await expect(page.getByRole("heading", { level: 2, name: primitive })).toBeVisible();
  }
  await expect(page.getByText("Teclado compacto")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Código de artículo" })).toHaveValue("ART-2048");
  await expect(page.locator(".ui-skeleton__shape")).toHaveCount(3);
  await expect(page.locator(".ui-skeleton__shape").first()).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Notificación informativa de ejemplo.");

  await page.getByRole("button", { name: "Cambiar estado de ejemplo" }).click();
  await expect(page.getByText("Estado: Disponible", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Acción primaria" }).click();
  await expect(page.getByText("Acciones activadas: 1", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Activar acción con icono" }).click();
  await expect(page.getByText("Acciones con icono activadas: 1", { exact: true })).toBeVisible();

  const codeInput = page.getByRole("textbox", { name: "Código de artículo" });
  await codeInput.fill("");
  await expect(codeInput).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("El código de artículo no puede estar vacío.")).toBeVisible();
  await codeInput.fill("ART-2048X");
  await expect(codeInput).not.toHaveAttribute("aria-invalid");

  const description = page.getByRole("textbox", { name: "Descripción" });
  await description.fill("Descripción editada\ncon dos líneas.");
  await expect(description).toHaveValue("Descripción editada\ncon dos líneas.");

  const statusSelect = page.getByLabel("Estado");
  await statusSelect.focus();
  await statusSelect.press("ArrowDown");
  await page.getByRole("option", { name: "Por revisar" }).click();
  await expect(page.getByText("Estado de ejemplo: Por revisar", { exact: true })).toBeVisible();

  await statusSelect.focus();
  await statusSelect.press("ArrowDown");
  await statusSelect.press("Home");
  await statusSelect.press("Enter");
  await expect(page.getByText("Selecciona un estado para revisar el error.")).toBeVisible();
  await expect(statusSelect).toHaveAttribute("aria-invalid", "true");

  expect(apiRequests).toEqual([]);
});

test("lets the demo configure dialog close requests independently", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.pathname.startsWith("/api/")) {
      apiRequests.push(requestUrl.pathname);
    }
  });

  await page.goto("/__design-system");

  const openDialog = page.getByRole("button", { name: "Abrir diálogo" });
  const dialog = page.getByRole("dialog", { name: "Diálogo de ejemplo" });

  await openDialog.click();
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Cerrar diálogo" }).click();
  await expect(dialog).toBeHidden();

  await openDialog.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await openDialog.click();
  await page.mouse.click(8, 8);
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Botón de cierre: habilitado" }).click();
  await openDialog.click();
  await expect(page.getByRole("button", { name: "Cerrar diálogo" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Botón de cierre: deshabilitado" }).click();
  await page.getByRole("button", { name: "Escape: habilitado" }).click();
  await openDialog.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Cerrar diálogo" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Escape: deshabilitado" }).click();
  await page.getByRole("button", { name: "Clic exterior: habilitado" }).click();
  await openDialog.click();
  await page.mouse.click(8, 8);
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Cerrar diálogo" }).click();
  await expect(dialog).toBeHidden();

  expect(apiRequests).toEqual([]);
});

test("keeps the demo dialog open while an example operation is pending", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.pathname.startsWith("/api/")) {
      apiRequests.push(requestUrl.pathname);
    }
  });

  await page.goto("/__design-system");
  await page.getByRole("button", { name: "Bloqueo pendiente: inactivo" }).click();
  await page.getByRole("button", { name: "Abrir diálogo" }).click();

  const dialog = page.getByRole("dialog", { name: "Diálogo de ejemplo" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveText(
    "Operación de ejemplo pendiente. El cierre está bloqueado.",
  );

  await page.getByRole("button", { name: "Cerrar diálogo" }).click();
  await page.keyboard.press("Escape");
  await page.mouse.click(8, 8);
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Completar operación de ejemplo" }),
  ).toBeEnabled();
  await expect(dialog.getByRole("button", { name: "Cerrar desde el contenido" })).toBeDisabled();

  await dialog.getByRole("button", { name: "Completar operación de ejemplo" }).click();
  await expect(dialog.getByRole("status")).toHaveText(
    "Operación completada. Ya puedes cerrar el diálogo.",
  );
  await expect(dialog.getByRole("button", { name: "Cerrar desde el contenido" })).toBeEnabled();
  await page.getByRole("button", { name: "Cerrar diálogo" }).click();
  await expect(dialog).toBeHidden();

  expect(apiRequests).toEqual([]);
});

test("lets the demo paginate, sort, and show table states without a backend", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.pathname.startsWith("/api/")) {
      apiRequests.push(requestUrl.pathname);
    }
  });

  await page.goto("/__design-system");
  const dataTable = page.getByRole("region", { name: "DataTable" });
  await expect(dataTable.getByText("Página 1 de 3")).toBeVisible();
  await expect(dataTable.getByRole("cell", { name: "ART-2048" })).toBeVisible();

  const codeHeader = dataTable.getByRole("columnheader", { name: "Código" });
  await codeHeader.click();
  await expect(codeHeader).toHaveAttribute("aria-sort", "ascending");
  await expect(dataTable.getByRole("cell", { name: "ART-0540" })).toBeVisible();

  await dataTable.getByRole("button", { name: /next page/i }).click();
  await expect(dataTable.getByText("Página 2 de 3")).toBeVisible();
  await expect(dataTable.getByRole("cell", { name: "ART-2013" })).toBeVisible();

  await page.getByRole("button", { name: "Simular carga" }).click();
  await expect(dataTable.getByRole("status")).toContainText("Actualizando datos...");
  await expect(dataTable.getByRole("cell", { name: "ART-2013" })).toBeVisible();

  await page.getByRole("button", { name: "Simular error" }).click();
  await expect(dataTable.getByRole("alert")).toContainText("Error de carga de ejemplo.");
  await expect(dataTable.getByRole("cell", { name: "ART-2013" })).toBeVisible();

  await page.getByRole("button", { name: "Vaciar tabla" }).click();
  await expect(dataTable.getByRole("status")).toContainText("No hay datos para mostrar.");
  await expect(dataTable.getByText("0 de 0 páginas")).toBeVisible();
  await expect(dataTable.getByRole("table")).toHaveCount(0);

  await page.getByRole("button", { name: "Simular carga" }).click();
  await expect(dataTable.getByRole("status")).toContainText("Cargando datos...");
  await expect(dataTable.getByRole("table")).toHaveCount(0);

  await page.getByRole("button", { name: "Simular error" }).click();
  await expect(dataTable.getByRole("alert")).toContainText("Error de carga de ejemplo.");
  await expect(dataTable.getByRole("table")).toHaveCount(0);

  await page.getByRole("button", { name: "Restablecer tabla" }).click();
  await expect(dataTable.getByText("Página 1 de 3")).toBeVisible();
  await expect(dataTable.getByRole("cell", { name: "ART-2048" })).toBeVisible();
  expect(apiRequests).toEqual([]);
});
