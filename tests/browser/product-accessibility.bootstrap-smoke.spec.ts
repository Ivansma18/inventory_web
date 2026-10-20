import { expect, test, type Locator, type Page } from "@playwright/test";

const productUuid = "550e8400-e29b-41d4-a716-446655440001";
const categoryUuid = "550e8400-e29b-41d4-a716-446655440000";

const product = {
  uuid: productUuid,
  sku: "SKU-A11Y-001",
  name: "Producto para revisión accesible",
  description: "Producto simulado para comprobar accesibilidad contextual.",
  purchasePrice: 25.5,
  salePrice: 31.25,
  categoryUuid,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockAuthenticatedSession = async (page: Page) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "product-a11y-user", email: "operator@example.com", role: "OPERATOR" },
          session: { id: "product-a11y-session", createdAt: "2026-01-01T00:00:00.000Z" },
        },
      }),
    });
  });

  await page.route("**/api/backend/categories**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            uuid: categoryUuid,
            name: "Categoría de revisión",
            description: null,
            isActive: true,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        pagination: { total: 1, page: 1, limit: 15 },
      }),
    });
  });

  await page.route("**/api/backend/products**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const isDetailRequest = requestUrl.pathname.endsWith(`/${productUuid}`);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        isDetailRequest
          ? { data: product }
          : { data: [product], pagination: { total: 1, page: 1, limit: 15 } },
      ),
    });
  });
};

const sampleContextualTextContrast = async (page: Page, selectors: string[]) =>
  page.evaluate((targets) => {
    const readColor = (color: string) => {
      const channels = color
        .match(/[\d.]+/g)
        ?.slice(0, 3)
        .map(Number);
      if (!channels || channels.length !== 3) {
        throw new Error(`Cannot read computed color: ${color}`);
      }

      return channels;
    };
    const luminance = (color: string) =>
      readColor(color)
        .map((channel) => {
          const srgb = channel / 255;
          return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index]!, 0);
    const backgroundFor = (element: Element) => {
      let current: Element | null = element;
      while (current) {
        const background = getComputedStyle(current).backgroundColor;
        if (background !== "rgba(0, 0, 0, 0)" && background !== "transparent") {
          return background;
        }
        current = current.parentElement;
      }

      throw new Error("No opaque background was found for a contrast target.");
    };

    return targets.map((selector) => {
      const element = document.querySelector(selector);
      if (!element) {
        throw new Error(`Missing contextual contrast target: ${selector}`);
      }

      const foreground = getComputedStyle(element).color;
      const background = backgroundFor(element);
      const luminances = [luminance(foreground), luminance(background)].sort(
        (left, right) => right - left,
      );

      return {
        selector,
        foreground,
        background,
        ratio: (luminances[0]! + 0.05) / (luminances[1]! + 0.05),
      };
    });
  }, selectors);

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

test("measures product-list text contrast in rendered contexts and supports keyboard editing", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await page.goto("/products");

  const productRow = page.locator('[role="row"]').filter({ hasText: product.sku });
  await expect(productRow).toBeVisible();

  const contrastSamples = await sampleContextualTextContrast(page, [
    ".product-page__heading",
    ".product-list__summary",
    ".ui-input__label",
    ".ui-input__help",
    ".ui-select__label",
    ".ui-badge--success",
    ".ui-data-table tbody td",
    ".ui-button--secondary",
  ]);

  for (const sample of contrastSamples) {
    expect(
      sample.ratio,
      `${sample.selector}: ${sample.foreground} on ${sample.background}`,
    ).toBeGreaterThanOrEqual(4.5);
  }

  const editButton = productRow.getByRole("button", { name: "Editar" });
  await editButton.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(editButton).toBeFocused();
  await expectVisibleFocusIndicator(editButton);
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(new RegExp(`/products/${productUuid}/edit`));
  await expect(page.getByRole("heading", { level: 1, name: "Editar producto" })).toBeFocused();
});

test("associates validation errors and focuses the first invalid field by keyboard", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await page.goto("/products/new");

  const sku = page.getByRole("textbox", { name: "SKU (obligatorio)" });
  const category = page.getByRole("textbox", { name: "Categoría (obligatorio)" });
  await expect(category).toBeVisible();

  await page.getByRole("button", { name: "Crear producto" }).focus();
  await page.keyboard.press("Enter");

  const skuError = page.getByText("El SKU es obligatorio.");
  await expect(sku).toBeFocused();
  await expect(sku).toHaveAttribute("aria-invalid", "true");
  await expect(sku).toHaveAccessibleDescription("El SKU es obligatorio.");
  await expect(skuError).toBeVisible();
  await expectVisibleFocusIndicator(sku);

  const contrastSamples = await sampleContextualTextContrast(page, [
    ".product-page__heading",
    ".product-create-form__intro",
    ".ui-input__label",
    ".ui-input__help",
    ".ui-input__error",
    ".ui-select__label",
    ".ui-button--primary",
  ]);

  for (const sample of contrastSamples) {
    expect(
      sample.ratio,
      `${sample.selector}: ${sample.foreground} on ${sample.background}`,
    ).toBeGreaterThanOrEqual(4.5);
  }
});

test("moves focus to the first invalid product field when saving an edit by keyboard", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await page.goto(`/products/${productUuid}/edit`);

  const sku = page.getByRole("textbox", { name: "SKU (obligatorio)" });
  await expect(sku).toHaveValue(product.sku);
  await sku.fill("");

  await page.getByRole("button", { name: "Guardar cambios" }).focus();
  await page.keyboard.press("Enter");

  await expect(sku).toBeFocused();
  await expect(sku).toHaveAttribute("aria-invalid", "true");
  await expect(sku).toHaveAccessibleDescription("El SKU es obligatorio.");
  await expectVisibleFocusIndicator(sku);
});
