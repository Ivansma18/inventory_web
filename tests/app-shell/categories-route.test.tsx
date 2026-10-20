import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it.each([
    { path: "/categories/new", heading: "Crear categoría" },
    {
      path: "/categories/018f1f3b-7c2a-7b6e-9f12-123456789abc/edit",
      heading: "Editar categoría",
    },
  ])(
    "protects the direct $path route and focuses its heading after session confirmation",
    async ({ path, heading }) => {
      const pendingResponses = Array.from({ length: 3 }, () => deferred<Response>());
      const requestsStarted = Array.from({ length: 3 }, () => deferred<void>());
      const queryClient = createQueryClient();
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

      const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
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

      let initialRefresh!: Promise<AuthSessionQueryResult>;
      act(() => {
        initialRefresh = refetch!();
      });
      await requestsStarted[0]?.promise;
      expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
      expect(screen.queryByRole("heading", { level: 1, name: heading })).not.toBeInTheDocument();

      pendingResponses[0]?.resolve(HttpResponse.json(publicAuthResponse()));
      await act(async () => initialRefresh);

      const pageHeading = await screen.findByRole("heading", { level: 1, name: heading });
      expect(pageHeading).toHaveFocus();
      expect(screen.getByRole("main")).toContainElement(pageHeading);
      expect(screen.getByRole("banner")).toHaveTextContent("operator@example.com");
      expect(router.state.location.pathname).toBe(path);

      let errorRefresh!: Promise<AuthSessionQueryResult>;
      act(() => {
        errorRefresh = refetch!();
      });
      await requestsStarted[1]?.promise;
      expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
      expect(screen.queryByRole("heading", { level: 1, name: heading })).not.toBeInTheDocument();

      pendingResponses[1]?.resolve(
        HttpResponse.json({ error: { code: "INTERNAL" } }, { status: 503 }),
      );
      await act(async () => errorRefresh);
      expect(
        await screen.findByRole("heading", { level: 1, name: "No se pudo comprobar la sesión" }),
      ).toBeVisible();
      expect(screen.queryByRole("heading", { level: 1, name: heading })).not.toBeInTheDocument();
      expect(router.state.location.pathname).toBe(path);

      await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
      await requestsStarted[2]?.promise;
      expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");

      pendingResponses[2]?.resolve(unauthenticatedResponse());
      expect(
        await screen.findByRole("heading", { level: 1, name: "Sesión no iniciada" }),
      ).toBeVisible();
      expect(screen.queryByRole("heading", { level: 1, name: heading })).not.toBeInTheDocument();
      expect(router.state.location.pathname).toBe(path);

      router.dispose();
      queryClient.clear();
    },
  );
});
