import { expect, test } from "@playwright/test";

const authStateHarnessPath = "/tests/browser/fixtures/auth-state-harness.html";

const states = [
  {
    id: "checking",
    heading: "Comprobando tu sesión",
    message: "Estamos verificando tu acceso a Inventory.",
    role: "status",
    live: "polite",
  },
  {
    id: "error",
    heading: "No se pudo comprobar la sesión",
    message: "Comprueba tu conexión e inténtalo de nuevo.",
    role: "alert",
    live: "assertive",
  },
  {
    id: "signed-out",
    heading: "Sesión no iniciada",
    message: "No hay una sesión activa para esta aplicación.",
    role: "status",
    live: "polite",
  },
] as const;

for (const width of [360, 768, 1280]) {
  test(`presents session states accessibly without overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });

    for (const state of states) {
      await page.goto(`${authStateHarnessPath}?state=${state.id}`);

      await expect(page.getByRole("banner")).toHaveText("Inventory");
      await expect(page.getByRole("heading", { level: 1, name: state.heading })).toBeVisible();
      await expect(page.getByRole(state.role)).toContainText(state.message);
      await expect(page.getByRole(state.role)).toHaveAttribute("aria-live", state.live);
      await expect(page.getByRole("navigation")).toHaveCount(0);
      await expect(page.getByRole("link")).toHaveCount(0);
      await expect(page.getByRole("form")).toHaveCount(0);
      if (state.id === "error") {
        await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
      } else {
        await expect(page.getByRole("button")).toHaveCount(0);
      }

      const dimensions = await page.evaluate(() => ({
        documentHeight: document.documentElement.scrollHeight,
        documentWidth: document.documentElement.scrollWidth,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      }));
      expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
      expect(dimensions.documentHeight).toBeLessThanOrEqual(dimensions.viewportHeight);
    }
  });
}
