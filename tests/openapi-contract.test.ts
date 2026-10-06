import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { components, paths } from "@/shared/api/generated/auth-contracts";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = resolve(projectRoot, "tests/contracts/auth-health.openapi.json");
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, unknown>>;
  components: Record<string, Record<string, unknown>>;
};

const generatedHealth: paths["/health"]["get"]["responses"][200]["content"]["application/json"] = {
  status: "ok",
};
const generatedCredentials: components["schemas"]["AuthCredentials"] = {
  email: "developer@example.test",
  password: "test-password-only",
};
const generatedAuthResponse: components["schemas"]["PublicAuthResponse"] = {
  data: {
    user: {
      id: "user-id",
      email: "developer@example.test",
      role: "OPERATOR",
    },
    session: {
      id: "session-id",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
};
const generatedSignInBody: paths["/api/auth/sign-in/email"]["post"]["requestBody"]["content"]["application/json"] =
  generatedCredentials;
const generatedSignInResponse: paths["/api/auth/sign-in/email"]["post"]["responses"][200]["content"]["application/json"] =
  generatedAuthResponse;
const generatedSessionResponse: paths["/api/auth/get-session"]["get"]["responses"][200]["content"]["application/json"] =
  generatedAuthResponse;
const generatedSignOutResponse: paths["/api/auth/sign-out"]["post"]["responses"][204] = {
  headers: {},
};
const generatedSignOutError: paths["/api/auth/sign-out"]["post"]["responses"][400]["content"]["application/json"] =
  {
    error: { code: "VALIDATION_ERROR", message: "Sign-out request rejected." },
  };
const generatedSignOutForbidden: paths["/api/auth/sign-out"]["post"]["responses"][403]["content"]["application/json"] =
  {
    error: { code: "FORBIDDEN", message: "The request origin is not trusted." },
  };
const generatedSignOutInternalError: paths["/api/auth/sign-out"]["post"]["responses"][500]["content"]["application/json"] =
  {
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
  };

const collectReferences = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(collectReferences);
  }

  if (typeof value !== "object" || value === null) {
    return [];
  }

  return Object.entries(value).flatMap(([key, entry]) =>
    key === "$ref" && typeof entry === "string" ? [entry] : collectReferences(entry),
  );
};

const resolvePointer = (document: unknown, pointer: string): unknown =>
  pointer
    .slice(2)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce<unknown>((current, segment) => {
      if (typeof current !== "object" || current === null) {
        return undefined;
      }

      return (current as Record<string, unknown>)[segment];
    }, document);

describe("Auth and health OpenAPI contract snapshot", () => {
  it("contains only the live health and Auth operations in the approved scope", () => {
    expect(snapshot.openapi).toBe("3.0.3");
    expect(snapshot.info).toEqual({ title: "Inventory API", version: "0.1.0" });
    expect(Object.keys(snapshot.paths).sort()).toEqual(
      [
        "/api/auth/get-session",
        "/api/auth/sign-in/email",
        "/api/auth/sign-out",
        "/api/auth/sign-up/email",
        "/health",
      ].sort(),
    );
  });

  it("retains every referenced component required by the selected operations", () => {
    const unresolvedReferences = collectReferences(snapshot).filter(
      (reference) =>
        reference.startsWith("#/") && resolvePointer(snapshot, reference) === undefined,
    );

    expect(unresolvedReferences).toEqual([]);
  });

  it("preserves the live Auth response statuses and cookie scheme", () => {
    expect(snapshot.paths["/api/auth/sign-in/email"]).toMatchObject({
      post: { responses: { 200: {}, 400: {}, 401: {} } },
    });
    expect(snapshot.paths["/api/auth/get-session"]).toMatchObject({
      get: { responses: { 200: {}, 401: {} } },
    });
    expect(snapshot.paths["/api/auth/sign-out"]).toMatchObject({
      post: { responses: { 204: {}, 400: {}, 403: {}, 500: {} } },
    });
    expect(snapshot.components.securitySchemes.sessionCookie).toMatchObject({
      type: "apiKey",
      in: "cookie",
      name: "better-auth.session_token",
    });
    expect(snapshot.components.schemas.AuthCredentials).toMatchObject({
      properties: { password: { minLength: 8 } },
    });
  });

  it("matches the backend's current auth and health contracts through generated types", () => {
    expect(generatedHealth).toEqual({ status: "ok" });
    expect(generatedCredentials.email).toBe("developer@example.test");
    expect(generatedAuthResponse.data.user.role).toBe("OPERATOR");
    expect(generatedAuthResponse.data.session.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(generatedSignInBody).toEqual(generatedCredentials);
    expect(generatedSignInResponse).toEqual(generatedAuthResponse);
    expect(generatedSessionResponse).toEqual(generatedAuthResponse);
    expect(generatedSignOutResponse).toEqual({ headers: {} });
    expect(generatedSignOutError.error.code).toBe("VALIDATION_ERROR");
    expect(generatedSignOutForbidden.error.code).toBe("FORBIDDEN");
    expect(generatedSignOutInternalError.error.code).toBe("INTERNAL_ERROR");

    expect(snapshot.components.schemas).toHaveProperty("AuthCredentials");
    expect(snapshot.components.schemas).toHaveProperty("PublicAuthResponse");
    expect(snapshot.components.schemas).toHaveProperty("PublicAuthUser");
    expect(snapshot.components.schemas).toHaveProperty("PublicAuthSession");
  });
});
