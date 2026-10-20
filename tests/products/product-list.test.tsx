import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { components } from "@/shared/api/generated/auth-contracts";
import { afterEach, describe, expect, it } from "vitest";

import { appRoutes } from "@/app/router/router";
import { UiProvider } from "@/app/providers/ui.provider";
import { useSession } from "@/features/auth";
import { createQueryClient } from "@/shared/api/query-client";
import { server } from "../mocks/server";

const productUrl = "https://inventory.test/api/products";
const categoryUuid = "550e8400-e29b-41d4-a716-446655440000";
const categoriesUrl = "https://inventory.test/api/categories";

const publicAuthResponse = (
  sessionId = "product-list-session",
): components["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: {
      id: "product-list-user",
      email: "operator@example.com",
      role: "OPERATOR",
    },
    session: {
      id: sessionId,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
});

const publicAuthResponseForRole = (
  role: components["schemas"]["PublicAuthResponse"]["data"]["user"]["role"],
): components["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: {
      id: "product-list-user",
      email: "operator@example.com",
      role,
    },
    session: {
      id: "product-list-session",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
});

const product = (index: number, isActive = true) => ({
  uuid: `550e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}`,
  sku: `SKU-${String(index).padStart(3, "0")}`,
  name: `Producto ${String(index).padStart(3, "0")}`,
  description: null,
  purchasePrice: 25.5,
  salePrice: 31.25,
  categoryUuid: "550e8400-e29b-41d4-a716-446655440000",
  isActive,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const productStatusUrl = `${productUrl}/${product(1).uuid}`;

const routeResources: Array<{
  queryClient: ReturnType<typeof createQueryClient>;
  router: ReturnType<typeof createMemoryRouter>;
}> = [];

const renderProductRoute = (
  initialEntry: string | string[] = "/products",
  queryClient = createQueryClient(),
) => {
  const initialEntries = Array.isArray(initialEntry) ? initialEntry : [initialEntry];
  const router = createMemoryRouter(appRoutes, {
    initialEntries,
    initialIndex: initialEntries.length - 1,
  });
  routeResources.push({ queryClient, router });

  render(
    <QueryClientProvider client={queryClient}>
      <UiProvider>
        <RouterProvider router={router} />
      </UiProvider>
    </QueryClientProvider>,
  );

  return { queryClient, router };
};

const SessionRefetchControl = () => {
  const session = useSession();

  return (
    <div>
      <p role="status">
        {session.status === "authenticated" ? session.session.id : session.status}
      </p>
      <button onClick={() => void session.refetch()}>Refresh test session</button>
    </div>
  );
};

afterEach(() => {
  for (const { queryClient, router } of routeResources.splice(0)) {
    router.dispose();
    queryClient.clear();
  }
});

describe("Product list remote query", () => {
  it.each(["ADMIN", "MANAGER", "OPERATOR", "VIEWER"] as const)(
    "keeps activate and deactivate actions visible to %s",
    async (role) => {
      server.use(
        http.get(/\/api\/auth\/get-session/, () =>
          HttpResponse.json(publicAuthResponseForRole(role)),
        ),
        http.get(productUrl, () =>
          HttpResponse.json({
            data: [product(1, true), product(2, false)],
            pagination: { total: 2, page: 1, limit: 15 },
          }),
        ),
      );

      renderProductRoute();

      expect(
        await screen.findByRole("button", { name: "Desactivar" }, { timeout: 5_000 }),
      ).toBeVisible();
      expect(
        await screen.findByRole("button", { name: "Activar" }, { timeout: 5_000 }),
      ).toBeVisible();
    },
  );

  it.each([
    {
      isActive: true,
      action: "Desactivar",
      dialogTitle: "Confirmar desactivación",
      expectedState: "Activo",
    },
    {
      isActive: false,
      action: "Activar",
      dialogTitle: "Confirmar activación",
      expectedState: "Inactivo",
    },
  ])(
    "identifies the product before $action and cancellation preserves its state without a request",
    async ({ isActive, action, dialogTitle, expectedState }) => {
      const user = userEvent.setup();
      let statusMutationRequests = 0;

      server.use(
        http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
        http.get(productUrl, () =>
          HttpResponse.json({
            data: [product(1, isActive)],
            pagination: { total: 1, page: 1, limit: 15 },
          }),
        ),
        http.patch(productStatusUrl, () => {
          statusMutationRequests += 1;
          return HttpResponse.json({ data: product(1, false) });
        }),
        http.delete(productStatusUrl, () => {
          statusMutationRequests += 1;
          return HttpResponse.json({ data: product(1, false) });
        }),
      );

      renderProductRoute();

      const productRow = await screen.findByRole("row", { name: /SKU-001/ });
      await user.click(within(productRow).getByRole("button", { name: action }));

      const dialog = await screen.findByRole("dialog", { name: dialogTitle });
      expect(dialog).toHaveTextContent("Producto 001");

      if (isActive) {
        expect(dialog).toHaveTextContent(
          "El producto se conservará en el catálogo; desactivarlo no lo elimina.",
        );
      } else {
        expect(dialog).not.toHaveTextContent("desactivarlo no lo elimina");
      }

      await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(
        within(screen.getByRole("row", { name: /SKU-001/ })).getByText(expectedState),
      ).toBeVisible();
      expect(statusMutationRequests).toBe(0);
    },
  );

  it("announces a late not-found response without moving focus and refreshes on return", async () => {
    const user = userEvent.setup();
    let resolveMutation!: (response: Response) => void;
    const pendingMutation = new Promise<Response>((resolve) => {
      resolveMutation = resolve;
    });
    let mutationRequests = 0;
    let listRequests = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => {
        listRequests += 1;
        return HttpResponse.json({
          data: listRequests === 1 ? [product(1)] : [],
          pagination: { total: listRequests === 1 ? 1 : 0, page: 1, limit: 15 },
        });
      }),
      http.delete(productStatusUrl, () => {
        mutationRequests += 1;
        return pendingMutation;
      }),
    );

    const { router } = renderProductRoute();
    const row = await screen.findByRole("row", { name: /SKU-001/ });
    await user.click(within(row).getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));
    await waitFor(() => expect(mutationRequests).toBe(1));
    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));

    await act(async () => {
      await router.navigate("/");
    });
    const homeHeading = await screen.findByRole("heading", {
      level: 1,
      name: "Bienvenido a Inventory",
    });
    homeHeading.focus();
    expect(homeHeading).toHaveFocus();

    resolveMutation(
      HttpResponse.json(
        { error: { code: "PRODUCT_NOT_FOUND", message: "private missing product" } },
        { status: 404 },
      ),
    );

    const notFoundAlert = await screen.findByRole("alert");
    expect(notFoundAlert).toHaveTextContent("No se encontró el producto.");
    expect(notFoundAlert).not.toHaveTextContent("private missing product");
    expect(router.state.location.pathname).toBe("/");
    expect(homeHeading).toHaveFocus();
    expect(mutationRequests).toBe(1);
    expect(listRequests).toBe(1);

    await act(async () => {
      await router.navigate("/products");
    });

    await waitFor(() => expect(listRequests).toBe(2));
    expect(await screen.findByText("No hay productos activos para mostrar.")).toBeVisible();
  });

  it("discards a late not-found response after the session changes", async () => {
    const user = userEvent.setup();
    let currentSessionId = "product-list-session";
    let resolveMutation!: (response: Response) => void;
    const pendingMutation = new Promise<Response>((resolve) => {
      resolveMutation = resolve;
    });
    let mutationRequests = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () =>
        HttpResponse.json(publicAuthResponse(currentSessionId)),
      ),
      http.get(productUrl, () =>
        HttpResponse.json({
          data: [product(1)],
          pagination: { total: 1, page: 1, limit: 15 },
        }),
      ),
      http.delete(productStatusUrl, () => {
        mutationRequests += 1;
        return pendingMutation;
      }),
    );

    const queryClient = createQueryClient();
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/products"] });
    routeResources.push({ queryClient, router });
    render(
      <QueryClientProvider client={queryClient}>
        <UiProvider>
          <SessionRefetchControl />
          <RouterProvider router={router} />
        </UiProvider>
      </QueryClientProvider>,
    );

    const row = await screen.findByRole("row", { name: /SKU-001/ });
    await user.click(within(row).getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));
    await waitFor(() => expect(mutationRequests).toBe(1));
    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));

    await act(async () => {
      await router.navigate("/");
    });
    await screen.findByRole("heading", { level: 1, name: "Bienvenido a Inventory" });
    currentSessionId = "replacement-product-list-session";
    await user.click(screen.getByRole("button", { name: "Refresh test session" }));
    expect(
      await screen.findByText(currentSessionId, { selector: "p[role='status']" }),
    ).toBeVisible();

    resolveMutation(
      HttpResponse.json(
        { error: { code: "PRODUCT_NOT_FOUND", message: "private missing product" } },
        { status: 404 },
      ),
    );
    await waitFor(() =>
      expect(
        queryClient
          .getMutationCache()
          .getAll()
          .some((mutation) => mutation.state.status === "error"),
      ).toBe(true),
    );

    expect(screen.queryByText(/No se encontró el producto/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");

    currentSessionId = "product-list-session";
    await user.click(screen.getByRole("button", { name: "Refresh test session" }));
    expect(
      await screen.findByText(currentSessionId, { selector: "p[role='status']" }),
    ).toBeVisible();
  });

  it("opens and closes the status confirmation from the keyboard and restores focus", async () => {
    const user = userEvent.setup();
    let mutationRequests = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () =>
        HttpResponse.json({ data: [product(1)], pagination: { total: 1, page: 1, limit: 15 } }),
      ),
      http.delete(productStatusUrl, () => {
        mutationRequests += 1;
        return HttpResponse.json({ data: { uuid: product(1).uuid, isActive: false } });
      }),
    );

    const { router } = renderProductRoute();
    const row = await screen.findByRole("row", { name: /SKU-001/ });
    const action = within(row).getByRole("button", { name: "Desactivar" });
    action.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("dialog", { name: "Confirmar desactivación" })).toBeVisible();
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(action).toHaveFocus());
    expect(router.state.location.pathname).toBe("/products");
    expect(mutationRequests).toBe(0);
  });

  it("confirms a status change with keyboard activation and announces its result", async () => {
    const user = userEvent.setup();
    let mutationRequests = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () =>
        HttpResponse.json({ data: [product(1)], pagination: { total: 1, page: 1, limit: 15 } }),
      ),
      http.delete(productStatusUrl, () => {
        mutationRequests += 1;
        return HttpResponse.json({ data: { uuid: product(1).uuid, isActive: false } });
      }),
    );

    renderProductRoute();
    const row = await screen.findByRole("row", { name: /SKU-001/ });
    const action = within(row).getByRole("button", { name: "Desactivar" });
    action.focus();
    await user.keyboard("{Enter}");

    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    const cancelButton = within(dialog).getByRole("button", { name: "Cancelar" });
    const confirmButton = within(dialog).getByRole("button", { name: "Desactivar" });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    await user.tab();
    expect(cancelButton).toHaveFocus();
    await user.tab();
    expect(confirmButton).toHaveFocus();
    await user.keyboard("{Enter}");

    const announcement = await screen.findByText("Producto desactivado correctamente.");
    expect(announcement.closest('[role="status"]')).toBeInTheDocument();
    expect(mutationRequests).toBe(1);
  });

  it.each([
    {
      initialActive: true,
      action: "Desactivar",
      targetActive: false,
      method: "DELETE",
      successMessage: "Producto desactivado correctamente.",
    },
    {
      initialActive: false,
      action: "Activar",
      targetActive: true,
      method: "PATCH",
      successMessage: "Producto activado correctamente.",
    },
  ] as const)(
    "waits for the backend before $action, prevents duplicates and refreshes the active criteria",
    async ({ initialActive, action, targetActive, method, successMessage }) => {
      const user = userEvent.setup();
      const listRequests: URL[] = [];
      const mutationRequests: Array<{ method: string; body: string }> = [];
      let resolveMutation!: (response: Response) => void;
      const pendingMutation = new Promise<Response>((resolve) => {
        resolveMutation = resolve;
      });
      const listUrl = `/products?page=1&search=SKU-001&status=${
        initialActive ? "active" : "inactive"
      }&sort=sku&order=desc`;
      const mutationHandler =
        method === "PATCH"
          ? http.patch(productStatusUrl, async ({ request }) => {
              mutationRequests.push({ method: request.method, body: await request.text() });
              return pendingMutation;
            })
          : http.delete(productStatusUrl, async ({ request }) => {
              mutationRequests.push({ method: request.method, body: await request.text() });
              return pendingMutation;
            });

      server.use(
        http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
        http.get(productUrl, ({ request }) => {
          listRequests.push(new URL(request.url));
          return HttpResponse.json({
            data: listRequests.length === 1 ? [product(1, initialActive)] : [],
            pagination: {
              total: listRequests.length === 1 ? 1 : 0,
              page: 1,
              limit: 15,
            },
          });
        }),
        mutationHandler,
      );

      const { router } = renderProductRoute(listUrl);
      const productRow = await screen.findByRole("row", { name: /SKU-001/ });
      await user.click(within(productRow).getByRole("button", { name: action }));
      const dialog = await screen.findByRole("dialog");
      const confirmButton = within(dialog).getByRole("button", { name: action });

      await user.click(confirmButton);

      await waitFor(() => expect(mutationRequests).toHaveLength(1));
      expect(confirmButton).toBeDisabled();
      expect(confirmButton).toHaveAttribute("aria-busy", "true");
      expect(within(dialog).getByRole("status")).toHaveTextContent(
        initialActive ? "Desactivando producto SKU-001" : "Activando producto SKU-001",
      );
      expect(productRow).toHaveTextContent(initialActive ? "Activo" : "Inactivo");
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      const pendingProductRow = screen.getByRole("row", { name: /SKU-001/ });
      const pendingRowStatusButton = within(pendingProductRow).getByRole("button", {
        name: action,
      });
      expect(pendingRowStatusButton).toBeDisabled();
      expect(pendingRowStatusButton).toHaveAttribute("aria-busy", "true");
      expect(pendingProductRow).toHaveTextContent(initialActive ? "Activo" : "Inactivo");
      expect(listRequests).toHaveLength(1);
      await user.click(pendingRowStatusButton);
      expect(mutationRequests).toHaveLength(1);

      resolveMutation(
        HttpResponse.json({
          data: targetActive ? product(1, true) : { uuid: product(1).uuid, isActive: false },
        }),
      );

      const announcement = await screen.findByText(successMessage);
      expect(announcement.closest('[role="status"]')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await waitFor(() => expect(listRequests).toHaveLength(2));
      expect(router.state.location.pathname + router.state.location.search).toBe(listUrl);
      expect(Object.fromEntries(listRequests[1]!.searchParams)).toEqual({
        page: "1",
        limit: "15",
        search: "SKU-001",
        isActive: String(initialActive),
        sort: "sku",
        order: "desc",
      });
      expect(mutationRequests).toEqual([
        {
          method,
          body: method === "PATCH" ? JSON.stringify({ isActive: true }) : "",
        },
      ]);
      expect(
        await screen.findByText("No se encontraron productos con esta búsqueda."),
      ).toBeVisible();
    },
  );

  it.each([
    { isActive: true, action: "Desactivar", successMessage: "Producto desactivado correctamente." },
    { isActive: false, action: "Activar", successMessage: "Producto activado correctamente." },
  ])(
    "keeps the current route and focus when a pending $action response arrives after leaving the list",
    async ({ isActive, action, successMessage }) => {
      const user = userEvent.setup();
      let resolveMutation!: (response: Response) => void;
      const pendingMutation = new Promise<Response>((resolve) => {
        resolveMutation = resolve;
      });
      let mutationRequests = 0;

      server.use(
        http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
        http.get(productUrl, () =>
          HttpResponse.json({
            data: [product(1, isActive)],
            pagination: { total: 1, page: 1, limit: 15 },
          }),
        ),
        http.patch(productStatusUrl, () => {
          mutationRequests += 1;
          return pendingMutation;
        }),
        http.delete(productStatusUrl, () => {
          mutationRequests += 1;
          return pendingMutation;
        }),
      );

      const { router } = renderProductRoute();
      const row = await screen.findByRole("row", { name: /SKU-001/ });
      await user.click(within(row).getByRole("button", { name: action }));
      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: action }));
      await waitFor(() => expect(mutationRequests).toBe(1));

      await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await act(async () => {
        await router.navigate("/");
      });

      const homeHeading = await screen.findByRole("heading", {
        level: 1,
        name: "Bienvenido a Inventory",
      });
      homeHeading.focus();
      expect(homeHeading).toHaveFocus();
      expect(router.state.location.pathname).toBe("/");

      resolveMutation(
        isActive
          ? HttpResponse.json({ data: { uuid: product(1).uuid, isActive: false } })
          : HttpResponse.json({ data: product(1, true) }),
      );

      expect(await screen.findByText(successMessage)).toBeVisible();
      expect(router.state.location.pathname).toBe("/");
      expect(homeHeading).toHaveFocus();
    },
  );

  it("moves to the last available page after deactivation removes the current page", async () => {
    const user = userEvent.setup();
    const requestedPages: number[] = [];
    let pageTwoRequestCount = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        requestedPages.push(page);

        if (page === 2) {
          pageTwoRequestCount += 1;
          return pageTwoRequestCount === 1
            ? HttpResponse.json({
                data: [product(16)],
                pagination: { total: 16, page: 2, limit: 15 },
              })
            : HttpResponse.json({ data: [], pagination: { total: 15, page: 2, limit: 15 } });
        }

        return HttpResponse.json({
          data: Array.from({ length: 15 }, (_, index) => product(index + 1)),
          pagination: { total: 15, page: 1, limit: 15 },
        });
      }),
      http.delete(`${productUrl}/${product(16).uuid}`, () =>
        HttpResponse.json({ data: { uuid: product(16).uuid, isActive: false } }),
      ),
    );

    const listUrl = "/products?page=2&search=SKU&status=active&sort=sku&order=desc";
    const { router } = renderProductRoute(listUrl);
    const productRow = await screen.findByRole("row", { name: /SKU-016/ });

    await user.click(within(productRow).getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    expect(await screen.findByText("Producto desactivado correctamente.")).toBeVisible();
    await waitFor(() =>
      expect(router.state.location.search).toBe(
        "?page=1&search=SKU&status=active&sort=sku&order=desc",
      ),
    );
    expect(await screen.findByRole("row", { name: /SKU-001/ })).toBeVisible();
    expect(screen.getByText("Página 1 de 1")).toBeVisible();
    expect(requestedPages).toEqual([2, 2, 1]);
    expect(router.state.location.pathname + router.state.location.search).toBe(
      "/products?page=1&search=SKU&status=active&sort=sku&order=desc",
    );
  });

  it("shows a recoverable status error and retries only after an explicit request", async () => {
    const user = userEvent.setup();
    let mutationRequests = 0;
    let listRequests = 0;
    let deactivationConfirmed = false;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => {
        listRequests += 1;
        return HttpResponse.json({
          data: deactivationConfirmed ? [] : [product(1)],
          pagination: { total: deactivationConfirmed ? 0 : 1, page: 1, limit: 15 },
        });
      }),
      http.delete(productStatusUrl, () => {
        mutationRequests += 1;
        if (mutationRequests === 1) {
          return HttpResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Internal server details" } },
            { status: 500 },
          );
        }

        deactivationConfirmed = true;
        return HttpResponse.json({ data: { uuid: product(1).uuid, isActive: false } });
      }),
    );

    renderProductRoute();
    const productRow = await screen.findByRole("row", { name: /SKU-001/ });
    await user.click(within(productRow).getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "No se pudo confirmar el resultado del cambio de estado. Comprueba el estado del producto antes de volver a intentarlo.",
    );
    expect(within(dialog).getByRole("alert")).not.toHaveTextContent("Internal server details");
    expect(within(dialog).getByRole("button", { name: "Reintentar" })).toBeVisible();
    expect(mutationRequests).toBe(1);
    expect(listRequests).toBe(1);
    expect(productRow).toHaveTextContent("Activo");

    await user.click(within(dialog).getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Producto desactivado correctamente.")).toBeVisible();
    await waitFor(() => expect(mutationRequests).toBe(2));
    await waitFor(() => expect(listRequests).toBe(2));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rechecks the session after a 401 status response and lets SessionBoundary take priority", async () => {
    const user = userEvent.setup();
    let mutationRejected = false;
    let sessionRefreshRequests = 0;
    let mutationRequests = 0;
    let resolveSessionRefresh!: (response: Response) => void;
    const sessionRefresh = new Promise<Response>((resolve) => {
      resolveSessionRefresh = resolve;
    });

    server.use(
      http.get(/\/api\/auth\/get-session/, () => {
        if (mutationRejected) {
          sessionRefreshRequests += 1;
          return sessionRefresh;
        }
        return HttpResponse.json(publicAuthResponse());
      }),
      http.get(productUrl, () =>
        HttpResponse.json({ data: [product(1)], pagination: { total: 1, page: 1, limit: 15 } }),
      ),
      http.delete(productStatusUrl, () => {
        mutationRequests += 1;
        mutationRejected = true;
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "private authentication detail" } },
          { status: 401 },
        );
      }),
    );

    renderProductRoute();
    const row = await screen.findByRole("row", { name: /SKU-001/ });
    await user.click(within(row).getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    expect(await screen.findByRole("heading", { name: "Comprobando tu sesión" })).toBeVisible();
    await waitFor(() => expect(sessionRefreshRequests).toBe(1));
    expect(mutationRequests).toBe(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Producto desactivado correctamente.")).not.toBeInTheDocument();

    resolveSessionRefresh(HttpResponse.json(publicAuthResponse()));

    expect(await screen.findByRole("row", { name: /SKU-001/ })).toBeVisible();
    expect(
      await screen.findByText(
        "La sesión se verificó, pero no se confirmó el resultado del cambio de estado. Comprueba el estado del producto antes de volver a intentarlo.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("private authentication detail")).not.toBeInTheDocument();
    expect(mutationRequests).toBe(1);
  });

  it.each([true, false])(
    "reports a 403 as a forbidden status change for an %s product without showing success or retry",
    async (isActive) => {
      const user = userEvent.setup();
      const mutationRequests: string[] = [];
      const forbiddenResponse = () =>
        HttpResponse.json(
          { error: { code: "FORBIDDEN", message: "private permission detail" } },
          { status: 403 },
        );

      server.use(
        http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
        http.get(productUrl, () =>
          HttpResponse.json({
            data: [product(1, isActive)],
            pagination: { total: 1, page: 1, limit: 15 },
          }),
        ),
        http.delete(productStatusUrl, () => {
          mutationRequests.push("DELETE");
          return forbiddenResponse();
        }),
        http.patch(productStatusUrl, async ({ request }) => {
          mutationRequests.push(`PATCH ${JSON.stringify(await request.json())}`);
          return forbiddenResponse();
        }),
      );

      renderProductRoute(isActive ? "/products" : "/products?status=inactive");
      const row = await screen.findByRole("row", { name: /SKU-001/ });
      await user.click(
        within(row).getByRole("button", { name: isActive ? "Desactivar" : "Activar" }),
      );
      const dialog = await screen.findByRole("dialog", {
        name: isActive ? "Confirmar desactivación" : "Confirmar activación",
      });
      await user.click(
        within(dialog).getByRole("button", { name: isActive ? "Desactivar" : "Activar" }),
      );

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "No tienes permiso para cambiar el estado de este producto.",
      );
      expect(within(dialog).queryByText("private permission detail")).not.toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Cancelar" })).toBeEnabled();
      expect(row).toHaveTextContent(isActive ? "Activo" : "Inactivo");
      expect(screen.queryByText("Producto desactivado correctamente.")).not.toBeInTheDocument();
      expect(screen.queryByText("Producto activado correctamente.")).not.toBeInTheDocument();
      expect(mutationRequests).toEqual(isActive ? ["DELETE"] : ['PATCH {"isActive":true}']);
    },
  );

  it("distinguishes an invalid status response from a confirmed change", async () => {
    const user = userEvent.setup();
    let mutationRequests = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () =>
        HttpResponse.json({ data: [product(1)], pagination: { total: 1, page: 1, limit: 15 } }),
      ),
      http.delete(productStatusUrl, () => {
        mutationRequests += 1;
        return HttpResponse.json({ data: { uuid: product(1).uuid, isActive: true } });
      }),
    );

    renderProductRoute();
    const row = await screen.findByRole("row", { name: /SKU-001/ });
    await user.click(within(row).getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "La respuesta del cambio de estado no se pudo validar. Comprueba el estado del producto antes de volver a intentarlo.",
    );
    expect(within(dialog).getByRole("button", { name: "Reintentar" })).toBeVisible();
    expect(row).toHaveTextContent("Activo");
    expect(screen.queryByText("Producto desactivado correctamente.")).not.toBeInTheDocument();
    expect(mutationRequests).toBe(1);
  });

  it("removes the retry action when the failed product is no longer available", async () => {
    const user = userEvent.setup();
    let mutationRequests = 0;
    let listRequests = 0;
    let productAvailable = true;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => {
        listRequests += 1;
        return HttpResponse.json({
          data: productAvailable ? [product(1)] : [],
          pagination: { total: productAvailable ? 1 : 0, page: 1, limit: 15 },
        });
      }),
      http.delete(productStatusUrl, () => {
        mutationRequests += 1;
        return HttpResponse.json(
          { error: { code: "INTERNAL_ERROR", message: "Failure" } },
          {
            status: 500,
          },
        );
      }),
    );

    const { queryClient } = renderProductRoute();
    const productRow = await screen.findByRole("row", { name: /SKU-001/ });
    await user.click(within(productRow).getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));
    expect(await within(dialog).findByRole("alert")).toBeVisible();

    productAvailable = false;
    await queryClient.invalidateQueries({ queryKey: ["products", "list", "product-list-session"] });

    await waitFor(() => expect(listRequests).toBe(2));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "No se pudo confirmar el resultado del cambio de estado.",
    );
    expect(within(dialog).queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    expect(mutationRequests).toBe(1);
  });

  it("shows a not-found state without retrying and refreshes the list when returning", async () => {
    const user = userEvent.setup();
    let mutationRequests = 0;
    let listRequests = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => {
        listRequests += 1;
        return HttpResponse.json({
          data: listRequests === 1 ? [product(1)] : [],
          pagination: { total: listRequests === 1 ? 1 : 0, page: 1, limit: 15 },
        });
      }),
      http.delete(productStatusUrl, () => {
        mutationRequests += 1;
        return HttpResponse.json(
          { error: { code: "PRODUCT_NOT_FOUND", message: "Not found" } },
          { status: 404 },
        );
      }),
    );

    renderProductRoute();
    const productRow = await screen.findByRole("row", { name: /SKU-001/ });
    await user.click(within(productRow).getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    const notFoundDialog = await screen.findByRole("dialog", { name: "Producto no encontrado" });
    expect(await within(notFoundDialog).findByRole("alert")).toHaveTextContent(
      "No se encontró el producto.",
    );
    expect(within(notFoundDialog).getByRole("button", { name: "Volver al listado" })).toBeVisible();
    expect(
      within(notFoundDialog).queryByRole("button", { name: "Reintentar" }),
    ).not.toBeInTheDocument();
    expect(mutationRequests).toBe(1);

    await user.click(within(notFoundDialog).getByRole("button", { name: "Volver al listado" }));

    await waitFor(() => expect(listRequests).toBe(2));
    expect(await screen.findByText("No hay productos activos para mostrar.")).toBeVisible();
    expect(mutationRequests).toBe(1);
  });

  it.each(["ADMIN", "MANAGER", "OPERATOR", "VIEWER"] as const)(
    "keeps the edit action available to %s and carries the current list criteria",
    async (role) => {
      const user = userEvent.setup();
      const listRequests: URL[] = [];
      const initialListUrl = "/products?page=2&search=monitor&status=inactive&sort=sku&order=desc";

      server.use(
        http.get(/\/api\/auth\/get-session/, () =>
          HttpResponse.json(publicAuthResponseForRole(role)),
        ),
        http.get(productUrl, ({ request }) => {
          listRequests.push(new URL(request.url));
          return HttpResponse.json({
            data: [product(1, false)],
            pagination: { total: 16, page: 2, limit: 15 },
          });
        }),
        http.get(`${productUrl}/${product(1, false).uuid}`, () =>
          HttpResponse.json({ data: product(1, false) }),
        ),
        http.get(categoriesUrl, () =>
          HttpResponse.json({
            data: [
              {
                uuid: categoryUuid,
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

      const { router } = renderProductRoute(initialListUrl);

      const editButton = await screen.findByRole("button", { name: "Editar" });
      expect(editButton).toBeVisible();
      await user.click(editButton);

      await waitFor(() =>
        expect(router.state.location.pathname).toBe(`/products/${product(1, false).uuid}/edit`),
      );
      expect(new URLSearchParams(router.state.location.search).get("returnTo")).toBe(
        "/products?page=2&search=monitor&status=inactive&sort=sku&order=desc",
      );
      expect(listRequests).toHaveLength(1);
    },
  );

  it("loads the default active page and requests the next page from the backend", async () => {
    const user = userEvent.setup();
    const productRequests: URL[] = [];

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, ({ request }) => {
        const url = new URL(request.url);
        productRequests.push(url);
        const page = Number(url.searchParams.get("page"));
        const products =
          page === 1 ? Array.from({ length: 15 }, (_, index) => product(index + 1)) : [product(16)];

        return HttpResponse.json({
          data: products,
          pagination: { total: 16, page, limit: 15 },
        });
      }),
    );

    renderProductRoute();

    expect(await screen.findByRole("heading", { level: 1, name: "Productos" })).toBeVisible();
    await waitFor(() => expect(productRequests).toHaveLength(1));

    expect(Object.fromEntries(productRequests[0]!.searchParams)).toEqual({
      page: "1",
      limit: "15",
      isActive: "true",
      sort: "name",
      order: "asc",
    });
    expect(await screen.findByRole("table")).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "SKU" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Nombre" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Precio de compra" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Precio de venta" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Estado" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "SKU-001" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "Producto 001" })).toBeVisible();
    expect(screen.getAllByRole("cell", { name: "25,50" })[0]).toBeVisible();
    expect(screen.getAllByRole("cell", { name: "31,25" })[0]).toBeVisible();
    expect(screen.getAllByText("Activo")[0]).toBeVisible();
    expect(screen.getByText("16 productos")).toBeVisible();
    expect(screen.getByText("Página 1 de 2")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Página siguiente" }));

    await waitFor(() => expect(productRequests).toHaveLength(2));
    expect(Object.fromEntries(productRequests[1]!.searchParams)).toEqual({
      page: "2",
      limit: "15",
      isActive: "true",
      sort: "name",
      order: "asc",
    });
    expect(await screen.findByRole("cell", { name: "SKU-016" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "Producto 016" })).toBeVisible();
    expect(screen.getByText("Página 2 de 2")).toBeVisible();
    expect(productRequests).toHaveLength(2);
  });

  it("filters, sorts and paginates with keyboard controls", async () => {
    const user = userEvent.setup();
    const productRequests: URL[] = [];

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, ({ request }) => {
        const url = new URL(request.url);
        productRequests.push(url);
        const page = Number(url.searchParams.get("page"));

        return HttpResponse.json({
          data:
            page === 1
              ? Array.from({ length: 15 }, (_, index) => product(index + 1))
              : [product(16)],
          pagination: { total: 16, page, limit: 15 },
        });
      }),
    );

    renderProductRoute();

    const search = await screen.findByRole("searchbox", { name: "Buscar productos" });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("16 productos"));
    search.focus();
    await user.type(search, "monitor");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(productRequests).toHaveLength(2));
    expect(productRequests[1]!.searchParams.get("search")).toBe("monitor");
    expect(search).toHaveFocus();

    const skuHeader = screen.getByRole("columnheader", { name: "SKU" });
    skuHeader.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(productRequests).toHaveLength(3));
    expect(productRequests[2]!.searchParams.get("sort")).toBe("sku");
    expect(productRequests[2]!.searchParams.get("order")).toBe("asc");

    const nextPage = screen.getByRole("button", { name: "Página siguiente" });
    nextPage.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(productRequests).toHaveLength(4));
    expect(productRequests[3]!.searchParams.get("page")).toBe("2");
    expect(productRequests[3]!.searchParams.get("search")).toBe("monitor");
    expect(productRequests[3]!.searchParams.get("sort")).toBe("sku");
    expect(await screen.findByRole("cell", { name: "SKU-016" })).toBeVisible();
  });

  it("applies case-insensitive partial search after trimming and omits an empty search", async () => {
    const user = userEvent.setup();
    const productRequests: URL[] = [];
    const queryClient = createQueryClient();
    queryClient.setDefaultOptions({
      ...queryClient.getDefaultOptions(),
      queries: { ...queryClient.getDefaultOptions().queries, staleTime: 0 },
    });

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, ({ request }) => {
        const url = new URL(request.url);
        productRequests.push(url);
        const search = url.searchParams.get("search")?.toLocaleLowerCase();
        const results = search
          ? [product(1)].filter(
              (item) =>
                item.sku.toLocaleLowerCase().includes(search) ||
                item.name.toLocaleLowerCase().includes(search),
            )
          : Array.from({ length: 15 }, (_, index) => product(index + 1));

        return HttpResponse.json({
          data: results,
          pagination: { total: search ? results.length : 16, page: 1, limit: 15 },
        });
      }),
    );

    renderProductRoute("/products", queryClient);

    await screen.findByRole("cell", { name: "SKU-001" });
    const searchInput = screen.getByRole("searchbox", { name: "Buscar productos" });
    await user.type(searchInput, "  sKu-00  ");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByRole("cell", { name: "SKU-001" })).toBeVisible();
    await waitFor(() => expect(productRequests).toHaveLength(2));
    expect(productRequests[1]!.searchParams.get("search")).toBe("sKu-00");

    await user.clear(searchInput);
    await user.type(searchInput, "   ");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => expect(productRequests).toHaveLength(3));
    expect(productRequests[2]!.searchParams.has("search")).toBe(false);
  });

  it("restores a shared list URL on a fresh route and applies its full criteria remotely", async () => {
    const requests: URL[] = [];
    const sharedUrl = "/products?page=2&search=keyboard&status=inactive&sort=sku&order=desc";

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);

        return HttpResponse.json({
          data: [product(16, false)],
          pagination: { total: 16, page: 2, limit: 15 },
        });
      }),
    );

    const { router } = renderProductRoute(sharedUrl);

    expect(await screen.findByRole("cell", { name: "SKU-016" })).toBeVisible();
    expect(Object.fromEntries(requests[0]!.searchParams)).toEqual({
      page: "2",
      limit: "15",
      search: "keyboard",
      isActive: "false",
      sort: "sku",
      order: "desc",
    });
    expect(screen.getByRole("searchbox", { name: "Buscar productos" })).toHaveValue("keyboard");
    expect(screen.getByRole("textbox", { name: "Estado del producto" })).toHaveValue("Inactivos");
    expect(screen.getByRole("textbox", { name: "Ordenar por" })).toHaveValue("SKU");
    expect(screen.getByRole("textbox", { name: "Dirección del orden" })).toHaveValue("Descendente");
    expect(screen.getByText("Página 2 de 2")).toBeVisible();
    expect(router.state.location.pathname + router.state.location.search).toBe(sharedUrl);
  });

  it("restores previous and next list criteria through router history", async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    queryClient.setDefaultOptions({
      ...queryClient.getDefaultOptions(),
      queries: { ...queryClient.getDefaultOptions().queries, staleTime: 0 },
    });
    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get("page"));
        const search = url.searchParams.get("search");
        const isInactive = url.searchParams.get("isActive") === "false";

        return HttpResponse.json({
          data: [product(page === 2 ? 16 : search ? 7 : 1, isInactive)],
          pagination: { total: page === 2 ? 16 : 1, page, limit: 15 },
        });
      }),
    );

    const { router } = renderProductRoute("/products", queryClient);
    expect(await screen.findByRole("cell", { name: "SKU-001" })).toBeVisible();

    await user.type(screen.getByRole("searchbox", { name: "Buscar productos" }), "keyboard");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByRole("cell", { name: "SKU-007" })).toBeVisible();
    expect(router.state.location.search).toBe(
      "?page=1&search=keyboard&status=active&sort=name&order=asc",
    );

    await router.navigate(-1);
    expect(await screen.findByRole("cell", { name: "SKU-001" })).toBeVisible();
    expect(router.state.location.pathname + router.state.location.search).toBe("/products");
    await waitFor(() =>
      expect(screen.getByRole("searchbox", { name: "Buscar productos" })).toHaveValue(""),
    );

    await router.navigate(1);
    expect(await screen.findByRole("cell", { name: "SKU-007" })).toBeVisible();
    expect(router.state.location.search).toBe(
      "?page=1&search=keyboard&status=active&sort=name&order=asc",
    );
    await waitFor(() =>
      expect(screen.getByRole("searchbox", { name: "Buscar productos" })).toHaveValue("keyboard"),
    );
  });

  it("replaces invalid URL criteria without adding a history entry", async () => {
    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () =>
        HttpResponse.json({
          data: [product(1)],
          pagination: { total: 1, page: 1, limit: 15 },
        }),
      ),
    );

    const invalidUrl = "/products?page=0&search=%20%20&status=archived&sort=uuid&order=sideways";
    const { router } = renderProductRoute(["/", invalidUrl]);

    expect(await screen.findByRole("cell", { name: "SKU-001" })).toBeVisible();
    await waitFor(() =>
      expect(router.state.location.search).toBe("?page=1&status=active&sort=name&order=asc"),
    );
    expect(screen.getByRole("searchbox", { name: "Buscar productos" })).toHaveValue("");

    await router.navigate(-1);
    expect(router.state.location.pathname + router.state.location.search).toBe("/");
  });

  it("replaces an out-of-range page after the backend returns its last valid page", async () => {
    const requestedPages: number[] = [];
    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get("page"));
        requestedPages.push(page);

        return HttpResponse.json({
          data: [product(16)],
          pagination: { total: 16, page, limit: 15 },
        });
      }),
    );

    const { router } = renderProductRoute(["/", "/products?page=3"]);
    expect(await screen.findByRole("cell", { name: "SKU-016" })).toBeVisible();
    await waitFor(() =>
      expect(router.state.location.search).toBe("?page=2&status=active&sort=name&order=asc"),
    );
    expect(requestedPages).toEqual([3, 2]);

    await router.navigate(-1);
    expect(router.state.location.pathname + router.state.location.search).toBe("/");
  });

  it("combines search and status, sorts by every supported field and resets to page one", async () => {
    const user = userEvent.setup();
    const productRequests: URL[] = [];
    const queryClient = createQueryClient();
    queryClient.setDefaultOptions({
      ...queryClient.getDefaultOptions(),
      queries: { ...queryClient.getDefaultOptions().queries, staleTime: 0 },
    });
    const selectOptionByIndex = async (label: string, optionIndex: number) => {
      const control = screen.getByRole("textbox", { name: label });
      control.focus();
      await user.keyboard("{ArrowDown}{Home}" + "{ArrowDown}".repeat(optionIndex + 1) + "{Enter}");
    };

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, ({ request }) => {
        const url = new URL(request.url);
        productRequests.push(url);
        const page = Number(url.searchParams.get("page"));

        return HttpResponse.json({
          data:
            page === 1
              ? Array.from({ length: 15 }, (_, index) => product(index + 1))
              : [product(16)],
          pagination: { total: 16, page, limit: 15 },
        });
      }),
    );

    renderProductRoute("/products", queryClient);

    await screen.findByRole("cell", { name: "SKU-001" });
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    await screen.findByRole("cell", { name: "SKU-016" });

    await user.type(screen.getByRole("searchbox", { name: "Buscar productos" }), " partial ");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await screen.findByRole("cell", { name: "SKU-001" });
    await waitFor(() => expect(productRequests).toHaveLength(3));
    expect(Object.fromEntries(productRequests[2]!.searchParams)).toMatchObject({
      page: "1",
      search: "partial",
      isActive: "true",
    });

    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    await screen.findByRole("cell", { name: "SKU-016" });
    await selectOptionByIndex("Estado del producto", 1);

    await waitFor(() => expect(productRequests).toHaveLength(5));
    expect(Object.fromEntries(productRequests[4]!.searchParams)).toMatchObject({
      page: "1",
      search: "partial",
      isActive: "false",
    });

    const sortOptions = [
      ["SKU", "sku", 1],
      ["Nombre", "name", 0],
      ["Precio de compra", "purchasePrice", 2],
      ["Precio de venta", "salePrice", 3],
      ["Fecha de creación", "createdAt", 4],
      ["Fecha de actualización", "updatedAt", 5],
    ] as const;

    for (const [label, sort, optionIndex] of sortOptions) {
      await user.click(screen.getByRole("button", { name: "Página siguiente" }));
      await screen.findByRole("cell", { name: "SKU-016" });
      const previousRequestCount = productRequests.length;
      await selectOptionByIndex("Ordenar por", optionIndex);
      expect(screen.getByRole("textbox", { name: "Ordenar por" })).toHaveValue(label);

      await waitFor(() => expect(productRequests).toHaveLength(previousRequestCount + 1));
      expect(productRequests.at(-1)!.searchParams.get("page")).toBe("1");
      expect(productRequests.at(-1)!.searchParams.get("sort")).toBe(sort);
      expect(productRequests.at(-1)!.searchParams.get("search")).toBe("partial");
      expect(productRequests.at(-1)!.searchParams.get("isActive")).toBe("false");
    }

    for (const [order, optionIndex] of [
      ["desc", 1],
      ["asc", 0],
    ] as const) {
      await user.click(screen.getByRole("button", { name: "Página siguiente" }));
      await screen.findByRole("cell", { name: "SKU-016" });
      const previousRequestCount = productRequests.length;
      await selectOptionByIndex("Dirección del orden", optionIndex);

      await waitFor(() => expect(productRequests).toHaveLength(previousRequestCount + 1));
      expect(productRequests.at(-1)!.searchParams.get("page")).toBe("1");
      expect(productRequests.at(-1)!.searchParams.get("sort")).toBe("updatedAt");
      expect(productRequests.at(-1)!.searchParams.get("order")).toBe(order);
    }
  }, 20_000);

  it("identifies the pending product query until its response arrives", async () => {
    let resolveProducts!: (response: Response) => void;
    const pendingProducts = new Promise<Response>((resolve) => {
      resolveProducts = resolve;
    });

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => pendingProducts),
    );

    renderProductRoute();

    expect(await screen.findByText("Cargando datos...")).toBeVisible();
    resolveProducts(
      HttpResponse.json({ data: [product(1)], pagination: { total: 1, page: 1, limit: 15 } }),
    );
    expect(await screen.findByRole("cell", { name: "SKU-001" })).toBeVisible();
    expect(screen.queryByText("Cargando datos...")).not.toBeInTheDocument();
  });

  it("keeps the newest search visible when an older deferred response resolves later", async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    const requestedSearches: string[] = [];
    const mockedResponseSearches: string[] = [];
    let resolveOlderResponse!: (response: Response) => void;
    let resolveNewerResponse!: (response: Response) => void;
    const onMockedResponse = ({ request }: { request: Request }) => {
      const url = new URL(request.url);
      if (url.pathname.endsWith("/products")) {
        mockedResponseSearches.push(url.searchParams.get("search") ?? "");
      }
    };

    server.events.on("response:mocked", onMockedResponse);
    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, ({ request }) => {
        const search = new URL(request.url).searchParams.get("search") ?? "";
        requestedSearches.push(search);

        return new Promise<Response>((resolve) => {
          if (search === "older") {
            resolveOlderResponse = resolve;
          } else if (search === "newer") {
            resolveNewerResponse = resolve;
          }
        });
      }),
    );

    try {
      renderProductRoute("/products?search=older", queryClient);
      await waitFor(() => expect(requestedSearches).toEqual(["older"]));

      const searchInput = screen.getByRole("searchbox", { name: "Buscar productos" });
      await user.clear(searchInput);
      await user.type(searchInput, "newer");
      await user.click(screen.getByRole("button", { name: "Buscar" }));
      await waitFor(() => expect(requestedSearches).toEqual(["older", "newer"]));

      resolveNewerResponse(
        HttpResponse.json({
          data: [product(2)],
          pagination: { total: 1, page: 1, limit: 15 },
        }),
      );
      expect(await screen.findByRole("cell", { name: "SKU-002" })).toBeVisible();
      await waitFor(() => expect(mockedResponseSearches).toContain("newer"));

      resolveOlderResponse(
        HttpResponse.json({
          data: [product(1)],
          pagination: { total: 1, page: 1, limit: 15 },
        }),
      );
      await waitFor(() => expect(mockedResponseSearches).toContain("older"));
      expect(mockedResponseSearches).toEqual(["newer", "older"]);
      expect(screen.getByRole("cell", { name: "SKU-002" })).toBeVisible();
      expect(screen.queryByRole("cell", { name: "SKU-001" })).not.toBeInTheDocument();
      expect(screen.getByRole("searchbox", { name: "Buscar productos" })).toHaveValue("newer");
    } finally {
      server.events.removeListener("response:mocked", onMockedResponse);
    }
  });

  it("shows a recoverable error and retries the list query on request", async () => {
    const user = userEvent.setup();
    let requestCount = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => {
        requestCount += 1;

        if (requestCount === 1) {
          return HttpResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
        }

        return HttpResponse.json({
          data: [product(1)],
          pagination: { total: 1, page: 1, limit: 15 },
        });
      }),
    );

    renderProductRoute();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar los productos.",
    );
    expect(requestCount).toBe(1);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("cell", { name: "SKU-001" })).toBeVisible();
    expect(requestCount).toBe(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("presents an empty catalogue with pagination anchored to page one", async () => {
    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () =>
        HttpResponse.json({ data: [], pagination: { total: 0, page: 1, limit: 15 } }),
      ),
    );

    renderProductRoute();

    expect(await screen.findByText("No hay productos activos para mostrar.")).toBeVisible();
    expect(screen.getByText("Página 1 de 1")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Página siguiente" })).toBeDisabled();
  });

  it("offers to clear an applied search when the successful result is empty", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () =>
        HttpResponse.json({ data: [], pagination: { total: 0, page: 1, limit: 15 } }),
      ),
    );

    const { router } = renderProductRoute("/products?search=missing");

    expect(await screen.findByText("No se encontraron productos con esta búsqueda.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));

    expect(router.state.location.search).toBe("?page=1&status=active&sort=name&order=asc");
    expect(screen.queryByRole("button", { name: "Limpiar búsqueda" })).not.toBeInTheDocument();
    expect(
      screen.getByText("No hay productos activos para mostrar.").closest('[role="status"]'),
    ).toBeInTheDocument();
  });

  it("corrects a page made invalid by a smaller result set to the last valid page", async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    queryClient.setDefaultOptions({
      ...queryClient.getDefaultOptions(),
      queries: { ...queryClient.getDefaultOptions().queries, staleTime: 0 },
    });
    const requestedPages: number[] = [];
    let pageTwoRequestCount = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        requestedPages.push(page);

        if (page === 1) {
          return HttpResponse.json({
            data: Array.from({ length: 15 }, (_, index) => product(index + 1)),
            pagination: { total: 45, page, limit: 15 },
          });
        }

        if (page === 2) {
          pageTwoRequestCount += 1;
          return pageTwoRequestCount === 1
            ? HttpResponse.json({
                data: Array.from({ length: 15 }, (_, index) => product(index + 16)),
                pagination: { total: 45, page, limit: 15 },
              })
            : HttpResponse.json({
                data: [product(16)],
                pagination: { total: 16, page, limit: 15 },
              });
        }

        if (page === 3) {
          return HttpResponse.json({ data: [], pagination: { total: 16, page, limit: 15 } });
        }

        return HttpResponse.json({ data: [], pagination: { total: 0, page, limit: 15 } });
      }),
    );

    renderProductRoute("/products", queryClient);

    await screen.findByRole("cell", { name: "SKU-001" });
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    await screen.findByRole("cell", { name: "SKU-016" });
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));

    expect(await screen.findByRole("cell", { name: "SKU-016" })).toBeVisible();
    expect(await screen.findByText("Página 2 de 2")).toBeVisible();
    expect(requestedPages).toEqual([1, 2, 3, 2]);
    expect(screen.queryByText("No hay productos activos para mostrar.")).not.toBeInTheDocument();
  });

  it("returns an empty result received on a later page to the first-page representation", async () => {
    const user = userEvent.setup();
    const requestedPages: number[] = [];

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        requestedPages.push(page);

        if (page === 1 && requestedPages.length === 1) {
          return HttpResponse.json({
            data: Array.from({ length: 15 }, (_, index) => product(index + 1)),
            pagination: { total: 16, page, limit: 15 },
          });
        }

        return HttpResponse.json({ data: [], pagination: { total: 0, page, limit: 15 } });
      }),
    );

    renderProductRoute();

    await screen.findByRole("cell", { name: "SKU-001" });
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));

    expect(await screen.findByText("No hay productos activos para mostrar.")).toBeVisible();
    expect(screen.getByText("Página 1 de 1")).toBeVisible();
    expect(requestedPages).toEqual([1, 2, 1]);
    expect(screen.queryByRole("cell", { name: "SKU-001" })).not.toBeInTheDocument();
  });
});
