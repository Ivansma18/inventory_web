import { expect, test } from "@playwright/test";

const harnessPath = "/tests/browser/fixtures/dialog-harness.html";

test("dialog names itself and contains keyboard focus in Chromium", async ({ page }) => {
  await page.goto(harnessPath);

  const dialog = page.getByRole("dialog", { name: "Focus dialog" });
  const firstControl = page.getByRole("button", { name: "First control" });
  const lastControl = page.getByRole("button", { name: "Last control" });

  await expect(dialog).toBeVisible();
  await expect(firstControl).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(lastControl).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(firstControl).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(lastControl).toBeFocused();
});

test("dialog focuses its accessible title when there are no controls", async ({ page }) => {
  await page.goto(`${harnessPath}?empty`);

  const dialog = page.getByRole("dialog", { name: "Focus dialog" });
  const title = page.getByRole("heading", { name: "Focus dialog" });

  await expect(dialog).toBeVisible();
  await expect(title).toBeFocused();
});
