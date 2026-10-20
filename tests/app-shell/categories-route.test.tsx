import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { AuthSessionQueryResult, UseSessionResult } from "@/features/auth";
import { useSession } from "@/features/auth";
import type { components } from "@/shared/api/generated/auth-contracts";
import { describe, expect, it } from "vitest";

import { UiProvider } from "@/app/providers/ui.provider";
import { appRoutes } from "@/app/router/router";
import { createQueryClient } from "@/shared/api/query-client";
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

const publicAuthResponse = (): components["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: {
      id: "categories-route-user",
      email: "operator@example.com",
      role: "OPERATOR",
    },
    session: {
      id: "categories-route-session",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
});

const unauthenticatedResponse = () =>
  HttpResponse.json(
    { error: { code: "UNAUTHORIZED", message: "No active session." } },
    { status: 401 },
  );

describe("Categories route", () => {
  it("holds a direct URL behind session verification and focuses the page heading", async () => {
    const pendingSession = deferred<Response>();
    const sessionRequestStarted = deferred<void>();
    const pendingAbsence = deferred<Response>();
    const absenceRequestStarted = deferred<void>();
    const queryClient = createQueryClient();
    let requestCount = 0;
    let categoryRequestCount = 0;
    let refetch: UseSessionResult["refetch"] | undefined;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => {
        requestCount += 1;
        if (requestCount === 1) {
          sessionRequestStarted.resolve();
          return pendingSession.promise;
        }

        absenceRequestStarted.resolve();
        return pendingAbsence.promise;
      }),
      http.get("https://inventory.test/api/categories", () => {
        categoryRequestCount += 1;
        return HttpResponse.json({ data: [], pagination: { total: 0, page: 1, limit: 15 } });
      }),
    );

    const router = createMemoryRouter(appRoutes, { initialEntries: ["/categories"] });
    const SessionRefreshDriver = () => {
      refetch = useSession().refetch;
      return null;
    };

    render(
      <QueryClientProvider client={queryClient}>
        <UiProvider>
          <>
            <RouterProvider router={router} />
            <SessionRefreshDriver />
          </>
        </UiProvider>
      </QueryClientProvider>,
    );

    await sessionRequestStarted.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
    expect(screen.queryByRole("heading", { level: 1, name: "Categorías" })).not.toBeInTheDocument();

    await act(async () => {
      pendingSession.resolve(HttpResponse.json(publicAuthResponse()));
    });

    const categoriesHeading = await screen.findByRole("heading", {
      level: 1,
      name: "Categorías",
    });
    expect(categoriesHeading).toHaveFocus();
    expect(screen.getByRole("link", { name: "Categorías" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByText("Organiza las categorías que utilizas para clasificar tus productos."),
    ).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(categoryRequestCount).toBe(0);
    expect(router.state.location.pathname).toBe("/categories");

    let refetchResult!: Promise<AuthSessionQueryResult>;
    act(() => {
      refetchResult = refetch!();
    });
    await absenceRequestStarted.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
    expect(screen.queryByRole("heading", { level: 1, name: "Categorías" })).not.toBeInTheDocument();

    pendingAbsence.resolve(unauthenticatedResponse());
    await act(async () => refetchResult);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Sesión no iniciada" }),
    ).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Categorías" })).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/categories");

    router.dispose();
    queryClient.clear();
  });
});
