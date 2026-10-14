import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { AuthSessionQueryResult, UseSessionResult } from "@/features/auth";
import { useSession } from "@/features/auth";
import type { components } from "@/shared/api/generated/auth-contracts";
import { describe, expect, it } from "vitest";

import { appNavigationItems } from "@/app/router/navigation";
import { QueryProvider } from "@/app/providers/query.provider";
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
      id: "router-user",
      email: "operator@example.com",
      role: "OPERATOR",
    },
    session: {
      id: "router-session",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
});

const unauthenticatedResponse = () =>
  HttpResponse.json(
    { error: { code: "UNAUTHORIZED", message: "No active session." } },
    { status: 401 },
  );

describe("App Shell routes and navigation catalog", () => {
  it("registers Home, Products, and Not Found under session priority", async () => {
    const user = userEvent.setup();
    const pendingAbsence = deferred<Response>();
    const absenceRequestStarted = deferred<void>();
    let requestCount = 0;
    let refetch: UseSessionResult["refetch"] | undefined;

    expect(appNavigationItems).toEqual([
      { id: "home", label: "Inicio", to: "/", icon: "home" },
      { id: "products", label: "Productos", to: "/products", icon: "box" },
    ]);
    expect(appNavigationItems.some(({ to }) => to.startsWith("/__"))).toBe(false);

    server.use(
      http.get(/\/api\/auth\/get-session/, () => {
        requestCount += 1;
        if (requestCount === 1) {
          return HttpResponse.json(publicAuthResponse());
        }

        absenceRequestStarted.resolve();
        return pendingAbsence.promise;
      }),
      http.get("https://inventory.test/api/products", () =>
        HttpResponse.json({ data: [], pagination: { total: 0, page: 1, limit: 15 } }),
      ),
    );

    const router = createMemoryRouter(appRoutes, { initialEntries: ["/"] });

    const SessionRefreshDriver = () => {
      refetch = useSession().refetch;
      return null;
    };

    render(
      <QueryProvider>
        <>
          <RouterProvider router={router} />
          <SessionRefreshDriver />
        </>
      </QueryProvider>,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
    ).toBeVisible();
    const homeMain = screen.getByRole("main");
    expect(homeMain).toContainElement(
      screen.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
    );
    expect(screen.getByRole("banner")).toHaveTextContent("operator@example.com");
    expect(
      screen.getByRole("complementary", { name: "Barra lateral de Inventory" }),
    ).toHaveTextContent("Inventory");
    const navigation = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(within(navigation).getAllByRole("link")).toHaveLength(2);
    const homeNavigationLink = within(navigation).getByRole("link", { name: "Inicio" });
    const productsNavigationLink = within(navigation).getByRole("link", { name: "Productos" });
    expect(homeNavigationLink).toHaveAttribute("aria-current", "page");
    expect(productsNavigationLink).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Saltar al contenido" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(homeMain).toHaveAttribute("id", "main-content");
    expect(homeMain).toHaveAttribute("tabindex", "-1");

    await user.click(productsNavigationLink);
    const productsHeading = await screen.findByRole("heading", {
      level: 1,
      name: "Productos",
    });
    expect(productsHeading).toBeVisible();
    expect(screen.getByRole("main")).toContainElement(productsHeading);
    expect(productsNavigationLink).toHaveAttribute("aria-current", "page");
    expect(homeNavigationLink).not.toHaveAttribute("aria-current");

    await act(async () => router.navigate("/not-registered"));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Página no encontrada" }),
    ).toBeVisible();
    expect(homeNavigationLink).not.toHaveAttribute("aria-current");
    homeNavigationLink.focus();
    await user.keyboard("{Enter}");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
    ).toBeVisible();
    expect(homeNavigationLink).toHaveAttribute("aria-current", "page");
    expect(productsNavigationLink).not.toHaveAttribute("aria-current");

    await act(async () => router.navigate("/not-registered"));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Página no encontrada" }),
    ).toBeVisible();
    expect(homeNavigationLink).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Volver a Inicio" })).toBeVisible();

    let refetchResult!: Promise<AuthSessionQueryResult>;
    act(() => {
      refetchResult = refetch!();
    });
    await absenceRequestStarted.promise;
    expect(screen.getByRole("status")).toHaveTextContent("Comprobando tu sesión");
    expect(screen.queryByRole("heading", { name: "Página no encontrada" })).not.toBeInTheDocument();

    pendingAbsence.resolve(unauthenticatedResponse());
    await act(async () => refetchResult);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Sesión no iniciada" }),
    ).toBeVisible();
    expect(screen.queryByRole("link", { name: "Volver a Inicio" })).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/not-registered");
    expect(requestCount).toBe(2);

    router.dispose();
  });
});
