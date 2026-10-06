import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const viteCli = resolve(projectRoot, "node_modules/vite/bin/vite.js");
const invalidApiUrl = "not-a-valid-api-url";
const validEnvironment = {
  ...process.env,
  VITE_APP_NAME: "Inventory",
  VITE_API_URL: "/api/backend",
  API_PROXY_TARGET: "http://localhost:3000",
};
const invalidEnvironment = {
  ...validEnvironment,
  VITE_APP_NAME: "",
  VITE_API_URL: invalidApiUrl,
};

const runVite = (args, environment, timeoutMs = 20_000) =>
  new Promise((resolveResult, rejectResult) => {
    const child = spawn(process.execPath, [viteCli, ...args], {
      cwd: projectRoot,
      env: environment,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let output = "";
    let spawnError;
    let timedOut = false;

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", (error) => {
      spawnError = error;
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.once("close", (code, signal) => {
      clearTimeout(timeout);

      if (spawnError) {
        rejectResult(spawnError);
        return;
      }

      resolveResult({ code, signal, timedOut, output });
    });
  });

const assertInvalidConfigurationRejected = async (name, args) => {
  const result = await runVite(args, invalidEnvironment);

  assert.equal(
    result.timedOut,
    false,
    `${name} did not reject invalid configuration before timeout.`,
  );
  assert.notEqual(result.code, 0, `${name} accepted invalid configuration.`);
  assert.match(result.output, /VITE_APP_NAME/);
  assert.match(result.output, /VITE_API_URL/);
  assert.equal(result.output.includes(invalidApiUrl), false, `${name} exposed the invalid value.`);

  console.log(`PASS ${name} rejects invalid public configuration before starting.`);
};

const reservePreviewPort = () =>
  new Promise((resolveServer, rejectServer) => {
    const server = createServer();
    const onError = (error) => {
      if (error.code === "EADDRINUSE") {
        rejectServer(
          new Error("Port 5174 is already occupied; no existing process was stopped or reused."),
        );
        return;
      }

      rejectServer(error);
    };

    server.once("error", onError);
    server.listen(5174, "localhost", () => {
      server.removeListener("error", onError);
      resolveServer(server);
    });
  });

const closeServer = (server) =>
  new Promise((resolveClose, rejectClose) => {
    server.close((error) => {
      if (error) {
        rejectClose(error);
        return;
      }

      resolveClose();
    });
  });

const assertStrictPortRejected = async () => {
  const reservation = await reservePreviewPort();

  try {
    const result = await runVite([], validEnvironment, 8_000);

    assert.equal(
      result.timedOut,
      false,
      "Vite did not exit when localhost:5174 was occupied; its child process was terminated.",
    );
    assert.notEqual(result.code, 0, "Vite started despite the occupied port.");
    assert.match(result.output, /5174/);
    assert.match(result.output, /already in use|in use/i);

    console.log("PASS dev rejects the occupied localhost:5174 port without falling back.");
  } finally {
    await closeServer(reservation);
  }
};

await assertInvalidConfigurationRejected("dev", []);
await assertInvalidConfigurationRejected("build", ["build"]);
await assertStrictPortRejected();

console.log("Startup process checks passed; the verifier closed its listener and child processes.");
