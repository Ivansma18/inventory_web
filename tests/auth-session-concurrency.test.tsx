import { StrictMode, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createAuthClient } from "better-auth/react";
import { http, HttpResponse } from "msw";
import type { components } from "@/shared/api/generated/auth-contracts";
import { createAuthFetchOptions } from "@/features/auth/api/auth-transport";
import { createInventoryAuthPlugin } from "@/features/auth/inventory-auth-plugin";
import { describe, expect, it } from "vitest";

import { server } from "./mocks/server";

const sessionEndpoint = "https://inventory.test/api/auth/get-session";
const signInEndpoint = "https://inventory.test/api/auth/sign-in/email";
const signOutEndpoint = "https://inventory.test/api/auth/sign-out";

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

const unauthenticatedResponse = () =>
  HttpResponse.json(
    { error: { code: "UNAUTHORIZED", message: "No active session." } },
    { status: 401 },
  );

const strictWrapper = ({ children }: { children: ReactNode }) => (
  <StrictMode>{children}</StrictMode>
);

describe("Inventory Auth concurrency", () => {
  it("runs one automatic initial session query across StrictMode and multiple consumers", async () => {
    let sessionRequests = 0;
    server.use(
      http.get(sessionEndpoint, async () => {
        sessionRequests += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return HttpResponse.json(authResponse("shared-user"));
      }),
    );

    const client = createTestAuthClient();
    const firstConsumer = renderHook(() => client.useInventorySession(), {
      wrapper: strictWrapper,
    });
    const secondConsumer = renderHook(() => client.useInventorySession(), {
      wrapper: strictWrapper,
    });

    await waitFor(() => expect(firstConsumer.result.current.status).toBe("authenticated"));
    await waitFor(() => expect(secondConsumer.result.current.status).toBe("authenticated"));
    expect(firstConsumer.result.current).toEqual(secondConsumer.result.current);
    expect(sessionRequests).toBe(1);

    firstConsumer.unmount();
    secondConsumer.unmount();

    const remountedConsumer = renderHook(() => client.useInventorySession(), {
      wrapper: strictWrapper,
    });
    await waitFor(() => expect(remountedConsumer.result.current.status).toBe("authenticated"));
    expect(sessionRequests).toBe(1);
  });

  it("discards a session response started before a confirmed logout", async () => {
    let sessionRequests = 0;
    let resolveStaleQueryStarted!: () => void;
    let resolveStaleQuery!: () => void;
    const staleQueryStarted = new Promise<void>((resolve) => {
      resolveStaleQueryStarted = resolve;
    });
    const staleQueryResponse = new Promise<void>((resolve) => {
      resolveStaleQuery = resolve;
    });

    server.use(
      http.get(sessionEndpoint, async () => {
        sessionRequests += 1;
        if (sessionRequests === 1) {
          return HttpResponse.json(authResponse("current-user"));
        }

        resolveStaleQueryStarted();
        await staleQueryResponse;
        return HttpResponse.json(authResponse("stale-user"));
      }),
      http.post(signOutEndpoint, () => new HttpResponse(null, { status: 204 })),
    );

    const client = createTestAuthClient();
    const { result } = renderHook(() => client.useInventorySession());
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    let staleRefetch!: ReturnType<typeof client.refreshSession>;
    act(() => {
      staleRefetch = client.refreshSession();
    });
    await staleQueryStarted;
    expect(result.current.isRefetching).toBe(true);

    await act(async () => client.signOutInventory());
    expect(result.current).toMatchObject({
      status: "unauthenticated",
      user: null,
      session: null,
      isAuthenticated: false,
      isUnauthenticated: true,
    });

    resolveStaleQuery();
    let staleResult: unknown;
    await act(async () => {
      staleResult = await staleRefetch;
    });

    expect(staleResult).toEqual({ data: null, error: null, stale: true });
    expect(result.current).toMatchObject({
      status: "unauthenticated",
      user: null,
      session: null,
      isAuthenticated: false,
      isUnauthenticated: true,
      isRefetching: false,
    });
  });

  it("serializes sign-in and sign-out requests and returns precondition errors for overlap", async () => {
    let signInRequests = 0;
    let signOutRequests = 0;
    let signInRequestPending = false;
    let resolveSignInStarted!: () => void;
    let resolveSignIn!: () => void;
    let resolveSignOutStarted!: () => void;
    let resolveSignOut!: () => void;
    const signInStarted = new Promise<void>((resolve) => {
      resolveSignInStarted = resolve;
    });
    const signInResponse = new Promise<void>((resolve) => {
      resolveSignIn = resolve;
    });
    const signOutStarted = new Promise<void>((resolve) => {
      resolveSignOutStarted = resolve;
    });
    const signOutResponse = new Promise<void>((resolve) => {
      resolveSignOut = resolve;
    });

    server.use(
      http.get(sessionEndpoint, () => unauthenticatedResponse()),
      http.post(signInEndpoint, async () => {
        signInRequests += 1;
        if (signInRequestPending) {
          return HttpResponse.json(authResponse("unexpected-overlapping-user"));
        }

        signInRequestPending = true;
        resolveSignInStarted();
        await signInResponse;
        signInRequestPending = false;
        return HttpResponse.json(authResponse("serialized-user"));
      }),
      http.post(signOutEndpoint, async () => {
        signOutRequests += 1;
        if (signInRequestPending) {
          return new HttpResponse(null, { status: 204 });
        }

        resolveSignOutStarted();
        await signOutResponse;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const client = createTestAuthClient();
    const { result } = renderHook(() => client.useInventorySession());
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));

    let signInPromise!: ReturnType<typeof client.signInWithEmail>;
    act(() => {
      signInPromise = client.signInWithEmail({
        email: "operator@example.com",
        password: "test-password-only",
      });
    });
    await signInStarted;

    let overlappingSignIn: unknown;
    let overlappingSignOut: unknown;
    await act(async () => {
      overlappingSignIn = await client.signInWithEmail({
        email: "operator@example.com",
        password: "test-password-only",
      });
      overlappingSignOut = await client.signOutInventory();
    });

    resolveSignIn();
    let completedSignIn: unknown;
    await act(async () => {
      completedSignIn = await signInPromise;
    });

    expect(overlappingSignIn).toMatchObject({
      data: null,
      error: { kind: "precondition", activeOperation: "sign-in" },
    });
    expect(overlappingSignOut).toMatchObject({
      data: null,
      error: { kind: "precondition", activeOperation: "sign-in" },
    });
    expect(signInRequests).toBe(1);
    expect(signOutRequests).toBe(0);

    expect(completedSignIn).toMatchObject({ error: null });
    expect(result.current.status).toBe("authenticated");

    let signOutPromise!: ReturnType<typeof client.signOutInventory>;
    act(() => {
      signOutPromise = client.signOutInventory();
    });
    await signOutStarted;

    let overlappingSignInDuringSignOut: unknown;
    await act(async () => {
      overlappingSignInDuringSignOut = await client.signInWithEmail({
        email: "operator@example.com",
        password: "test-password-only",
      });
    });
    resolveSignOut();
    await act(async () => signOutPromise);

    expect(overlappingSignInDuringSignOut).toMatchObject({
      data: null,
      error: {
        kind: "precondition",
        activeOperation: "sign-out",
        sessionStatus: "authenticated",
      },
    });
    expect(signInRequests).toBe(1);
    expect(signOutRequests).toBe(1);
    expect(result.current.status).toBe("unauthenticated");
  });
});
