import { defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createViteAliases } from "./scripts/vite-aliases.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), ".");

export default defineConfig({
  resolve: {
    alias: createViteAliases(projectRoot),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
      "**/playwright-report/**",
      "**/test-results/**",
      "tests/browser/**",
    ],
  },
});
