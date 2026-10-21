import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
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

interface SessionRefreshCaptureProps {
  onRefetch: (refetch: UseSessionResult["refetch"]) => void;
}

const SessionRefreshCapture = ({ onRefetch }: SessionRefreshCaptureProps) => {
  onRefetch(useSession().refetch);
  return null;
};

const renderAuthenticatedCategoriesRoute = async (
  queryClient: ReturnType<typeof createQueryClient>,
  router: ReturnType<typeof createMemoryRouter>,
) => {
  let refetch: UseSessionResult["refetch"] | undefined;
  const createTree = (children: ReactNode) => (
    <QueryClientProvider client={queryClient}>
      <UiProvider>{children}</UiProvider>
    </QueryClientProvider>
  );
  const rendered = render(
    createTree(
      <SessionRefreshCapture
        onRefetch={(refresh) => {
          refetch = refresh;
        }}
      />,
    ),
  );

  let sessionRefresh!: Promise<AuthSessionQueryResult>;
  act(() => {
    sessionRefresh = refetch!();
  });
  await act(async () => sessionRefresh);
  rendered.rerender(createTree(<RouterProvider router={router} />));

  return rendered;
};

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

  it("announces a pending category list query and renders its result", async () => {
    const pendingList = deferred<Response>();
    const listRequestStarted = deferred<void>();
    const queryClient = createQueryClient();

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get("https://inventory.test/api/categories", () => {
        listRequestStarted.resolve();
        return pendingList.promise;
      }),
    );

    const router = createMemoryRouter(appRoutes, { initialEntries: ["/categories"] });
    await renderAuthenticatedCategoriesRoute(queryClient, router);
    await listRequestStarted.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Cargando datos...");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    pendingList.resolve(
      HttpResponse.json({
        data: [
          {
            uuid: "550e8400-e29b-41d4-a716-446655440000",
            name: "Oficina",
            description: null,
            isActive: true,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        pagination: { total: 1, page: 1, limit: 15 },
      }),
    );
    expect(await screen.findByRole("row", { name: /Oficina/ })).toBeVisible();

    router.dispose();
    queryClient.clear();
  });

  it("shows a list error and retries only after an explicit action", async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    let categoryRequestCount = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get("https://inventory.test/api/categories", () => {
        categoryRequestCount += 1;
        if (categoryRequestCount === 1) {
          return HttpResponse.json({ error: "Unavailable" }, { status: 503 });
        }

        return HttpResponse.json({
          data: [
            {
              uuid: "550e8400-e29b-41d4-a716-446655440000",
              name: "Oficina",
              description: null,
              isActive: true,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
          pagination: { total: 1, page: 1, limit: 15 },
        });
      }),
    );

    const router = createMemoryRouter(appRoutes, { initialEntries: ["/categories"] });
    await renderAuthenticatedCategoriesRoute(queryClient, router);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar las categorías.",
    );
    expect(categoryRequestCount).toBe(1);

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("row", { name: /Oficina/ })).toBeVisible();
    expect(categoryRequestCount).toBe(2);

    router.dispose();
    queryClient.clear();
  });

  it("shows the general empty state and its first-page paginator", async () => {
    const queryClient = createQueryClient();

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get("https://inventory.test/api/categories", () =>
        HttpResponse.json({ data: [], pagination: { total: 0, page: 1, limit: 15 } }),
      ),
    );

    const router = createMemoryRouter(appRoutes, { initialEntries: ["/categories"] });
    await renderAuthenticatedCategoriesRoute(queryClient, router);
    expect(await screen.findByText("No hay categorías para mostrar.")).toBeVisible();
    expect(screen.getByText("Página 1 de 1")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Limpiar búsqueda" })).not.toBeInTheDocument();

    router.dispose();
    queryClient.clear();
  });

  it("replaces an out-of-range page with the last result page without a history loop", async () => {
    const requestedPages: number[] = [];
    const queryClient = createQueryClient();

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get("https://inventory.test/api/categories", ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        requestedPages.push(page);

        return HttpResponse.json({
          data:
            page === 2
              ? [
                  {
                    uuid: "550e8400-e29b-41d4-a716-446655440016",
                    name: "Última categoría",
                    description: null,
                    isActive: true,
                    createdAt: "2026-01-01T00:00:00.000Z",
                    updatedAt: "2026-01-01T00:00:00.000Z",
                  },
                ]
              : [],
          pagination: { total: 16, page, limit: 15 },
        });
      }),
    );

    const router = createMemoryRouter(appRoutes, {
      initialEntries: ["/", "/categories?page=3"],
    });
    await renderAuthenticatedCategoriesRoute(queryClient, router);

    expect(await screen.findByRole("row", { name: /Última categoría/ })).toBeVisible();
    await waitFor(() =>
      expect(router.state.location.search).toBe("?page=2&status=active&sort=name&order=asc"),
    );
    expect(requestedPages).toEqual([3, 2]);
    expect(screen.getByText("Página 2 de 2")).toBeVisible();

    await router.navigate(-1);
    expect(router.state.location.pathname + router.state.location.search).toBe("/");
    await router.navigate(1);
    expect(router.state.location.pathname + router.state.location.search).toBe(
      "/categories?page=2&status=active&sort=name&order=asc",
    );
    expect(await screen.findByRole("row", { name: /Última categoría/ })).toBeVisible();
    expect(requestedPages).toEqual([3, 2]);

    router.dispose();
    queryClient.clear();
  });

  it("replaces an out-of-range page with page one when the total is zero", async () => {
    const requestedPages: number[] = [];
    const queryClient = createQueryClient();

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get("https://inventory.test/api/categories", ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        requestedPages.push(page);

        return HttpResponse.json({
          data: [],
          pagination: { total: 0, page: 1, limit: 15 },
        });
      }),
    );

    const router = createMemoryRouter(appRoutes, {
      initialEntries: ["/", "/categories?page=4"],
    });
    await renderAuthenticatedCategoriesRoute(queryClient, router);

    expect(await screen.findByText("No hay categorías para mostrar.")).toBeVisible();
    await waitFor(() =>
      expect(router.state.location.search).toBe("?page=1&status=active&sort=name&order=asc"),
    );
    expect(requestedPages).toEqual([4, 1]);
    expect(screen.getByText("Página 1 de 1")).toBeVisible();

    await router.navigate(-1);
    expect(router.state.location.pathname + router.state.location.search).toBe("/");
    await router.navigate(1);
    expect(router.state.location.pathname + router.state.location.search).toBe(
      "/categories?page=1&status=active&sort=name&order=asc",
    );
    expect(requestedPages).toEqual([4, 1]);

    router.dispose();
    queryClient.clear();
  });

  it("searches, filters, sorts, and resets pagination when criteria change", async () => {
    const user = userEvent.setup();
    const categoryRequests: URL[] = [];
    const queryClient = createQueryClient();
    queryClient.setDefaultOptions({
      ...queryClient.getDefaultOptions(),
      queries: { ...queryClient.getDefaultOptions().queries, staleTime: 0 },
    });
    const categories = Array.from({ length: 40 }, (_, index) => {
      const isActive = index < 20;
      const categoryNumber = isActive ? index + 1 : index - 19;

      return {
        uuid: `550e8400-e29b-41d4-a716-${String(index + 1).padStart(12, "0")}`,
        name: `Oficina ${isActive ? "activa" : "inactiva"} ${String(categoryNumber).padStart(2, "0")}`,
        description: null,
        isActive,
        createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
        updatedAt: new Date(Date.UTC(2026, 1, index + 1)).toISOString(),
      };
    });
    const expectedQuery = (
      page: number,
      status: "active" | "inactive",
      sort: "name" | "createdAt" | "updatedAt",
      order: "asc" | "desc",
      search?: string,
    ) => ({
      page: String(page),
      limit: "15",
      ...(search ? { search } : {}),
      isActive: status === "active" ? "true" : "false",
      sort,
      order,
    });
    const waitForRequest = async (count: number) => {
      await waitFor(() => expect(categoryRequests).toHaveLength(count));
      return categoryRequests[count - 1]!;
    };
    const expectRequest = async (
      count: number,
      page: number,
      status: "active" | "inactive",
      sort: "name" | "createdAt" | "updatedAt",
      order: "asc" | "desc",
      search?: string,
    ) => {
      const request = await waitForRequest(count);
      expect(Object.fromEntries(request.searchParams)).toEqual(
        expectedQuery(page, status, sort, order, search),
      );
    };
    const selectOptionByIndex = async (label: string, optionIndex: number) => {
      const control = screen.getByRole("textbox", { name: label });
      control.focus();
      await user.keyboard("{ArrowDown}{Home}" + "{ArrowDown}".repeat(optionIndex + 1) + "{Enter}");
    };

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get("https://inventory.test/api/categories", ({ request }) => {
        const url = new URL(request.url);
        categoryRequests.push(url);
        const page = Number(url.searchParams.get("page"));
        const isActive = url.searchParams.get("isActive") === "true";
        const search = url.searchParams.get("search")?.toLowerCase();
        const matchingCategories = categories.filter(
          (category) =>
            category.isActive === isActive &&
            (!search || category.name.toLowerCase().includes(search)),
        );

        return HttpResponse.json({
          data: matchingCategories.slice((page - 1) * 15, page * 15),
          pagination: { total: matchingCategories.length, page, limit: 15 },
        });
      }),
    );

    const router = createMemoryRouter(appRoutes, { initialEntries: ["/categories"] });
    await renderAuthenticatedCategoriesRoute(queryClient, router);

    expect(await screen.findByRole("row", { name: /Oficina activa 01/ })).toBeVisible();
    await expectRequest(1, 1, "active", "name", "asc");

    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(await screen.findByRole("row", { name: /Oficina activa 16/ })).toBeVisible();
    await expectRequest(2, 2, "active", "name", "asc");

    const searchInput = screen.getByRole("searchbox", { name: "Buscar categorías" });
    await user.type(searchInput, "  fIC  ");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByRole("row", { name: /Oficina activa 01/ })).toBeVisible();
    expect(searchInput).toHaveValue("fIC");
    await expectRequest(3, 1, "active", "name", "asc", "fIC");
    expect(router.state.location.search).toBe(
      "?page=1&search=fIC&status=active&sort=name&order=asc",
    );

    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(await screen.findByRole("row", { name: /Oficina activa 16/ })).toBeVisible();
    await expectRequest(4, 2, "active", "name", "asc", "fIC");

    await selectOptionByIndex("Estado de categoría", 1);
    expect(await screen.findByRole("row", { name: /Oficina inactiva 01/ })).toBeVisible();
    await expectRequest(5, 1, "inactive", "name", "asc", "fIC");
    expect(router.state.location.search).toBe(
      "?page=1&search=fIC&status=inactive&sort=name&order=asc",
    );

    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(await screen.findByRole("row", { name: /Oficina inactiva 16/ })).toBeVisible();
    await expectRequest(6, 2, "inactive", "name", "asc", "fIC");

    await user.clear(searchInput);
    await user.type(searchInput, "   ");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByRole("row", { name: /Oficina inactiva 01/ })).toBeVisible();
    expect(searchInput).toHaveValue("");
    await expectRequest(7, 1, "inactive", "name", "asc");
    expect(router.state.location.search).toBe("?page=1&status=inactive&sort=name&order=asc");

    for (const [sort, optionIndex] of [
      ["createdAt", 1],
      ["updatedAt", 2],
      ["name", 0],
    ] as const) {
      await user.click(screen.getByRole("button", { name: "Página siguiente" }));
      expect(await screen.findByRole("row", { name: /Oficina inactiva 16/ })).toBeVisible();
      const previousRequestCount = categoryRequests.length;
      await selectOptionByIndex("Ordenar por", optionIndex);
      expect(await screen.findByRole("row", { name: /Oficina inactiva 01/ })).toBeVisible();
      await expectRequest(previousRequestCount + 1, 1, "inactive", sort, "asc");
      expect(router.state.location.search).toBe(`?page=1&status=inactive&sort=${sort}&order=asc`);
    }

    for (const [order, optionIndex] of [
      ["desc", 1],
      ["asc", 0],
    ] as const) {
      await user.click(screen.getByRole("button", { name: "Página siguiente" }));
      expect(await screen.findByRole("row", { name: /Oficina inactiva 16/ })).toBeVisible();
      const previousRequestCount = categoryRequests.length;
      await selectOptionByIndex("Dirección del orden", optionIndex);
      expect(await screen.findByRole("row", { name: /Oficina inactiva 01/ })).toBeVisible();
      await expectRequest(previousRequestCount + 1, 1, "inactive", "name", order);
      expect(router.state.location.search).toBe(`?page=1&status=inactive&sort=name&order=${order}`);
    }

    router.dispose();
    queryClient.clear();
  }, 30_000);

  it("restores category list controls and results from URL state and router history", async () => {
    const requests: URL[] = [];
    const queryClient = createQueryClient();
    queryClient.setDefaultOptions({
      ...queryClient.getDefaultOptions(),
      queries: { ...queryClient.getDefaultOptions().queries, staleTime: 0 },
    });

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get("https://inventory.test/api/categories", ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const search = url.searchParams.get("search");
        const isChangedSearch = search === "changed";

        return HttpResponse.json({
          data: [
            {
              uuid: isChangedSearch
                ? "550e8400-e29b-41d4-a716-446655440017"
                : "550e8400-e29b-41d4-a716-446655440016",
              name: isChangedSearch ? "Categoría changed" : "Oficina en página dos",
              description: null,
              isActive: false,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-02-01T00:00:00.000Z",
            },
          ],
          pagination: {
            total: isChangedSearch ? 1 : 16,
            page: Number(url.searchParams.get("page")),
            limit: 15,
          },
        });
      }),
    );

    const initialUrl =
      "/categories?page=2&search=oficina&status=inactive&sort=updatedAt&order=desc";
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/", initialUrl] });
    const user = userEvent.setup();
    await renderAuthenticatedCategoriesRoute(queryClient, router);

    expect(await screen.findByRole("row", { name: /Oficina en página dos/ })).toBeVisible();
    expect(screen.getByRole("searchbox", { name: "Buscar categorías" })).toHaveValue("oficina");
    expect(screen.getByRole("textbox", { name: "Estado de categoría" })).toHaveValue("Inactivas");
    expect(screen.getByRole("textbox", { name: "Ordenar por" })).toHaveValue(
      "Fecha de actualización",
    );
    expect(screen.getByRole("textbox", { name: "Dirección del orden" })).toHaveValue("Descendente");
    expect(Object.fromEntries(requests[0]!.searchParams)).toEqual({
      page: "2",
      limit: "15",
      search: "oficina",
      isActive: "false",
      sort: "updatedAt",
      order: "desc",
    });

    await user.clear(screen.getByRole("searchbox", { name: "Buscar categorías" }));
    await user.type(screen.getByRole("searchbox", { name: "Buscar categorías" }), " changed ");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByRole("row", { name: /Categoría changed/ })).toBeVisible();
    expect(router.state.location.search).toBe(
      "?page=1&search=changed&status=inactive&sort=updatedAt&order=desc",
    );

    await router.navigate(-1);
    expect(router.state.location.pathname + router.state.location.search).toBe(initialUrl);
    expect(await screen.findByRole("row", { name: /Oficina en página dos/ })).toBeVisible();
    expect(screen.getByRole("searchbox", { name: "Buscar categorías" })).toHaveValue("oficina");
    expect(screen.getByRole("textbox", { name: "Estado de categoría" })).toHaveValue("Inactivas");

    await router.navigate(1);
    expect(router.state.location.search).toBe(
      "?page=1&search=changed&status=inactive&sort=updatedAt&order=desc",
    );
    expect(await screen.findByRole("row", { name: /Categoría changed/ })).toBeVisible();
    expect(screen.getByRole("searchbox", { name: "Buscar categorías" })).toHaveValue("changed");

    router.dispose();
    queryClient.clear();
  });

  it("does not show a replaced query result when deferred category responses finish out of order", async () => {
    const user = userEvent.setup();
    const slowResponse = deferred<Response>();
    const currentResponse = deferred<Response>();
    const slowRequestStarted = deferred<void>();
    const currentRequestStarted = deferred<void>();
    const slowHandlerFinished = deferred<void>();
    const queryClient = createQueryClient();
    const categoryResponse = (name: string) =>
      HttpResponse.json({
        data: [
          {
            uuid:
              name === "Resultado anterior"
                ? "550e8400-e29b-41d4-a716-446655440017"
                : name === "Resultado lento"
                  ? "550e8400-e29b-41d4-a716-446655440018"
                  : "550e8400-e29b-41d4-a716-446655440019",
            name,
            description: null,
            isActive: true,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        pagination: { total: 1, page: 1, limit: 15 },
      });

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get("https://inventory.test/api/categories", ({ request }) => {
        const search = new URL(request.url).searchParams.get("search");

        if (search === "seed") {
          return categoryResponse("Resultado anterior");
        }

        if (search === "slow") {
          slowRequestStarted.resolve();
          return slowResponse.promise.then((response) => {
            slowHandlerFinished.resolve();
            return response;
          });
        }

        if (search === "current") {
          currentRequestStarted.resolve();
          return currentResponse.promise;
        }

        throw new Error(`Unexpected category search: ${search}`);
      }),
    );

    const router = createMemoryRouter(appRoutes, {
      initialEntries: ["/categories?search=seed"],
    });
    await renderAuthenticatedCategoriesRoute(queryClient, router);

    expect(await screen.findByRole("row", { name: /Resultado anterior/ })).toBeVisible();
    const searchInput = screen.getByRole("searchbox", { name: "Buscar categorías" });
    await user.clear(searchInput);
    await user.type(searchInput, "slow");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await slowRequestStarted.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Cargando datos...");
    expect(
      screen.queryByRole("row", { name: /Resultado anterior|Resultado lento|Resultado vigente/ }),
    ).toBeNull();

    await user.clear(searchInput);
    await user.type(searchInput, "current");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await currentRequestStarted.promise;
    expect(router.state.location.search).toBe(
      "?page=1&search=current&status=active&sort=name&order=asc",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Cargando datos...");
    expect(
      screen.queryByRole("row", { name: /Resultado anterior|Resultado lento|Resultado vigente/ }),
    ).toBeNull();

    await act(async () => {
      currentResponse.resolve(categoryResponse("Resultado vigente"));
    });
    expect(await screen.findByRole("row", { name: /Resultado vigente/ })).toBeVisible();
    expect(screen.queryByRole("row", { name: /Resultado lento/ })).toBeNull();

    await act(async () => {
      slowResponse.resolve(categoryResponse("Resultado lento"));
      await slowHandlerFinished.promise;
    });
    await waitFor(() => {
      expect(screen.getByRole("row", { name: /Resultado vigente/ })).toBeVisible();
      expect(screen.queryByRole("row", { name: /Resultado lento/ })).toBeNull();
    });
    expect(router.state.location.search).toBe(
      "?page=1&search=current&status=active&sort=name&order=asc",
    );

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
