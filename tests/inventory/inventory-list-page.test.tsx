import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
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

const routers: Array<ReturnType<typeof createMemoryRouter>> = [];
const queryClients: Array<ReturnType<typeof createQueryClient>> = [];

const renderInventoryRoute = (initialEntry = "/inventory") => {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] });
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
});
