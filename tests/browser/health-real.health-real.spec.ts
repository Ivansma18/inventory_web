import { expect, test } from "@playwright/test";

test("consumes real health through the HTTP client and local proxy", async ({ page }) => {
  const proxiedApiRequests: string[] = [];

  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.pathname.startsWith("/api/backend")) {
      proxiedApiRequests.push(`${request.method()} ${requestUrl.pathname}`);
    }
  });

  await page.goto("/__health-test");

  const healthResult = page.getByTestId("health-result");
  await expect(healthResult).not.toHaveAttribute("data-status", "pending", { timeout: 15_000 });

  const status = await healthResult.getAttribute("data-status");
  const errorKind = await healthResult.getAttribute("data-error-kind");
  expect(
    status,
    `Local backend health failed (${errorKind ?? "unknown"}); the real /health endpoint is required and no mock fallback is used.`,
  ).toBe("success");
  await expect(healthResult).toHaveAttribute("data-health-status", "ok");
  await expect(healthResult).toHaveText("Health check succeeded.");
  expect(proxiedApiRequests).toEqual(["GET /api/backend/health"]);
});
