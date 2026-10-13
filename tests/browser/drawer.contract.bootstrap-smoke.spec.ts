import { expect, test } from "@playwright/test";

const drawerHarnessPath = "/tests/browser/fixtures/drawer-contract-harness.html";

test("moves focus into Drawer and contains Tab and Shift+Tab", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(drawerHarnessPath);

  const opener = page.getByRole("button", { name: "Abrir navegación" });
  await opener.click();

  const drawer = page.getByRole("dialog", { name: "Navegación principal" });
  const closeButton = page.getByRole("button", { name: "Cerrar panel" });
  const lastPanelControl = page.getByRole("button", { name: "Último control del panel" });

  await expect(drawer).toHaveAttribute("aria-modal", "true");
  await expect(closeButton).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(lastPanelControl).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();

  const root = page.locator("#root");
  await expect(root).toHaveAttribute("inert", "");
  await expect(root).toHaveAttribute("aria-hidden", "true");

  await page.getByTestId("outside-action").click({ force: true });
  await expect(page.getByTestId("outside-action-count")).toHaveText("0");
});

test("closes by button, Escape, or backdrop and restores focus and page interaction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(drawerHarnessPath);

  const opener = page.getByRole("button", { name: "Abrir navegación" });
  const root = page.locator("#root");

  for (const closeMethod of ["button", "escape", "backdrop"] as const) {
    await opener.click();
    const drawer = page.getByRole("dialog", { name: "Navegación principal" });
    await expect(drawer).toBeVisible();
    await expect(root).toHaveAttribute("inert", "");

    if (closeMethod === "button") {
      await page.getByRole("button", { name: "Cerrar panel" }).click();
    } else if (closeMethod === "escape") {
      await page.keyboard.press("Escape");
    } else {
      await page.mouse.click(900, 400);
    }

    await expect(drawer, `close method: ${closeMethod}`).toBeHidden();
    await expect(opener).toBeFocused();
    await expect(root).not.toHaveAttribute("inert");
    await expect(root).not.toHaveAttribute("aria-hidden");
    await expect
      .poll(() => page.evaluate(() => window.getComputedStyle(document.body).overflowY))
      .not.toBe("hidden");
  }

  await expect(page.getByTestId("close-request-count")).toHaveText("3");
});

test("resolves focus to a destination link or page heading selected by the consumer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(drawerHarnessPath);

  const opener = page.getByRole("button", { name: "Abrir navegación" });
  const destinationLink = page.getByRole("link", { name: "Destino activo" });

  await opener.click();
  await page.getByRole("link", { name: "Seleccionar destino" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(destinationLink).toBeFocused();

  await opener.click();
  await page.getByRole("button", { name: "Mostrar encabezado de destino" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Destino actualizado" })).toBeFocused();
});
