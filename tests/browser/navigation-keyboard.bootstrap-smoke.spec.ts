import { expect, test, type Locator, type Page } from "@playwright/test";

const expectVisibleFocusIndicator = async (locator: Locator) => {
  const focusStyle = await locator.evaluate((element) => {
    const { outlineColor, outlineStyle, outlineWidth } = getComputedStyle(element);
    return { outlineColor, outlineStyle, outlineWidth };
  });

  expect(focusStyle).toEqual({
    outlineColor: "rgb(39, 103, 109)",
    outlineStyle: "solid",
    outlineWidth: "2px",
  });
};

const authenticatePage = async (page: Page) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "keyboard-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "keyboard-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });
};

for (const width of [360, 768]) {
  test(`operates compact navigation by keyboard at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await authenticatePage(page);
    await page.goto("/not-registered");

    const skipLink = page.getByRole("link", { name: "Saltar al contenido" });
    const opener = page.getByRole("button", { name: "Abrir navegación" });
    const root = page.locator("#root");
    await expect(opener).toHaveAttribute("aria-expanded", "false");
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(opener).toBeFocused();
    await expectVisibleFocusIndicator(opener);
    await page.keyboard.press("Enter");

    const drawer = page.getByRole("dialog", { name: "Navegación principal" });
    const closeButton = page.getByRole("button", { name: "Cerrar panel" });
    const openerElement = page.locator('button[aria-label="Abrir navegación"]');
    const homeLink = page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Inicio", exact: true });
    const productsLink = page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Productos", exact: true });
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute("aria-modal", "true");
    await expect(openerElement).toHaveAttribute("aria-expanded", "true");
    await expect(homeLink).not.toHaveAttribute("aria-current");
    await expect(closeButton).toBeFocused();
    await expect(root).toHaveAttribute("inert", "");

    await page.keyboard.press("Shift+Tab");
    await expect(productsLink).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(homeLink).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(productsLink).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();
    await page.keyboard.press("Escape");

    await expect(drawer).toBeHidden();
    await expect(opener).toHaveAttribute("aria-expanded", "false");
    await expect(opener).toBeFocused();
    await expect(root).not.toHaveAttribute("inert");

    await page.keyboard.press("Enter");
    await expect(closeButton).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(homeLink).toBeFocused();
    await page.keyboard.press("Enter");

    const homeHeading = page.getByRole("heading", {
      level: 1,
      name: "Bienvenido a Inventory",
    });
    await expect(drawer).toBeHidden();
    await expect(page).toHaveURL(/\/$/);
    await expect(homeHeading).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}

test("tabs through collapsed persistent navigation and exposes its tooltip", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "inventory.shell.preferences.v1",
      JSON.stringify({ state: { sidebarCollapsed: true }, version: 1 }),
    );
  });
  await authenticatePage(page);
  await page.goto("/");

  const skipLink = page.getByRole("link", { name: "Saltar al contenido" });
  const expandButton = page.getByRole("button", { name: "Expandir navegación" });
  const homeLink = page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name: "Inicio", exact: true });

  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(expandButton).toBeFocused();
  await expectVisibleFocusIndicator(expandButton);
  await page.keyboard.press("Tab");
  await expect(homeLink).toBeFocused();
  await expectVisibleFocusIndicator(homeLink);
  await expect(homeLink).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("tooltip")).toHaveText("Inicio");
  await page.keyboard.press("Shift+Tab");
  await expect(expandButton).toBeFocused();
  await page.keyboard.press("Enter");
  const collapseButton = page.getByRole("button", { name: "Contraer navegación" });
  await expect(collapseButton).toHaveAttribute("aria-expanded", "true");
  await expect(collapseButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Expandir navegación" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
});
