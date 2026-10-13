import { expect, test } from "@playwright/test";

for (const width of [360, 768, 1280]) {
  test(`composes App Shell regions and skip navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    if (width === 1280) {
      await page.addInitScript(() => {
        localStorage.setItem(
          "inventory.shell.preferences.v1",
          JSON.stringify({ state: { sidebarCollapsed: true }, version: 1 }),
        );
      });
    }

    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            user: { id: "layout-user", email: "operator@example.com", role: "OPERATOR" },
            session: { id: "layout-session", createdAt: "2026-01-01T00:00:00.000Z" },
          },
        }),
      });
    });

    await page.goto("/");

    const banner = page.getByRole("banner");
    const sidebar = page.getByRole("complementary", { name: "Barra lateral de Inventory" });
    const navigation = page.getByRole("navigation", { name: "Navegación principal" });
    const main = page.getByRole("main");
    const skipLink = page.getByRole("link", { name: "Saltar al contenido" });
    const homeLink = page.getByRole("link", { name: "Inicio", exact: true });

    await expect(banner).toContainText("operator@example.com");
    if (width >= 1024) {
      await expect(sidebar).toBeVisible();
      await expect(sidebar).toContainText("Inventory");
      await expect(navigation.getByRole("link")).toHaveCount(1);
      await expect(homeLink).toHaveAttribute("aria-current", "page");
      const expandButton = page.getByRole("button", { name: "Expandir navegación" });
      await expect(expandButton).toHaveAttribute("aria-expanded", "false");

      await homeLink.hover();
      await expect(page.getByRole("tooltip")).toHaveText("Inicio");
      await page.mouse.move(0, 0);
      await homeLink.focus();
      await expect(page.getByRole("tooltip")).toHaveText("Inicio");

      await expandButton.click();
      const collapseButton = page.getByRole("button", { name: "Contraer navegación" });
      await expect(collapseButton).toHaveAttribute("aria-expanded", "true");
      await collapseButton.click();
      await expect(page.getByRole("button", { name: "Expandir navegación" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem("inventory.shell.preferences.v1")))
        .toContain('"sidebarCollapsed":true');
      await page.reload();
      await expect(page.getByRole("button", { name: "Expandir navegación" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      await expect(page.getByRole("link", { name: "Inicio", exact: true })).toBeVisible();
    } else {
      await expect(sidebar).toHaveCount(0);
      await expect(navigation).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Abrir navegación" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    }
    await expect(
      main.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
    ).toBeVisible();
    await expect(skipLink).toHaveAttribute("href", "#main-content");

    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(main).toBeFocused();

    await page.goto("/not-registered");
    await expect(
      page.getByRole("heading", { level: 1, name: "Página no encontrada" }),
    ).toBeVisible();
    if (width >= 1024) {
      await expect(homeLink).not.toHaveAttribute("aria-current");
      await homeLink.focus();
      await page.keyboard.press("Enter");
    } else {
      await page.getByRole("link", { name: "Volver a Inicio" }).click();
    }
    await expect(
      page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
    ).toBeVisible();
    if (width >= 1024) {
      await expect(homeLink).toHaveAttribute("aria-current", "page");
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}

for (const width of [360, 768, 1023, 1024, 1280]) {
  test(`uses one responsive navigation mode at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() => {
      localStorage.setItem(
        "inventory.shell.preferences.v1",
        JSON.stringify({ state: { sidebarCollapsed: true }, version: 1 }),
      );
    });
    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            user: { id: "responsive-user", email: "operator@example.com", role: "OPERATOR" },
            session: { id: "responsive-session", createdAt: "2026-01-01T00:00:00.000Z" },
          },
        }),
      });
    });

    await page.goto("/");

    const opener = page.locator('button[aria-label="Abrir navegación"]');
    const navigation = page.getByRole("navigation", { name: "Navegación principal" });
    const navigationNodes = page.locator('nav[aria-label="Navegación principal"]');
    const savedPreferences = await page.evaluate(() =>
      localStorage.getItem("inventory.shell.preferences.v1"),
    );

    if (width < 1024) {
      await expect(navigationNodes).toHaveCount(0);
      await expect(
        page.getByRole("complementary", { name: "Barra lateral de Inventory" }),
      ).toHaveCount(0);
      await expect(opener).toBeVisible();
      await expect(opener).toHaveAttribute("aria-expanded", "false");
      await expect(navigation).toHaveCount(0);

      await opener.click();
      const drawer = page.getByRole("dialog", { name: "Navegación principal" });
      await expect(drawer).toBeVisible();
      await expect(opener).toHaveAttribute("aria-expanded", "true");
      await expect(navigation).toBeVisible();
      await expect(navigation.getByRole("link", { name: "Inicio" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(navigationNodes).toHaveCount(1);

      await page.getByRole("button", { name: "Cerrar panel" }).click();
      await expect(drawer).toBeHidden();
      await expect(opener).toHaveAttribute("aria-expanded", "false");
      await expect(opener).toBeFocused();
      await expect(navigation).toHaveCount(0);
    } else {
      await expect(
        page.getByRole("complementary", { name: "Barra lateral de Inventory" }),
      ).toBeVisible();
      await expect(navigationNodes).toHaveCount(1);
      await expect(navigation).toBeVisible();
      await expect(navigation.getByRole("link", { name: "Inicio" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(opener).toHaveCount(0);
      await expect(page.getByRole("dialog", { name: "Navegación principal" })).toHaveCount(0);
    }

    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("inventory.shell.preferences.v1")))
      .toBe(savedPreferences);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}

test("switches the navigation mode at the shared breakpoint without changing preferences", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 800 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "inventory.shell.preferences.v1",
      JSON.stringify({ state: { sidebarCollapsed: true }, version: 1 }),
    );
  });
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "resize-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "resize-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });

  await page.goto("/");

  const layout = page.locator(".app-layout");
  const navigationNodes = page.locator('nav[aria-label="Navegación principal"]');
  const opener = page.getByRole("button", { name: "Abrir navegación" });
  const preferencesBeforeResize = await page.evaluate(() =>
    localStorage.getItem("inventory.shell.preferences.v1"),
  );

  await expect(layout).toHaveAttribute("data-navigation-mode", "compact");
  await expect(opener).toBeVisible();
  await expect(navigationNodes).toHaveCount(0);

  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(layout).toHaveAttribute("data-navigation-mode", "persistent");
  await expect(
    page.getByRole("complementary", { name: "Barra lateral de Inventory" }),
  ).toBeVisible();
  await expect(navigationNodes).toHaveCount(1);
  await expect(opener).toHaveCount(0);

  await page.setViewportSize({ width: 1023, height: 800 });
  await expect(layout).toHaveAttribute("data-navigation-mode", "compact");
  await expect(opener).toBeVisible();
  await expect(navigationNodes).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("inventory.shell.preferences.v1")))
    .toBe(preferencesBeforeResize);
});
