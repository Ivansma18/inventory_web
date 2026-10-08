import { expect, test } from "@playwright/test";

const harnessPath = "/tests/browser/fixtures/data-table-harness.html";

test("sorts and changes pages with keyboard navigation in Chromium", async ({ page }) => {
  await page.goto(harnessPath);

  const sortableHeader = page.getByRole("columnheader", { name: "Nombre" });
  await sortableHeader.focus();
  await page.keyboard.press("Enter");
  await expect(sortableHeader).toHaveAttribute("aria-sort", "ascending");

  await page.getByRole("columnheader", { name: "Referencia" }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Page 1" })).toBeFocused();
  await page.keyboard.press("Tab");
  const secondPage = page.getByRole("button", { name: "Page 2" });
  await expect(secondPage).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByText("Página 2 de 5")).toBeVisible();
  await expect(page.getByRole("cell", { name: "SKU-10" })).toBeVisible();
});

test("keeps a wide table scrollable locally at 360 pixels without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(harnessPath);

  const viewport = page.locator(".ui-data-table-viewport");
  await expect(page.getByRole("table")).toBeVisible();
  await viewport.hover();
  await page.mouse.wheel(700, 0);

  const horizontalState = () =>
    viewport.evaluate((element) => {
      const candidates = [element, ...element.querySelectorAll<HTMLElement>("*")];
      const scrollable = candidates.filter((candidate) => {
        const overflowX = getComputedStyle(candidate).overflowX;
        return candidate.scrollWidth > candidate.clientWidth && /auto|scroll/.test(overflowX);
      });

      return {
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        hasLocalOverflow: scrollable.length > 0,
        localScrollMoved: scrollable.some((candidate) => candidate.scrollLeft > 0),
      };
    });

  await expect.poll(horizontalState).toMatchObject({
    hasLocalOverflow: true,
    localScrollMoved: true,
    pageWidth: 360,
    viewportWidth: 360,
  });
});
