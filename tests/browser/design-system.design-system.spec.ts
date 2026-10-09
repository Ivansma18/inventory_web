import { expect, test } from "@playwright/test";

test("opens the development Design System route without contacting the backend", async ({
  page,
}) => {
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
  expect(apiRequests).toEqual([]);
});
