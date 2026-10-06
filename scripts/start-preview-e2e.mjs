import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { build, preview } from "vite";

const projectRoot = process.cwd();
const configFile = resolve(projectRoot, "vite.config.ts");
const typeScriptCli = resolve(projectRoot, "node_modules/typescript/bin/tsc");

execFileSync(process.execPath, [typeScriptCli, "--noEmit"], {
  cwd: projectRoot,
  stdio: "inherit",
});

await build({ configFile });
process.stdout.write("Production bundle built for the Playwright preview check.\n");

const previewServer = await preview({
  configFile,
  preview: {
    host: "localhost",
    port: 5174,
    strictPort: true,
  },
});

const closePreview = () => {
  void previewServer.close().catch((error) => {
    process.stderr.write(`Unable to close the production preview: ${error.message}\n`);
    process.exitCode = 1;
  });
};

process.once("SIGINT", closePreview);
process.once("SIGTERM", closePreview);
