import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { components } from "@/shared/api/generated/auth-contracts";
import { afterEach, describe, expect, it } from "vitest";

import { appRoutes } from "@/app/router/router";
import { UiProvider } from "@/app/providers/ui.provider";
import { useSession } from "@/features/auth";
import type { UseSessionResult } from "@/features/auth";
import { createQueryClient } from "@/shared/api/query-client";
import { server } from "../mocks/server";

const categoriesUrl = "https://inventory.test/api/categories";
const productsUrl = "https://inventory.test/api/products";

const publicAuthResponse = (
  role: components["schemas"]["PublicAuthResponse"]["data"]["user"]["role"] = "OPERATOR",
): components["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: {
      id: "product-create-user",
      email: "operator@example.com",
      role,
    },
    session: {
      id: "product-create-session",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
});

const category = (index: number, name: string) => ({
  uuid: `550e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}`,
  name,
  description: null,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const createdProduct = {
  uuid: "650e8400-e29b-41d4-a716-446655440000",
  sku: "SKU-NEW",
  name: "Monitor",
  description: null,
  purchasePrice: 10.25,
  salePrice: 8.5,
  categoryUuid: category(1, "Oficina").uuid,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const activeCategoryResponse = () =>
  HttpResponse.json({
    data: [category(1, "Oficina")],
    pagination: { total: 1, page: 1, limit: 15 },
  });

const fillValidProductForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByRole("textbox", { name: "SKU (obligatorio)" }), "SKU-NEW");
  await user.type(screen.getByRole("textbox", { name: "Nombre (obligatorio)" }), "Monitor");
  await user.type(screen.getByRole("textbox", { name: "Precio de compra (obligatorio)" }), "10,25");
  await user.type(screen.getByRole("textbox", { name: "Precio de venta (obligatorio)" }), "8.50");

  const categorySelect = screen.getByRole("textbox", { name: "Categoría (obligatorio)" });
  await waitFor(() => expect(categorySelect).toBeEnabled());
  categorySelect.focus();
  await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
};

const routeResources: Array<{
  queryClient: ReturnType<typeof createQueryClient>;
  router: ReturnType<typeof createMemoryRouter>;
}> = [];

const renderProductCreateRoute = (
  onSessionRefetch?: (refetch: UseSessionResult["refetch"]) => void,
) => {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(appRoutes, { initialEntries: ["/products/new"] });
  routeResources.push({ queryClient, router });
  const SessionRefreshDriver = () => {
    const session = useSession();
    onSessionRefetch?.(session.refetch);
    return null;
  };

  render(
    <QueryClientProvider client={queryClient}>
      <UiProvider>
        <>
          <RouterProvider router={router} />
          {onSessionRefetch ? <SessionRefreshDriver /> : null}
        </>
      </UiProvider>
    </QueryClientProvider>,
  );

  return { queryClient, router };
};

afterEach(() => {
  for (const { queryClient, router } of routeResources.splice(0)) {
    router.dispose();
    queryClient.clear();
  }
});

describe("product creation form", () => {
  it("lets the session boundary replace a dirty form while its discard prompt is open", async () => {
    const user = userEvent.setup();
    let refetchSession: UseSessionResult["refetch"] | undefined;
    let sessionRefreshStarted!: () => void;
    let resolveSessionRefresh!: (response: Response) => void;
    const sessionRefreshRequested = new Promise<void>((resolve) => {
      sessionRefreshStarted = resolve;
    });
    const sessionRefresh = new Promise<Response>((resolve) => {
      resolveSessionRefresh = resolve;
    });
    let shouldHoldSessionRefresh = false;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => {
        if (shouldHoldSessionRefresh) {
          sessionRefreshStarted();
          return sessionRefresh;
        }

        return HttpResponse.json(publicAuthResponse());
      }),
      http.get(categoriesUrl, () => activeCategoryResponse()),
    );

    renderProductCreateRoute((refetch) => {
      refetchSession = refetch;
    });
    const sku = await screen.findByRole("textbox", { name: "SKU (obligatorio)" });
    await user.type(sku, "SKU-DRAFT");
    await user.click(
      within(screen.getByRole("navigation", { name: "Navegación principal" })).getByRole("link", {
        name: "Inicio",
      }),
    );
    expect(await screen.findByRole("dialog", { name: "¿Descartar los cambios?" })).toBeVisible();

    shouldHoldSessionRefresh = true;
    if (!refetchSession) {
      throw new Error("The session refresh driver did not expose refetch.");
    }
    let refreshResult!: ReturnType<UseSessionResult["refetch"]>;
    act(() => {
      refreshResult = refetchSession!();
    });
    await sessionRefreshRequested;

    expect(await screen.findByRole("heading", { name: "Comprobando tu sesión" })).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Datos del producto" })).not.toBeInTheDocument();

    resolveSessionRefresh(HttpResponse.json(publicAuthResponse()));
    await act(async () => refreshResult);

    expect(await screen.findByRole("heading", { level: 1, name: "Crear producto" })).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("confirms internal navigation for a dirty form and keeps browser warnings until discard", async () => {
    const user = userEvent.setup();

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(categoriesUrl, () => activeCategoryResponse()),
    );

    const { router } = renderProductCreateRoute();
    const sku = await screen.findByRole("textbox", { name: "SKU (obligatorio)" });
    await user.type(sku, "SKU-DRAFT");

    const dirtyUnloadEvent = new Event("beforeunload", { cancelable: true });
    fireEvent(window, dirtyUnloadEvent);
    expect(dirtyUnloadEvent.defaultPrevented).toBe(true);

    const navigation = within(screen.getByRole("navigation", { name: "Navegación principal" }));
    const homeLink = navigation.getByRole("link", { name: "Inicio" });
    await user.click(homeLink);

    const firstPrompt = await screen.findByRole("dialog");
    expect(firstPrompt).toHaveTextContent("Hay cambios sin guardar");
    await user.click(within(firstPrompt).getByRole("button", { name: "Continuar editando" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe("/products/new");
    expect(sku).toHaveValue("SKU-DRAFT");

    const stillDirtyUnloadEvent = new Event("beforeunload", { cancelable: true });
    fireEvent(window, stillDirtyUnloadEvent);
    expect(stillDirtyUnloadEvent.defaultPrevented).toBe(true);

    await user.click(homeLink);
    const discardPrompt = await screen.findByRole("dialog");
    await user.click(within(discardPrompt).getByRole("button", { name: "Descartar cambios" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
    ).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));

    const afterDiscardUnloadEvent = new Event("beforeunload", { cancelable: true });
    fireEvent(window, afterDiscardUnloadEvent);
    expect(afterDiscardUnloadEvent.defaultPrevented).toBe(false);
  });

  it("shows the required product fields, optional description, and active category selector", async () => {
    const user = userEvent.setup();
    const categoryRequests: URL[] = [];

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(categoriesUrl, ({ request }) => {
        const url = new URL(request.url);
        categoryRequests.push(url);
        const page = Number(url.searchParams.get("page"));
        const search = url.searchParams.get("search") ?? "";

        return HttpResponse.json({
          data: [category(page, search ? `Resultado ${search}` : `Categoría ${page}`)],
          pagination: { total: search ? 1 : 31, page, limit: 15 },
        });
      }),
    );

    renderProductCreateRoute();

    expect(await screen.findByRole("heading", { level: 1, name: "Crear producto" })).toBeVisible();

    const sku = screen.getByRole("textbox", { name: "SKU (obligatorio)" });
    const name = screen.getByRole("textbox", { name: "Nombre (obligatorio)" });
    const purchasePrice = screen.getByRole("textbox", { name: "Precio de compra (obligatorio)" });
    const salePrice = screen.getByRole("textbox", { name: "Precio de venta (obligatorio)" });
    const description = screen.getByRole("textbox", { name: "Descripción (opcional)" });
    const categorySelect = screen.getByRole("textbox", { name: "Categoría (obligatorio)" });

    expect(sku).toBeRequired();
    expect(name).toBeRequired();
    expect(purchasePrice).toBeRequired();
    expect(salePrice).toBeRequired();
    expect(description).not.toBeRequired();
    expect(purchasePrice).toHaveAttribute("inputmode", "decimal");
    expect(salePrice).toHaveAttribute("inputmode", "decimal");
    expect(screen.getAllByText("Usa coma o punto decimal; máximo dos decimales.")).toHaveLength(2);
    expect(categorySelect).toHaveAttribute("aria-required", "true");
    expect(screen.getByRole("searchbox", { name: "Buscar categorías activas" })).toBeVisible();

    await waitFor(() => expect(categorySelect).toBeEnabled());
    expect(categoryRequests).toHaveLength(1);
    expect(categoryRequests[0]!.searchParams.get("isActive")).toBe("true");

    categorySelect.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(categorySelect).toHaveValue("Categoría 1");

    await user.click(screen.getByRole("button", { name: "Página siguiente de categorías" }));
    await waitFor(() => expect(categoryRequests).toHaveLength(2));
    expect(categoryRequests[1]!.searchParams.get("page")).toBe("2");
    expect(categorySelect).toHaveValue("Categoría 1");

    const categorySearch = screen.getByRole("searchbox", { name: "Buscar categorías activas" });
    await user.type(categorySearch, "oficina");
    await user.click(screen.getByRole("button", { name: "Buscar categorías" }));
    await waitFor(() => expect(categoryRequests).toHaveLength(3));
    expect(categoryRequests[2]!.searchParams.get("search")).toBe("oficina");
    expect(categoryRequests[2]!.searchParams.get("page")).toBe("1");
  });

  it("shows accessible errors when SKU and name contain only outer whitespace", async () => {
    const user = userEvent.setup();

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(categoriesUrl, () =>
        HttpResponse.json({
          data: [category(1, "Oficina")],
          pagination: { total: 1, page: 1, limit: 15 },
        }),
      ),
    );

    renderProductCreateRoute();

    const sku = screen.getByRole("textbox", { name: "SKU (obligatorio)" });
    await user.type(sku, "   ");
    await user.tab();

    const skuError = await screen.findByText("El SKU es obligatorio.");
    expect(sku).toHaveAttribute("aria-invalid", "true");
    expect(sku).toHaveAttribute("aria-describedby", skuError.id);
    expect(sku).toHaveAccessibleDescription("El SKU es obligatorio.");

    const name = screen.getByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.type(name, "   ");
    await user.tab();

    const nameError = await screen.findByText("El nombre es obligatorio.");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAttribute("aria-describedby", nameError.id);
    expect(name).toHaveAccessibleDescription("El nombre es obligatorio.");
  });

  it("blocks an invalid form submit and identifies invalid required fields", async () => {
    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(categoriesUrl, () =>
        HttpResponse.json({
          data: [category(1, "Oficina")],
          pagination: { total: 1, page: 1, limit: 15 },
        }),
      ),
    );

    renderProductCreateRoute();

    const form = screen.getByRole("form", { name: "Datos del producto" });
    fireEvent.submit(form);

    const sku = screen.getByRole("textbox", { name: "SKU (obligatorio)" });
    const name = screen.getByRole("textbox", { name: "Nombre (obligatorio)" });
    expect(await screen.findByText("El SKU es obligatorio.")).toBeVisible();
    expect(screen.getByText("El nombre es obligatorio.")).toBeVisible();
    expect(sku).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("El precio de compra es obligatorio.")).toBeVisible();
    expect(screen.getByText("El precio de venta es obligatorio.")).toBeVisible();
    expect(screen.getByText("Selecciona una categoría activa.")).toBeVisible();
  });

  it("keeps the typed decimal text and associates invalid price errors with their fields", async () => {
    const user = userEvent.setup();

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(categoriesUrl, () =>
        HttpResponse.json({
          data: [category(1, "Oficina")],
          pagination: { total: 1, page: 1, limit: 15 },
        }),
      ),
    );

    renderProductCreateRoute();

    const purchasePrice = screen.getByRole("textbox", { name: "Precio de compra (obligatorio)" });
    await user.type(purchasePrice, "1,234");
    await user.tab();

    const purchasePriceError = await screen.findByText(
      "El precio de compra admite como máximo dos decimales.",
    );
    expect(purchasePrice).toHaveValue("1,234");
    expect(purchasePrice).toHaveAttribute("aria-invalid", "true");
    expect(purchasePrice).toHaveAccessibleDescription(
      "Usa coma o punto decimal; máximo dos decimales. El precio de compra admite como máximo dos decimales.",
    );
    expect(purchasePrice).toHaveAttribute(
      "aria-describedby",
      `${purchasePrice.id}-help ${purchasePriceError.id}`,
    );

    const salePrice = screen.getByRole("textbox", { name: "Precio de venta (obligatorio)" });
    await user.type(salePrice, "-1");
    await user.tab();

    const salePriceError = await screen.findByText("El precio de venta no puede ser negativo.");
    expect(salePrice).toHaveValue("-1");
    expect(salePrice).toHaveAttribute("aria-invalid", "true");
    expect(salePrice).toHaveAttribute(
      "aria-describedby",
      `${salePrice.id}-help ${salePriceError.id}`,
    );
  });

  it("explains that an active category is needed and blocks submit without one", async () => {
    const user = userEvent.setup();
    let createRequests = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(categoriesUrl, () =>
        HttpResponse.json({ data: [], pagination: { total: 0, page: 1, limit: 15 } }),
      ),
      http.post("https://inventory.test/api/products", () => {
        createRequests += 1;
        return HttpResponse.json({ data: {} }, { status: 201 });
      }),
    );

    renderProductCreateRoute();

    const categorySelect = screen.getByRole("textbox", { name: "Categoría (obligatorio)" });
    expect(
      await screen.findByText(
        "No hay categorías activas. No se puede crear un producto hasta que exista una.",
      ),
    ).toBeVisible();
    expect(categorySelect).toBeDisabled();

    expect(categorySelect).toHaveAttribute("aria-required", "true");
    expect(
      screen.queryByRole("button", {
        name: /crear categoría|editar categoría|activar categoría|desactivar categoría/i,
      }),
    ).not.toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "SKU (obligatorio)" }), "SKU-NEW");
    await user.type(screen.getByRole("textbox", { name: "Nombre (obligatorio)" }), "Monitor");
    await user.type(
      screen.getByRole("textbox", { name: "Precio de compra (obligatorio)" }),
      "100,00",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Precio de venta (obligatorio)" }),
      "150,00",
    );

    fireEvent.submit(screen.getByRole("form", { name: "Datos del producto" }));

    const categoryError = await screen.findByText("Selecciona una categoría activa.");
    expect(categorySelect).toHaveAttribute("aria-invalid", "true");
    expect(categorySelect).toHaveAccessibleDescription(
      "Selecciona una categoría activa. No hay categorías activas. No se puede crear un producto hasta que exista una.",
    );
    expect(categorySelect).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining(categoryError.id),
    );
    expect(createRequests).toBe(0);
  });

  it("does not report the global empty state when a category search has no matches", async () => {
    const user = userEvent.setup();

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(categoriesUrl, ({ request }) => {
        const search = new URL(request.url).searchParams.get("search");

        return search
          ? HttpResponse.json({ data: [], pagination: { total: 0, page: 1, limit: 15 } })
          : HttpResponse.json({
              data: [category(1, "Oficina")],
              pagination: { total: 1, page: 1, limit: 15 },
            });
      }),
    );

    renderProductCreateRoute();

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Categoría (obligatorio)" })).toBeEnabled(),
    );
    const categorySearch = screen.getByRole("searchbox", { name: "Buscar categorías activas" });
    await user.type(categorySearch, "sin coincidencias");
    await user.click(screen.getByRole("button", { name: "Buscar categorías" }));

    expect(await screen.findByText("No se encontraron categorías activas.")).toBeVisible();
    expect(
      screen.queryByText(
        "No hay categorías activas. No se puede crear un producto hasta que exista una.",
      ),
    ).not.toBeInTheDocument();
  });

  it("sends one request while pending, confirms only after a valid response, and returns to the default list", async () => {
    const user = userEvent.setup();
    let createRequests = 0;
    let submittedBody: unknown;
    let resolveCreate!: (response: Response) => void;
    const deferredCreate = new Promise<Response>((resolve) => {
      resolveCreate = resolve;
    });

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(categoriesUrl, () => activeCategoryResponse()),
      http.post(productsUrl, async ({ request }) => {
        createRequests += 1;
        submittedBody = await request.json();
        return deferredCreate;
      }),
      http.get(productsUrl, () =>
        HttpResponse.json({ data: [createdProduct], pagination: { total: 1, page: 1, limit: 15 } }),
      ),
    );

    const { router } = renderProductCreateRoute();
    await fillValidProductForm(user);

    const dirtyUnloadEvent = new Event("beforeunload", { cancelable: true });
    fireEvent(window, dirtyUnloadEvent);
    expect(dirtyUnloadEvent.defaultPrevented).toBe(true);

    const form = screen.getByRole("form", { name: "Datos del producto" });
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(await screen.findByRole("status")).toHaveTextContent("Creando producto…");
    await waitFor(() => expect(createRequests).toBe(1));
    expect(submittedBody).toEqual({
      sku: "SKU-NEW",
      name: "Monitor",
      purchasePrice: 10.25,
      salePrice: 8.5,
      categoryUuid: category(1, "Oficina").uuid,
    });
    expect(screen.getByRole("textbox", { name: "SKU (obligatorio)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Creando producto…" })).toBeDisabled();
    expect(screen.queryByText("Producto creado correctamente.")).not.toBeInTheDocument();

    resolveCreate(HttpResponse.json({ data: createdProduct }, { status: 201 }));

    expect(await screen.findByText("Producto creado correctamente.")).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe("/products"));
    expect(router.state.location.search).toBe("?page=1&status=active&sort=name&order=asc");
    expect(createRequests).toBe(1);

    const afterSaveUnloadEvent = new Event("beforeunload", { cancelable: true });
    fireEvent(window, afterSaveUnloadEvent);
    expect(afterSaveUnloadEvent.defaultPrevented).toBe(false);
  });

  it.each(["network", "server"] as const)(
    "preserves entered values and communicates an uncertain outcome after a creation %s failure",
    async (failureKind) => {
      const user = userEvent.setup();
      let createRequests = 0;

      server.use(
        http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
        http.get(categoriesUrl, () => activeCategoryResponse()),
        http.post(productsUrl, () => {
          createRequests += 1;
          return failureKind === "network"
            ? HttpResponse.error()
            : HttpResponse.json(
                { error: { code: "INTERNAL_ERROR", message: "private server detail" } },
                { status: 500 },
              );
        }),
      );

      renderProductCreateRoute();
      await screen.findByRole("heading", { level: 1, name: "Crear producto" });
      await fillValidProductForm(user);
      fireEvent.submit(screen.getByRole("form", { name: "Datos del producto" }));

      const error = await screen.findByRole("alert");
      expect(error).toHaveTextContent(
        "No se pudo confirmar el resultado de la creación. Revisa el catálogo antes de volver a intentarlo.",
      );
      expect(error).not.toHaveTextContent("private server detail");
      expect(screen.getByRole("textbox", { name: "SKU (obligatorio)" })).toHaveValue("SKU-NEW");
      expect(screen.getByRole("textbox", { name: "Nombre (obligatorio)" })).toHaveValue("Monitor");
      expect(screen.getByRole("textbox", { name: "Precio de compra (obligatorio)" })).toHaveValue(
        "10,25",
      );
      expect(screen.getByRole("textbox", { name: "Precio de venta (obligatorio)" })).toHaveValue(
        "8.50",
      );
      expect(screen.getByRole("button", { name: "Crear producto" })).toBeEnabled();
      expect(screen.queryByText("Producto creado correctamente.")).not.toBeInTheDocument();
      expect(createRequests).toBe(1);
    },
  );

  it("rechecks the session after a 401 and lets SessionBoundary replace the create form", async () => {
    const user = userEvent.setup();
    let mutationRejected = false;
    let sessionRefreshRequests = 0;
    let createRequests = 0;
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
      http.get(categoriesUrl, () => activeCategoryResponse()),
      http.post(productsUrl, () => {
        createRequests += 1;
        mutationRejected = true;
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "private authentication detail" } },
          { status: 401 },
        );
      }),
    );

    renderProductCreateRoute();
    await screen.findByRole("heading", { level: 1, name: "Crear producto" });
    await fillValidProductForm(user);
    fireEvent.submit(screen.getByRole("form", { name: "Datos del producto" }));

    expect(await screen.findByRole("heading", { name: "Comprobando tu sesión" })).toBeVisible();
    await waitFor(() => expect(sessionRefreshRequests).toBe(1));
    expect(createRequests).toBe(1);
    expect(screen.queryByRole("form", { name: "Datos del producto" })).not.toBeInTheDocument();
    expect(screen.queryByText("Producto creado correctamente.")).not.toBeInTheDocument();

    resolveSessionRefresh(HttpResponse.json(publicAuthResponse()));

    expect(await screen.findByRole("heading", { level: 1, name: "Crear producto" })).toBeVisible();
    expect(
      await screen.findByText(
        "La sesión se verificó, pero no se confirmó el resultado de la creación. Revisa el catálogo antes de volver a intentarlo.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("private authentication detail")).not.toBeInTheDocument();
    expect(createRequests).toBe(1);
  });

  it.each([
    { existingProductState: "active", privateMessage: "The SKU belongs to an active product." },
    { existingProductState: "inactive", privateMessage: "The SKU belongs to an inactive product." },
  ])(
    "explains duplicate SKUs without exposing whether the existing product is $existingProductState",
    async ({ privateMessage }) => {
      const user = userEvent.setup();

      server.use(
        http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
        http.get(categoriesUrl, () => activeCategoryResponse()),
        http.post(productsUrl, () =>
          HttpResponse.json(
            { error: { code: "PRODUCT_SKU_ALREADY_EXISTS", message: privateMessage } },
            { status: 409 },
          ),
        ),
      );

      const { router } = renderProductCreateRoute();
      await fillValidProductForm(user);
      fireEvent.submit(screen.getByRole("form", { name: "Datos del producto" }));

      const sku = screen.getByRole("textbox", { name: "SKU (obligatorio)" });
      const error = await screen.findByText(
        "Este SKU ya está registrado. Desactivar un producto no libera su SKU; comprueba el valor e inténtalo con otro.",
      );

      expect(sku).toHaveAttribute("aria-invalid", "true");
      expect(sku).toHaveAccessibleDescription(error.textContent ?? "");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText(privateMessage)).not.toBeInTheDocument();
      expect(screen.queryByText("Producto creado correctamente.")).not.toBeInTheDocument();
      expect(router.state.location.pathname).toBe("/products/new");
      expect(screen.getByRole("button", { name: "Crear producto" })).toBeEnabled();
    },
  );

  it("shows a permission rejection when product creation returns 403", async () => {
    const user = userEvent.setup();

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(categoriesUrl, () => activeCategoryResponse()),
      http.post(productsUrl, () =>
        HttpResponse.json(
          { error: { code: "FORBIDDEN", message: "private permission detail" } },
          { status: 403 },
        ),
      ),
    );

    const { router } = renderProductCreateRoute();
    await screen.findByRole("heading", { level: 1, name: "Crear producto" });
    await fillValidProductForm(user);
    fireEvent.submit(screen.getByRole("form", { name: "Datos del producto" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No tienes permiso para crear productos.",
    );
    expect(screen.queryByText("private permission detail")).not.toBeInTheDocument();
    expect(screen.queryByText("Producto creado correctamente.")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/products/new");
    expect(screen.getByRole("textbox", { name: "SKU (obligatorio)" })).toHaveValue("SKU-NEW");
    expect(screen.getByRole("button", { name: "Crear producto" })).toBeEnabled();
  });

  it.each([
    { status: 404, code: "PRODUCT_CATEGORY_NOT_FOUND" },
    { status: 409, code: "PRODUCT_CATEGORY_INACTIVE" },
    { status: 409, code: "PRODUCT_CATEGORY_ASSIGNMENT_CONFLICT" },
  ])(
    "identifies a rejected category ($status $code), refreshes choices, and preserves the other values",
    async ({ status, code }) => {
      const user = userEvent.setup();
      let categoryRequests = 0;

      server.use(
        http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
        http.get(categoriesUrl, () => {
          categoryRequests += 1;
          return categoryRequests === 1
            ? activeCategoryResponse()
            : HttpResponse.json({
                data: [category(2, "Papelería")],
                pagination: { total: 1, page: 1, limit: 15 },
              });
        }),
        http.post(productsUrl, () =>
          HttpResponse.json({ error: { code, message: "private category detail" } }, { status }),
        ),
      );

      renderProductCreateRoute();
      await fillValidProductForm(user);
      await user.type(
        screen.getByRole("textbox", { name: "Descripción (opcional)" }),
        "Pantalla profesional para oficina.",
      );
      fireEvent.submit(screen.getByRole("form", { name: "Datos del producto" }));

      const categorySelect = screen.getByRole("textbox", { name: "Categoría (obligatorio)" });
      const categoryError = await screen.findByText(
        "No se pudo asignar esta categoría. Actualiza las opciones y selecciona una categoría activa.",
      );
      expect(categorySelect).toHaveAttribute("aria-invalid", "true");
      expect(categorySelect).toHaveAccessibleDescription(categoryError.textContent ?? "");
      expect(categorySelect).toBeDisabled();
      expect(screen.getByRole("button", { name: "Actualizar categorías activas" })).toBeVisible();
      expect(screen.queryByText("private category detail")).not.toBeInTheDocument();
      expect(screen.queryByText("No se pudo crear el producto. Inténtalo de nuevo.")).toBeNull();
      expect(screen.getByRole("textbox", { name: "SKU (obligatorio)" })).toHaveValue("SKU-NEW");
      expect(screen.getByRole("textbox", { name: "Nombre (obligatorio)" })).toHaveValue("Monitor");
      expect(screen.getByRole("textbox", { name: "Descripción (opcional)" })).toHaveValue(
        "Pantalla profesional para oficina.",
      );
      expect(screen.getByRole("textbox", { name: "Precio de compra (obligatorio)" })).toHaveValue(
        "10,25",
      );
      expect(screen.getByRole("textbox", { name: "Precio de venta (obligatorio)" })).toHaveValue(
        "8.50",
      );

      await user.click(screen.getByRole("button", { name: "Actualizar categorías activas" }));
      await waitFor(() => expect(categoryRequests).toBe(2));
      expect(await screen.findByText("Selecciona una categoría activa.")).toBeVisible();
      expect(categorySelect).toBeEnabled();

      categorySelect.focus();
      await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

      expect(categorySelect).toHaveValue("Papelería");
      expect(categorySelect).not.toHaveAttribute("aria-invalid", "true");
      expect(screen.queryByText(/No se pudo asignar esta categoría/)).not.toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "SKU (obligatorio)" })).toHaveValue("SKU-NEW");
      expect(screen.getByRole("textbox", { name: "Nombre (obligatorio)" })).toHaveValue("Monitor");
      expect(screen.getByRole("textbox", { name: "Descripción (opcional)" })).toHaveValue(
        "Pantalla profesional para oficina.",
      );
      expect(screen.getByRole("textbox", { name: "Precio de compra (obligatorio)" })).toHaveValue(
        "10,25",
      );
      expect(screen.getByRole("textbox", { name: "Precio de venta (obligatorio)" })).toHaveValue(
        "8.50",
      );
    },
  );

  it("does not treat an unrelated 409 as a category rejection", async () => {
    const user = userEvent.setup();

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(categoriesUrl, () => activeCategoryResponse()),
      http.post(productsUrl, () =>
        HttpResponse.json(
          { error: { code: "PRODUCT_CONFLICT", message: "private conflict detail" } },
          { status: 409 },
        ),
      ),
    );

    renderProductCreateRoute();
    await fillValidProductForm(user);
    fireEvent.submit(screen.getByRole("form", { name: "Datos del producto" }));

    expect(
      await screen.findByText("No se pudo crear el producto. Inténtalo de nuevo."),
    ).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Categoría (obligatorio)" })).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.queryByRole("button", { name: "Actualizar categorías activas" })).toBeNull();
  });

  it("does not confirm or navigate after a malformed successful response", async () => {
    const user = userEvent.setup();
    let createRequests = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(categoriesUrl, () => activeCategoryResponse()),
      http.post(productsUrl, () => {
        createRequests += 1;
        return HttpResponse.json({ data: {} }, { status: 201 });
      }),
    );

    const { router } = renderProductCreateRoute();
    await fillValidProductForm(user);
    fireEvent.submit(screen.getByRole("form", { name: "Datos del producto" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La respuesta de creación no se pudo validar. Revisa el catálogo antes de volver a intentarlo.",
    );
    expect(screen.queryByText("Producto creado correctamente.")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/products/new");
    expect(screen.getByRole("textbox", { name: "SKU (obligatorio)" })).toHaveValue("SKU-NEW");
    expect(createRequests).toBe(1);
  });

  it.each(["ADMIN", "MANAGER", "OPERATOR", "VIEWER"] as const)(
    "keeps the create action visible for the %s role",
    async (role) => {
      server.use(
        http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse(role))),
        http.get(categoriesUrl, () => activeCategoryResponse()),
      );

      renderProductCreateRoute();

      expect(await screen.findByRole("button", { name: "Crear producto" })).toBeVisible();
    },
  );
});
