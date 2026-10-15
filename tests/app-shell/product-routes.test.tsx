import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { components } from "@/shared/api/generated/auth-contracts";
import { describe, expect, it } from "vitest";

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
      id: "products-router-user",
      email: "operator@example.com",
      role: "OPERATOR",
    },
    session: {
      id: "products-router-session",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
});

describe("Product form routes", () => {
  it("opens direct create and edit URLs inside the authenticated App Shell", async () => {
    const pendingSession = deferred<Response>();
    const sessionRequestStarted = deferred<void>();

    server.use(
      http.get(/\/api\/auth\/get-session/, () => {
        sessionRequestStarted.resolve();
        return pendingSession.promise;
      }),
      http.get("https://inventory.test/api/categories", () =>
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
      ),
    );

    const createPath = "/products/new";
    const createRouter = createMemoryRouter(appRoutes, { initialEntries: [createPath] });
    const createQueryClientInstance = createQueryClient();
    const createView = render(
      <QueryClientProvider client={createQueryClientInstance}>
        <RouterProvider router={createRouter} />
      </QueryClientProvider>,
    );

    await sessionRequestStarted.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
    expect(
      screen.queryByRole("heading", { level: 1, name: "Crear producto" }),
    ).not.toBeInTheDocument();

    pendingSession.resolve(HttpResponse.json(publicAuthResponse()));

    const createHeading = await screen.findByRole("heading", {
      level: 1,
      name: "Crear producto",
    });
    expect(createHeading).toBeVisible();
    expect(screen.getByRole("main")).toContainElement(createHeading);
    expect(screen.getByRole("banner")).toHaveTextContent("operator@example.com");
    expect(createRouter.state.location.pathname).toBe(createPath);

    createRouter.dispose();
    createView.unmount();
    cleanup();
    createQueryClientInstance.clear();

    const editPath = "/products/018f1f3b-7c2a-7b6e-9f12-123456789abc/edit";
    const editRouter = createMemoryRouter(appRoutes, { initialEntries: [editPath] });
    const editQueryClient = createQueryClient();
    render(
      <QueryClientProvider client={editQueryClient}>
        <RouterProvider router={editRouter} />
      </QueryClientProvider>,
    );

    const editHeading = await screen.findByRole("heading", {
      level: 1,
      name: "Editar producto",
    });
    expect(editHeading).toBeVisible();
    expect(screen.getByRole("main")).toContainElement(editHeading);
    expect(screen.getByRole("banner")).toHaveTextContent("operator@example.com");
    expect(editRouter.state.location.pathname).toBe(editPath);

    editRouter.dispose();
    editQueryClient.clear();
  });
});
