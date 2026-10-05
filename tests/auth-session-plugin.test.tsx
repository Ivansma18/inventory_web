import { act, renderHook, waitFor } from "@testing-library/react";
import { createAuthClient } from "better-auth/react";
import { http, HttpResponse } from "msw";
import type { components } from "@/shared/api/generated/auth-contracts";
import { createAuthFetchOptions } from "@/features/auth/api/auth-transport";
import { createInventoryAuthPlugin } from "@/features/auth/inventory-auth-plugin";
import { describe, expect, it } from "vitest";

import { server } from "./mocks/server";

const sessionEndpoint = "https://inventory.test/api/auth/get-session";

const createTestAuthClient = () =>
  createAuthClient({
    baseURL: "https://inventory.test/api/auth",
    fetchOptions: createAuthFetchOptions(),
    plugins: [createInventoryAuthPlugin()],
  });

const authResponse = (userId: string): components["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: {
      id: userId,
      email: "operator@example.com",
      role: "OPERATOR",
    },
    session: {
      id: `session-${userId}`,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
});

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

describe("Inventory auth session atom", () => {
  it("publishes pending before the initial query and then the validated session", async () => {
    server.use(
      http.get(sessionEndpoint, async () => {
        await wait(25);
        return HttpResponse.json(authResponse("first-user"));
      }),
    );

    const client = createTestAuthClient();
    const { result } = renderHook(() => client.useInventorySession());

    expect(result.current).toEqual({
      status: "pending",
      user: null,
      session: null,
      isRefetching: false,
      isAuthenticated: false,
      isUnauthenticated: false,
      error: null,
    });

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current).toMatchObject({
      user: authResponse("first-user").data.user,
      session: authResponse("first-user").data.session,
      isRefetching: false,
      isAuthenticated: true,
      isUnauthenticated: false,
      error: null,
    });
  });

  it("confirms unauthenticated when the initial session query returns 401", async () => {
    server.use(
      http.get(sessionEndpoint, () =>
        HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "No active session." } },
          { status: 401 },
        ),
      ),
    );

    const client = createTestAuthClient();
    const { result } = renderHook(() => client.useInventorySession());

    expect(result.current.status).toBe("pending");
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    expect(result.current).toMatchObject({
      user: null,
      session: null,
      isRefetching: false,
      isAuthenticated: false,
      isUnauthenticated: true,
      error: null,
    });
  });

  it("uses the same atom for explicit repeated session queries", async () => {
    let requests = 0;
    server.use(
      http.get(sessionEndpoint, async () => {
        requests += 1;
        await wait(20);
        return HttpResponse.json(authResponse(requests === 1 ? "first-user" : "second-user"));
      }),
    );

    const client = createTestAuthClient();
    const { result } = renderHook(() => client.useInventorySession());

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(requests).toBe(1);
    expect(result.current.user?.id).toBe("first-user");

    let refetch: Promise<void>;
    act(() => {
      refetch = client.refreshSession();
    });

    expect(result.current.isRefetching).toBe(true);
    await act(async () => refetch);

    expect(requests).toBe(2);
    expect(result.current).toMatchObject({
      status: "authenticated",
      user: authResponse("second-user").data.user,
      session: authResponse("second-user").data.session,
      isRefetching: false,
      isAuthenticated: true,
      isUnauthenticated: false,
      error: null,
    });
  });

  it("marks an incomplete initial response unconfirmed without either confirmation flag", async () => {
    server.use(
      http.get(sessionEndpoint, () =>
        HttpResponse.json({
          data: {
            user: { id: "user-id", email: "operator@example.com" },
            session: { id: "session-id", createdAt: "2026-01-01T00:00:00.000Z" },
          },
        }),
      ),
    );

    const client = createTestAuthClient();
    const { result } = renderHook(() => client.useInventorySession());

    await waitFor(() => expect(result.current.status).toBe("unconfirmed"));
    expect(result.current).toMatchObject({
      user: null,
      session: null,
      isAuthenticated: false,
      isUnauthenticated: false,
      error: {
        kind: "contract",
        status: 200,
        message: expect.any(String),
      },
    });
  });

  it("clears a confirmed session on incomplete refetch and later reconfirms by 200 or 401", async () => {
    let requestCount = 0;
    const incompleteResponse = {
      data: {
        user: { id: "incomplete-user", email: "operator@example.com" },
        session: { id: "incomplete-session", createdAt: "2026-01-01T00:00:00.000Z" },
      },
    };

    server.use(
      http.get(sessionEndpoint, () => {
        requestCount += 1;

        if (requestCount === 1) {
          return HttpResponse.json(authResponse("first-user"));
        }

        if (requestCount === 2) {
          return HttpResponse.json(incompleteResponse);
        }

        if (requestCount === 3) {
          return HttpResponse.json(authResponse("recovered-user"));
        }

        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "No active session." } },
          { status: 401 },
        );
      }),
    );

    const client = createTestAuthClient();
    const { result } = renderHook(() => client.useInventorySession());

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user?.id).toBe("first-user");

    await act(async () => client.refreshSession());
    expect(result.current).toMatchObject({
      status: "unconfirmed",
      user: null,
      session: null,
      isAuthenticated: false,
      isUnauthenticated: false,
      isRefetching: false,
      error: { kind: "contract", status: 200 },
    });

    await act(async () => client.refreshSession());
    expect(result.current).toMatchObject({
      status: "authenticated",
      user: authResponse("recovered-user").data.user,
      session: authResponse("recovered-user").data.session,
      isAuthenticated: true,
      isUnauthenticated: false,
      error: null,
    });

    await act(async () => client.refreshSession());
    expect(result.current).toMatchObject({
      status: "unauthenticated",
      user: null,
      session: null,
      isAuthenticated: false,
      isUnauthenticated: true,
      error: null,
    });
    expect(requestCount).toBe(4);
  });
});
