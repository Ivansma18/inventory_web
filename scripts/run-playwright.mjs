import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import process from "node:process";
import { parseEnv } from "node:util";

const require = createRequire(import.meta.url);
const playwrightCli = require.resolve("@playwright/test/cli");
const playwrightArgs = process.argv.slice(2);
const selectedProjects = [];

for (let index = 0; index < playwrightArgs.length; index += 1) {
  const argument = playwrightArgs[index];
  if (argument.startsWith("--project=")) {
    selectedProjects.push(...argument.slice("--project=".length).split(","));
  } else if (argument === "--project" && playwrightArgs[index + 1]) {
    selectedProjects.push(...playwrightArgs[index + 1].split(","));
    index += 1;
  }
}

const hasExplicitProjectSelection = selectedProjects.length > 0;
const authRealWasSelected = selectedProjects.includes("auth-real");

if (authRealWasSelected) {
  const localEnvPath = resolve(process.cwd(), ".env");

  try {
    const localEnv = parseEnv(readFileSync(localEnvPath, "utf8"));
    for (const name of ["AUTH_TEST_EMAIL", "AUTH_TEST_PASSWORD"]) {
      if (!process.env[name]?.trim() && localEnv[name]?.trim()) {
        process.env[name] = localEnv[name];
      }
    }
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }
}

const healthRealWasSelected = selectedProjects.includes("health-real");
const designSystemProjectSelected = selectedProjects.includes("design-system");
const authHarnessProjectSelected =
  !hasExplicitProjectSelection || selectedProjects.includes("auth-harness");
const authHarnessRouteEnabled = authHarnessProjectSelected || authRealWasSelected;
const proxyContractProjectSelected =
  !hasExplicitProjectSelection || selectedProjects.includes("proxy-contract");
const previewProjectSelected = selectedProjects.includes("preview-smoke");

const child = spawn(process.execPath, [playwrightCli, "test", ...playwrightArgs], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    INVENTORY_E2E_AUTH_REAL: authRealWasSelected ? "1" : "0",
    INVENTORY_E2E_HEALTH_REAL: healthRealWasSelected ? "1" : "0",
    INVENTORY_E2E_AUTH_HARNESS_PROJECT: authHarnessProjectSelected ? "1" : "0",
    INVENTORY_E2E_PROXY_CONTRACT: proxyContractProjectSelected ? "1" : "0",
    INVENTORY_E2E_PREVIEW: previewProjectSelected ? "1" : "0",
    INVENTORY_E2E_DESIGN_SYSTEM_PROJECT: designSystemProjectSelected ? "1" : "0",
    INVENTORY_AUTH_E2E_HARNESS: authHarnessRouteEnabled ? "1" : "0",
    INVENTORY_HEALTH_E2E_HARNESS: healthRealWasSelected ? "1" : "0",
  },
  stdio: "inherit",
  windowsHide: true,
});

child.once("error", (error) => {
  process.stderr.write(`Unable to start Playwright: ${error.message}\n`);
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 1;
});
