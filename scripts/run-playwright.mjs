import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const playwrightCli = require.resolve("@playwright/test/cli");
const playwrightArgs = process.argv.slice(2);
const authRealWasSelected = playwrightArgs.some(
  (argument, index) =>
    argument === "--project=auth-real" ||
    (argument === "--project" && playwrightArgs[index + 1] === "auth-real"),
);

const child = spawn(process.execPath, [playwrightCli, "test", ...playwrightArgs], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    INVENTORY_E2E_AUTH_REAL: authRealWasSelected ? "1" : "0",
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
