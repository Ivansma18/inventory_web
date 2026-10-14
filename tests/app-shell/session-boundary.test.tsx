import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { useEffect } from "react";
import type { AuthSessionQueryResult, UseSessionResult } from "@/features/auth";
import { useSession } from "@/features/auth";
import type { components } from "@/shared/api/generated/auth-contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { appRoutes } from "@/app/router/router";
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

const beginCompactSessionRefresh = async () => {
  const refreshResponse = deferred<Response>();
  const refreshRequestStarted = deferred<void>();
  let holdRefresh = false;
  let refetch: UseSessionResult["refetch"] | undefined;

  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );

  server.use(
    http.get(/\/api\/auth\/get-session/, () => {
      if (holdRefresh) {
        refreshRequestStarted.resolve();
        return refreshResponse.promise;
      }

      return HttpResponse.json(publicAuthResponse("drawer-user"));
    }),
  );

  const router = createMemoryRouter(appRoutes, { initialEntries: ["/"] });
  const SessionRefreshDriver = () => {
    refetch = useSession().refetch;
    return null;
  };
  const { container } = render(
    <>
      <RouterProvider router={router} />
      <SessionRefreshDriver />
    </>,
  );

  let initialRefresh!: Promise<AuthSessionQueryResult>;
  act(() => {
    initialRefresh = refetch!();
  });
  await act(async () => initialRefresh);
  await screen.findByRole("heading", { level: 1, name: "Bienvenido a Inventory" });
  await userEvent.setup().click(screen.getByRole("button", { name: "Abrir navegación" }));
  expect(screen.getByRole("dialog", { name: "Navegación principal" })).toBeVisible();
  expect(container).toHaveAttribute("inert", "");

  holdRefresh = true;
  let refreshResult!: Promise<AuthSessionQueryResult>;
  act(() => {
    refreshResult = refetch!();
  });
  await refreshRequestStarted.promise;

  return { container, refreshResponse, refreshResult, router };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SessionBoundary", () => {
  it("recovers from HTTP, network, and contract failures without losing the URL", async () => {
    const pendingResponses = Array.from({ length: 6 }, () => deferred<Response>());
    const requestsStarted = Array.from({ length: 6 }, () => deferred<void>());
    let requestCount = 0;
    let refetch: UseSessionResult["refetch"] | undefined;
    const onProtectedMount = vi.fn();
    const onProtectedUnmount = vi.fn();

    window.history.replaceState(null, "", "/requested/report?filter=low-stock#row-7");
    const requestedUrl = window.location.href;

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

    const initialAlert = screen.getByRole("alert");
    const retryButton = screen.getByRole("button", { name: "Reintentar" });
    expect(initialAlert).not.toContainElement(retryButton);
    act(() => {
      retryButton.click();
      retryButton.click();
    });
    await requestsStarted[1]?.promise;
    expect(requestCount).toBe(2);
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
    expect(screen.getByRole("heading", { name: "Comprobando tu sesión" })).toHaveFocus();
    expect(screen.queryByText(/Contenido privado/)).not.toBeInTheDocument();

    pendingResponses[1]?.resolve(HttpResponse.json(publicAuthResponse("confirmed-user")));
    expect(await screen.findByText("Contenido privado de confirmed-user")).toBeInTheDocument();
    expect(onProtectedMount).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe(requestedUrl);

    let failedRefetch!: Promise<AuthSessionQueryResult>;
    act(() => {
      failedRefetch = refetch!();
    });
    await requestsStarted[2]?.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
    await waitFor(() => expect(onProtectedUnmount).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Contenido privado/)).not.toBeInTheDocument();

    pendingResponses[2]?.resolve(HttpResponse.error());
    await act(async () => failedRefetch);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo");
    expect(screen.queryByText(/Contenido privado/)).not.toBeInTheDocument();
    expect(onProtectedMount).toHaveBeenCalledTimes(1);

    const retryUnauthenticatedButton = screen.getByRole("button", { name: "Reintentar" });
    act(() => {
      retryUnauthenticatedButton.click();
    });
    await requestsStarted[3]?.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
    expect(screen.getByRole("heading", { name: "Comprobando tu sesión" })).toHaveFocus();
    await waitFor(() => expect(onProtectedUnmount).toHaveBeenCalledTimes(1));

    pendingResponses[3]?.resolve(unauthenticatedResponse());
    expect(
      await screen.findByRole("heading", { level: 1, name: "Sesión no iniciada" }),
    ).toBeVisible();
    expect(screen.queryByText(/Contenido privado/)).not.toBeInTheDocument();
    expect(window.location.href).toBe(requestedUrl);

    let contractFailure!: Promise<AuthSessionQueryResult>;
    act(() => {
      contractFailure = refetch!();
    });
    await requestsStarted[4]?.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");

    pendingResponses[4]?.resolve(
      HttpResponse.json({ data: { user: { id: "incomplete-user" }, session: {} } }),
    );
    await act(async () => contractFailure);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo");

    const retryContractButton = screen.getByRole("button", { name: "Reintentar" });
    act(() => {
      retryContractButton.click();
    });
    await requestsStarted[5]?.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
    expect(screen.getByRole("heading", { name: "Comprobando tu sesión" })).toHaveFocus();

    pendingResponses[5]?.resolve(HttpResponse.json(publicAuthResponse("contract-recovered")));
    expect(await screen.findByText("Contenido privado de contract-recovered")).toBeInTheDocument();
    expect(onProtectedMount).toHaveBeenCalledTimes(2);
    expect(window.location.href).toBe(requestedUrl);
    expect(requestCount).toBe(6);
  });

  it("closes compact navigation, unlocks the page, and focuses the pending session heading", async () => {
    const { container, refreshResponse, refreshResult, router } =
      await beginCompactSessionRefresh();

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Comprobando tu sesión",
    });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.queryByRole("dialog", { name: "Navegación principal" })).not.toBeInTheDocument();
    expect(container).not.toHaveAttribute("inert");
    expect(container).not.toHaveAttribute("aria-hidden");

    refreshResponse.resolve(unauthenticatedResponse());
    await act(async () => refreshResult);
    router.dispose();
  });

  it("keeps focus on the session heading when a refresh settles with an error", async () => {
    const { container, refreshResponse, refreshResult, router } =
      await beginCompactSessionRefresh();

    refreshResponse.resolve(
      HttpResponse.json(
        { error: { code: "INTERNAL", message: "Internal error." } },
        { status: 503 },
      ),
    );
    await act(async () => refreshResult);

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "No se pudo comprobar la sesión",
    });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.queryByRole("dialog", { name: "Navegación principal" })).not.toBeInTheDocument();
    expect(container).not.toHaveAttribute("inert");
    expect(container).not.toHaveAttribute("aria-hidden");
    router.dispose();
  });

  it("keeps focus on the session heading when a refresh confirms no session", async () => {
    const { container, refreshResponse, refreshResult, router } =
      await beginCompactSessionRefresh();

    refreshResponse.resolve(unauthenticatedResponse());
    await act(async () => refreshResult);

    const heading = await screen.findByRole("heading", { level: 1, name: "Sesión no iniciada" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.queryByRole("dialog", { name: "Navegación principal" })).not.toBeInTheDocument();
    expect(container).not.toHaveAttribute("inert");
    expect(container).not.toHaveAttribute("aria-hidden");
    router.dispose();
  });
});
