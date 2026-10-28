import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InventorySessionScope } from "@/features/inventory";
import { createQueryClient } from "@/shared/api/query-client";

const authSession = vi.hoisted(() => ({
  currentSessionId: null as string | null,
  useSession: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  isCurrentSession: (sessionId: string) => authSession.currentSessionId === sessionId,
  useSession: authSession.useSession,
}));

const authenticatedSession = (id: string) => ({
  status: "authenticated",
  session: { id, createdAt: "2026-01-01T00:00:00.000Z" },
});

const setSession = (sessionId: string | null) => {
  authSession.currentSessionId = sessionId;
  authSession.useSession.mockReturnValue(
    sessionId === null ? { status: "unauthenticated" } : authenticatedSession(sessionId),
  );
};

const createTree = (queryClient: ReturnType<typeof createQueryClient>) => (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<ScopedOutlet />} path="/">
            <Route element={<output>Contenido de ruta</output>} index />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  </StrictMode>
);

const ScopedOutlet = () => (
  <InventorySessionScope>
    <Outlet />
  </InventorySessionScope>
);

const renderedScopes: Array<{
  queryClient: ReturnType<typeof createQueryClient>;
  unmount: () => void;
}> = [];

const renderScope = (queryClient: ReturnType<typeof createQueryClient>) => {
  const rendered = render(createTree(queryClient));
  renderedScopes.push({ queryClient, unmount: rendered.unmount });
  return rendered;
};

afterEach(() => {
  for (const scope of renderedScopes.splice(0)) {
    scope.unmount();
    scope.queryClient.clear();
  }

  authSession.currentSessionId = null;
  authSession.useSession.mockReset();
});

describe("Inventory session scope", () => {
  it("cancels and removes only the abandoned session's Inventory queries", async () => {
    const queryClient = createQueryClient();
    const inventoryListA = ["inventory", "list", "session-a", { page: 1 }] as const;
    const latestMovementA = ["inventory", "latest-movement", "session-a", "product-a"] as const;
    const inventoryListB = ["inventory", "list", "session-b", { page: 1 }] as const;
    const productListA = ["products", "list", "session-a", { page: 1 }] as const;

    queryClient.setQueryData(inventoryListA, "inventory A");
    queryClient.setQueryData(latestMovementA, "movement A");
    queryClient.setQueryData(inventoryListB, "inventory B");
    queryClient.setQueryData(productListA, "products A");
    setSession("session-a");

    const scope = renderScope(queryClient);

    expect(screen.getByText("Contenido de ruta")).toBeVisible();
    expect(queryClient.getQueryData(inventoryListA)).toBe("inventory A");
    expect(queryClient.getQueryData(latestMovementA)).toBe("movement A");

    const pendingInventoryA = ["inventory", "list", "session-a", { page: 2 }] as const;
    let pendingSignal: AbortSignal | undefined;
    const pendingFetch = queryClient
      .fetchQuery({
        queryKey: pendingInventoryA,
        queryFn: ({ signal }) => {
          pendingSignal = signal;
          return new Promise<string>((resolve) => {
            signal.addEventListener("abort", () => resolve("stale result"), { once: true });
          });
        },
      })
      .catch(() => undefined);

    let pendingQuery = queryClient.getQueryCache().find({ queryKey: pendingInventoryA });
    await waitFor(() => {
      pendingQuery = queryClient.getQueryCache().find({ queryKey: pendingInventoryA });
      expect(pendingQuery?.state.fetchStatus).toBe("fetching");
      expect(pendingSignal).toBeDefined();
    });

    setSession("session-b");
    scope.rerender(createTree(queryClient));

    await waitFor(() => {
      expect(
        queryClient.getQueryCache().findAll({
          predicate: ({ queryKey }) => queryKey[0] === "inventory" && queryKey[2] === "session-a",
        }),
      ).toHaveLength(0);
    });
    await pendingFetch;

    expect(pendingSignal?.aborted).toBe(true);
    expect(pendingQuery?.state.fetchStatus).toBe("idle");
    expect(queryClient.getQueryData(inventoryListB)).toBe("inventory B");
    expect(queryClient.getQueryData(productListA)).toBe("products A");
  });

  it("removes the ended session's Inventory cache on logout without touching other features", async () => {
    const queryClient = createQueryClient();
    const inventoryListA = ["inventory", "list", "session-a", { page: 1 }] as const;
    const productListA = ["products", "list", "session-a", { page: 1 }] as const;

    queryClient.setQueryData(inventoryListA, "inventory A");
    queryClient.setQueryData(productListA, "products A");
    setSession("session-a");

    const scope = renderScope(queryClient);
    expect(screen.getByText("Contenido de ruta")).toBeVisible();
    expect(queryClient.getQueryData(inventoryListA)).toBe("inventory A");

    setSession(null);
    scope.rerender(createTree(queryClient));

    await waitFor(() => {
      expect(
        queryClient.getQueryCache().findAll({
          predicate: ({ queryKey }) => queryKey[0] === "inventory" && queryKey[2] === "session-a",
        }),
      ).toHaveLength(0);
    });

    expect(queryClient.getQueryData(productListA)).toBe("products A");
  });
});
