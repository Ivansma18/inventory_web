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
