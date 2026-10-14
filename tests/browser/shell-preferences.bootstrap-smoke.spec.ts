import { expect, test, type Page } from "@playwright/test";

const storageKey = "inventory.shell.preferences.v1";

const mockAuthenticatedSession = async (page: Page) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "preferences-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "preferences-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });
};

test("persists the sidebar preference across reload and another page in the same context", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockAuthenticatedSession(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();
  const collapseButton = page.getByRole("button", { name: "Contraer navegación" });
  await expect(collapseButton).toHaveAttribute("aria-expanded", "true");
  await collapseButton.click();
  await expect(page.getByRole("button", { name: "Expandir navegación" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );

  const expectedPreference = { state: { sidebarCollapsed: true }, version: 1 };
  const savedPreference = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  expect(JSON.parse(savedPreference ?? "null")).toEqual(expectedPreference);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([storageKey]);

  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Expandir navegación" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );

  const secondPage = await context.newPage();
  await secondPage.setViewportSize({ width: 1280, height: 800 });
  await mockAuthenticatedSession(secondPage);
  await secondPage.goto("/");

  await expect(
    secondPage.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();
  await expect(secondPage.getByRole("button", { name: "Expandir navegación" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  const secondPagePreference = await secondPage.evaluate(
    (key) => localStorage.getItem(key),
    storageKey,
  );
  expect(JSON.parse(secondPagePreference ?? "null")).toEqual(expectedPreference);
  expect(await secondPage.evaluate(() => Object.keys(localStorage))).toEqual([storageKey]);
  await secondPage.close();
});

test("keeps Home and sidebar controls usable with invalid stored preferences", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => localStorage.setItem("inventory.shell.preferences.v1", "{"));
  await mockAuthenticatedSession(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Contraer navegación" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.getByRole("button", { name: "Contraer navegación" }).click();
  await expect(page.getByRole("button", { name: "Expandir navegación" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );

  await page.evaluate((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({ state: { sidebarCollapsed: "collapsed" }, version: 1 }),
    );
  }, storageKey);
  await page.reload();

  await expect(
    page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
  ).toBeVisible();
  const restoredExpandedButton = page.getByRole("button", { name: "Contraer navegación" });
  await expect(restoredExpandedButton).toHaveAttribute("aria-expanded", "true");
  await restoredExpandedButton.click();
  await expect(page.getByRole("button", { name: "Expandir navegación" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );

  const correctedPreference = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  expect(JSON.parse(correctedPreference ?? "null")).toEqual({
    state: { sidebarCollapsed: true },
    version: 1,
  });
});
