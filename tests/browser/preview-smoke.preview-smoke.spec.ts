import { expect, test } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const forbiddenBundleMarkers = [
  "/__auth-test",
  "Auth test harness",
  "auth-real-harness.tsx",
  "/__health-test",
  "Inventory Local Health Check",
  "health-real-client-harness.ts",
  "/__design-system",
  "Demostración del sistema de diseño",
  "INVENTORY_HEALTH_E2E_HARNESS",
  "AUTH_TEST_EMAIL",
  "AUTH_TEST_PASSWORD",
  "preview-sentinel@example.invalid",
  "preview-sentinel-password",
];

const readBundleFiles = async (directory: string): Promise<Buffer[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map((entry) => {
      const entryPath = join(directory, entry.name);
      return entry.isDirectory() ? readBundleFiles(entryPath) : readFile(entryPath);
    }),
  );

  return nestedFiles.flat();
};

test("serves the built app in preview without Auth harness or backend access", async ({ page }) => {
  const bundleFiles = await readBundleFiles(resolve(process.cwd(), "dist"));
  expect(bundleFiles.length).toBeGreaterThan(0);
  const bundle = Buffer.concat(bundleFiles);

  for (const marker of forbiddenBundleMarkers) {
    expect(bundle.includes(Buffer.from(marker)), `bundle must not contain ${marker}`).toBe(false);
  }

  const apiRequests: string[] = [];
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.pathname.startsWith("/api/")) {
      apiRequests.push(requestUrl.pathname);
    }
  });

  const previewResponse = await page.goto("/");
  expect(previewResponse).not.toBeNull();
  if (!previewResponse) {
    throw new Error("The production preview did not return the app document.");
  }

  expect(previewResponse.status()).toBe(200);
  expect(await previewResponse.text()).toMatch(/src="\/assets\/index-[^"]+\.js"/);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Inventory" })).toBeVisible();
  await expect(page.getByText("Frontend base para la gestión de inventario.")).toBeVisible();
  expect(apiRequests).toEqual([]);

  const harnessResponse = await page.request.get("/__auth-test");
  expect(harnessResponse.status()).toBe(200);
  expect(harnessResponse.headers()["content-type"]).toContain("text/html");
  const harnessFallback = await harnessResponse.text();
  expect(harnessFallback).not.toContain("Auth test harness");
  expect(harnessFallback).not.toContain("auth-real-harness.tsx");
  expect(harnessFallback).not.toContain("/src/main.tsx");

  const healthHarnessResponse = await page.request.get("/__health-test");
  expect(healthHarnessResponse.status()).toBe(200);
  expect(healthHarnessResponse.headers()["content-type"]).toContain("text/html");
  const healthFallback = await healthHarnessResponse.text();
  expect(healthFallback).not.toContain("Local backend health check");
  expect(healthFallback).not.toContain("health-real-client-harness.ts");
  expect(healthFallback).not.toContain("/src/main.tsx");

  const designSystemFallback = await page.request.get("/__design-system");
  expect([200, 404]).toContain(designSystemFallback.status());
  expect(await designSystemFallback.text()).not.toContain("Demostración del sistema de diseño");
});
