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

test("waits for logout, retries a failure, and keeps the session closed in browser history", async ({
  page,
}) => {
  const firstSignOutStarted = deferred();
  const firstSignOutResponse = deferred();
  const secondSignOutStarted = deferred();
  const secondSignOutResponse = deferred();
  let signOutRequests = 0;

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "logout-flow-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "logout-flow-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });
  await page.route("**/api/auth/sign-out", async (route) => {
    signOutRequests += 1;
    if (signOutRequests === 1) {
      firstSignOutStarted.resolve();
      await firstSignOutResponse.promise;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "INTERNAL", message: "Internal error." } }),
      });
      return;
    }

    if (signOutRequests === 2) {
      secondSignOutStarted.resolve();
      await secondSignOutResponse.promise;
      await route.fulfill({ status: 204 });
      return;
    }

    throw new Error("Unexpected duplicate logout request.");
  });

  await page.goto("/not-registered");
  await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();
  await page.getByRole("link", { name: "Volver a Inicio" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await firstSignOutStarted.promise;

  const pendingButton = page.getByRole("button", { name: "Cerrando sesión…" });
  await expect(pendingButton).toHaveAttribute("aria-disabled", "true");
  await expect(pendingButton).not.toHaveAttribute("disabled");
  await expect(pendingButton).toHaveAttribute("aria-busy", "true");
  await expect(pendingButton).toBeFocused();
  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();
  await expect(page.getByRole("banner")).toContainText("operator@example.com");
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link"),
  ).toHaveText(["Inicio", "Productos", "Categorías"]);
  await expect(page.getByRole("heading", { name: "Sesión no iniciada" })).toHaveCount(0);
  expect(signOutRequests).toBe(1);

  await pendingButton.evaluate((button: HTMLButtonElement) => button.click());
  expect(signOutRequests).toBe(1);

  firstSignOutResponse.resolve();
  await expect(page.getByRole("alert")).toHaveText("No se pudo cerrar sesión. Inténtalo de nuevo.");
  await expect(page.getByRole("alert")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveCount(0);
  const retryLogoutButton = page.getByRole("button", { name: "Cerrar sesión", exact: true });
  await expect(retryLogoutButton).toBeEnabled();
  await expect(retryLogoutButton).toBeFocused();
  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();
  await expect(page.getByRole("banner")).toContainText("operator@example.com");

  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await secondSignOutStarted.promise;
  const retryPendingButton = page.getByRole("button", { name: "Cerrando sesión…" });
  await expect(retryPendingButton).toHaveAttribute("aria-disabled", "true");
  await expect(retryPendingButton).not.toHaveAttribute("disabled");
  await expect(retryPendingButton).toHaveAttribute("aria-busy", "true");
  await expect(retryPendingButton).toBeFocused();
  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();
  expect(signOutRequests).toBe(2);

  secondSignOutResponse.resolve();
  const signedOutHeading = page.getByRole("heading", { level: 1, name: "Sesión no iniciada" });
  await expect(signedOutHeading).toBeVisible();
  await expect(signedOutHeading).toBeFocused();
  await expect(page.getByRole("status")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveAttribute("aria-live", "polite");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cerrar sesión", exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Bienvenido a Inventory" })).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(signOutRequests).toBe(2);

  await page.goBack();
  await expect(page).toHaveURL(/\/not-registered$/);
  await expect(page.getByRole("heading", { level: 1, name: "Sesión no iniciada" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Página no encontrada" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Bienvenido a Inventory" })).toHaveCount(0);
  await expect(page.getByRole("navigation")).toHaveCount(0);

  await page.goForward();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Sesión no iniciada" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bienvenido a Inventory" })).toHaveCount(0);
  expect(signOutRequests).toBe(2);
});
