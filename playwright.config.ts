import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:5174";
const authRealWasSelected = process.env.INVENTORY_E2E_AUTH_REAL === "1";

const webServerEnv: NodeJS.ProcessEnv = {
  ...process.env,
  VITE_APP_NAME: process.env.VITE_APP_NAME ?? "Inventory",
  VITE_API_URL: process.env.VITE_API_URL ?? "/api/backend",
  API_PROXY_TARGET: process.env.API_PROXY_TARGET ?? "http://localhost:3000",
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
  webServer: {
    command: `"${process.execPath}" node_modules/vite/bin/vite.js`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: webServerEnv,
    stdout: "pipe",
    stderr: "pipe",
  },
});
