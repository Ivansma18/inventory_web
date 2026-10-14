import { expect, test } from "@playwright/test";

const appPagesHarnessPath = "/tests/browser/fixtures/app-pages-harness.html";

for (const width of [360, 768, 1280]) {
  test(`renders Home and Not Found without overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });

    await page.goto(`${appPagesHarnessPath}?page=home`);
    const homeHeading = page.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" });
    await expect(homeHeading).toBeVisible();
    await homeHeading.focus();
    await expect(homeHeading).toBeFocused();
    await expect(page.getByText("Aquí empieza tu jornada de trabajo.")).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);

    let dimensions = await page.evaluate(() => ({
      documentHeight: document.documentElement.scrollHeight,
      documentWidth: document.documentElement.scrollWidth,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    expect(dimensions.documentHeight).toBeLessThanOrEqual(dimensions.viewportHeight);

    await page.goto(`${appPagesHarnessPath}?page=missing`);
    const notFoundHeading = page.getByRole("heading", {
      level: 1,
      name: "Página no encontrada",
    });
    await expect(notFoundHeading).toBeVisible();
    await notFoundHeading.focus();
    await expect(notFoundHeading).toBeFocused();

    const returnLink = page.getByRole("link", { name: "Volver a Inicio" });
    await expect(returnLink).toBeVisible();
    await returnLink.click();
    await expect(page.getByTestId("current-path")).toHaveText("/");

    dimensions = await page.evaluate(() => ({
      documentHeight: document.documentElement.scrollHeight,
      documentWidth: document.documentElement.scrollWidth,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    expect(dimensions.documentHeight).toBeLessThanOrEqual(dimensions.viewportHeight);
  });
}
