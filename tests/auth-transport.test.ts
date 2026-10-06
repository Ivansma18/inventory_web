import { createAuthClient, type BetterAuthClientPlugin, type FetchEsque } from "better-auth/client";
import { http, HttpResponse } from "msw";
import type { components } from "@/shared/api/generated/auth-contracts";
import {
  AuthResponseContractError,
  createAuthFetchOptions,
} from "@/features/auth/api/auth-transport";
import { describe, expect, it } from "vitest";

import { server } from "./mocks/server";

const authTransportProbe = {
  id: "auth-transport-test-probe",
  getActions: ($fetch) => ({
    requestAuthPath: <Response = unknown>(path: string) =>
      $fetch<Response>(path, { method: "GET" }),
  }),
} satisfies BetterAuthClientPlugin;

const createTestAuthClient = (customFetchImpl?: FetchEsque) =>
  createAuthClient({
    baseURL: "https://inventory.test/api/auth",
    fetchOptions: createAuthFetchOptions(customFetchImpl),
    plugins: [authTransportProbe],
  });

const validAuthResponse = {
  data: {
    user: {
      id: "user-id",
      email: "user@example.com",
      role: "OPERATOR",
    },
    session: {
      id: "session-id",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
} satisfies components["schemas"]["PublicAuthResponse"];

describe("Auth transport over Better Auth's public client plugin", () => {
  it("preserves the backend envelope and ISO date string and includes credentials", async () => {
    let requestCredentials: RequestCredentials | undefined;
    const customFetchImpl: FetchEsque = (input, init) => {
      requestCredentials = init?.credentials;
      return fetch(input, init);
    };

    server.use(
      http.get("https://inventory.test/api/auth/get-session", () =>
        HttpResponse.json(validAuthResponse),
      ),
    );

    const client = createTestAuthClient(customFetchImpl);
    const result =
      await client.requestAuthPath<components["schemas"]["PublicAuthResponse"]>("/get-session");

    expect(result).toEqual({ data: validAuthResponse, error: null });
    expect(typeof result.data?.data.session.createdAt).toBe("string");
    expect(requestCredentials).toBe("include");
  });

  it("accepts a bodyless 204 response", async () => {
    server.use(
      http.get(
        "https://inventory.test/api/auth/bodyless",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    const client = createTestAuthClient();
    await expect(client.requestAuthPath<null>("/bodyless")).resolves.toEqual({
      data: null,
      error: null,
    });
  });

  it("keeps malformed successful JSON distinct and retains its HTTP status", async () => {
    server.use(
      http.get(
        "https://inventory.test/api/auth/malformed-success",
        () =>
          new HttpResponse("{", { status: 200, headers: { "content-type": "application/json" } }),
      ),
    );

    const client = createTestAuthClient();
    const failure = await client
      .requestAuthPath<components["schemas"]["PublicAuthResponse"]>("/malformed-success")
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AuthResponseContractError);
    expect(failure).toMatchObject({ kind: "contract", status: 200 });
  });

  it.each([
    ["empty", () => new HttpResponse(null, { status: 502, statusText: "Bad Gateway" })],
    [
      "HTML",
      () =>
        new HttpResponse("<html>upstream failure</html>", {
          status: 502,
          statusText: "Bad Gateway",
          headers: { "content-type": "text/html" },
        }),
    ],
  ])("preserves HTTP status for an %s error response", async (_kind, responseFactory) => {
    server.use(http.get("https://inventory.test/api/auth/upstream-error", () => responseFactory()));

    const client = createTestAuthClient();
    const result =
      await client.requestAuthPath<components["schemas"]["PublicAuthResponse"]>("/upstream-error");

    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({ status: 502, statusText: "Bad Gateway" });
    expect(JSON.stringify(result.error)).not.toContain("upstream failure");
  });

  it("leaves a network failure without an HTTP response distinct from contract errors", async () => {
    const networkFailure = new TypeError("fetch failed");
    const customFetchImpl: FetchEsque = async () => {
      throw networkFailure;
    };
    const client = createTestAuthClient(customFetchImpl);

    await expect(
      client.requestAuthPath<components["schemas"]["PublicAuthResponse"]>("/offline"),
    ).rejects.toBe(networkFailure);
  });
});
