import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";

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
const authHarnessProjectSelected =
  !hasExplicitProjectSelection || selectedProjects.includes("auth-harness");
const authHarnessRouteEnabled = authHarnessProjectSelected || authRealWasSelected;
const proxyContractProjectSelected =
  !hasExplicitProjectSelection || selectedProjects.includes("proxy-contract");

const child = spawn(process.execPath, [playwrightCli, "test", ...playwrightArgs], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    INVENTORY_E2E_AUTH_REAL: authRealWasSelected ? "1" : "0",
    INVENTORY_E2E_AUTH_HARNESS_PROJECT: authHarnessProjectSelected ? "1" : "0",
    INVENTORY_E2E_PROXY_CONTRACT: proxyContractProjectSelected ? "1" : "0",
    INVENTORY_AUTH_E2E_HARNESS: authHarnessRouteEnabled ? "1" : "0",
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
