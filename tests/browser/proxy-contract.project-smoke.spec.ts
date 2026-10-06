import { expect, test } from "@playwright/test";

const mockControlUrl = "http://127.0.0.1:5176/__control";

test("preserves Auth and business requests through the browser proxy", async ({ page }) => {
  const resetResponse = await page.request.post(`${mockControlUrl}/reset`);
  expect(resetResponse.status()).toBe(204);

  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Inventory" })).toBeVisible();

  const authRequestBody = { email: "proxy-contract@example.invalid", intent: "test-only" };
  const authResult = await page.evaluate(async (body) => {
    const response = await fetch("/api/auth/sign-in/email?flow=e2e&returnTo=%2Fdashboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    return { body: await response.json(), status: response.status };
  }, authRequestBody);

  expect(authResult).toEqual({ body: { ok: true }, status: 200 });

  const businessRequestBody = { sku: "E2E-SKU", quantity: 4 };
  const businessResult = await page.evaluate(async (body) => {
    const response = await fetch("/api/backend/products?search=proxy-contract&page=7", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    return { body: await response.json(), status: response.status };
  }, businessRequestBody);

  expect(businessResult).toEqual({ body: { ok: true }, status: 200 });

  const navigationResponse = await page.goto("/products?source=proxy-contract");
  expect(navigationResponse).not.toBeNull();
  if (!navigationResponse) {
    throw new Error("The browser navigation did not produce a response.");
  }

  expect(navigationResponse.status()).toBe(200);
  expect(navigationResponse.headers()["content-type"]).toContain("text/html");
  expect(await navigationResponse.text()).toContain('<div id="root"></div>');

  const recordedRequestsResponse = await page.request.get(`${mockControlUrl}/requests`);
  expect(recordedRequestsResponse.status()).toBe(200);
  expect(await recordedRequestsResponse.json()).toEqual([
    {
      body: JSON.stringify(authRequestBody),
      method: "POST",
      origin: "http://localhost:5174",
      url: "/api/auth/sign-in/email?flow=e2e&returnTo=%2Fdashboard",
    },
    {
      body: JSON.stringify(businessRequestBody),
      method: "PATCH",
      origin: "http://localhost:5174",
      url: "/products?search=proxy-contract&page=7",
    },
  ]);

  const stopBackendResponse = await page.request.post(`${mockControlUrl}/stop-backend`);
  expect(stopBackendResponse.status()).toBe(204);

  const sentinel = "proxy-error-must-not-echo-this";
  const unavailableResult = await page.evaluate(async (value) => {
    const response = await fetch(`/api/backend/products?search=${encodeURIComponent(value)}`, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: value,
    });

    return {
      body: await response.text(),
      cacheControl: response.headers.get("cache-control"),
      contentType: response.headers.get("content-type"),
      status: response.status,
    };
  }, sentinel);

  expect(unavailableResult.status).toBe(502);
  expect(unavailableResult.cacheControl).toBe("no-store");
  expect(unavailableResult.contentType).toContain("application/json");
  expect(JSON.parse(unavailableResult.body)).toEqual({
    error: {
      code: "PROXY_BACKEND_UNAVAILABLE",
      message: "The backend service is unavailable.",
      source: "proxy",
    },
  });
  expect(JSON.stringify(unavailableResult)).not.toContain(sentinel);
});
