import { expect, test } from "@playwright/test";

const appHeaderHarnessPath = "/tests/browser/fixtures/app-header-harness.html";

for (const width of [360, 768, 1280]) {
  test(`keeps a long identity and its action visible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(appHeaderHarnessPath);

    const identity = page.getByText("operadora-de-inventario-con-identificador-largo@example.com");
    const action = page.getByRole("button", { name: "Acción de cuenta" });
    await expect(identity).toBeVisible();
    await expect(identity).toHaveAttribute(
      "title",
      "operadora-de-inventario-con-identificador-largo@example.com",
    );
    await expect(action).toBeVisible();

    const actionBounds = await action.boundingBox();
    expect(actionBounds).not.toBeNull();
    expect((actionBounds?.x ?? width) + (actionBounds?.width ?? 0)).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}
