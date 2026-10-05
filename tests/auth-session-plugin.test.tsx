import { act, renderHook, waitFor } from "@testing-library/react";
import { createAuthClient } from "better-auth/react";
import type { FetchEsque } from "better-auth/client";
import { http, HttpResponse } from "msw";
import type { components } from "@/shared/api/generated/auth-contracts";
import { createAuthFetchOptions } from "@/features/auth/api/auth-transport";
import { createInventoryAuthPlugin } from "@/features/auth/inventory-auth-plugin";
import { describe, expect, it } from "vitest";

import { server } from "./mocks/server";

const sessionEndpoint = "https://inventory.test/api/auth/get-session";
const signInEndpoint = "https://inventory.test/api/auth/sign-in/email";
const signOutEndpoint = "https://inventory.test/api/auth/sign-out";

const createTestAuthClient = (customFetchImpl?: FetchEsque) =>
  createAuthClient({
    baseURL: "https://inventory.test/api/auth",
    fetchOptions: createAuthFetchOptions(customFetchImpl),
    plugins: [createInventoryAuthPlugin()],
  });

const testCredentials = {
  email: "operator@example.com",
  password: "test-password-only",
};

const unauthenticatedResponse = () =>
  HttpResponse.json(
    { error: { code: "UNAUTHORIZED", message: "No active session." } },
    { status: 401 },
  );

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

  it("signs in with email credentials, includes cookies, and publishes the validated session", async () => {
    let requestBody: unknown;
    let requestCredentials: RequestCredentials | undefined;
    let signInRequests = 0;
    const customFetchImpl: FetchEsque = (input, init) => {
      if (String(input).endsWith("/sign-in/email")) {
        requestCredentials = init?.credentials;
      }

      return fetch(input, init);
    };

    server.use(
      http.get(sessionEndpoint, () => unauthenticatedResponse()),
      http.post(signInEndpoint, async ({ request }) => {
        signInRequests += 1;
        requestBody = await request.json();
        await wait(25);
        return HttpResponse.json(authResponse("signed-in-user"));
      }),
    );

    const client = createTestAuthClient(customFetchImpl);
    const { result } = renderHook(() => ({
      session: client.useInventorySession(),
      signIn: client.useInventorySignIn(),
    }));

    await waitFor(() => expect(result.current.session.status).toBe("unauthenticated"));

    let signInPromise!: ReturnType<typeof client.signInWithEmail>;
    act(() => {
      signInPromise = client.signInWithEmail(testCredentials);
    });

    expect(result.current.signIn.isPending).toBe(true);

    let signInResult!: Awaited<ReturnType<typeof client.signInWithEmail>>;
    await act(async () => {
      signInResult = await signInPromise;
    });

    expect(signInRequests).toBe(1);
    expect(requestBody).toEqual(testCredentials);
    expect(requestCredentials).toBe("include");
    expect(signInResult!).toMatchObject({
      data: authResponse("signed-in-user"),
      error: null,
    });
    expect(result.current.session).toMatchObject({
      status: "authenticated",
      user: authResponse("signed-in-user").data.user,
      session: authResponse("signed-in-user").data.session,
      isAuthenticated: true,
      isUnauthenticated: false,
    });
    expect(result.current.signIn.isPending).toBe(false);
  });

  it("keeps the confirmed unauthenticated state and returns a sanitized credentials error", async () => {
    server.use(
      http.get(sessionEndpoint, () => unauthenticatedResponse()),
      http.post(signInEndpoint, () =>
        HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Sensitive backend detail." } },
          { status: 401 },
        ),
      ),
    );

    const client = createTestAuthClient();
    const { result } = renderHook(() => client.useInventorySession());

    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    let signInResult!: Awaited<ReturnType<typeof client.signInWithEmail>>;
    await act(async () => {
      signInResult = await client.signInWithEmail(testCredentials);
    });

    expect(signInResult).toMatchObject({
      data: null,
      error: {
        kind: "credentials",
        status: 401,
        code: "UNAUTHORIZED",
        message: expect.any(String),
      },
    });
    expect(JSON.stringify(signInResult)).not.toContain("Sensitive backend detail.");
    expect(result.current).toMatchObject({
      status: "unauthenticated",
      user: null,
      session: null,
      isAuthenticated: false,
      isUnauthenticated: true,
    });
  });

  it.each(["pending", "authenticated", "unconfirmed"] as const)(
    "does not send login while the session is %s",
    async (initialStatus) => {
      let signInRequests = 0;
      let resolveInitialSession: (() => void) | undefined;
      let resolveQueryStarted: (() => void) | undefined;
      const initialQueryStarted = new Promise<void>((resolve) => {
        resolveQueryStarted = resolve;
      });
      const delayedSession = new Promise<void>((resolve) => {
        resolveInitialSession = resolve;
      });

      server.use(
        http.get(sessionEndpoint, async () => {
          if (initialStatus === "pending") {
            resolveQueryStarted?.();
            await delayedSession;
            return unauthenticatedResponse();
          }

          if (initialStatus === "authenticated") {
            return HttpResponse.json(authResponse("existing-user"));
          }

          return HttpResponse.json({
            data: {
              user: { id: "incomplete-user", email: "operator@example.com" },
              session: { id: "incomplete-session", createdAt: "2026-01-01T00:00:00.000Z" },
            },
          });
        }),
        http.post(signInEndpoint, () => {
          signInRequests += 1;
          return HttpResponse.json(authResponse("unexpected-user"));
        }),
      );

      const client = createTestAuthClient();
      const { result } = renderHook(() => client.useInventorySession());

      if (initialStatus === "pending") {
        await initialQueryStarted;
      } else {
        await waitFor(() => expect(result.current.status).toBe(initialStatus));
      }

      let signInResult!: Awaited<ReturnType<typeof client.signInWithEmail>>;
      await act(async () => {
        signInResult = await client.signInWithEmail(testCredentials);
      });

      expect(signInResult).toMatchObject({
        data: null,
        error: { kind: "precondition", sessionStatus: initialStatus },
      });
      expect(signInRequests).toBe(0);

      if (initialStatus === "pending") {
        resolveInitialSession?.();
        await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
      }
    },
  );

  it("does not authenticate from an incomplete sign-in response", async () => {
    server.use(
      http.get(sessionEndpoint, () => unauthenticatedResponse()),
      http.post(signInEndpoint, () =>
        HttpResponse.json({
          data: {
            user: { id: "incomplete-user", email: "operator@example.com" },
            session: { id: "incomplete-session", createdAt: "2026-01-01T00:00:00.000Z" },
          },
        }),
      ),
    );

    const client = createTestAuthClient();
    const { result } = renderHook(() => client.useInventorySession());

    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    let signInResult!: Awaited<ReturnType<typeof client.signInWithEmail>>;
    await act(async () => {
      signInResult = await client.signInWithEmail(testCredentials);
    });

    expect(signInResult).toMatchObject({
      data: null,
      error: { kind: "contract", operation: "sign-in", status: 200 },
    });
    expect(result.current).toMatchObject({
      status: "unconfirmed",
      user: null,
      session: null,
      isAuthenticated: false,
      isUnauthenticated: false,
    });
  });

  it("confirms logout immediately on a bodyless 204 and does not restore the closed session", async () => {
    let sessionRequests = 0;
    let signOutRequests = 0;
    let signOutCredentials: RequestCredentials | undefined;
    const customFetchImpl: FetchEsque = (input, init) => {
      if (String(input).endsWith("/sign-out")) {
        signOutCredentials = init?.credentials;
      }

      return fetch(input, init);
    };

    server.use(
      http.get(sessionEndpoint, () => {
        sessionRequests += 1;
        return sessionRequests === 1
          ? HttpResponse.json(authResponse("logout-user"))
          : unauthenticatedResponse();
      }),
      http.post(signOutEndpoint, async () => {
        signOutRequests += 1;
        await wait(25);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const client = createTestAuthClient(customFetchImpl);
    const { result } = renderHook(() => ({
      session: client.useInventorySession(),
      signOut: client.useInventorySignOut(),
    }));

    await waitFor(() => expect(result.current.session.status).toBe("authenticated"));

    let signOutPromise!: ReturnType<typeof client.signOutInventory>;
    act(() => {
      signOutPromise = client.signOutInventory();
    });

    expect(result.current.signOut.isPending).toBe(true);
    expect(result.current.session.status).toBe("authenticated");

    let signOutResult!: Awaited<ReturnType<typeof client.signOutInventory>>;
    await act(async () => {
      signOutResult = await signOutPromise;
    });

    expect(signOutResult).toEqual({ data: null, error: null });
    expect(signOutRequests).toBe(1);
    expect(signOutCredentials).toBe("include");
    expect(result.current.signOut.isPending).toBe(false);
    expect(result.current.session).toMatchObject({
      status: "unauthenticated",
      user: null,
      session: null,
      isAuthenticated: false,
      isUnauthenticated: true,
    });
    expect(sessionRequests).toBe(1);

    await act(async () => client.refreshSession());

    expect(sessionRequests).toBe(2);
    expect(result.current.session).toMatchObject({
      status: "unauthenticated",
      user: null,
      session: null,
      isAuthenticated: false,
      isUnauthenticated: true,
    });
  });
});
