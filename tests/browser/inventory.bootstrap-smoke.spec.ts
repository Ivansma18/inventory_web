import { expect, test } from "@playwright/test";

test("renders the authenticated Inventory shell without business API requests", async ({
  page,
}) => {
  let sessionRequests = 0;
  let businessRequests = 0;
  const apiRequests: string[] = [];

  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith("/api/")) {
      apiRequests.push(pathname);
    }
  });

  await page.route("**/api/auth/get-session", async (route) => {
    sessionRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "bootstrap-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "bootstrap-session", createdAt: "2026-01-01T00:00:00.000Z" },
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
  await expect(page.getByText("Aquí empieza tu jornada de trabajo.")).toBeVisible();
  await expect(page.getByText("operator@example.com")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  expect(sessionRequests).toBe(1);
  expect(businessRequests).toBe(0);
  expect(apiRequests).toEqual(["/api/auth/get-session"]);

  const harnessResponse = await page.request.get("/__auth-test");
  const harnessHtml = await harnessResponse.text();
  expect(harnessHtml).not.toContain("Auth test harness");
});
