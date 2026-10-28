import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { components } from "@/shared/api/generated/inventory-contracts";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UiProvider } from "@/app/providers/ui.provider";
import { appRoutes } from "@/app/router/router";
import { createQueryClient } from "@/shared/api/query-client";
import { server } from "../mocks/server";

const authSession = vi.hoisted(() => ({
  currentSessionId: null as string | null,
  useAuth: vi.fn(() => ({
    isSigningIn: false,
    isSigningOut: false,
    signIn: vi.fn(async () => ({ data: null, error: null })),
    signOut: vi.fn(async () => ({ data: null, error: null })),
    signOutError: null,
  })),
  useSession: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  isCurrentSession: (sessionId: string) => authSession.currentSessionId === sessionId,
  useAuth: authSession.useAuth,
  useSession: authSession.useSession,
}));

const pendingSessionState = {
  status: "pending",
  user: null,
  session: null,
  isRefetching: false,
  isAuthenticated: false,
  isUnauthenticated: false,
  error: null,
  verification: { status: "pending", error: null },
  isPending: true,
  refetch: vi.fn(async () => ({ data: null, error: null })),
};

const unauthenticatedSessionState = {
  status: "unauthenticated",
  user: null,
  session: null,
  isRefetching: false,
  isAuthenticated: false,
  isUnauthenticated: true,
  error: null,
  verification: { status: "success", error: null },
  isPending: false,
  refetch: vi.fn(async () => ({ data: null, error: null })),
};

const authenticatedSessionState = {
  status: "authenticated",
  user: {
    id: "inventory-list-user",
    email: "operator@example.com",
    role: "OPERATOR",
  },
  session: { id: "inventory-list-session", createdAt: "2026-01-01T00:00:00.000Z" },
  isRefetching: false,
  isAuthenticated: true,
  isUnauthenticated: false,
  error: null,
  verification: { status: "success", error: null },
  isPending: false,
  refetch: vi.fn(async () => ({ data: null, error: null })),
};

const setSession = (sessionId: string | null, state: object) => {
  authSession.currentSessionId = sessionId;
  authSession.useSession.mockReturnValue(state);
};

const inventoryUrl = "https://inventory.test/api/inventory";
const productsUrl = "https://inventory.test/api/products";
const inventoryUuid = (index: number) =>
  `550e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}`;

const inventoryRecord = (
  index: number,
  overrides: Partial<components["schemas"]["Inventory"]> = {},
): components["schemas"]["Inventory"] => ({
  productUuid: inventoryUuid(index),
  sku: `SKU-${String(index).padStart(3, "0")}`,
  name: `Producto ${String(index).padStart(3, "0")}`,
  categoryUuid: null,
  isActive: true,
  quantity: index === 1 ? 2 : 10,
  minimumStock: index === 1 ? 2 : 3,
  status: index === 1 ? "LOW_STOCK" : "IN_STOCK",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const inventoryResponse = (
  data: components["schemas"]["Inventory"][],
  page: number,
  total: number,
): components["schemas"]["InventoryListResponse"] => ({
  data,
  pagination: { total, page, limit: 15 },
});

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

const routers: Array<ReturnType<typeof createMemoryRouter>> = [];
const queryClients: Array<ReturnType<typeof createQueryClient>> = [];

const renderInventoryRoute = (initialEntry: string | string[] = "/inventory") => {
  const queryClient = createQueryClient();
  const initialEntries = typeof initialEntry === "string" ? [initialEntry] : initialEntry;
  const router = createMemoryRouter(appRoutes, { initialEntries });
  queryClients.push(queryClient);
  routers.push(router);

  render(
    <QueryClientProvider client={queryClient}>
      <UiProvider>
        <RouterProvider router={router} />
      </UiProvider>
    </QueryClientProvider>,
  );

  return { queryClient, router };
};

afterEach(() => {
  for (const router of routers.splice(0)) {
    router.dispose();
  }
  for (const queryClient of queryClients.splice(0)) {
    queryClient.clear();
  }
  authSession.currentSessionId = null;
  authSession.useSession.mockReset();
});

describe("Inventory list page", () => {
  it("requests the default active page, renders exact inventory rows and pages remotely", async () => {
    const user = userEvent.setup();
    const requests: URL[] = [];
    let productRequests = 0;
    setSession("inventory-list-session", authenticatedSessionState);
    const firstPage = Array.from({ length: 15 }, (_, index) => {
      const itemIndex = index + 1;
      if (itemIndex === 2) {
        return inventoryRecord(itemIndex, {
          quantity: 0,
          minimumStock: 0,
          status: "OUT_OF_STOCK",
        });
      }
      if (itemIndex === 3) {
        return inventoryRecord(itemIndex, {
          quantity: 1_234_567_890_123,
          minimumStock: 2,
          status: "IN_STOCK",
        });
      }
      return inventoryRecord(itemIndex);
    });

    server.use(
      http.get(inventoryUrl, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const page = Number(url.searchParams.get("page"));

        return HttpResponse.json(
          page === 1
            ? inventoryResponse(firstPage, 1, 16)
            : inventoryResponse([inventoryRecord(16)], 2, 16),
        );
      }),
      http.get(productsUrl, () => {
        productRequests += 1;
        return HttpResponse.json({
          data: [{ name: "Producto sin registro de inventario", sku: "NO-STOCK-ROW" }],
          pagination: { total: 1, page: 1, limit: 15 },
        });
      }),
    );

    const { queryClient, router } = renderInventoryRoute();

    expect(await screen.findByRole("heading", { level: 1, name: "Inventario" })).toBeVisible();
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(Object.fromEntries(requests[0]!.searchParams)).toEqual({
      page: "1",
      limit: "15",
      isActive: "true",
      sort: "name",
      order: "asc",
    });
    expect(requests[0]!.searchParams.has("search")).toBe(false);
    expect(requests[0]!.searchParams.has("status")).toBe(false);

    const listQuery = queryClient.getQueryCache().find({
      queryKey: [
        "inventory",
        "list",
        "inventory-list-session",
        {
          page: 1,
          limit: 15,
          isActive: "true",
          sort: "name",
          order: "asc",
        },
      ],
    });
    expect(listQuery).toBeDefined();
    expect(listQuery?.options.retry).toBe(false);

    expect(await screen.findByRole("table")).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Producto" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "SKU" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Existencias actuales" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Mínimo de existencias" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Actividad" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Estado de existencias" })).toBeVisible();
    expect(screen.getAllByRole("row")).toHaveLength(16);
    expect(screen.getByText("16 productos")).toBeVisible();
    expect(screen.getByText("Página 1 de 2")).toBeVisible();
    expect(productRequests).toBe(0);
    expect(screen.queryByText("Producto sin registro de inventario")).not.toBeInTheDocument();

    const lowStockRow = screen.getByRole("row", { name: /SKU-001/ });
    expect(within(lowStockRow).getByRole("cell", { name: "Producto 001" })).toBeVisible();
    expect(within(lowStockRow).getAllByRole("cell", { name: "2" })).toHaveLength(2);
    expect(within(lowStockRow).getByRole("cell", { name: "Activo" })).toBeVisible();
    expect(within(lowStockRow).getByText("Stock bajo")).toBeVisible();

    const emptyStockRow = screen.getByRole("row", { name: /SKU-002/ });
    expect(within(emptyStockRow).getAllByRole("cell", { name: "0" })).toHaveLength(2);
    expect(within(emptyStockRow).getByText("Sin existencias")).toBeVisible();

    const preciseQuantityRow = screen.getByRole("row", { name: /SKU-003/ });
    expect(within(preciseQuantityRow).getByRole("cell", { name: "1234567890123" })).toBeVisible();
    expect(within(preciseQuantityRow).getByText("Con existencias")).toBeVisible();
    expect(screen.queryByText("Producto 016")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Página siguiente" }));

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(Object.fromEntries(requests[1]!.searchParams)).toEqual({
      page: "2",
      limit: "15",
      isActive: "true",
      sort: "name",
      order: "asc",
    });
    expect(await screen.findByRole("cell", { name: "SKU-016" })).toBeVisible();
    expect(screen.getByText("Página 2 de 2")).toBeVisible();
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(router.state.location.search).toContain("page=2");
  });

  it.each([
    { requestedPage: 9, total: 16, correctedPage: 2 },
    { requestedPage: 8, total: 0, correctedPage: 1 },
  ])(
    "replaces out-of-range page $requestedPage with $correctedPage for total $total",
    async ({ requestedPage, total, correctedPage }) => {
      const requests: URL[] = [];
      const criteria = "search=desk&status=inactive&stockStatus=LOW_STOCK&sort=sku&order=desc";
      const initialEntry = `/inventory?page=${requestedPage}&${criteria}`;
      const correctedEntry = `/inventory?page=${correctedPage}&${criteria}`;
      setSession("inventory-list-session", authenticatedSessionState);
      server.use(
        http.get(inventoryUrl, ({ request }) => {
          const url = new URL(request.url);
          requests.push(url);
          const page = Number(url.searchParams.get("page"));

          if (page === requestedPage) {
            return HttpResponse.json(inventoryResponse([], requestedPage, total));
          }

          return HttpResponse.json(
            inventoryResponse(
              total > 0
                ? [
                    inventoryRecord(16, {
                      isActive: false,
                      quantity: 2,
                      minimumStock: 2,
                      status: "LOW_STOCK",
                    }),
                  ]
                : [],
              correctedPage,
              total,
            ),
          );
        }),
      );

      const { router } = renderInventoryRoute(initialEntry);

      if (total > 0) {
        expect(await screen.findByRole("row", { name: /SKU-016/ })).toBeVisible();
      } else {
        expect(
          await screen.findByText("No se encontraron productos con esta búsqueda."),
        ).toBeVisible();
      }

      await waitFor(() =>
        expect(router.state.location.pathname + router.state.location.search).toBe(correctedEntry),
      );
      await waitFor(() =>
        expect(requests.map((url) => url.searchParams.get("page"))).toEqual([
          String(requestedPage),
          String(correctedPage),
        ]),
      );
      expect(Object.fromEntries(requests[1]!.searchParams)).toEqual({
        page: String(correctedPage),
        limit: "15",
        search: "desk",
        isActive: "false",
        status: "LOW_STOCK",
        sort: "sku",
        order: "desc",
      });
      expect(screen.getByText(total > 0 ? "16 productos" : "0 productos")).toBeVisible();
      expect(screen.getByText(total > 0 ? "Página 2 de 2" : "Página 1 de 1")).toBeVisible();
    },
  );

  it("replaces an invalid history entry so Back and Forward retain criteria without restoring it", async () => {
    const requests: URL[] = [];
    const criteria = "search=desk&status=inactive&stockStatus=LOW_STOCK&sort=sku&order=desc";
    const previousEntry = `/inventory?page=1&${criteria}`;
    const invalidEntry = `/inventory?page=9&${criteria}`;
    const correctedEntry = `/inventory?page=2&${criteria}`;
    setSession("inventory-list-session", authenticatedSessionState);
    server.use(
      http.get(inventoryUrl, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const page = Number(url.searchParams.get("page"));

        if (page === 9) {
          return HttpResponse.json(inventoryResponse([], 9, 16));
        }

        return HttpResponse.json(
          inventoryResponse(
            [
              inventoryRecord(page === 1 ? 1 : 16, {
                isActive: false,
                quantity: 2,
                minimumStock: 2,
                status: "LOW_STOCK",
              }),
            ],
            page,
            16,
          ),
        );
      }),
    );

    const { router } = renderInventoryRoute([previousEntry, invalidEntry]);

    expect(await screen.findByRole("row", { name: /SKU-016/ })).toBeVisible();
    await waitFor(() =>
      expect(router.state.location.pathname + router.state.location.search).toBe(correctedEntry),
    );
    expect(requests.map((url) => url.searchParams.get("page"))).toEqual(["9", "2"]);

    await act(async () => {
      await router.navigate(-1);
    });

    expect(await screen.findByRole("row", { name: /SKU-001/ })).toBeVisible();
    expect(router.state.location.pathname + router.state.location.search).toBe(previousEntry);

    await act(async () => {
      await router.navigate(1);
    });

    expect(await screen.findByRole("row", { name: /SKU-016/ })).toBeVisible();
    expect(router.state.location.pathname + router.state.location.search).toBe(correctedEntry);
    expect(requests.map((url) => url.searchParams.get("page"))).toEqual(["9", "2", "1"]);
    expect(screen.queryByRole("row", { name: /SKU-001/ })).not.toBeInTheDocument();
  });

  it("trims a case-insensitive partial name/SKU search, resets to page one, and treats blanks as absent", async () => {
    const user = userEvent.setup();
    const requests: URL[] = [];
    const initialEntry =
      "/inventory?page=3&status=inactive&stockStatus=LOW_STOCK&sort=name&order=asc";
    const searchResults = [
      inventoryRecord(11, {
        name: "Office Desk Lamp",
        sku: "LAMP-011",
        isActive: false,
        quantity: 2,
        minimumStock: 2,
        status: "LOW_STOCK",
      }),
      inventoryRecord(12, {
        name: "Chair",
        sku: "Desk-012",
        isActive: false,
        quantity: 2,
        minimumStock: 2,
        status: "LOW_STOCK",
      }),
      inventoryRecord(13, {
        name: "Keyboard",
        sku: "KB-013",
        isActive: false,
        quantity: 2,
        minimumStock: 2,
        status: "LOW_STOCK",
      }),
      inventoryRecord(14, {
        name: "Monitor",
        sku: "MON-014",
        isActive: false,
        quantity: 10,
        minimumStock: 3,
        status: "IN_STOCK",
      }),
      inventoryRecord(15, {
        name: "Active Desk",
        sku: "ACTIVE-015",
        isActive: true,
        quantity: 2,
        minimumStock: 2,
        status: "LOW_STOCK",
      }),
    ];
    setSession("inventory-list-session", authenticatedSessionState);
    server.use(
      http.get(inventoryUrl, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const page = Number(url.searchParams.get("page"));
        const search = url.searchParams.get("search")?.toLocaleLowerCase() ?? "";
        const active = url.searchParams.get("isActive") === "true";
        const stockStatus = url.searchParams.get("status");

        if (page === 3 && !url.searchParams.has("search")) {
          return HttpResponse.json(
            inventoryResponse(
              [
                inventoryRecord(31, {
                  isActive: false,
                  quantity: 2,
                  minimumStock: 2,
                  status: "LOW_STOCK",
                }),
              ],
              3,
              31,
            ),
          );
        }

        const matchingRows = searchResults.filter((item) => {
          const matchesSearch =
            search.length === 0 ||
            item.name.toLocaleLowerCase().includes(search) ||
            item.sku.toLocaleLowerCase().includes(search);
          const matchesActivity = item.isActive === active;
          const matchesStockStatus = stockStatus === null || item.status === stockStatus;

          return matchesSearch && matchesActivity && matchesStockStatus;
        });

        return HttpResponse.json(inventoryResponse(matchingRows, page, matchingRows.length));
      }),
    );

    const { router } = renderInventoryRoute(initialEntry);

    expect(await screen.findByRole("row", { name: /SKU-031/ })).toBeVisible();
    expect(screen.getByRole("searchbox", { name: "Buscar productos" })).toBeVisible();
    expect(screen.getByLabelText("Actividad del producto")).toHaveAccessibleName(
      "Actividad del producto",
    );
    expect(screen.getByLabelText("Estado de existencias")).toHaveAccessibleName(
      "Estado de existencias",
    );

    const searchInput = screen.getByRole("searchbox", { name: "Buscar productos" });
    await user.type(searchInput, "  dEsK  ");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByRole("row", { name: /LAMP-011/ })).toBeVisible();
    expect(screen.getByRole("row", { name: /Desk-012/ })).toBeVisible();
    expect(screen.queryByRole("row", { name: /SKU-031/ })).not.toBeInTheDocument();
    expect(searchInput).toHaveValue("dEsK");
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(Object.fromEntries(requests[1]!.searchParams)).toEqual({
      page: "1",
      limit: "15",
      search: "dEsK",
      isActive: "false",
      status: "LOW_STOCK",
      sort: "name",
      order: "asc",
    });
    expect(router.state.location.search).toBe(
      "?page=1&search=dEsK&status=inactive&stockStatus=LOW_STOCK&sort=name&order=asc",
    );

    await user.clear(searchInput);
    await user.type(searchInput, "   ");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByRole("row", { name: /KB-013/ })).toBeVisible();
    expect(screen.queryByRole("row", { name: /MON-014/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /ACTIVE-015/ })).not.toBeInTheDocument();
    expect(searchInput).toHaveValue("");
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2]!.searchParams.has("search")).toBe(false);
    expect(Object.fromEntries(requests[2]!.searchParams)).toEqual({
      page: "1",
      limit: "15",
      isActive: "false",
      status: "LOW_STOCK",
      sort: "name",
      order: "asc",
    });
    expect(router.state.location.search).toBe(
      "?page=1&status=inactive&stockStatus=LOW_STOCK&sort=name&order=asc",
    );

    await user.type(searchInput, "missing");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByText("No se encontraron productos con esta búsqueda.")).toBeVisible();
    await waitFor(() => expect(requests).toHaveLength(4));
    expect(Object.fromEntries(requests[3]!.searchParams)).toEqual({
      page: "1",
      limit: "15",
      search: "missing",
      isActive: "false",
      status: "LOW_STOCK",
      sort: "name",
      order: "asc",
    });

    await user.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(await screen.findByRole("row", { name: /KB-013/ })).toBeVisible();
    expect(searchInput).toHaveValue("");
    expect(router.state.location.search).toBe(
      "?page=1&status=inactive&stockStatus=LOW_STOCK&sort=name&order=asc",
    );
    expect(requests).toHaveLength(4);
  });

  it("applies activity and every stock-status option together through labeled controls", async () => {
    const user = userEvent.setup();
    const requests: URL[] = [];
    setSession("inventory-list-session", authenticatedSessionState);
    server.use(
      http.get(inventoryUrl, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const page = Number(url.searchParams.get("page"));
        return HttpResponse.json(
          page === 2
            ? inventoryResponse([inventoryRecord(16)], 2, 31)
            : inventoryResponse([], 1, 0),
        );
      }),
    );

    const { router } = renderInventoryRoute(
      "/inventory?page=2&status=active&stockStatus=all&sort=name&order=asc",
    );
    await screen.findByRole("row", { name: /SKU-016/ });

    const selectOption = async (label: string, optionLabel: string) => {
      const select = screen.getByLabelText(label);
      select.focus();
      await user.keyboard("{ArrowDown}");
      const listbox = await screen.findByRole("listbox", { hidden: true });
      await user.click(within(listbox).getByRole("option", { name: optionLabel, hidden: true }));
    };
    const expectRequest = async (
      requestCount: number,
      urlSearch: string,
      expectedParams: Record<string, string>,
    ) => {
      await waitFor(() => expect(router.state.location.search).toBe(urlSearch));
      await waitFor(() => expect(requests).toHaveLength(requestCount));
      expect(Object.fromEntries(requests[requestCount - 1]!.searchParams)).toEqual(expectedParams);
    };

    await selectOption("Actividad del producto", "Inactivos");
    await expectRequest(2, "?page=1&status=inactive&stockStatus=all&sort=name&order=asc", {
      page: "1",
      limit: "15",
      isActive: "false",
      sort: "name",
      order: "asc",
    });

    await selectOption("Estado de existencias", "Sin existencias");
    await expectRequest(3, "?page=1&status=inactive&stockStatus=OUT_OF_STOCK&sort=name&order=asc", {
      page: "1",
      limit: "15",
      isActive: "false",
      status: "OUT_OF_STOCK",
      sort: "name",
      order: "asc",
    });

    await selectOption("Estado de existencias", "Con existencias");
    await expectRequest(4, "?page=1&status=inactive&stockStatus=IN_STOCK&sort=name&order=asc", {
      page: "1",
      limit: "15",
      isActive: "false",
      status: "IN_STOCK",
      sort: "name",
      order: "asc",
    });

    await selectOption("Estado de existencias", "Stock bajo");
    await expectRequest(5, "?page=1&status=inactive&stockStatus=LOW_STOCK&sort=name&order=asc", {
      page: "1",
      limit: "15",
      isActive: "false",
      status: "LOW_STOCK",
      sort: "name",
      order: "asc",
    });

    await selectOption("Estado de existencias", "Todos los estados");
    const allStatusesUrl = "?page=1&status=inactive&stockStatus=all&sort=name&order=asc";
    await waitFor(() => expect(router.state.location.search).toBe(allStatusesUrl));
    expect(requests).toHaveLength(5);
    expect(Object.fromEntries(requests[1]!.searchParams)).toEqual({
      page: "1",
      limit: "15",
      isActive: "false",
      sort: "name",
      order: "asc",
    });

    await selectOption("Actividad del producto", "Activos");
    await expectRequest(6, "?page=1&status=active&stockStatus=all&sort=name&order=asc", {
      page: "1",
      limit: "15",
      isActive: "true",
      sort: "name",
      order: "asc",
    });
  });

  it("does not query inventory while Auth is pending", async () => {
    let inventoryRequestCount = 0;
    setSession(null, pendingSessionState);

    server.use(
      http.get(inventoryUrl, () => {
        inventoryRequestCount += 1;
        return HttpResponse.json(inventoryResponse([], 1, 0));
      }),
    );

    renderInventoryRoute();

    expect(inventoryRequestCount).toBe(0);
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
  });

  it("does not query inventory when Auth confirms that no session exists", async () => {
    let inventoryRequestCount = 0;
    setSession(null, unauthenticatedSessionState);
    server.use(
      http.get(inventoryUrl, () => {
        inventoryRequestCount += 1;
        return HttpResponse.json(inventoryResponse([], 1, 0));
      }),
    );

    renderInventoryRoute();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Sesión no iniciada" }),
    ).toBeVisible();
    expect(inventoryRequestCount).toBe(0);
  });

  it("announces a pending list request and withholds rows until the response arrives", async () => {
    const pendingResponse = deferred<Response>();
    let requestCount = 0;
    setSession("inventory-list-session", authenticatedSessionState);
    server.use(
      http.get(inventoryUrl, () => {
        requestCount += 1;
        return pendingResponse.promise;
      }),
    );

    renderInventoryRoute();

    expect(await screen.findByRole("status")).toHaveTextContent("Cargando datos...");
    expect(requestCount).toBe(1);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await act(async () => {
      pendingResponse.resolve(HttpResponse.json(inventoryResponse([inventoryRecord(1)], 1, 1)));
    });

    expect(await screen.findByRole("cell", { name: "SKU-001" })).toBeVisible();
    expect(screen.queryByRole("status")).not.toHaveTextContent("Cargando datos...");
  });

  it.each(["network", "server"] as const)(
    "offers a manual GET retry after a %s failure and preserves every criterion",
    async (failureKind) => {
      const user = userEvent.setup();
      const requests: URL[] = [];
      const initialEntry =
        "/inventory?page=2&search=desk&status=inactive&stockStatus=LOW_STOCK&sort=sku&order=desc";
      setSession("inventory-list-session", authenticatedSessionState);
      server.use(
        http.get(inventoryUrl, ({ request }) => {
          requests.push(new URL(request.url));
          if (requests.length === 1) {
            return failureKind === "network"
              ? HttpResponse.error()
              : HttpResponse.json(
                  { error: { code: "INTERNAL_ERROR", message: "private database details" } },
                  { status: 503 },
                );
          }

          return HttpResponse.json(
            inventoryResponse(
              [
                inventoryRecord(16, {
                  isActive: false,
                  quantity: 2,
                  minimumStock: 2,
                  status: "LOW_STOCK",
                }),
              ],
              2,
              16,
            ),
          );
        }),
      );

      const { router } = renderInventoryRoute(initialEntry);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "No se pudo cargar el inventario.",
      );
      expect(screen.getByRole("button", { name: "Reintentar consulta" })).toBeVisible();
      expect(screen.queryByText("private database details")).not.toBeInTheDocument();
      expect(requests).toHaveLength(1);
      expect(Object.fromEntries(requests[0]!.searchParams)).toEqual({
        page: "2",
        limit: "15",
        search: "desk",
        isActive: "false",
        status: "LOW_STOCK",
        sort: "sku",
        order: "desc",
      });

      await user.click(screen.getByRole("button", { name: "Reintentar consulta" }));

      const retriedRow = await screen.findByRole("row", { name: /SKU-016/ });
      expect(within(retriedRow).getByText("Inactivo")).toBeVisible();
      expect(within(retriedRow).getByText("Stock bajo")).toBeVisible();
      expect(requests).toHaveLength(2);
      expect(Object.fromEntries(requests[1]!.searchParams)).toEqual(
        Object.fromEntries(requests[0]!.searchParams),
      );
      expect(router.state.location.pathname + router.state.location.search).toBe(initialEntry);
    },
  );

  it("shows an empty-search action that clears only search and requests the remaining criteria", async () => {
    const user = userEvent.setup();
    const requests: URL[] = [];
    const initialEntry =
      "/inventory?page=1&search=missing&status=inactive&stockStatus=LOW_STOCK&sort=sku&order=desc";
    setSession("inventory-list-session", authenticatedSessionState);
    server.use(
      http.get(inventoryUrl, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        return url.searchParams.has("search")
          ? HttpResponse.json(inventoryResponse([], 1, 0))
          : HttpResponse.json(
              inventoryResponse(
                [
                  inventoryRecord(1, {
                    isActive: false,
                    quantity: 2,
                    minimumStock: 2,
                    status: "LOW_STOCK",
                  }),
                ],
                1,
                1,
              ),
            );
      }),
    );

    const { router } = renderInventoryRoute(initialEntry);

    expect(await screen.findByText("No se encontraron productos con esta búsqueda.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Limpiar búsqueda" })).toBeVisible();
    expect(requests).toHaveLength(1);
    expect(Object.fromEntries(requests[0]!.searchParams)).toEqual({
      page: "1",
      limit: "15",
      search: "missing",
      isActive: "false",
      status: "LOW_STOCK",
      sort: "sku",
      order: "desc",
    });

    await user.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));

    expect(await screen.findByRole("cell", { name: "SKU-001" })).toBeVisible();
    expect(requests).toHaveLength(2);
    expect(Object.fromEntries(requests[1]!.searchParams)).toEqual({
      page: "1",
      limit: "15",
      isActive: "false",
      status: "LOW_STOCK",
      sort: "sku",
      order: "desc",
    });
    expect(router.state.location.search).toBe(
      "?page=1&status=inactive&stockStatus=LOW_STOCK&sort=sku&order=desc",
    );
  });

  it("shows a confirmed empty state without offering to clear an unapplied search", async () => {
    setSession("inventory-list-session", authenticatedSessionState);
    server.use(http.get(inventoryUrl, () => HttpResponse.json(inventoryResponse([], 1, 0))));

    renderInventoryRoute();

    expect(await screen.findByText("No hay productos de inventario para mostrar.")).toBeVisible();
    expect(screen.getByText("0 productos")).toBeVisible();
    expect(screen.getByText("Página 1 de 1")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Limpiar búsqueda" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rejects a malformed list response globally without showing valid-looking partial rows", async () => {
    let requestCount = 0;
    setSession("inventory-list-session", authenticatedSessionState);
    server.use(
      http.get(inventoryUrl, () => {
        requestCount += 1;
        return HttpResponse.json(
          inventoryResponse([inventoryRecord(1), { ...inventoryRecord(2), quantity: -1 }], 1, 2),
        );
      }),
    );

    renderInventoryRoute();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar el inventario.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("Producto 001")).not.toBeInTheDocument();
    expect(screen.queryByText("2 productos")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar consulta" })).not.toBeInTheDocument();
    expect(requestCount).toBe(1);
  });

  it("does not present a previous query snapshot as the current criteria", async () => {
    const currentCriteriaResponse = deferred<Response>();
    const requests: URL[] = [];
    setSession("inventory-list-session", authenticatedSessionState);
    server.use(
      http.get(inventoryUrl, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        return url.searchParams.get("search") === "current"
          ? currentCriteriaResponse.promise
          : HttpResponse.json(
              inventoryResponse(
                [inventoryRecord(1, { name: "Producto del criterio anterior" })],
                1,
                1,
              ),
            );
      }),
    );

    const { router } = renderInventoryRoute(
      "/inventory?page=1&search=previous&status=active&stockStatus=all&sort=name&order=asc",
    );
    expect(await screen.findByText("Producto del criterio anterior")).toBeVisible();

    await act(async () => {
      await router.navigate(
        "/inventory?page=1&search=current&status=active&stockStatus=all&sort=name&order=asc",
      );
    });

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(await screen.findByRole("status")).toHaveTextContent("Cargando datos...");
    expect(screen.queryByText("Producto del criterio anterior")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await act(async () => {
      currentCriteriaResponse.resolve(
        HttpResponse.json(
          inventoryResponse([inventoryRecord(2, { name: "Producto del criterio vigente" })], 1, 1),
        ),
      );
    });

    expect(await screen.findByText("Producto del criterio vigente")).toBeVisible();
    expect(screen.queryByText("Producto del criterio anterior")).not.toBeInTheDocument();
  });
});
