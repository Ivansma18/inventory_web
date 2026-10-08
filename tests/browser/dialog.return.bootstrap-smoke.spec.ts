import { expect, test } from "@playwright/test";

const harnessPath = "/tests/browser/fixtures/dialog-return-harness.html";

const openRemoveOpenerAndClose = async (page: import("@playwright/test").Page, search = "") => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${harnessPath}${search}`);
  const opener = page.getByTestId("dialog-opener");

  await opener.click();
  await expect(page.getByRole("dialog", { name: "Focus return dialog" })).toBeVisible();
  await page.getByRole("button", { name: "Remove opener" }).click();
  await expect(opener).not.toBeAttached();
  const fallback = page.getByTestId("dialog-focus-fallback");
  await expect(fallback).toBeAttached();
  await expect(fallback).toHaveAttribute("tabindex", "0");
  await page.keyboard.press("Escape");
  await expect(fallback).toBeAttached();
  await expect(fallback).toHaveAttribute("tabindex", "0");
  await expect(page.getByRole("dialog", { name: "Focus return dialog" })).not.toBeVisible();
  expect(pageErrors).toEqual([]);
};

test("returns focus to the opener when it remains available", async ({ page }) => {
  await page.goto(harnessPath);
  const opener = page.getByTestId("dialog-opener");

  await opener.click();
  await expect(page.getByRole("dialog", { name: "Focus return dialog" })).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(opener).toBeFocused();
});

test("uses the page header when the opener is removed", async ({ page }) => {
  await openRemoveOpenerAndClose(page);

  await expect(page.getByTestId("page-header")).toBeFocused();
});

test("uses main when the opener and page header are unavailable", async ({ page }) => {
  await openRemoveOpenerAndClose(page, "?no-header");

  await expect(page.getByTestId("page-main")).toBeFocused();
});

test("uses the first page control when neither header nor main is available", async ({ page }) => {
  await openRemoveOpenerAndClose(page, "?no-header&no-main");

  await expect(page.getByTestId("page-action")).toBeFocused();
});

test("uses the required fallback when no other destination remains", async ({ page }) => {
  await openRemoveOpenerAndClose(page, "?no-header&no-main&no-interactive");

  await expect(page.getByTestId("dialog-focus-fallback")).toBeFocused();
});
