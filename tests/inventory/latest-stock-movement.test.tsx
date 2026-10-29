import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { components } from "@/shared/api/generated/inventory-contracts";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { appRoutes } from "@/app/router/router";
import { UiProvider } from "@/app/providers/ui.provider";
import { LatestStockMovementCell } from "@/features/inventory/components/latest-stock-movement-cell";
import type { StockMovement } from "@/features/inventory/api/latest-movement-contract";
import { createQueryClient } from "@/shared/api/query-client";
import { httpClient } from "@/shared/api/http-client";
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

const sessionId = "latest-movement-session";
const inventoryUrl = "https://inventory.test/api/inventory";
const movementUrl = `${inventoryUrl}/:productUuid/movements`;
const inventoryUuid = (index: number) =>
  `550e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}`;

const authenticatedSessionState = {
  status: "authenticated",
  user: {
    id: "latest-movement-user",
    email: "operator@example.com",
    role: "OPERATOR",
  },
  session: { id: sessionId, createdAt: "2026-01-01T00:00:00.000Z" },
  isRefetching: false,
  isAuthenticated: true,
  isUnauthenticated: false,
  error: null,
  verification: { status: "success", error: null },
  isPending: false,
  refetch: vi.fn(async () => ({ data: null, error: null })),
};

const setAuthenticatedSession = () => {
  authSession.currentSessionId = sessionId;
  authSession.useSession.mockReturnValue(authenticatedSessionState);
};

const inventoryRecord = (
  index: number,
  overrides: Partial<components["schemas"]["Inventory"]> = {},
): components["schemas"]["Inventory"] => ({
  productUuid: inventoryUuid(index),
  sku: `SKU-${String(index).padStart(3, "0")}`,
  name: `Producto ${String(index).padStart(3, "0")}`,
  categoryUuid: null,
  isActive: true,
  quantity: 10,
  minimumStock: 3,
  status: "IN_STOCK",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const inventoryResponse = (data: components["schemas"]["Inventory"][]) => ({
  data,
  pagination: { total: data.length, page: 1, limit: 15 },
});

const stockMovement = (productUuid: string): StockMovement => ({
  uuid: "550e8400-e29b-41d4-a716-446655440999",
  productUuid,
  type: "IN",
  quantity: 4,
  previousStock: 3,
  newStock: 7,
  reason: null,
  reference: null,
  createdAt: "2026-01-01T02:30:00+00:00",
});

const staleStockMovement = (productUuid: string): StockMovement => ({
  ...stockMovement(productUuid),
  type: "OUT",
  quantity: 999,
  previousStock: 1_000,
  newStock: 1,
  createdAt: "2025-12-30T04:45:00.000Z",
});

const movementResponse = (data: StockMovement[] = []) => ({
  data,
  pagination: { total: data.length, page: 1, limit: 1 },
});

const retryableMovementFailures = [
  { kind: "network", response: () => HttpResponse.error() },
  {
    kind: "server",
    response: () => HttpResponse.json({ message: "private server detail" }, { status: 503 }),
  },
  {
    kind: "invalid response",
    response: () => HttpResponse.json(movementResponse([stockMovement(inventoryUuid(2))])),
  },
] as const;

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

const renderInventoryRoute = (queryClient = createQueryClient()) => {
  const router = createMemoryRouter(appRoutes, { initialEntries: ["/inventory"] });
  queryClients.push(queryClient);
  routers.push(router);

  render(
    <QueryClientProvider client={queryClient}>
      <UiProvider>
        <RouterProvider router={router} />
      </UiProvider>
    </QueryClientProvider>,
  );

  return queryClient;
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
  vi.restoreAllMocks();
});

describe("latest stock movement cells", () => {
  it("keeps validated stock visible while each cell loads and distinguishes a valid empty result", async () => {
    setAuthenticatedSession();
    const firstMovement = deferred<Response>();
    const secondMovement = deferred<Response>();
    const pendingResponses = new Map([
      [inventoryUuid(1), firstMovement],
      [inventoryUuid(2), secondMovement],
    ]);
    const movementRequests: URL[] = [];

    server.use(
      http.get(inventoryUrl, () =>
        HttpResponse.json(inventoryResponse([inventoryRecord(1), inventoryRecord(2)])),
      ),
      http.get(movementUrl, ({ request, params }) => {
        movementRequests.push(new URL(request.url));
        return pendingResponses.get(String(params.productUuid))!.promise;
      }),
    );

    renderInventoryRoute();

    const pendingCells = await screen.findAllByText("Consultando movimiento…");
    expect(pendingCells).toHaveLength(2);
    expect(
      within(screen.getByRole("row", { name: /SKU-001/ })).getByRole("cell", { name: "10" }),
    ).toBeVisible();
    expect(screen.getByRole("cell", { name: "SKU-001" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "SKU-002" })).toBeVisible();
    expect(screen.queryByText("Sin movimientos")).not.toBeInTheDocument();
    expect(movementRequests).toHaveLength(2);
    for (const request of movementRequests) {
      expect(Object.fromEntries(request.searchParams)).toEqual({ page: "1", limit: "1" });
    }

    await act(async () => {
      firstMovement.resolve(HttpResponse.json(movementResponse([stockMovement(inventoryUuid(1))])));
      secondMovement.resolve(HttpResponse.json(movementResponse()));
    });

    const firstRow = screen.getByRole("row", { name: /SKU-001/ });
    const secondRow = screen.getByRole("row", { name: /SKU-002/ });
    expect(await within(firstRow).findByText("Entrada")).toBeVisible();
    expect(within(firstRow).getByText("Cantidad: 4")).toBeVisible();
    expect(within(firstRow).getByText("1 ene 2026, 2:30 UTC")).toBeVisible();
    expect(await within(secondRow).findByText("Sin movimientos")).toBeVisible();
    expect(within(firstRow).getByRole("cell", { name: "10" })).toBeVisible();
  });

  it("starts at most fifteen initial movement reads and scopes query keys by session and product", async () => {
    setAuthenticatedSession();
    const requests: URL[] = [];
    const requestSpy = vi.spyOn(httpClient, "request");

    server.use(
      http.get(inventoryUrl, () =>
        HttpResponse.json(
          inventoryResponse(Array.from({ length: 15 }, (_, i) => inventoryRecord(i + 1))),
        ),
      ),
      http.get(movementUrl, ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json(movementResponse());
      }),
    );

    const queryClient = renderInventoryRoute();

    await waitFor(() => expect(screen.getAllByText("Sin movimientos")).toHaveLength(15));
    expect(requests).toHaveLength(15);
    const movementQueries = queryClient.getQueryCache().findAll({
      queryKey: ["inventory", "latest-movement", sessionId],
    });
    expect(movementQueries).toHaveLength(15);
    expect(movementQueries.map((query) => query.queryKey[3]).sort()).toEqual(
      Array.from({ length: 15 }, (_, i) => inventoryUuid(i + 1)).sort(),
    );
    expect(movementQueries.every((query) => query.options.retry === false)).toBe(true);

    const movementCallArguments = requestSpy.mock.calls
      .map(([request]) => request)
      .filter((request) => request.path.endsWith("/movements"));
    expect(movementCallArguments).toHaveLength(15);
    expect(movementCallArguments.every((request) => request.signal instanceof AbortSignal)).toBe(
      true,
    );
    expect(requests.every((request) => request.searchParams.get("limit") === "1")).toBe(true);
  });

  it("does not start movement queries until the full inventory response is validated", async () => {
    setAuthenticatedSession();
    let movementRequestCount = 0;
    server.use(
      http.get(inventoryUrl, () =>
        HttpResponse.json({
          data: [inventoryRecord(1), inventoryRecord(2, { quantity: 0, status: "IN_STOCK" })],
          pagination: { total: 2, page: 1, limit: 15 },
        }),
      ),
      http.get(movementUrl, () => {
        movementRequestCount += 1;
        return HttpResponse.json(movementResponse());
      }),
    );

    renderInventoryRoute();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar el inventario.");
    expect(movementRequestCount).toBe(0);
    expect(screen.queryByText("SKU-001")).not.toBeInTheDocument();
  });

  it("deduplicates concurrent observers for the same session and product", async () => {
    const productUuid = inventoryUuid(1);
    const pendingMovement = deferred<Response>();
    let requestCount = 0;
    server.use(
      http.get(movementUrl, () => {
        requestCount += 1;
        return pendingMovement.promise;
      }),
    );
    const queryClient = createQueryClient();
    queryClients.push(queryClient);

    render(
      <QueryClientProvider client={queryClient}>
        <LatestStockMovementCell
          productName="Producto 001"
          productUuid={productUuid}
          sessionId={sessionId}
        />
        <LatestStockMovementCell
          productName="Producto 001"
          productUuid={productUuid}
          sessionId={sessionId}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findAllByText("Consultando movimiento…")).toHaveLength(2);
    await waitFor(() => expect(requestCount).toBe(1));
    const query = queryClient.getQueryCache().find({
      queryKey: ["inventory", "latest-movement", sessionId, productUuid],
    });
    expect(query?.getObserversCount()).toBe(2);

    await act(async () => {
      pendingMovement.resolve(HttpResponse.json(movementResponse()));
    });

    expect(await screen.findAllByText("Sin movimientos")).toHaveLength(2);
    expect(requestCount).toBe(1);
  });

  it.each(retryableMovementFailures)(
    "retries only the failed cell after a $kind error",
    async ({ response }) => {
      setAuthenticatedSession();
      const user = userEvent.setup();
      const movementRequests = new Map([
        [inventoryUuid(1), 0],
        [inventoryUuid(2), 0],
      ]);
      let inventoryRequestCount = 0;

      server.use(
        http.get(inventoryUrl, () => {
          inventoryRequestCount += 1;
          return HttpResponse.json(inventoryResponse([inventoryRecord(1), inventoryRecord(2)]));
        }),
        http.get(movementUrl, ({ params }) => {
          const productUuid = String(params.productUuid);
          const attempts = (movementRequests.get(productUuid) ?? 0) + 1;
          movementRequests.set(productUuid, attempts);

          if (productUuid === inventoryUuid(1) && attempts === 1) {
            return response();
          }

          const movement =
            productUuid === inventoryUuid(1)
              ? stockMovement(productUuid)
              : {
                  ...stockMovement(productUuid),
                  type: "OUT" as const,
                  quantity: 2,
                  previousStock: 10,
                  newStock: 8,
                };

          return HttpResponse.json(movementResponse([movement]));
        }),
      );

      renderInventoryRoute();

      await screen.findByRole("cell", { name: "SKU-001" });
      const firstRow = screen.getByRole("row", { name: /SKU-001/ });
      const secondRow = screen.getByRole("row", { name: /SKU-002/ });
      expect(await within(firstRow).findByText("No se pudo consultar")).toBeVisible();
      expect(
        within(firstRow).getByRole("button", {
          name: "Reintentar último movimiento de Producto 001",
        }),
      ).toBeVisible();
      expect(await within(secondRow).findByText("Salida")).toBeVisible();
      expect(within(firstRow).getByRole("cell", { name: "10" })).toBeVisible();
      expect(inventoryRequestCount).toBe(1);
      expect(movementRequests.get(inventoryUuid(1))).toBe(1);
      expect(movementRequests.get(inventoryUuid(2))).toBe(1);

      await user.click(
        within(firstRow).getByRole("button", {
          name: "Reintentar último movimiento de Producto 001",
        }),
      );

      expect(await within(firstRow).findByText("Entrada")).toBeVisible();
      expect(within(firstRow).getByText("Cantidad: 4")).toBeVisible();
      expect(within(firstRow).getByRole("cell", { name: "10" })).toBeVisible();
      expect(within(secondRow).getByText("Salida")).toBeVisible();
      expect(inventoryRequestCount).toBe(1);
      expect(movementRequests.get(inventoryUuid(1))).toBe(2);
      expect(movementRequests.get(inventoryUuid(2))).toBe(1);
    },
  );

  it("keeps a 404 distinct from an empty movement result and does not invent stock", async () => {
    setAuthenticatedSession();
    let inventoryRequestCount = 0;
    let movementRequestCount = 0;
    server.use(
      http.get(inventoryUrl, () => {
        inventoryRequestCount += 1;
        return HttpResponse.json(inventoryResponse([inventoryRecord(1)]));
      }),
      http.get(movementUrl, () => {
        movementRequestCount += 1;
        return HttpResponse.json({ message: "private not-found detail" }, { status: 404 });
      }),
    );

    renderInventoryRoute();

    await screen.findByRole("cell", { name: "SKU-001" });
    const row = screen.getByRole("row", { name: /SKU-001/ });
    expect(await within(row).findByText("No se pudo consultar")).toBeVisible();
    expect(within(row).queryByText("Sin movimientos")).not.toBeInTheDocument();
    expect(within(row).getByRole("cell", { name: "10" })).toBeVisible();
    expect(within(row).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/private not-found detail/i)).not.toBeInTheDocument();
    expect(inventoryRequestCount).toBe(1);
    expect(movementRequestCount).toBe(1);
  });

  it("discards pending movement responses when changing page", async () => {
    setAuthenticatedSession();
    const user = userEvent.setup();
    const pendingMovements = new Map<string, Deferred<Response>>();
    const movementRequests = new Map<string, number>();
    const requestSpy = vi.spyOn(httpClient, "request");
    let pageOneListRequests = 0;
    let pageTwoListRequests = 0;

    server.use(
      http.get(inventoryUrl, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        if (page === 1) {
          pageOneListRequests += 1;
          return HttpResponse.json({
            data: Array.from({ length: 15 }, (_, index) => inventoryRecord(index + 1)),
            pagination: { total: 16, page: 1, limit: 15 },
          });
        }

        pageTwoListRequests += 1;
        return HttpResponse.json({
          data: [inventoryRecord(16)],
          pagination: { total: 16, page: 2, limit: 15 },
        });
      }),
      http.get(movementUrl, ({ params }) => {
        const productUuid = String(params.productUuid);
        movementRequests.set(productUuid, (movementRequests.get(productUuid) ?? 0) + 1);

        if (productUuid === inventoryUuid(16)) {
          return HttpResponse.json(
            movementResponse([
              {
                ...stockMovement(productUuid),
                type: "ADJUSTMENT",
                quantity: 0,
                previousStock: 10,
                newStock: 16,
                createdAt: "2026-03-01T12:00:00.000Z",
              },
            ]),
          );
        }

        const pending = deferred<Response>();
        pendingMovements.set(productUuid, pending);
        return pending.promise;
      }),
    );

    renderInventoryRoute();

    expect(await screen.findAllByText("Consultando movimiento…")).toHaveLength(15);
    await waitFor(() => expect(pendingMovements.size).toBe(15));
    expect(movementRequests.size).toBe(15);

    await user.click(screen.getByRole("button", { name: "Página siguiente" }));

    const currentRow = screen.getByRole("row", { name: /SKU-016/ });
    expect(await within(currentRow).findByText("Ajuste")).toBeVisible();
    expect(within(currentRow).getByText("Existencia resultante: 16")).toBeVisible();
    expect(within(currentRow).getByText("1 mar 2026, 12:00 UTC")).toBeVisible();
    await waitFor(() => expect(pageTwoListRequests).toBe(1));

    const movementSignals = new Map(
      requestSpy.mock.calls
        .map(([request]) => request)
        .flatMap((request) => {
          const productMatch = request.path.match(/\/inventory\/([^/]+)\/movements$/);
          return productMatch
            ? [[decodeURIComponent(productMatch[1]!), request.signal] as const]
            : [];
        }),
    );
    await waitFor(() => {
      for (const productUuid of pendingMovements.keys()) {
        expect(movementSignals.get(productUuid)?.aborted).toBe(true);
      }
    });

    const searchInput = screen.getByRole("searchbox", { name: "Buscar productos" });
    searchInput.focus();
    const focusedElement = document.activeElement;
    await act(async () => {
      for (const [productUuid, pending] of pendingMovements) {
        pending.resolve(HttpResponse.json(movementResponse([staleStockMovement(productUuid)])));
      }
      await Promise.resolve();
    });

    expect(screen.getByRole("row", { name: /SKU-016/ })).toBeVisible();
    expect(screen.queryByText("Salida")).not.toBeInTheDocument();
    expect(screen.queryByText("Cantidad: 999")).not.toBeInTheDocument();
    expect(screen.queryByText("30 dic 2025, 4:45 UTC")).not.toBeInTheDocument();
    expect(screen.queryByText("No se pudo consultar")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(focusedElement);
    expect(pageOneListRequests).toBe(1);
    expect(pageTwoListRequests).toBe(1);
    expect(movementRequests.size).toBe(16);
    expect(movementRequests.get(inventoryUuid(16))).toBe(1);
  });

  it("discards pending movement responses when criteria replace the current list", async () => {
    setAuthenticatedSession();
    const user = userEvent.setup();
    const firstUuid = inventoryUuid(21);
    const secondUuid = inventoryUuid(22);
    const filteredUuid = inventoryUuid(23);
    const pendingMovements = new Map<string, Deferred<Response>>();
    const movementRequests = new Map<string, number>();
    const requestSpy = vi.spyOn(httpClient, "request");
    let inventoryRequestCount = 0;

    server.use(
      http.get(inventoryUrl, ({ request }) => {
        inventoryRequestCount += 1;
        const search = new URL(request.url).searchParams.get("search");
        return HttpResponse.json(
          search === "filtrado"
            ? inventoryResponse([
                inventoryRecord(23, { name: "Producto filtrado", sku: "SKU-023" }),
              ])
            : inventoryResponse([inventoryRecord(21), inventoryRecord(22)]),
        );
      }),
      http.get(movementUrl, ({ params }) => {
        const productUuid = String(params.productUuid);
        movementRequests.set(productUuid, (movementRequests.get(productUuid) ?? 0) + 1);

        if (productUuid === filteredUuid) {
          return HttpResponse.json(movementResponse([stockMovement(productUuid)]));
        }

        const pending = deferred<Response>();
        pendingMovements.set(productUuid, pending);
        return pending.promise;
      }),
    );

    renderInventoryRoute();

    expect(await screen.findAllByText("Consultando movimiento…")).toHaveLength(2);
    await waitFor(() => expect(pendingMovements.size).toBe(2));
    expect(movementRequests.size).toBe(2);

    const searchInput = screen.getByRole("searchbox", { name: "Buscar productos" });
    await user.type(searchInput, "filtrado");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    const currentRow = screen.getByRole("row", { name: /SKU-023/ });
    expect(await within(currentRow).findByText("Entrada")).toBeVisible();
    expect(within(currentRow).getByText("Cantidad: 4")).toBeVisible();
    await waitFor(() => expect(inventoryRequestCount).toBe(2));

    const movementSignals = new Map(
      requestSpy.mock.calls
        .map(([request]) => request)
        .flatMap((request) => {
          const productMatch = request.path.match(/\/inventory\/([^/]+)\/movements$/);
          return productMatch
            ? [[decodeURIComponent(productMatch[1]!), request.signal] as const]
            : [];
        }),
    );
    await waitFor(() => {
      expect(movementSignals.get(firstUuid)?.aborted).toBe(true);
      expect(movementSignals.get(secondUuid)?.aborted).toBe(true);
    });

    const focusedElement = document.activeElement;
    await act(async () => {
      for (const [productUuid, pending] of pendingMovements) {
        pending.resolve(HttpResponse.json(movementResponse([staleStockMovement(productUuid)])));
      }
      await Promise.resolve();
    });

    expect(screen.getByRole("row", { name: /SKU-023/ })).toBeVisible();
    expect(screen.queryByText("Salida")).not.toBeInTheDocument();
    expect(screen.queryByText("Cantidad: 999")).not.toBeInTheDocument();
    expect(screen.queryByText("30 dic 2025, 4:45 UTC")).not.toBeInTheDocument();
    expect(screen.queryByText("No se pudo consultar")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(focusedElement);
    expect(inventoryRequestCount).toBe(2);
    expect(movementRequests.size).toBe(3);
    expect(movementRequests.get(filteredUuid)).toBe(1);
  });
});
