import { act, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useEffect } from "react";
import type { AuthSessionQueryResult, UseSessionResult } from "@/features/auth";
import { useSession } from "@/features/auth";
import type { components } from "@/shared/api/generated/auth-contracts";
import { describe, expect, it, vi } from "vitest";

import { SessionBoundary } from "@/app/layouts/session-boundary";
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

const publicAuthResponse = (userId: string): components["schemas"]["PublicAuthResponse"] => ({
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

describe("SessionBoundary", () => {
  it("prioritizes the latest public verification and only mounts protected content after success", async () => {
    const pendingResponses = Array.from({ length: 5 }, () => deferred<Response>());
    const requestsStarted = Array.from({ length: 5 }, () => deferred<void>());
    let requestCount = 0;
    let refetch: UseSessionResult["refetch"] | undefined;
    const onProtectedMount = vi.fn();
    const onProtectedUnmount = vi.fn();

    server.use(
      http.get(/\/api\/auth\/get-session/, async () => {
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

    const SessionRefreshDriver = () => {
      const session = useSession();
      refetch = session.refetch;
      return null;
    };

    const ProtectedContent = () => {
      const session = useSession();

      useEffect(() => {
        onProtectedMount();
        return onProtectedUnmount;
      }, []);

      return <p>Contenido privado de {session.user?.id}</p>;
    };

    render(
      <>
        <SessionBoundary>
          <ProtectedContent />
        </SessionBoundary>
        <SessionRefreshDriver />
      </>,
    );

    await requestsStarted[0]?.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
    expect(onProtectedMount).not.toHaveBeenCalled();

    pendingResponses[0]?.resolve(
      HttpResponse.json({ error: { code: "INTERNAL" } }, { status: 503 }),
    );
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No se pudo"));
    expect(onProtectedMount).not.toHaveBeenCalled();

    let recovery!: Promise<AuthSessionQueryResult>;
    act(() => {
      recovery = refetch!();
    });
    await requestsStarted[1]?.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
    expect(screen.queryByText(/Contenido privado/)).not.toBeInTheDocument();

    pendingResponses[1]?.resolve(HttpResponse.json(publicAuthResponse("confirmed-user")));
    await act(async () => recovery);
    expect(await screen.findByText("Contenido privado de confirmed-user")).toBeInTheDocument();
    expect(onProtectedMount).toHaveBeenCalledTimes(1);

    let failedRefetch!: Promise<AuthSessionQueryResult>;
    act(() => {
      failedRefetch = refetch!();
    });
    await requestsStarted[2]?.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
    await waitFor(() => expect(onProtectedUnmount).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Contenido privado/)).not.toBeInTheDocument();

    pendingResponses[2]?.resolve(
      HttpResponse.json({ error: { code: "INTERNAL" } }, { status: 503 }),
    );
    await act(async () => failedRefetch);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo");
    expect(screen.queryByText(/Contenido privado/)).not.toBeInTheDocument();
    expect(onProtectedMount).toHaveBeenCalledTimes(1);

    let successfulRefetch!: Promise<AuthSessionQueryResult>;
    act(() => {
      successfulRefetch = refetch!();
    });
    await requestsStarted[3]?.promise;
    pendingResponses[3]?.resolve(HttpResponse.json(publicAuthResponse("recovered-user")));
    await act(async () => successfulRefetch);
    expect(await screen.findByText("Contenido privado de recovered-user")).toBeInTheDocument();
    expect(onProtectedMount).toHaveBeenCalledTimes(2);

    let unauthenticatedRefetch!: Promise<AuthSessionQueryResult>;
    act(() => {
      unauthenticatedRefetch = refetch!();
    });
    await requestsStarted[4]?.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
    await waitFor(() => expect(onProtectedUnmount).toHaveBeenCalledTimes(2));

    pendingResponses[4]?.resolve(unauthenticatedResponse());
    await act(async () => unauthenticatedRefetch);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Sesión no iniciada" }),
    ).toBeVisible();
    expect(screen.queryByText(/Contenido privado/)).not.toBeInTheDocument();
    expect(requestCount).toBe(5);
  });
});
