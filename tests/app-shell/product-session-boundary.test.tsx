import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { AuthSessionQueryResult, UseSessionResult } from "@/features/auth";
import { useSession } from "@/features/auth";
import type { components } from "@/shared/api/generated/auth-contracts";
import { describe, expect, it } from "vitest";

import { appRoutes } from "@/app/router/router";
import { server } from "../mocks/server";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

const publicAuthResponse = (
  userId: string,
  email: string,
): components["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: {
      id: userId,
      email,
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

describe("Product routes and session boundary", () => {
  it("does not present content from a previous session during pending, error, or signed-out states", async () => {
    const user = userEvent.setup();
    const pendingResponses = Array.from({ length: 4 }, () => deferred<Response>());
    const requestsStarted = Array.from({ length: 4 }, () => deferred<void>());
    let requestCount = 0;
    let refetch: UseSessionResult["refetch"] | undefined;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => {
        const requestIndex = requestCount;
        requestCount += 1;
        requestsStarted[requestIndex]?.resolve();

        const response = pendingResponses[requestIndex];
        if (!response) {
          throw new Error("Unexpected extra session verification request.");
        }

        return response.promise;
      }),
    );

    const router = createMemoryRouter(appRoutes, { initialEntries: ["/products"] });
    const SessionRefreshDriver = () => {
      refetch = useSession().refetch;
      return null;
    };

    render(
      <>
        <RouterProvider router={router} />
        <SessionRefreshDriver />
      </>,
    );

    await requestsStarted[0]?.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
    expect(screen.queryByRole("heading", { level: 1, name: "Productos" })).not.toBeInTheDocument();

    pendingResponses[0]?.resolve(
      HttpResponse.json(publicAuthResponse("first-user", "first@example.com")),
    );
    expect(await screen.findByRole("heading", { level: 1, name: "Productos" })).toBeVisible();
    expect(screen.getByRole("banner")).toHaveTextContent("first@example.com");

    let replacementSession!: Promise<AuthSessionQueryResult>;
    act(() => {
      replacementSession = refetch!();
    });
    await requestsStarted[1]?.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
    expect(screen.queryByRole("heading", { level: 1, name: "Productos" })).not.toBeInTheDocument();
    expect(screen.queryByText("first@example.com")).not.toBeInTheDocument();

    pendingResponses[1]?.resolve(
      HttpResponse.json(publicAuthResponse("second-user", "second@example.com")),
    );
    await act(async () => replacementSession);
    expect(await screen.findByRole("heading", { level: 1, name: "Productos" })).toBeVisible();
    expect(screen.getByRole("banner")).toHaveTextContent("second@example.com");

    let failedSession!: Promise<AuthSessionQueryResult>;
    act(() => {
      failedSession = refetch!();
    });
    await requestsStarted[2]?.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
    expect(screen.queryByText("second@example.com")).not.toBeInTheDocument();

    pendingResponses[2]?.resolve(
      HttpResponse.json({ error: { code: "INTERNAL" } }, { status: 503 }),
    );
    await act(async () => failedSession);
    expect(
      await screen.findByRole("heading", { level: 1, name: "No se pudo comprobar la sesión" }),
    ).toBeVisible();
    expect(screen.queryByRole("heading", { level: 1, name: "Productos" })).not.toBeInTheDocument();
    expect(screen.queryByText("second@example.com")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await requestsStarted[3]?.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");

    pendingResponses[3]?.resolve(unauthenticatedResponse());
    expect(
      await screen.findByRole("heading", { level: 1, name: "Sesión no iniciada" }),
    ).toBeVisible();
    expect(screen.queryByRole("heading", { level: 1, name: "Productos" })).not.toBeInTheDocument();
    expect(screen.queryByText("second@example.com")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/products");
    expect(requestCount).toBe(4);

    router.dispose();
  });
});
