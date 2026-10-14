import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { useSession, type UseSessionResult } from "@/features/auth";
import { describe, expect, it } from "vitest";

import { CurrentUserAppHeader } from "@/app/components/app-header";
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

describe("App Shell logout race", () => {
  it("announces a delayed logout failure after a concurrent 401 removes the shell", async () => {
    const signOutStarted = deferred<void>();
    const signOutResponse = deferred<Response>();
    const refreshStarted = deferred<void>();
    const refreshResponse = deferred<Response>();
    let sessionRequests = 0;
    let refetch: UseSessionResult["refetch"] | undefined;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => {
        sessionRequests += 1;
        if (sessionRequests === 1) {
          return HttpResponse.json({
            data: {
              user: { id: "logout-race-user", email: "operator@example.com", role: "OPERATOR" },
              session: { id: "logout-race-session", createdAt: "2026-01-01T00:00:00.000Z" },
            },
          });
        }

        refreshStarted.resolve();
        return refreshResponse.promise;
      }),
      http.post(/\/api\/auth\/sign-out/, async () => {
        signOutStarted.resolve();
        return signOutResponse.promise;
      }),
    );

    const SessionRefreshDriver = () => {
      refetch = useSession().refetch;
      return null;
    };
    const user = userEvent.setup();
    render(
      <>
        <SessionBoundary>
          <>
            <CurrentUserAppHeader />
            <h1>Contenido autenticado</h1>
          </>
        </SessionBoundary>
        <SessionRefreshDriver />
      </>,
    );

    await user.click(await screen.findByRole("button", { name: "Cerrar sesión" }));
    await signOutStarted.promise;
    const pendingButton = screen.getByRole("button", { name: "Cerrando sesión…" });
    expect(pendingButton).toHaveAttribute("aria-disabled", "true");
    expect(pendingButton).not.toHaveAttribute("disabled");
    expect(pendingButton).toHaveFocus();

    let refreshPromise!: ReturnType<UseSessionResult["refetch"]>;
    act(() => {
      refreshPromise = refetch!();
    });
    await refreshStarted.promise;
    refreshResponse.resolve(
      HttpResponse.json(
        { error: { code: "UNAUTHORIZED", message: "No active session." } },
        { status: 401 },
      ),
    );
    await act(async () => refreshPromise);

    const signedOutHeading = await screen.findByRole("heading", { name: "Sesión no iniciada" });
    expect(signedOutHeading).toBeVisible();
    expect(signedOutHeading).toHaveFocus();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Contenido autenticado" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cerrar sesión/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();

    signOutResponse.resolve(
      HttpResponse.json(
        { error: { code: "INTERNAL", message: "Internal error." } },
        { status: 503 },
      ),
    );

    const logoutError = await screen.findByRole("alert");
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(logoutError).toHaveTextContent("No se pudo completar el cierre de sesión.");
    expect(logoutError).toHaveTextContent("La sesión ya no está activa.");
    expect(screen.getByRole("heading", { name: "Sesión no iniciada" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Sesión no iniciada" })).toHaveFocus();
    expect(
      screen.queryByRole("heading", { name: "Contenido autenticado" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Cerrar sesión|Reintentar/ }),
    ).not.toBeInTheDocument();
  });
});
