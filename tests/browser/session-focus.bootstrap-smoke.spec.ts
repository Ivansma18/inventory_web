import { expect, test, type Page } from "@playwright/test";

const harnessPath = "/tests/browser/fixtures/session-focus-harness.html";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

interface JsonResponse {
  status: number;
  contentType: string;
  body: string;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

const jsonResponse = (status: number, body: unknown): JsonResponse => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const publicSession = () => ({
  data: {
    user: { id: "focus-user", email: "operator@example.com", role: "OPERATOR" },
    session: { id: "focus-session", createdAt: "2026-01-01T00:00:00.000Z" },
  },
});

const unauthorizedResponse = () => ({
  error: { code: "UNAUTHORIZED", message: "No active session." },
});

const openDrawerAndBeginRefresh = async (page: Page) => {
  const refreshStarted = deferred<void>();
  const refreshResponse = deferred<JsonResponse>();
  let sessionRequests = 0;

  await page.route("**/api/auth/get-session", async (route) => {
    sessionRequests += 1;
    if (sessionRequests === 1) {
      await route.fulfill(jsonResponse(200, publicSession()));
      return;
    }

    refreshStarted.resolve();
    await route.fulfill(await refreshResponse.promise);
  });

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(harnessPath);
  await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();

  await page.getByRole("button", { name: "Abrir navegación" }).click();
  const drawer = page.getByRole("dialog", { name: "Navegación principal" });
  const root = page.locator("#root");
  await expect(drawer).toBeVisible();
  await expect(root).toHaveAttribute("inert", "");

  await page.evaluate(() => window.dispatchEvent(new Event("inventory:test:refetch-session")));
  await refreshStarted.promise;

  const checkingHeading = page.getByRole("heading", {
    level: 1,
    name: "Comprobando tu sesión",
  });
  await expect(checkingHeading).toBeVisible();
  await expect(checkingHeading).toBeFocused();
  const checkingAnnouncement = page.getByRole("status");
  await expect(checkingAnnouncement).toHaveCount(1);
  await expect(checkingAnnouncement).toHaveAttribute("aria-live", "polite");
  await expect(checkingAnnouncement).toHaveAttribute("aria-atomic", "true");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(drawer).toHaveCount(0);
  await expect(root).not.toHaveAttribute("inert");
  await expect(root).not.toHaveAttribute("aria-hidden");

  return { checkingHeading, drawer, refreshResponse, root };
};

test("closes and unlocks the panel while a session refresh is pending", async ({ page }) => {
  const { refreshResponse, root } = await openDrawerAndBeginRefresh(page);

  await expect(root).not.toHaveAttribute("inert");
  refreshResponse.resolve(jsonResponse(200, publicSession()));
  await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link"),
  ).toHaveText(["Inicio", "Productos", "Categorías"]);
});

test("moves focus to the error heading when an open panel is replaced by an error", async ({
  page,
}) => {
  const { drawer, refreshResponse, root } = await openDrawerAndBeginRefresh(page);

  refreshResponse.resolve(
    jsonResponse(503, {
      error: { code: "INTERNAL", message: "Internal error." },
    }),
  );

  const errorHeading = page.getByRole("heading", {
    level: 1,
    name: "No se pudo comprobar la sesión",
  });
  await expect(errorHeading).toBeVisible();
  await expect(errorHeading).toBeFocused();
  const errorAnnouncement = page.getByRole("alert");
  await expect(errorAnnouncement).toHaveCount(1);
  await expect(errorAnnouncement).toHaveAttribute("aria-live", "assertive");
  await expect(errorAnnouncement).toHaveAttribute("aria-atomic", "true");
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(drawer).toHaveCount(0);
  await expect(root).not.toHaveAttribute("inert");
  await expect(root).not.toHaveAttribute("aria-hidden");
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
});

test("moves focus to the signed-out heading when an open panel is replaced by 401", async ({
  page,
}) => {
  const { drawer, refreshResponse, root } = await openDrawerAndBeginRefresh(page);

  refreshResponse.resolve(jsonResponse(401, unauthorizedResponse()));

  const signedOutHeading = page.getByRole("heading", {
    level: 1,
    name: "Sesión no iniciada",
  });
  await expect(signedOutHeading).toBeVisible();
  await expect(signedOutHeading).toBeFocused();
  const signedOutAnnouncement = page.getByRole("status");
  await expect(signedOutAnnouncement).toHaveCount(1);
  await expect(signedOutAnnouncement).toHaveAttribute("aria-live", "polite");
  await expect(signedOutAnnouncement).toHaveAttribute("aria-atomic", "true");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(drawer).toHaveCount(0);
  await expect(root).not.toHaveAttribute("inert");
  await expect(root).not.toHaveAttribute("aria-hidden");
  await expect(page.getByRole("button", { name: "Reintentar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toHaveCount(0);
});
