import { expect, test } from "@playwright/test";

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

const deferred = (): Deferred => {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

const publicSession = (userId: string) => ({
  data: {
    user: { id: userId, email: "operator@example.com", role: "OPERATOR" },
    session: { id: `session-${userId}`, createdAt: "2026-01-01T00:00:00.000Z" },
  },
});

test("keeps the initial shell pending until Auth confirms a 401", async ({ page }) => {
  const requestStarted = deferred();
  const responseGate = deferred();
  const requestedUrl = "/not-registered?source=pending#row-7";

  await page.route("**/api/auth/get-session", async (route) => {
    requestStarted.resolve();
    await responseGate.promise;
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "UNAUTHORIZED", message: "No active session." } }),
    });
  });

  await page.goto(requestedUrl);
  await requestStarted.promise;

  await expect(page.getByRole("status")).toContainText("Comprobando tu sesión");
  await expect(page.getByRole("status")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveAttribute("aria-live", "polite");
  await expect(page.getByRole("status")).toHaveAttribute("aria-atomic", "true");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Página no encontrada" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Bienvenido a Inventory" })).toHaveCount(0);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toHaveCount(0);

  responseGate.resolve();

  await expect(page.getByRole("heading", { level: 1, name: "Sesión no iniciada" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveAttribute("aria-live", "polite");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Página no encontrada" })).toHaveCount(0);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("link")).toHaveCount(0);
  await expect(page).toHaveURL(/\/not-registered\?source=pending#row-7$/);
});

test("recovers from network, HTTP, and contract failures through the public retry action", async ({
  page,
}) => {
  let sessionRequests = 0;
  const requestedUrl = "/requested/report?filter=low-stock#row-7";

  await page.route("**/api/auth/get-session", async (route) => {
    sessionRequests += 1;
    if (sessionRequests === 1) {
      await route.abort("failed");
      return;
    }

    if (sessionRequests === 2) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "INTERNAL", message: "Internal error." } }),
      });
      return;
    }

    if (sessionRequests === 3) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { user: { id: "incomplete-user" }, session: {} } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(publicSession("recovered-user")),
    });
  });

  await page.goto(requestedUrl);
  await expect(
    page.getByRole("heading", { level: 1, name: "No se pudo comprobar la sesión" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
  await expect(page.getByRole("alert")).toHaveCount(1);
  await expect(page.getByRole("alert")).toHaveAttribute("aria-atomic", "true");
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Página no encontrada" })).toHaveCount(0);
  expect(sessionRequests).toBe(1);

  for (const expectedRequestCount of [2, 3]) {
    const response = page.waitForResponse(
      (candidate) => new URL(candidate.url()).pathname === "/api/auth/get-session",
    );
    await page.getByRole("button", { name: "Reintentar" }).click();
    await response;

    await expect(
      page.getByRole("heading", { level: 1, name: "No se pudo comprobar la sesión" }),
    ).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(1);
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Página no encontrada" })).toHaveCount(0);
    expect(sessionRequests).toBe(expectedRequestCount);
  }

  const recoveryResponse = page.waitForResponse(
    (candidate) => new URL(candidate.url()).pathname === "/api/auth/get-session",
  );
  await page.getByRole("button", { name: "Reintentar" }).click();
  await recoveryResponse;

  await expect(page).toHaveURL(/\/requested\/report\?filter=low-stock#row-7$/);
  await expect(page.getByRole("banner")).toContainText("operator@example.com");
  const recoveredPageHeading = page.getByRole("heading", {
    level: 1,
    name: "Página no encontrada",
  });
  await expect(recoveredPageHeading).toBeVisible();
  await expect(recoveredPageHeading).toBeFocused();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByRole("link", { name: "Volver a Inicio" })).toBeVisible();
  expect(sessionRequests).toBe(4);
});
