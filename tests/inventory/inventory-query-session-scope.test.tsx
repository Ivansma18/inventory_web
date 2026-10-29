import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { components } from "@/shared/api/generated/inventory-contracts";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UiProvider } from "@/app/providers/ui.provider";
import { appRoutes } from "@/app/router/router";
import type { StockMovement } from "@/features/inventory/api/latest-movement-contract";
import { createQueryClient } from "@/shared/api/query-client";
import { httpClient } from "@/shared/api/http-client";
import { server } from "../mocks/server";

const authState = vi.hoisted(() => {
  let currentSessionId: string | null = null;
  let snapshot: object = {
    status: "unauthenticated",
    verification: { status: "success", error: null },
  };
  const listeners = new Set<() => void>();

  return {
    getCurrentSessionId: () => currentSessionId,
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setSession: (sessionId: string | null, nextSnapshot: object) => {
      currentSessionId = sessionId;
      snapshot = nextSnapshot;
      listeners.forEach((listener) => listener());
    },
    reset: () => {
      currentSessionId = null;
      snapshot = {
        status: "unauthenticated",
        verification: { status: "success", error: null },
      };
      listeners.forEach((listener) => listener());
    },
    useAuth: vi.fn(() => ({
      isSigningIn: false,
      isSigningOut: false,
      signIn: vi.fn(async () => ({ data: null, error: null })),
      signOut: vi.fn(async () => ({ data: null, error: null })),
      signOutError: null,
    })),
  };
});

vi.mock("@/features/auth", async () => {
  const { useSyncExternalStore } = await import("react");

  return {
    isCurrentSession: (sessionId: string) => authState.getCurrentSessionId() === sessionId,
    useAuth: authState.useAuth,
    useSession: () =>
      useSyncExternalStore(authState.subscribe, authState.getSnapshot, authState.getSnapshot),
  };
});

const SESSION_A = "inventory-session-a";
const SESSION_B = "inventory-session-b";
const inventoryUrl = "https://inventory.test/api/inventory";
const movementUrl = `${inventoryUrl}/:productUuid/movements`;
const inventoryUuid = (index: number) =>
  `550e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}`;

const authenticatedSession = (sessionId: string) => ({
  status: "authenticated",
  user: {
    id: `user-${sessionId}`,
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
});

const unauthenticatedSession = {
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

const setSession = (sessionId: string | null) =>
  authState.setSession(
    sessionId,
    sessionId === null ? unauthenticatedSession : authenticatedSession(sessionId),
  );

const inventoryRecord = (
  index: number,
  sessionName: string,
): components["schemas"]["Inventory"] => ({
  productUuid: inventoryUuid(index),
  sku: `SKU-${sessionName}`,
  name: `Producto de ${sessionName}`,
  categoryUuid: null,
  isActive: true,
  quantity: 10,
  minimumStock: 3,
  status: "IN_STOCK",
  updatedAt: "2026-01-01T00:00:00.000Z",
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

const pendingResponses: Array<Deferred<Response>> = [];
const mountedRoutes: Array<{
  queryClient: ReturnType<typeof createQueryClient>;
  router: ReturnType<typeof createMemoryRouter>;
  unmount: () => void;
}> = [];

const renderInventoryRoute = () => {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(appRoutes, { initialEntries: ["/inventory"] });
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <UiProvider>
        <RouterProvider router={router} />
      </UiProvider>
    </QueryClientProvider>,
  );
  mountedRoutes.push({ queryClient, router, unmount: rendered.unmount });

  return { queryClient, router };
};

const inventoryQueriesForSession = (
  queryClient: ReturnType<typeof createQueryClient>,
  sessionId: string,
) =>
  queryClient.getQueryCache().findAll({
    predicate: ({ queryKey }) => queryKey[0] === "inventory" && queryKey[2] === sessionId,
  });

afterEach(() => {
  for (const route of mountedRoutes.splice(0)) {
    route.unmount();
    route.router.dispose();
    route.queryClient.clear();
  }

  for (const response of pendingResponses.splice(0)) {
    response.resolve(HttpResponse.json(inventoryResponse([])));
  }

  authState.reset();
  vi.restoreAllMocks();
});

describe("Inventory query session scope", () => {
  it.each([
    ["replace session A with session B", SESSION_B],
    ["log out of session A", null],
  ] as const)("discards a late list response when users %s", async (_transition, nextSessionId) => {
    const pendingListA = deferred<Response>();
    pendingResponses.push(pendingListA);
    const listAStarted = deferred<void>();
    const listB = inventoryRecord(2, "sesión B");
    let listRequests = 0;

    setSession(SESSION_A);
    server.use(
      http.get(inventoryUrl, () => {
        listRequests += 1;
        if (listRequests === 1) {
          listAStarted.resolve();
          return pendingListA.promise;
        }
        return HttpResponse.json(inventoryResponse([listB]));
      }),
      http.get(movementUrl, () =>
        HttpResponse.json({ data: [], pagination: { total: 0, page: 1, limit: 1 } }),
      ),
    );
    const requestSpy = vi.spyOn(httpClient, "request");
    const { queryClient } = renderInventoryRoute();
    await listAStarted.promise;

    const searchInput = screen.getByRole("searchbox", { name: "Buscar productos" });
    searchInput.focus();
    const listSignalA = requestSpy.mock.calls
      .map(([request]) => request)
      .find((request) => request.path === "/inventory")?.signal;

    await act(async () => setSession(nextSessionId));

    if (nextSessionId === null) {
      const signedOutHeading = await screen.findByRole("heading", { name: "Sesión no iniciada" });
      await waitFor(() => expect(listSignalA?.aborted).toBe(true));
      await waitFor(() => {
        expect(inventoryQueriesForSession(queryClient, SESSION_A)).toHaveLength(0);
      });

      await act(async () => {
        pendingListA.resolve(
          HttpResponse.json(inventoryResponse([inventoryRecord(1, "sesión A")])),
        );
        await Promise.resolve();
      });

      expect(signedOutHeading).toBeVisible();
      expect(document.activeElement).toBe(signedOutHeading);
      expect(screen.queryByText("Producto de sesión A")).not.toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "SKU-sesión A" })).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(inventoryQueriesForSession(queryClient, SESSION_A)).toHaveLength(0);
      expect(listRequests).toBe(1);
      return;
    }

    expect(await screen.findByRole("cell", { name: "SKU-sesión B" })).toBeVisible();
    const focusedElement = document.activeElement;
    await waitFor(() => expect(listSignalA?.aborted).toBe(true));
    await waitFor(() => {
      expect(inventoryQueriesForSession(queryClient, SESSION_A)).toHaveLength(0);
    });
    expect(screen.queryByText("Producto de sesión A")).not.toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /SKU-sesión A/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "SKU-sesión A" })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(focusedElement);

    await act(async () => {
      pendingListA.resolve(HttpResponse.json(inventoryResponse([inventoryRecord(1, "sesión A")])));
      await Promise.resolve();
    });

    expect(screen.getByRole("cell", { name: "SKU-sesión B" })).toBeVisible();
    expect(screen.queryByText("Producto de sesión A")).not.toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /SKU-sesión A/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "SKU-sesión A" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(focusedElement);
    expect(inventoryQueriesForSession(queryClient, SESSION_A)).toHaveLength(0);
    expect(listRequests).toBe(2);
  });

  it.each([
    ["replace session A with session B", SESSION_B],
    ["log out of session A", null],
  ] as const)(
    "discards a late movement response when users %s",
    async (_transition, nextSessionId) => {
      const pendingMovementA = deferred<Response>();
      pendingResponses.push(pendingMovementA);
      const movementAStarted = deferred<void>();
      const productA = inventoryRecord(1, "sesión A");
      const productB = inventoryRecord(2, "sesión B");
      const movementRequests = new Map<string, number>();
      let listRequests = 0;

      setSession(SESSION_A);
      server.use(
        http.get(inventoryUrl, () => {
          listRequests += 1;
          return HttpResponse.json(inventoryResponse([listRequests === 1 ? productA : productB]));
        }),
        http.get(movementUrl, ({ params }) => {
          const productUuid = String(params.productUuid);
          movementRequests.set(productUuid, (movementRequests.get(productUuid) ?? 0) + 1);
          if (productUuid === productA.productUuid) {
            movementAStarted.resolve();
            return pendingMovementA.promise;
          }
          return HttpResponse.json({
            data: [stockMovement(productUuid)],
            pagination: { total: 1, page: 1, limit: 1 },
          });
        }),
      );
      const requestSpy = vi.spyOn(httpClient, "request");
      const { queryClient } = renderInventoryRoute();

      expect(await screen.findByRole("cell", { name: "SKU-sesión A" })).toBeVisible();
      expect(await screen.findByText("Consultando movimiento…")).toBeVisible();
      await movementAStarted.promise;

      const searchInput = screen.getByRole("searchbox", { name: "Buscar productos" });
      searchInput.focus();
      const movementSignalA = requestSpy.mock.calls
        .map(([request]) => request)
        .find((request) => request.path.endsWith(`/${productA.productUuid}/movements`))?.signal;

      await act(async () => setSession(nextSessionId));

      if (nextSessionId === null) {
        const signedOutHeading = await screen.findByRole("heading", { name: "Sesión no iniciada" });
        await waitFor(() => expect(movementSignalA?.aborted).toBe(true));
        await waitFor(() => {
          expect(inventoryQueriesForSession(queryClient, SESSION_A)).toHaveLength(0);
        });

        await act(async () => {
          pendingMovementA.resolve(
            HttpResponse.json({
              data: [staleStockMovement(productA.productUuid)],
              pagination: { total: 1, page: 1, limit: 1 },
            }),
          );
          await Promise.resolve();
        });

        expect(signedOutHeading).toBeVisible();
        expect(document.activeElement).toBe(signedOutHeading);
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
        expect(screen.queryByRole("cell", { name: "SKU-sesión A" })).not.toBeInTheDocument();
        expect(screen.queryByText("Salida")).not.toBeInTheDocument();
        expect(screen.queryByText("Cantidad: 999")).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(inventoryQueriesForSession(queryClient, SESSION_A)).toHaveLength(0);
        expect(movementRequests.get(productA.productUuid)).toBe(1);
        expect(listRequests).toBe(1);
        return;
      }

      const rowB = await screen.findByRole("row", { name: /SKU-sesión B/ });
      expect(await screen.findByText("Entrada")).toBeVisible();
      expect(rowB).toBeVisible();
      const focusedElement = document.activeElement;
      await waitFor(() => expect(movementSignalA?.aborted).toBe(true));
      await waitFor(() => {
        expect(inventoryQueriesForSession(queryClient, SESSION_A)).toHaveLength(0);
      });
      expect(screen.queryByText("Producto de sesión A")).not.toBeInTheDocument();
      expect(screen.queryByRole("row", { name: /SKU-sesión A/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "SKU-sesión A" })).not.toBeInTheDocument();

      await act(async () => {
        pendingMovementA.resolve(
          HttpResponse.json({
            data: [staleStockMovement(productA.productUuid)],
            pagination: { total: 1, page: 1, limit: 1 },
          }),
        );
        await Promise.resolve();
      });

      expect(screen.getByRole("row", { name: /SKU-sesión B/ })).toBeVisible();
      expect(screen.queryByText("Producto de sesión A")).not.toBeInTheDocument();
      expect(screen.queryByRole("row", { name: /SKU-sesión A/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "SKU-sesión A" })).not.toBeInTheDocument();
      expect(screen.queryByText("Salida")).not.toBeInTheDocument();
      expect(screen.queryByText("Cantidad: 999")).not.toBeInTheDocument();
      expect(screen.queryByText("30 dic 2025, 4:45 UTC")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(document.activeElement).toBe(focusedElement);
      expect(inventoryQueriesForSession(queryClient, SESSION_A)).toHaveLength(0);
      expect(movementRequests.get(productA.productUuid)).toBe(1);
      expect(movementRequests.get(productB.productUuid)).toBe(1);
      expect(listRequests).toBe(2);
    },
  );
});
