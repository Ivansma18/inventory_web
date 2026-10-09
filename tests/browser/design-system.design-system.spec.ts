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
  await expect(page.locator("form, input")).toHaveCount(0);
  expect(apiRequests).toEqual([]);
});
