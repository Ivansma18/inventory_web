import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:5174";
const authRealWasSelected = process.env.INVENTORY_E2E_AUTH_REAL === "1";
const healthRealWasSelected = process.env.INVENTORY_E2E_HEALTH_REAL === "1";
const authHarnessProjectSelected = process.env.INVENTORY_E2E_AUTH_HARNESS_PROJECT === "1";
const proxyContractProjectSelected = process.env.INVENTORY_E2E_PROXY_CONTRACT === "1";
const previewProjectSelected = process.env.INVENTORY_E2E_PREVIEW === "1";
const proxyTestBackendTarget = "http://127.0.0.1:5175";
const unavailablePreviewBackendTarget = "http://127.0.0.1:65534";

const webServerEnv: NodeJS.ProcessEnv = {
  ...process.env,
  VITE_APP_NAME: process.env.VITE_APP_NAME ?? "Inventory",
  VITE_API_URL: process.env.VITE_API_URL ?? "/api/backend",
  API_PROXY_TARGET: proxyContractProjectSelected
    ? proxyTestBackendTarget
    : previewProjectSelected
      ? unavailablePreviewBackendTarget
      : (process.env.API_PROXY_TARGET ?? "http://localhost:3000"),
  INVENTORY_AUTH_E2E_HARNESS: process.env.INVENTORY_AUTH_E2E_HARNESS ?? "0",
  INVENTORY_HEALTH_E2E_HARNESS: healthRealWasSelected ? "1" : "0",
};

for (const key of Object.keys(webServerEnv)) {
  if (key.startsWith("AUTH_TEST_")) {
    delete webServerEnv[key];
  }
}

const projects = [
  {
    name: "bootstrap-smoke",
    testDir: "./tests/browser",
    testMatch: "**/*.bootstrap-smoke.spec.ts",
    use: { ...devices["Desktop Chrome"], baseURL },
  },
  {
    name: "proxy-contract",
    testDir: "./tests/browser",
    testMatch: "**/*.project-smoke.spec.ts",
    use: { ...devices["Desktop Chrome"], baseURL },
  },
  ...(previewProjectSelected
    ? [
        {
          name: "preview-smoke",
          testDir: "./tests/browser",
          testMatch: "**/*.preview-smoke.spec.ts",
          use: { ...devices["Desktop Chrome"], baseURL },
        },
      ]
    : []),
  ...(healthRealWasSelected
    ? [
        {
          name: "health-real",
          testDir: "./tests/browser",
          testMatch: "**/*.health-real.spec.ts",
          use: {
            ...devices["Desktop Chrome"],
            baseURL,
            screenshot: "off" as const,
            trace: "off" as const,
            video: "off" as const,
          },
        },
      ]
    : []),
  ...(authHarnessProjectSelected
    ? [
        {
          name: "auth-harness",
          testDir: "./tests/browser",
          testMatch: "**/*.auth-harness.spec.ts",
          use: {
            ...devices["Desktop Chrome"],
            baseURL,
            screenshot: "off" as const,
            trace: "off" as const,
            video: "off" as const,
          },
        },
      ]
    : []),
  ...(authRealWasSelected
    ? [
        {
          name: "auth-real",
          testDir: "./tests/browser",
          testMatch: "**/*.auth-real.spec.ts",
          use: {
            ...devices["Desktop Chrome"],
            baseURL,
            screenshot: "off" as const,
            trace: "off" as const,
            video: "off" as const,
          },
        },
      ]
    : []),
];

const viteWebServer = {
  command: `"${process.execPath}" node_modules/vite/bin/vite.js`,
  url: baseURL,
  reuseExistingServer: false,
  timeout: 120_000,
  env: webServerEnv,
  stdout: "pipe" as const,
  stderr: "pipe" as const,
};

const proxyTestBackendWebServer = {
  command: `"${process.execPath}" scripts/proxy-test-backend.mjs`,
  url: `${proxyTestBackendTarget}/__proxy-test/health`,
  reuseExistingServer: false,
  timeout: 120_000,
  stdout: "pipe" as const,
  stderr: "pipe" as const,
};

const previewWebServerEnv: NodeJS.ProcessEnv = {
  ...webServerEnv,
  VITE_APP_NAME: "Inventory",
  VITE_API_URL: "/api/backend",
  API_PROXY_TARGET: proxyContractProjectSelected
    ? proxyTestBackendTarget
    : unavailablePreviewBackendTarget,
  INVENTORY_AUTH_E2E_HARNESS: "0",
  AUTH_TEST_EMAIL: "preview-sentinel@example.invalid",
  AUTH_TEST_PASSWORD: "preview-sentinel-password",
};

const previewWebServer = {
  command: `"${process.execPath}" scripts/start-preview-e2e.mjs`,
  url: baseURL,
  reuseExistingServer: false,
  timeout: 120_000,
  env: previewWebServerEnv,
  stdout: "pipe" as const,
  stderr: "pipe" as const,
};

const webServers = [
  ...(proxyContractProjectSelected ? [proxyTestBackendWebServer] : []),
  previewProjectSelected ? previewWebServer : viteWebServer,
];

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: "list",
  timeout: 30_000,
  outputDir: "./test-results",
  projects,
  use: {
    baseURL,
    headless: true,
    trace: "off",
  },
  webServer: webServers.length === 1 ? webServers[0] : webServers,
});
