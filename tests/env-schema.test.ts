import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { publicEnvSchema, toolEnvSchema } from "@/shared/config/env.schema";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("public environment schema", () => {
  it("requires the application name and API URL", () => {
    const result = publicEnvSchema.safeParse({});

    expect(result.success).toBe(false);
    if (result.success) return;

    const issuePaths = result.error.issues.map((issue) => issue.path[0]);
    expect(issuePaths).toContain("VITE_APP_NAME");
    expect(issuePaths).toContain("VITE_API_URL");
  });

  it("trims the application name and accepts a local API prefix", () => {
    const result = publicEnvSchema.safeParse({
      VITE_APP_NAME: "  Inventory  ",
      VITE_API_URL: "/api/backend",
    });

    expect(result).toEqual({
      success: true,
      data: {
        VITE_APP_NAME: "Inventory",
        VITE_API_URL: "/api/backend",
      },
    });
  });

  it.each(["", "   "])("rejects an empty application name: %j", (name) => {
    const result = publicEnvSchema.safeParse({
      VITE_APP_NAME: name,
      VITE_API_URL: "/api/backend",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "VITE_APP_NAME")).toBe(true);
    }
  });

  it.each([
    "/",
    "//api.example.com",
    "ftp://api.example.com",
    "https://user:password@api.example.com",
    "not-a-url",
  ])("rejects an invalid API URL: %s", (url) => {
    expect(
      publicEnvSchema.safeParse({
        VITE_APP_NAME: "Inventory",
        VITE_API_URL: url,
      }).success,
    ).toBe(false);
  });

  it.each(["http://localhost:3000/api", "https://api.example.com/v1"])(
    "accepts an absolute HTTP(S) API URL: %s",
    (url) => {
      expect(
        publicEnvSchema.safeParse({
          VITE_APP_NAME: "Inventory",
          VITE_API_URL: url,
        }).success,
      ).toBe(true);
    },
  );

  it("reports the invalid field without including URL credentials", () => {
    const secret = "do-not-log-this-password";
    const result = publicEnvSchema.safeParse({
      VITE_APP_NAME: "Inventory",
      VITE_API_URL: `https://user:${secret}@api.example.com`,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = JSON.stringify(result.error.issues);
      expect(issues).toContain("VITE_API_URL");
      expect(issues).not.toContain(secret);
    }
  });
});

describe("tool environment schema", () => {
  it("defaults the proxy target to the documented local backend", () => {
    expect(toolEnvSchema.parse({})).toEqual({
      API_PROXY_TARGET: "http://localhost:3000",
    });
  });

  it.each(["http://localhost:4000", "https://api.example.com"])(
    "accepts an HTTP(S) proxy origin: %s",
    (target) => {
      expect(toolEnvSchema.parse({ API_PROXY_TARGET: target })).toEqual({
        API_PROXY_TARGET: target,
      });
    },
  );

  it.each([
    "ftp://localhost:3000",
    "https://user:password@api.example.com",
    "https://api.example.com/path",
    "https://api.example.com?token=secret",
    "https://api.example.com#fragment",
  ])("rejects a non-origin proxy target: %s", (target) => {
    expect(toolEnvSchema.safeParse({ API_PROXY_TARGET: target }).success).toBe(false);
  });
});

describe("public environment example", () => {
  it("contains safe local examples and blank private-auth placeholders", async () => {
    const example = await readFile(resolve(projectRoot, ".env.example"), "utf8");
    const variableNames = example
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => line.split("=", 1)[0]);

    expect(variableNames).toEqual([
      "VITE_APP_NAME",
      "VITE_API_URL",
      "API_PROXY_TARGET",
      "AUTH_TEST_EMAIL",
      "AUTH_TEST_PASSWORD",
    ]);
    expect(example).toMatch(/^AUTH_TEST_EMAIL=$/m);
    expect(example).toMatch(/^AUTH_TEST_PASSWORD=$/m);
    expect(example).not.toMatch(/^VITE_AUTH_TEST_/m);
  });
});
