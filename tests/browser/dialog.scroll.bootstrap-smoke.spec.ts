import { expect, test } from "@playwright/test";

const harnessPath = "/tests/browser/fixtures/dialog-return-harness.html?long";

test("keeps long content scrollable inside a short Dialog viewport", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 320 });
  await page.goto(harnessPath);

  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(320);

  await page.getByTestId("dialog-opener").click();
  const pageScrollWhenOpened = await page.evaluate(() => window.scrollY);

  const dialog = page.getByRole("dialog", { name: "Focus return dialog" });
  const content = page.locator(".ui-dialog__content");
  await expect(dialog).toBeVisible();

  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds?.height).toBeLessThanOrEqual(300);

  await content.hover();
  await page.mouse.wheel(0, 1200);

  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(page.getByTestId("dialog-end")).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBe(pageScrollWhenOpened);
});
