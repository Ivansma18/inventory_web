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
    });

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current).toMatchObject({
      user: authResponse("first-user").data.user,
      session: authResponse("first-user").data.session,
      isRefetching: false,
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
    expect(result.current).toMatchObject({ user: null, session: null, isRefetching: false });
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
    });
  });
});
