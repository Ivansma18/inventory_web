import { expect, test } from "@playwright/test";

const drawerHarnessPath = "/tests/browser/fixtures/drawer-harness.html";

test("keeps Drawer within a short mobile viewport and scrolls its content internally", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 320 });
  await page.goto(drawerHarnessPath);

  const drawer = page.getByRole("dialog", { name: "Drawer de navegación" });
  const content = page.locator(".ui-drawer__content");
  await expect(drawer).toBeVisible();

  const bounds = await drawer.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds?.width).toBeLessThanOrEqual(360);
  expect(bounds?.height).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(320);

  const colors = await drawer.evaluate((element) => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--ui-color-surface)";
    document.body.appendChild(probe);
    const tokenColor = window.getComputedStyle(probe).backgroundColor;
    probe.remove();

    return { backgroundColor: window.getComputedStyle(element).backgroundColor, tokenColor };
  });
  expect(colors.backgroundColor).toBe(colors.tokenColor);

  await content.hover();
  await page.mouse.wheel(0, 5_000);
  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(page.getByTestId("drawer-end")).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("respects reduced motion while keeping the Drawer content available", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 600 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(drawerHarnessPath);

  const drawer = page.getByRole("dialog", { name: "Drawer de navegación" });
  await expect(drawer).toBeVisible();
  await expect(page.getByTestId("drawer-end")).toBeAttached();

  const transitionDurationMs = await drawer.evaluate((element) => {
    const value = window.getComputedStyle(element).transitionDuration.split(",")[0].trim();
    return value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000;
  });
  expect(transitionDurationMs).toBeLessThanOrEqual(1);
});
