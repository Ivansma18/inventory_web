import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { UseSessionResult } from "@/features/auth";
import { useSession } from "@/features/auth";
import type { components } from "@/shared/api/generated/auth-contracts";
import { afterEach, describe, expect, it } from "vitest";

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
      id: "inventory-route-user",
      email: "operator@example.com",
      role: "OPERATOR",
    },
    session: {
      id: "inventory-route-session",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
});

const inventoryUrl = "https://inventory.test/api/inventory";
const routers: Array<ReturnType<typeof createMemoryRouter>> = [];
const queryClients: Array<ReturnType<typeof createQueryClient>> = [];

const renderInventoryRoute = (initialEntry = "/inventory") => {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] });
  let refetchSession: UseSessionResult["refetch"] | undefined;
  const SessionRefreshCapture = () => {
    refetchSession = useSession().refetch;
    return null;
  };
  queryClients.push(queryClient);
  routers.push(router);

  render(
    <QueryClientProvider client={queryClient}>
      <UiProvider>
        <>
          <RouterProvider router={router} />
          <SessionRefreshCapture />
        </>
      </UiProvider>
    </QueryClientProvider>,
  );

  return { refetchSession: () => refetchSession!(), router };
};

afterEach(() => {
  for (const router of routers.splice(0)) {
    router.dispose();
  }
  for (const queryClient of queryClients.splice(0)) {
    queryClient.clear();
  }
});

describe("Inventory route", () => {
  it("holds a direct URL while Auth is pending, then focuses Inventario without a business request", async () => {
    const pendingSession = deferred<Response>();
    const sessionRequestStarted = deferred<void>();
    let inventoryRequestCount = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => {
        sessionRequestStarted.resolve();
        return pendingSession.promise;
      }),
      http.get(inventoryUrl, () => {
        inventoryRequestCount += 1;
        return HttpResponse.json({ data: [], pagination: { total: 0, page: 1, limit: 15 } });
      }),
    );

    const { router } = renderInventoryRoute("/inventory?search=desk");
    await sessionRequestStarted.promise;

    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
    expect(screen.queryByRole("heading", { level: 1, name: "Inventario" })).not.toBeInTheDocument();
    expect(inventoryRequestCount).toBe(0);

    await act(async () => {
      pendingSession.resolve(HttpResponse.json(publicAuthResponse()));
    });

    const inventoryHeading = await screen.findByRole("heading", {
      level: 1,
      name: "Inventario",
    });
    expect(inventoryHeading).toHaveFocus();
    expect(router.state.location.pathname).toBe("/inventory");
    expect(router.state.location.search).toBe("?search=desk");
    expect(screen.getByRole("link", { name: "Inventario" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(inventoryRequestCount).toBe(0);
  });

  it("shows a recoverable Auth error and only renders Inventory after a successful retry", async () => {
    const user = userEvent.setup();
    let sessionRequestCount = 0;
    let inventoryRequestCount = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => {
        sessionRequestCount += 1;
        if (sessionRequestCount === 1) {
          return HttpResponse.json({ error: { code: "UNAVAILABLE" } }, { status: 503 });
        }

        return HttpResponse.json(publicAuthResponse());
      }),
      http.get(inventoryUrl, () => {
        inventoryRequestCount += 1;
        return HttpResponse.json({ data: [], pagination: { total: 0, page: 1, limit: 15 } });
      }),
    );

    const { refetchSession, router } = renderInventoryRoute("/inventory");
    await act(async () => refetchSession());

    expect(
      await screen.findByRole("heading", { level: 1, name: "No se pudo comprobar la sesión" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("navigation", { name: "Navegación principal" }),
    ).not.toBeInTheDocument();
    expect(inventoryRequestCount).toBe(0);

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    const inventoryHeading = await screen.findByRole("heading", {
      level: 1,
      name: "Inventario",
    });
    expect(inventoryHeading).toHaveFocus();
    expect(router.state.location.pathname).toBe("/inventory");
    expect(sessionRequestCount).toBe(2);
    expect(inventoryRequestCount).toBe(0);
  });

  it("preserves a direct URL but shows the signed-out state without business calls", async () => {
    let inventoryRequestCount = 0;
    server.use(
      http.get(/\/api\/auth\/get-session/, () =>
        HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "No active session." } },
          { status: 401 },
        ),
      ),
      http.get(inventoryUrl, () => {
        inventoryRequestCount += 1;
        return HttpResponse.json({ data: [], pagination: { total: 0, page: 1, limit: 15 } });
      }),
    );

    const { refetchSession, router } = renderInventoryRoute("/inventory?status=inactive");
    await act(async () => refetchSession());

    expect(
      await screen.findByRole("heading", { level: 1, name: "Sesión no iniciada" }),
    ).toBeVisible();
    expect(screen.queryByRole("heading", { level: 1, name: "Inventario" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Navegación principal" }),
    ).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/inventory");
    expect(router.state.location.search).toBe("?status=inactive");
    expect(inventoryRequestCount).toBe(0);
  });
});
