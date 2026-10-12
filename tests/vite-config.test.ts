import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfigFromFile, type UserConfig } from "vite";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configFile = resolve(projectRoot, "vite.config.ts");
const environmentKeys = ["VITE_APP_NAME", "VITE_API_URL", "API_PROXY_TARGET"] as const;

const withEnvironment = async <T>(
  values: Record<(typeof environmentKeys)[number], string>,
  run: () => Promise<T>,
): Promise<T> => {
  const previousValues = new Map<string, string | undefined>();

  for (const key of environmentKeys) {
    previousValues.set(key, process.env[key]);
    process.env[key] = values[key];
  }

  try {
    return await run();
  } finally {
    for (const [key, previousValue] of previousValues) {
      if (previousValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousValue;
      }
    }
  }
};

const loadViteConfig = async (command: "serve" | "build"): Promise<UserConfig> => {
  const mode = command === "build" ? "production" : "development";
  const loaded = await loadConfigFromFile({ command, mode }, configFile, projectRoot, "silent");

  if (!loaded) {
    throw new Error("Vite config was not loaded.");
  }

  return loaded.config;
};

const flattenPluginNames = (plugins: unknown[]): string[] =>
  plugins.flatMap((plugin) => {
    if (Array.isArray(plugin)) {
      return flattenPluginNames(plugin);
    }

    if (typeof plugin === "object" && plugin !== null && "name" in plugin) {
      return [String(plugin.name)];
    }

    return [];
  });

const findPlugin = (plugins: unknown[], name: string): unknown => {
  for (const plugin of plugins) {
    if (Array.isArray(plugin)) {
      const nestedPlugin = findPlugin(plugin, name);
      if (nestedPlugin) {
        return nestedPlugin;
      }
    } else if (
      typeof plugin === "object" &&
      plugin !== null &&
      "name" in plugin &&
      plugin.name === name
    ) {
      return plugin;
    }
  }

  return undefined;
};

describe("Vite environment validation", () => {
  it.each(["serve", "build"] as const)(
    "rejects invalid configuration before the %s command proceeds",
    async (command) => {
      await withEnvironment(
        {
          VITE_APP_NAME: "",
          VITE_API_URL: "not-a-url",
          API_PROXY_TARGET: "http://localhost:3000",
        },
        async () => {
          await expect(loadViteConfig(command)).rejects.toThrow(/VITE_APP_NAME|VITE_API_URL/);
        },
      );
    },
  );

  it("does not include credentials in Vite configuration errors", async () => {
    const secret = "config-error-secret";

    await withEnvironment(
      {
        VITE_APP_NAME: "Inventory",
        VITE_API_URL: `https://user:${secret}@api.example.com`,
        API_PROXY_TARGET: "http://localhost:3000",
      },
      async () => {
        const error = await loadViteConfig("build").catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(Error);
        expect(String(error)).toContain("VITE_API_URL");
        expect(String(error)).not.toContain(secret);
      },
    );
  });

  it.each(["serve", "build"] as const)(
    "validates the tools-only proxy target before the %s command proceeds",
    async (command) => {
      const secret = "proxy-config-secret";

      await withEnvironment(
        {
          VITE_APP_NAME: "Inventory",
          VITE_API_URL: "/api/backend",
          API_PROXY_TARGET: `https://user:${secret}@api.example.com`,
        },
        async () => {
          const error = await loadViteConfig(command).catch((caught: unknown) => caught);

          expect(error).toBeInstanceOf(Error);
          expect(String(error)).toContain("API_PROXY_TARGET");
          expect(String(error)).not.toContain(secret);
        },
      );
    },
  );
});

describe("Vite project configuration", () => {
  it("registers the Design System demo through a serve-only Vite plugin", async () => {
    await withEnvironment(
      {
        VITE_APP_NAME: "Inventory",
        VITE_API_URL: "/api/backend",
        API_PROXY_TARGET: "http://localhost:3000",
      },
      async () => {
        const config = await loadViteConfig("serve");
        const demoPlugin = findPlugin(config.plugins ?? [], "inventory-design-system-demo");

        expect(demoPlugin).toMatchObject({ apply: "serve" });
      },
    );
  });

  it("sets strict development and preview ports and configured plugins/aliases", async () => {
    await withEnvironment(
      {
        VITE_APP_NAME: "Inventory",
        VITE_API_URL: "/api/backend",
        API_PROXY_TARGET: "http://localhost:3000",
      },
      async () => {
        const config = await loadViteConfig("serve");

        expect(config.server).toMatchObject({
          host: "localhost",
          port: 5174,
          strictPort: true,
        });
        expect(config.preview).toMatchObject({
          host: "localhost",
          port: 5174,
          strictPort: true,
        });
        expect(config.resolve?.alias).toEqual({
          "@/app": resolve(projectRoot, "src/app"),
          "@/features": resolve(projectRoot, "src/features"),
          "@/shared": resolve(projectRoot, "src/shared"),
        });
        expect(config.envPrefix).toEqual([]);
        expect(config.define).toMatchObject({
          "import.meta.env.VITE_APP_NAME": JSON.stringify("Inventory"),
          "import.meta.env.VITE_API_URL": JSON.stringify("/api/backend"),
        });

        const pluginNames = flattenPluginNames(config.plugins ?? []);
        expect(pluginNames.some((name) => /react/i.test(name))).toBe(true);
        expect(pluginNames.some((name) => /tailwind/i.test(name))).toBe(true);
      },
    );
  });
});
