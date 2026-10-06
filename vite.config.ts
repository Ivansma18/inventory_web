import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

import { createViteAliases } from "./scripts/vite-aliases.ts";
import { createAuthTestHarnessPlugin } from "./scripts/vite-auth-test-harness.ts";
import { createApiProxy } from "./scripts/vite-proxy.ts";
import { publicEnvSchema, toolEnvSchema } from "./src/shared/config/env.schema.ts";

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
const envPrefixes = ["VITE_APP_NAME", "VITE_API_URL", "API_PROXY_TARGET"];

const validateEnvironment = (mode: string) => {
  const fileEnvironment = loadEnv(mode, projectRoot, envPrefixes);
  const publicResult = publicEnvSchema.safeParse({
    VITE_APP_NAME: process.env.VITE_APP_NAME ?? fileEnvironment.VITE_APP_NAME,
    VITE_API_URL: process.env.VITE_API_URL ?? fileEnvironment.VITE_API_URL,
  });
  const toolResult = toolEnvSchema.safeParse({
    API_PROXY_TARGET: process.env.API_PROXY_TARGET ?? fileEnvironment.API_PROXY_TARGET,
  });

  const errors = [
    ...(publicResult.success ? [] : publicResult.error.issues),
    ...(toolResult.success ? [] : toolResult.error.issues),
  ].map((issue) => `${String(issue.path[0] ?? "configuration")}: ${issue.message}`);

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n${errors.join("\n")}`);
  }

  if (!publicResult.success || !toolResult.success) {
    throw new Error("Environment validation failed.");
  }

  return {
    public: publicResult.data,
    tools: toolResult.data,
  };
};

export default defineConfig(({ mode, command }) => {
  const environment = validateEnvironment(mode);
  const apiProxy = createApiProxy(environment.tools.API_PROXY_TARGET);
  const authTestHarnessEnabled =
    command === "serve" && process.env.INVENTORY_AUTH_E2E_HARNESS === "1";

  return {
    root: projectRoot,
    envPrefix: [],
    define: {
      "import.meta.env.VITE_APP_NAME": JSON.stringify(environment.public.VITE_APP_NAME),
      "import.meta.env.VITE_API_URL": JSON.stringify(environment.public.VITE_API_URL),
    },
    plugins: [
      react(),
      tailwindcss(),
      ...(authTestHarnessEnabled ? [createAuthTestHarnessPlugin(projectRoot)] : []),
    ],
    resolve: {
      alias: createViteAliases(projectRoot),
    },
    server: {
      host: "localhost",
      port: 5174,
      strictPort: true,
      proxy: apiProxy,
    },
    preview: {
      host: "localhost",
      port: 5174,
      strictPort: true,
      proxy: apiProxy,
    },
  };
});
