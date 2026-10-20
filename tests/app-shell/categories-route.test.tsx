import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, within } from "@testing-library/react";
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
    const categoryRequests: URL[] = [];
    let refetch: UseSessionResult["refetch"] | undefined;
    const categoryFor = (page: number, index: number) => ({
      uuid: `550e8400-e29b-41d4-a716-${String(page * 100 + index).padStart(12, "0")}`,
      name: page === 1 && index === 1 ? "Oficina" : `Categoría ${page}-${index}`,
      description: null,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

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
      http.get("https://inventory.test/api/categories", ({ request }) => {
        categoryRequestCount += 1;
        const url = new URL(request.url);
        categoryRequests.push(url);
        const page = Number(url.searchParams.get("page"));
        const data =
          page === 1
            ? Array.from({ length: 15 }, (_, index) => categoryFor(page, index + 1))
            : [categoryFor(page, 1)];

        return HttpResponse.json({
          data,
          pagination: { total: 31, page, limit: 15 },
        });
      }),
    );

    const router = createMemoryRouter(appRoutes, { initialEntries: ["/categories"] });
    const SessionRefreshDriver = () => {
      refetch = useSession().refetch;
      return null;
    };

    const user = userEvent.setup();
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
    expect(screen.getByRole("table")).toBeVisible();
    const firstCategoryRow = screen.getByRole("row", { name: /Oficina/ });
    expect(firstCategoryRow).toBeVisible();
    expect(within(firstCategoryRow).getByText("Activa")).toBeVisible();
    expect(screen.getAllByRole("row")).toHaveLength(16);
    expect(screen.getByRole("status")).toHaveTextContent("31 categorías");
    expect(categoryRequestCount).toBe(1);
    expect(Object.fromEntries(categoryRequests[0]!.searchParams)).toEqual({
      page: "1",
      limit: "15",
      isActive: "true",
      sort: "name",
      order: "asc",
    });
    expect(router.state.location.pathname).toBe("/categories");

    await user.click(screen.getByRole("button", { name: "Página siguiente" }));

    expect(await screen.findByRole("row", { name: /Categoría 2-1/ })).toBeVisible();
    expect(screen.getByText("Página 2 de 3")).toBeVisible();
    expect(categoryRequestCount).toBe(2);
    expect(Object.fromEntries(categoryRequests[1]!.searchParams)).toEqual({
      page: "2",
      limit: "15",
      isActive: "true",
      sort: "name",
      order: "asc",
    });

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
