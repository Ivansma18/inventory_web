import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { useAuth, useSession } from "@/features/auth";
import type {
  AuthSessionQueryResult,
  AuthSignInResult,
  AuthSignOutResult,
  SignInCredentials,
} from "@/features/auth";

import { server } from "./mocks/server";

const unauthenticatedResponse = () =>
  HttpResponse.json(
    { error: { code: "UNAUTHORIZED", message: "No active session." } },
    { status: 401 },
  );

const publicAuthResponse = (userId: string) => ({
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

describe("public Auth hooks", () => {
  it("exposes session state, actions, and refetch without client internals", async () => {
    let sessionRequests = 0;
    let signInRequests = 0;
    let signInRequestBody: unknown;
    let signInRequestMethod: string | undefined;
    let signInRequestUrl: string | undefined;
    let signOutRequests = 0;
    const credentials: SignInCredentials = {
      email: "operator@example.com",
      password: "test-password-only",
    };

    server.use(
      http.get(/\/api\/auth\/get-session/, () => {
        sessionRequests += 1;
        if (sessionRequests === 1) {
          return HttpResponse.json({
            data: {
              user: { id: "incomplete-user", email: "operator@example.com" },
              session: { id: "incomplete-session", createdAt: "2026-01-01T00:00:00.000Z" },
            },
          });
        }

        return sessionRequests === 2
          ? unauthenticatedResponse()
          : HttpResponse.json(publicAuthResponse("refetched-user"));
      }),
      http.post(/\/api\/auth\/sign-in\/email/, async ({ request }) => {
        signInRequests += 1;
        signInRequestMethod = request.method;
        signInRequestUrl = request.url;
        signInRequestBody = await request.json();
        await wait(25);
        return HttpResponse.json(publicAuthResponse("signed-in-user"));
      }),
      http.post(/\/api\/auth\/sign-out/, async () => {
        signOutRequests += 1;
        await wait(25);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { result } = renderHook(() => ({ session: useSession(), auth: useAuth() }));

    expect(result.current.session.status).toBe("pending");
    await waitFor(() => expect(result.current.session.status).toBe("unconfirmed"));
    expect(result.current.session).toMatchObject({
      user: null,
      session: null,
      isAuthenticated: false,
      isUnauthenticated: false,
      isPending: false,
      error: { kind: "contract", operation: "session" },
    });

    let preconditionResult!: AuthSignInResult;
    await act(async () => {
      preconditionResult = await result.current.auth.signIn(credentials);
    });

    expect(preconditionResult).toMatchObject({
      data: null,
      error: { kind: "precondition", sessionStatus: "unconfirmed" },
    });
    expect(signInRequests).toBe(0);

    let unauthenticatedQueryResult!: AuthSessionQueryResult;
    await act(async () => {
      unauthenticatedQueryResult = await result.current.session.refetch();
    });

    expect(unauthenticatedQueryResult).toEqual({ data: null, error: null });
    expect(result.current.session.status).toBe("unauthenticated");

    let signInPromise!: Promise<AuthSignInResult>;
    act(() => {
      signInPromise = result.current.auth.signIn(credentials);
    });

    expect(result.current.auth.isSigningIn).toBe(true);
    let signInResult!: AuthSignInResult;
    await act(async () => {
      signInResult = await signInPromise;
    });

    expect(signInRequests).toBe(1);
    expect(signInRequestBody).toEqual(credentials);
    expect(signInRequestMethod).toBe("POST");
    expect(new URL(signInRequestUrl!).pathname).toBe("/api/auth/sign-in/email");
    expect(signInResult).toMatchObject({ data: publicAuthResponse("signed-in-user"), error: null });
    expect(result.current.session).toMatchObject({
      status: "authenticated",
      user: publicAuthResponse("signed-in-user").data.user,
      session: publicAuthResponse("signed-in-user").data.session,
      isPending: false,
      isAuthenticated: true,
      isUnauthenticated: false,
    });
    expect(result.current.auth.isSigningIn).toBe(false);

    let sessionQueryResult!: AuthSessionQueryResult;
    await act(async () => {
      sessionQueryResult = await result.current.session.refetch();
    });

    expect(sessionQueryResult).toMatchObject({
      data: publicAuthResponse("refetched-user"),
      error: null,
    });
    expect(result.current.session.user?.id).toBe("refetched-user");

    let signOutPromise!: Promise<AuthSignOutResult>;
    act(() => {
      signOutPromise = result.current.auth.signOut();
    });

    expect(result.current.auth.isSigningOut).toBe(true);
    let signOutResult!: AuthSignOutResult;
    await act(async () => {
      signOutResult = await signOutPromise;
    });

    expect(signOutResult).toEqual({ data: null, error: null });
    expect(result.current.session).toMatchObject({
      status: "unauthenticated",
      user: null,
      session: null,
      isAuthenticated: false,
      isUnauthenticated: true,
    });
    expect(result.current.auth.isSigningOut).toBe(false);
    expect(sessionRequests).toBe(3);
    expect(signInRequests).toBe(1);
    expect(signOutRequests).toBe(1);
  });
});
