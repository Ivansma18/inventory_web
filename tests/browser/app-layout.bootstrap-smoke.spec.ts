import { expect, test } from "@playwright/test";

for (const width of [360, 768, 1280]) {
  test(`composes App Shell regions and skip navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
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
    const main = page.getByRole("main");
    const skipLink = page.getByRole("link", { name: "Saltar al contenido" });

    await expect(banner).toContainText("operator@example.com");
    await expect(sidebar).toContainText("Inventory");
    await expect(
      main.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
    ).toBeVisible();
    await expect(skipLink).toHaveAttribute("href", "#main-content");

    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(main).toBeFocused();

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}
