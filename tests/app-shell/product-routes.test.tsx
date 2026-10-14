import { cleanup, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { components } from "@/shared/api/generated/auth-contracts";
import { describe, expect, it } from "vitest";

import { appRoutes } from "@/app/router/router";
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
    );

    const createPath = "/products/new";
    const createRouter = createMemoryRouter(appRoutes, { initialEntries: [createPath] });
    const createView = render(<RouterProvider router={createRouter} />);

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

    const editPath = "/products/018f1f3b-7c2a-7b6e-9f12-123456789abc/edit";
    const editRouter = createMemoryRouter(appRoutes, { initialEntries: [editPath] });
    render(<RouterProvider router={editRouter} />);

    const editHeading = await screen.findByRole("heading", {
      level: 1,
      name: "Editar producto",
    });
    expect(editHeading).toBeVisible();
    expect(screen.getByRole("main")).toContainElement(editHeading);
    expect(screen.getByRole("banner")).toHaveTextContent("operator@example.com");
    expect(editRouter.state.location.pathname).toBe(editPath);

    editRouter.dispose();
  });
});
