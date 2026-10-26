import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { components as authComponents } from "@/shared/api/generated/auth-contracts";
import type { components as categoryComponents } from "@/shared/api/generated/category-contracts";
import type { components as productComponents } from "@/shared/api/generated/product-contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { appRoutes } from "@/app/router/router";
import { UiProvider } from "@/app/providers/ui.provider";
import { createQueryClient, QUERY_STALE_TIME_MS } from "@/shared/api/query-client";
import { productDetailQueryKey } from "@/features/products/hooks/use-product";
import { server } from "../mocks/server";
import {
  buildProductEditLocation,
  DEFAULT_PRODUCT_LIST_RETURN_TO,
} from "@/features/products/utils/product-edit-return-to";

const productsUrl = "https://inventory.test/api/products";
const productUuid = "650e8400-e29b-41d4-a716-446655440000";
const categoryUuid = "550e8400-e29b-41d4-a716-446655440000";
const alternativeCategoryUuid = "550e8400-e29b-41d4-a716-446655440001";
const refreshedCategoryUuid = "550e8400-e29b-41d4-a716-446655440002";
const categoriesUrl = "https://inventory.test/api/categories";
const categoryUrl = `https://inventory.test/api/categories/${categoryUuid}`;
const productUrl = `https://inventory.test/api/products/${productUuid}`;

const publicAuthResponse = (): authComponents["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: {
      id: "product-edit-user",
      email: "operator@example.com",
      role: "OPERATOR",
    },
    session: {
      id: "product-edit-session",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
});

const product = (
  isActive: boolean,
  assignedCategoryUuid: string | null = categoryUuid,
): productComponents["schemas"]["Product"] => ({
  uuid: productUuid,
  sku: "SKU-EDIT-01",
  name: isActive ? "Monitor activo" : "Monitor inactivo",
  description: "Monitor de referencia",
  purchasePrice: 125.5,
  salePrice: 189.99,
  categoryUuid: assignedCategoryUuid,
  isActive,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
});

const category = (
  name: string,
  uuid = categoryUuid,
  isActive = true,
): categoryComponents["schemas"]["Category"] => ({
  uuid,
  name,
  description: null,
  isActive,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
});

const categoryListResponse = (
  data: categoryComponents["schemas"]["Category"][] = [category("Oficina")],
  total = data.length,
) => ({
  data,
  pagination: { total, page: 1, limit: 15 },
});

const activeCategoryQueryKey = [
  "categories",
  "active-list",
  "product-edit-session",
  { page: 1, limit: 15, isActive: "true", sort: "name", order: "asc" },
] as const;

const categoryOptionChanges = [
  {
    action: "crear",
    initialOptions: [category("Oficina")],
    updatedOptions: [category("Oficina"), category("Papelería", alternativeCategoryUuid)],
    expectedSelection: "Papelería",
    selectionKeys: "{ArrowDown}{ArrowDown}{ArrowDown}{Enter}",
  },
  {
    action: "renombrar",
    initialOptions: [category("Oficina")],
    updatedOptions: [category("Suministros")],
    expectedSelection: "Suministros",
    selectionKeys: "{ArrowDown}{ArrowDown}{Enter}",
  },
  {
    action: "activar",
    initialOptions: [category("Oficina")],
    updatedOptions: [category("Oficina"), category("Papelería", alternativeCategoryUuid)],
    expectedSelection: "Papelería",
    selectionKeys: "{ArrowDown}{ArrowDown}{ArrowDown}{Enter}",
  },
  {
    action: "desactivar",
    initialOptions: [category("Oficina"), category("Papelería", alternativeCategoryUuid)],
    updatedOptions: [category("Papelería", alternativeCategoryUuid)],
    expectedSelection: "Papelería",
    selectionKeys: "{ArrowDown}{ArrowDown}{Enter}",
  },
];

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

const routeResources: Array<{
  queryClient: ReturnType<typeof createQueryClient>;
  router: ReturnType<typeof createMemoryRouter>;
}> = [];

beforeEach(() => {
  server.use(
    http.get(categoriesUrl, () => HttpResponse.json(categoryListResponse())),
    http.get(categoryUrl, () => HttpResponse.json({ data: category("Oficina") })),
    http.get(`${categoriesUrl}/:uuid`, ({ params }) =>
      HttpResponse.json({ data: category("Categoría activa", String(params.uuid)) }),
    ),
    http.get(productsUrl, () =>
      HttpResponse.json({ data: [product(true)], pagination: { total: 1, page: 1, limit: 15 } }),
    ),
  );
});

const renderProductEditRoute = (
  initialEntry = `/products/${productUuid}/edit`,
  initialEntries = [initialEntry],
) => {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(appRoutes, {
    initialEntries,
    initialIndex: initialEntries.indexOf(initialEntry),
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

afterEach(() => {
  for (const { queryClient, router } of routeResources.splice(0)) {
    router.dispose();
    queryClient.clear();
  }
});

describe("product edit page", () => {
  it.each(categoryOptionChanges)(
    "rechecks active options on return after $action even while the cache is fresh",
    async ({ initialOptions, updatedOptions, expectedSelection, selectionKeys }) => {
      const user = userEvent.setup();
      let categoryRequests = 0;
      let currentOptions = initialOptions;

      server.use(
        http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
        http.get(categoriesUrl, () => {
          categoryRequests += 1;
          return HttpResponse.json(
            categoryListResponse(categoryRequests === 1 ? initialOptions : currentOptions),
          );
        }),
        http.get(productUrl, () => HttpResponse.json({ data: product(true, null) })),
      );

      const { queryClient, router } = renderProductEditRoute();
      await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
      const categorySelect = await screen.findByRole("textbox", { name: "Categoría" });
      await waitFor(() => expect(categoryRequests).toBe(1));
      await waitFor(() => expect(categorySelect).toBeEnabled());

      const cachedOptions = queryClient.getQueryState(activeCategoryQueryKey);
      expect(cachedOptions?.isInvalidated).toBe(false);
      expect(Date.now() - (cachedOptions?.dataUpdatedAt ?? 0)).toBeLessThan(QUERY_STALE_TIME_MS);

      await act(async () => {
        await router.navigate("/");
      });
      expect(
        await screen.findByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
      ).toBeVisible();
      expect(categoryRequests).toBe(1);

      currentOptions = updatedOptions;
      await act(async () => {
        await router.navigate(`/products/${productUuid}/edit`);
      });

      await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
      await waitFor(() => expect(categoryRequests).toBe(2));
      await waitFor(() =>
        expect(queryClient.getQueryData(activeCategoryQueryKey)).toMatchObject({
          data: updatedOptions,
        }),
      );

      const returnedCategorySelect = screen.getByRole("textbox", { name: "Categoría" });
      returnedCategorySelect.focus();
      await user.keyboard(selectionKeys);
      expect(returnedCategorySelect).toHaveValue(expectedSelection);
    },
  );

  it("preserves local values and dirty state when the product detail is refetched", async () => {
    const user = userEvent.setup();
    let detailRequests = 0;
    const refreshedProduct = {
      ...product(true),
      name: "Nombre actualizado en el servidor",
      description: "Descripción actualizada en el servidor",
    };

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => {
        detailRequests += 1;
        return HttpResponse.json({
          data: detailRequests === 1 ? product(true) : refreshedProduct,
        });
      }),
    );

    const { queryClient } = renderProductEditRoute();
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    const description = screen.getByRole("textbox", { name: "Descripción (opcional)" });
    await user.clear(name);
    await user.type(name, "Nombre local pendiente");
    await user.clear(description);
    await user.type(description, "Descripción local pendiente");

    const detailQueryKey = productDetailQueryKey("product-edit-session", productUuid);
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: detailQueryKey, exact: true });
    });

    await waitFor(() => expect(detailRequests).toBe(2));
    expect(queryClient.getQueryData(detailQueryKey)).toMatchObject({
      name: "Nombre actualizado en el servidor",
      description: "Descripción actualizada en el servidor",
    });
    expect(name).toHaveValue("Nombre local pendiente");
    expect(description).toHaveValue("Descripción local pendiente");

    const dirtyUnloadEvent = new Event("beforeunload", { cancelable: true });
    fireEvent(window, dirtyUnloadEvent);
    expect(dirtyUnloadEvent.defaultPrevented).toBe(true);
  });

  it("confirms internal navigation for a dirty edit and preserves its values when staying", async () => {
    const user = userEvent.setup();
    const sourceListUrl = "/products?page=3&search=monitor&status=inactive&sort=sku&order=desc";

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    const { router } = renderProductEditRoute(buildProductEditLocation(productUuid, sourceListUrl));
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Nombre pendiente");

    const dirtyUnloadEvent = new Event("beforeunload", { cancelable: true });
    fireEvent(window, dirtyUnloadEvent);
    expect(dirtyUnloadEvent.defaultPrevented).toBe(true);

    const navigation = within(screen.getByRole("navigation", { name: "Navegación principal" }));
    const homeLink = navigation.getByRole("link", { name: "Inicio" });
    await user.click(homeLink);

    const prompt = await screen.findByRole("dialog");
    await user.click(within(prompt).getByRole("button", { name: "Continuar editando" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe(`/products/${productUuid}/edit`);
    expect(name).toHaveValue("Nombre pendiente");

    await user.click(homeLink);
    const discardPrompt = await screen.findByRole("dialog");
    await user.click(within(discardPrompt).getByRole("button", { name: "Descartar cambios" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
    ).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(router.state.location.search).toBe("");

    const afterDiscardUnloadEvent = new Event("beforeunload", { cancelable: true });
    fireEvent(window, afterDiscardUnloadEvent);
    expect(afterDiscardUnloadEvent.defaultPrevented).toBe(false);
  });

  it("shows an invalid-address state without requesting a malformed UUID and returns to the list", async () => {
    const user = userEvent.setup();
    const productRequests: string[] = [];
    const sourceListUrl = "/products?page=2&search=keyboard&status=inactive&sort=sku&order=desc";

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(/\/api\/products\/[^/]+$/, ({ request }) => {
        productRequests.push(request.url);
        return HttpResponse.json({ data: product(true) });
      }),
      http.get(productsUrl, () =>
        HttpResponse.json({
          data: [product(false)],
          pagination: { total: 31, page: 2, limit: 15 },
        }),
      ),
    );

    const { router } = renderProductEditRoute(
      buildProductEditLocation("not-a-uuid", sourceListUrl),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La dirección del producto no es válida.",
    );
    expect(productRequests).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Volver al listado" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/products"));
    expect(router.state.location.search).toBe(sourceListUrl.slice("/products".length));
  });

  it("shows a distinct not-found state for a 404 and returns to the list", async () => {
    const user = userEvent.setup();
    const sourceListUrl =
      "/products?page=4&search=monitor&status=inactive&sort=updatedAt&order=asc";

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () =>
        HttpResponse.json(
          { error: { code: "PRODUCT_NOT_FOUND", message: "Product not found" } },
          { status: 404 },
        ),
      ),
      http.get(productsUrl, () =>
        HttpResponse.json({
          data: [product(false)],
          pagination: { total: 46, page: 4, limit: 15 },
        }),
      ),
    );

    const { router } = renderProductEditRoute(buildProductEditLocation(productUuid, sourceListUrl));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se encontró el producto.");
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Volver al listado" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/products"));
    expect(router.state.location.search).toBe(sourceListUrl.slice("/products".length));
  });

  it("keeps failed edits visible as read-only and refreshes the source list when returning", async () => {
    const user = userEvent.setup();
    const sourceListUrl = "/products?page=2&search=monitor&status=inactive&sort=sku&order=desc";
    const listRequests: URL[] = [];
    let patchRequests = 0;

    server.use(
      http.patch(productUrl, () => {
        patchRequests += 1;
        return HttpResponse.json(
          { error: { code: "PRODUCT_NOT_FOUND", message: "private missing product detail" } },
          { status: 404 },
        );
      }),
      http.get(productsUrl, ({ request }) => {
        listRequests.push(new URL(request.url));
        return HttpResponse.json({
          data: [product(false)],
          pagination: { total: 31, page: 2, limit: 15 },
        });
      }),
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
      http.get(categoriesUrl, () => HttpResponse.json(categoryListResponse())),
    );

    const { router } = renderProductEditRoute(buildProductEditLocation(productUuid, sourceListUrl));
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Nombre local sin guardar");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    const notFoundAlert = await screen.findByRole("alert");
    expect(notFoundAlert).toHaveTextContent("No se encontró el producto.");
    expect(notFoundAlert).not.toHaveTextContent("private missing product detail");
    expect(name).toHaveValue("Nombre local sin guardar");
    expect(name).toHaveAttribute("readonly");
    expect(screen.getByRole("textbox", { name: "SKU (obligatorio)" })).toHaveAttribute("readonly");
    expect(screen.getByRole("textbox", { name: "Precio de compra (obligatorio)" })).toHaveAttribute(
      "readonly",
    );
    expect(screen.getByRole("textbox", { name: "Precio de venta (obligatorio)" })).toHaveAttribute(
      "readonly",
    );
    expect(screen.getByRole("textbox", { name: "Descripción (opcional)" })).toHaveAttribute(
      "readonly",
    );
    expect(screen.getByRole("textbox", { name: "Categoría" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    expect(patchRequests).toBe(1);

    fireEvent.submit(screen.getByRole("form", { name: "Datos del producto" }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(patchRequests).toBe(1);

    await user.click(screen.getByRole("button", { name: "Volver al listado" }));
    const discardDialog = await screen.findByRole("dialog", { name: "¿Descartar los cambios?" });
    await user.click(within(discardDialog).getByRole("button", { name: "Descartar cambios" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/products"));
    await waitFor(() => expect(listRequests).toHaveLength(1));
    expect(Object.fromEntries(listRequests[0]!.searchParams)).toMatchObject({
      page: "2",
      search: "monitor",
      isActive: "false",
      sort: "sku",
      order: "desc",
    });
  });

  it.each([
    { description: "is absent", location: "/products/not-a-uuid/edit" },
    {
      description: "is invalid",
      location: "/products/not-a-uuid/edit?returnTo=%2Fsettings",
    },
  ])("uses safe default list criteria when the return URL $description", async ({ location }) => {
    const user = userEvent.setup();

    server.use(http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())));

    const { router } = renderProductEditRoute(location);
    await screen.findByText("La dirección del producto no es válida.");

    await user.click(screen.getByRole("button", { name: "Volver al listado" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/products"));
    expect(router.state.location.search).toBe(
      DEFAULT_PRODUCT_LIST_RETURN_TO.slice("/products".length),
    );
  });

  it.each(["network", "server"] as const)(
    "allows retry after a %s failure while loading the product",
    async (failureKind) => {
      const user = userEvent.setup();
      let productRequests = 0;

      server.use(
        http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
        http.get(productUrl, () => {
          productRequests += 1;

          if (productRequests > 1) {
            return HttpResponse.json({ data: product(true) });
          }

          return failureKind === "network"
            ? HttpResponse.error()
            : HttpResponse.json(
                { error: { code: "INTERNAL_ERROR", message: "private server detail" } },
                { status: 503 },
              );
        }),
      );

      renderProductEditRoute();

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "No se pudo cargar el producto por un problema de conexión o del servidor.",
      );
      expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();

      await user.click(screen.getByRole("button", { name: "Reintentar" }));

      expect(await screen.findByRole("textbox", { name: "Nombre (obligatorio)" })).toHaveValue(
        "Monitor activo",
      );
      expect(productRequests).toBe(2);
    },
  );

  it("requests the product by UUID and keeps editable fields unavailable until it arrives", async () => {
    const pendingProduct = deferred<Response>();
    const productRequestStarted = deferred<string>();

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, ({ request }) => {
        productRequestStarted.resolve(request.url);
        return pendingProduct.promise;
      }),
    );

    renderProductEditRoute();

    expect(await screen.findByRole("heading", { level: 1, name: "Editar producto" })).toBeVisible();
    expect(await screen.findByRole("status")).toHaveTextContent("Cargando datos del producto…");
    expect(await productRequestStarted.promise).toBe(productUrl);
    expect(screen.queryByRole("textbox", { name: "SKU (obligatorio)" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Nombre (obligatorio)" })).not.toBeInTheDocument();

    pendingProduct.resolve(HttpResponse.json({ data: product(true) }));

    expect(await screen.findByRole("textbox", { name: "SKU (obligatorio)" })).toHaveValue(
      "SKU-EDIT-01",
    );
    expect(screen.getByRole("textbox", { name: "Nombre (obligatorio)" })).toHaveValue(
      "Monitor activo",
    );
    expect(screen.getByRole("textbox", { name: "Descripción (opcional)" })).toHaveValue(
      "Monitor de referencia",
    );
    expect(screen.getByRole("textbox", { name: "Precio de compra (obligatorio)" })).toHaveValue(
      "125,50",
    );
    expect(screen.getByRole("textbox", { name: "Precio de venta (obligatorio)" })).toHaveValue(
      "189,99",
    );
  });

  it.each([true, false])(
    "allows editing the loaded product when isActive is %s",
    async (isActive) => {
      const user = userEvent.setup();

      server.use(
        http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
        http.get(productUrl, () => HttpResponse.json({ data: product(isActive) })),
      );

      renderProductEditRoute();

      const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
      expect(screen.getByText(isActive ? "Activo" : "Inactivo")).toBeVisible();
      expect(name).toBeEnabled();
      await user.clear(name);
      await user.type(name, "Nombre actualizado localmente");
      expect(name).toHaveValue("Nombre actualizado localmente");

      for (const fieldName of [
        "SKU (obligatorio)",
        "Descripción (opcional)",
        "Precio de compra (obligatorio)",
        "Precio de venta (obligatorio)",
      ]) {
        expect(screen.getByRole("textbox", { name: fieldName })).toBeEnabled();
      }
    },
  );

  it("keeps the original category and dirty product values while searching and paging options", async () => {
    const user = userEvent.setup();
    const requests: URL[] = [];

    server.use(
      http.get(categoriesUrl, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const page = Number(url.searchParams.get("page"));
        const search = url.searchParams.get("search") ?? "";

        return HttpResponse.json(
          categoryListResponse(
            search
              ? [category(`Resultado ${search}`, "550e8400-e29b-41d4-a716-446655440003")]
              : page === 1
                ? [category("Oficina"), category("Repuestos", alternativeCategoryUuid)]
                : [category("Limpieza", "550e8400-e29b-41d4-a716-446655440002")],
            31,
          ),
        );
      }),
    );
    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    renderProductEditRoute();

    await screen.findByRole("textbox", { name: "Categoría" });
    const getCategorySelect = () => screen.getByRole("textbox", { name: "Categoría" });
    await waitFor(() => expect(requests).toHaveLength(1));
    await waitFor(() => expect(getCategorySelect()).toHaveValue("Oficina"));
    expect(screen.getByRole("searchbox", { name: "Buscar categorías activas" })).toBeVisible();

    const name = screen.getByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Monitor con categoría original");
    const dirtyUnloadEvent = new Event("beforeunload", { cancelable: true });
    fireEvent(window, dirtyUnloadEvent);
    expect(dirtyUnloadEvent.defaultPrevented).toBe(true);

    await user.click(screen.getByRole("button", { name: "Página siguiente de categorías" }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]?.searchParams.get("page")).toBe("2");
    expect(getCategorySelect()).toHaveValue("Oficina");
    expect(name).toHaveValue("Monitor con categoría original");

    const categorySearch = screen.getByRole("searchbox", { name: "Buscar categorías activas" });
    await user.type(categorySearch, "repuesto");
    await user.click(screen.getByRole("button", { name: "Buscar categorías" }));
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2]?.searchParams.get("search")).toBe("repuesto");
    expect(getCategorySelect()).toHaveValue("Oficina");
    expect(name).toHaveValue("Monitor con categoría original");
    const dirtyAfterOptionsUnloadEvent = new Event("beforeunload", { cancelable: true });
    fireEvent(window, dirtyAfterOptionsUnloadEvent);
    expect(dirtyAfterOptionsUnloadEvent.defaultPrevented).toBe(true);
  });

  it("loads the original category detail when it is absent from active results", async () => {
    const detailRequests: URL[] = [];

    server.use(
      http.get(categoriesUrl, () =>
        HttpResponse.json(categoryListResponse([category("Repuestos", alternativeCategoryUuid)])),
      ),
      http.get(categoryUrl, ({ request }) => {
        detailRequests.push(new URL(request.url));
        return HttpResponse.json({ data: category("Oficina", categoryUuid, false) });
      }),
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    renderProductEditRoute();

    await screen.findByRole("textbox", { name: "Categoría" });
    const getCategorySelect = () => screen.getByRole("textbox", { name: "Categoría" });
    await waitFor(() => expect(detailRequests).toHaveLength(1));
    await waitFor(() => expect(getCategorySelect()).toHaveValue("Oficina (categoría actual)"));
    expect(detailRequests).toHaveLength(1);
    expect(detailRequests[0]?.pathname).toBe(`/api/categories/${categoryUuid}`);
    expect(screen.getByRole("searchbox", { name: "Buscar categorías activas" })).toBeVisible();
  });

  it.each([
    {
      reason: "inactiva",
      detailResponse: () =>
        HttpResponse.json({ data: category("Repuestos", alternativeCategoryUuid, false) }),
    },
    {
      reason: "inexistente",
      detailResponse: () =>
        HttpResponse.json(
          { error: { code: "CATEGORY_NOT_FOUND", message: "private category detail" } },
          { status: 404 },
        ),
    },
  ])(
    "invalidates a new selection confirmed $reason while preserving the original and other edits",
    async ({ detailResponse }) => {
      const user = userEvent.setup();
      let categoryRequests = 0;
      const originalDetailRequests: URL[] = [];
      const selectedDetailRequests: URL[] = [];

      server.use(
        http.get(categoriesUrl, () => {
          categoryRequests += 1;
          return HttpResponse.json(
            categoryListResponse(
              categoryRequests === 1
                ? [category("Repuestos", alternativeCategoryUuid)]
                : [category("Papelería", refreshedCategoryUuid)],
            ),
          );
        }),
        http.get(categoryUrl, ({ request }) => {
          originalDetailRequests.push(new URL(request.url));
          return HttpResponse.json({ data: category("Oficina", categoryUuid, false) });
        }),
        http.get(`${categoriesUrl}/${alternativeCategoryUuid}`, ({ request }) => {
          selectedDetailRequests.push(new URL(request.url));
          return detailResponse();
        }),
        http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
        http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
      );

      const { router } = renderProductEditRoute();
      const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
      const getCategorySelect = () => screen.getByRole("textbox", { name: "Categoría" });
      await waitFor(() => expect(getCategorySelect()).toHaveValue("Oficina (categoría actual)"));
      expect(originalDetailRequests).toHaveLength(1);

      await user.clear(name);
      await user.type(name, "Monitor con cambios conservados");
      getCategorySelect().focus();
      await user.keyboard("{ArrowDown}{Home}{Enter}");

      expect(
        await screen.findByText(
          "La categoría seleccionada ya no está activa o no existe. Se conserva la categoría original.",
        ),
      ).toBeVisible();
      expect(selectedDetailRequests).toHaveLength(1);
      expect(selectedDetailRequests[0]?.pathname).toBe(
        `/api/categories/${alternativeCategoryUuid}`,
      );
      expect(getCategorySelect()).toHaveValue("Oficina (categoría actual)");
      expect(getCategorySelect()).toBeDisabled();
      expect(name).toHaveValue("Monitor con cambios conservados");
      expect(screen.getByRole("button", { name: "Actualizar categorías activas" })).toBeVisible();
      const dirtyUnloadEvent = new Event("beforeunload", { cancelable: true });
      fireEvent(window, dirtyUnloadEvent);
      expect(dirtyUnloadEvent.defaultPrevented).toBe(true);
      expect(router.state.location.pathname).toBe(`/products/${productUuid}/edit`);

      await user.click(screen.getByRole("button", { name: "Actualizar categorías activas" }));
      await waitFor(() => expect(categoryRequests).toBe(2));
      expect(getCategorySelect()).toBeEnabled();
      expect(getCategorySelect()).toHaveValue("Oficina (categoría actual)");
      expect(name).toHaveValue("Monitor con cambios conservados");
      const dirtyAfterRefreshUnloadEvent = new Event("beforeunload", { cancelable: true });
      fireEvent(window, dirtyAfterRefreshUnloadEvent);
      expect(dirtyAfterRefreshUnloadEvent.defaultPrevented).toBe(true);
      expect(originalDetailRequests).toHaveLength(1);
    },
  );

  it("identifies a product without a category and leaves the selector optional", async () => {
    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true, null) })),
    );

    renderProductEditRoute();

    const categorySelect = await screen.findByRole("textbox", { name: "Categoría" });
    expect(screen.getByText("Sin categoría", { selector: "p" })).toBeVisible();
    expect(categorySelect).not.toHaveAttribute("aria-required", "true");
    expect(screen.getByRole("textbox", { name: "Nombre (obligatorio)" })).toBeEnabled();
  });

  it("does not offer an empty selection for an existing category", async () => {
    const user = userEvent.setup();

    server.use(
      http.get(categoriesUrl, () =>
        HttpResponse.json(
          categoryListResponse([
            category("Oficina"),
            category("Repuestos", alternativeCategoryUuid),
          ]),
        ),
      ),
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    renderProductEditRoute();

    await screen.findByRole("textbox", { name: "Categoría" });
    const getCategorySelect = () => screen.getByRole("textbox", { name: "Categoría" });
    await waitFor(() => expect(getCategorySelect()).toHaveValue("Oficina"));
    getCategorySelect().focus();
    await user.keyboard("{ArrowDown}");

    const listbox = screen.getByRole("listbox", { hidden: true });
    expect(
      within(listbox).queryByRole("option", {
        hidden: true,
        name: "Selecciona una categoría",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(listbox).getByRole("option", { hidden: true, name: "Oficina" }),
    ).toBeInTheDocument();
    expect(getCategorySelect()).toHaveValue("Oficina");
  });

  it("removes a rejected new category assignment until refreshed options are selected again", async () => {
    const user = userEvent.setup();
    const patchBodies: unknown[] = [];
    let categoryRequests = 0;

    server.use(
      http.get(categoriesUrl, () => {
        categoryRequests += 1;
        return HttpResponse.json(
          categoryListResponse(
            categoryRequests === 1
              ? [category("Oficina"), category("Repuestos", alternativeCategoryUuid)]
              : [category("Oficina"), category("Papelería", refreshedCategoryUuid)],
          ),
        );
      }),
      http.patch(productUrl, async ({ request }) => {
        patchBodies.push(await request.json());

        if (patchBodies.length === 1) {
          return HttpResponse.json(
            { error: { code: "PRODUCT_CATEGORY_INACTIVE", message: "private category detail" } },
            { status: 409 },
          );
        }

        if (patchBodies.length === 2) {
          return HttpResponse.json(
            { error: { code: "PRODUCT_SKU_ALREADY_EXISTS", message: "private SKU detail" } },
            { status: 409 },
          );
        }

        return HttpResponse.json({
          data: {
            ...product(true, refreshedCategoryUuid),
            name: "Monitor actualizado",
          },
        });
      }),
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    const { queryClient } = renderProductEditRoute();

    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await screen.findByRole("textbox", { name: "Categoría" });
    const getCategorySelect = () => screen.getByRole("textbox", { name: "Categoría" });
    await waitFor(() => expect(categoryRequests).toBe(1));
    await waitFor(() => expect(getCategorySelect()).toHaveValue("Oficina"));
    await user.clear(name);
    await user.type(name, "Monitor actualizado");
    getCategorySelect().focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(getCategorySelect()).toHaveValue("Repuestos");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El backend rechazó la categoría seleccionada.",
    );
    expect(name).toHaveValue("Monitor actualizado");
    expect(getCategorySelect()).toHaveValue("Oficina");
    expect(getCategorySelect()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Actualizar categorías activas" })).toBeVisible();
    const rejectedAssignmentUnloadEvent = new Event("beforeunload", { cancelable: true });
    fireEvent(window, rejectedAssignmentUnloadEvent);
    expect(rejectedAssignmentUnloadEvent.defaultPrevented).toBe(true);
    expect(patchBodies).toEqual([
      { name: "Monitor actualizado", categoryUuid: alternativeCategoryUuid },
    ]);

    const cachedOptions = queryClient.getQueryState(activeCategoryQueryKey);
    expect(cachedOptions?.isInvalidated).toBe(false);
    expect(Date.now() - (cachedOptions?.dataUpdatedAt ?? 0)).toBeLessThan(QUERY_STALE_TIME_MS);

    await user.click(screen.getByRole("button", { name: "Actualizar categorías activas" }));
    await waitFor(() => expect(categoryRequests).toBe(2));
    expect(getCategorySelect()).toBeEnabled();
    expect(getCategorySelect()).toHaveValue("Oficina");
    expect(name).toHaveValue("Monitor actualizado");
    const refreshedOptionsUnloadEvent = new Event("beforeunload", { cancelable: true });
    fireEvent(window, refreshedOptionsUnloadEvent);
    expect(refreshedOptionsUnloadEvent.defaultPrevented).toBe(true);

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(
      await screen.findByText(
        "Este SKU ya está registrado. Desactivar un producto no libera su SKU; comprueba el valor e inténtalo con otro.",
      ),
    ).toBeVisible();
    expect(patchBodies[1]).toEqual({ name: "Monitor actualizado" });

    getCategorySelect().focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(getCategorySelect()).toHaveValue("Papelería");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(patchBodies).toHaveLength(3));
    expect(patchBodies[2]).toEqual({
      name: "Monitor actualizado",
      categoryUuid: refreshedCategoryUuid,
    });
    expect(await screen.findByText("Producto actualizado correctamente.")).toBeVisible();
    expect(await screen.findByRole("row", { name: /SKU-EDIT-01/ })).toBeVisible();
  });

  it.each([
    {
      description: "an active original category",
      originalCategoryUuid: categoryUuid,
      originalCategoryActive: true,
      expectedCategoryLabel: "Oficina",
    },
    {
      description: "an inactive original category",
      originalCategoryUuid: categoryUuid,
      originalCategoryActive: false,
      expectedCategoryLabel: "Oficina (categoría actual)",
    },
    {
      description: "no original category",
      originalCategoryUuid: null,
      originalCategoryActive: true,
      expectedCategoryLabel: "",
    },
  ])(
    "allows saving other fields while the category options query fails with $description",
    async ({ originalCategoryUuid, originalCategoryActive, expectedCategoryLabel }) => {
      const user = userEvent.setup();
      const patchBodies: unknown[] = [];

      server.use(
        http.get(categoriesUrl, () =>
          HttpResponse.json(
            { error: { code: "CATEGORY_SERVICE_UNAVAILABLE", message: "private category detail" } },
            { status: 503 },
          ),
        ),
        http.patch(productUrl, async ({ request }) => {
          patchBodies.push(await request.json());
          return HttpResponse.json({
            data: { ...product(true, originalCategoryUuid), name: "Monitor actualizado" },
          });
        }),
        http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
        http.get(productUrl, () =>
          HttpResponse.json({ data: product(true, originalCategoryUuid) }),
        ),
        http.get(categoryUrl, () =>
          HttpResponse.json({
            data: category("Oficina", categoryUuid, originalCategoryActive),
          }),
        ),
      );

      renderProductEditRoute();

      const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
      await screen.findByRole("textbox", { name: "Categoría" });
      const getCategorySelect = () => screen.getByRole("textbox", { name: "Categoría" });
      expect(
        await screen.findByText("No se pudieron cargar las categorías activas.", { selector: "p" }),
      ).toBeVisible();
      expect(getCategorySelect()).toBeDisabled();
      if (originalCategoryUuid === null) {
        expect(screen.getByText("Sin categoría", { selector: "p" })).toBeVisible();
      } else {
        await waitFor(() => expect(getCategorySelect()).toHaveValue(expectedCategoryLabel));
      }

      await user.clear(name);
      await user.type(name, "Monitor actualizado");
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      await waitFor(() => expect(patchBodies).toHaveLength(1));
      expect(patchBodies).toEqual([{ name: "Monitor actualizado" }]);
      expect(await screen.findByText("Producto actualizado correctamente.")).toBeVisible();
      expect(await screen.findByRole("row", { name: /SKU-EDIT-01/ })).toBeVisible();
    },
  );

  it("sends only the edited fields in a PATCH and preserves the original active state", async () => {
    const user = userEvent.setup();
    const patchRequests: Array<{ method: string; body: unknown }> = [];

    server.use(
      http.patch(productUrl, async ({ request }) => {
        patchRequests.push({ method: request.method, body: await request.json() });
        return HttpResponse.json({
          data: {
            ...product(true),
            name: "Monitor actualizado",
            description: null,
            purchasePrice: 130.75,
          },
        });
      }),
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    renderProductEditRoute();

    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await screen.findByRole("textbox", { name: "Categoría" });
    const getCategorySelect = () => screen.getByRole("textbox", { name: "Categoría" });
    await waitFor(() => expect(getCategorySelect()).toHaveValue("Oficina"));
    const description = screen.getByRole("textbox", { name: "Descripción (opcional)" });
    const purchasePrice = screen.getByRole("textbox", { name: "Precio de compra (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Monitor actualizado");
    await user.clear(description);
    await user.clear(purchasePrice);
    await user.type(purchasePrice, "130,75");
    expect(getCategorySelect()).toHaveValue("Oficina");

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(patchRequests).toHaveLength(1));
    expect(patchRequests).toEqual([
      {
        method: "PATCH",
        body: {
          name: "Monitor actualizado",
          description: null,
          purchasePrice: 130.75,
        },
      },
    ]);
  });

  it("preserves long edited fields and sends long prices without truncation or rounding", async () => {
    const user = userEvent.setup();
    const longSku = `SKU-${"B4".repeat(48)}`;
    const longName = `Nombre actualizado ${"con detalle ".repeat(24).trimEnd()}`;
    const longDescription = `Descripción actualizada ${"para el catálogo. ".repeat(80)}`;
    const purchasePriceText = "9999999999999.99";
    const salePriceText = "1234567890123.45";
    const updatedProduct = {
      ...product(true),
      sku: longSku,
      name: longName,
      description: longDescription,
      purchasePrice: Number(purchasePriceText),
      salePrice: Number(salePriceText),
    };
    let submittedBody: unknown;

    server.use(
      http.patch(productUrl, async ({ request }) => {
        submittedBody = await request.json();
        return HttpResponse.json({ data: updatedProduct });
      }),
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    renderProductEditRoute();

    const sku = await screen.findByRole("textbox", { name: "SKU (obligatorio)" });
    const name = screen.getByRole("textbox", { name: "Nombre (obligatorio)" });
    const description = screen.getByRole("textbox", { name: "Descripción (opcional)" });
    const purchasePrice = screen.getByRole("textbox", { name: "Precio de compra (obligatorio)" });
    const salePrice = screen.getByRole("textbox", { name: "Precio de venta (obligatorio)" });

    fireEvent.change(sku, { target: { value: longSku } });
    fireEvent.change(name, { target: { value: longName } });
    fireEvent.change(description, { target: { value: longDescription } });
    fireEvent.change(purchasePrice, { target: { value: purchasePriceText } });
    fireEvent.change(salePrice, { target: { value: salePriceText } });

    expect(sku).toHaveValue(longSku);
    expect(name).toHaveValue(longName);
    expect(description).toHaveValue(longDescription);
    expect(purchasePrice).toHaveValue(purchasePriceText);
    expect(salePrice).toHaveValue(salePriceText);

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Producto actualizado correctamente.")).toBeVisible();
    expect(submittedBody).toEqual({
      sku: longSku,
      name: longName,
      description: longDescription,
      purchasePrice: Number(purchasePriceText),
      salePrice: Number(salePriceText),
    });
  });

  it("does not send PATCH when the edit form matches the original snapshot", async () => {
    const user = userEvent.setup();
    const patchRequests: URL[] = [];

    server.use(
      http.patch(productUrl, ({ request }) => {
        patchRequests.push(new URL(request.url));
        return HttpResponse.json({ data: product(true) });
      }),
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    renderProductEditRoute();

    await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(patchRequests).toHaveLength(0);
  });

  it("shows pending state, blocks duplicate submits, and confirms after a valid PATCH response", async () => {
    const user = userEvent.setup();
    const patchResponse = deferred<Response>();
    const patchRequests: unknown[] = [];

    server.use(
      http.patch(productUrl, async ({ request }) => {
        patchRequests.push(await request.json());
        return patchResponse.promise;
      }),
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    renderProductEditRoute();

    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Monitor actualizado");

    const form = screen.getByRole("form", { name: "Datos del producto" });
    fireEvent.submit(form);
    fireEvent.submit(form);

    const pendingStatus = await screen.findByText("Guardando cambios del producto…");
    expect(pendingStatus).toHaveAttribute("role", "status");
    await waitFor(() => expect(patchRequests).toHaveLength(1));
    expect(form).toHaveAttribute("aria-busy", "true");
    expect(name).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Categoría" })).toBeDisabled();
    expect(screen.getByRole("searchbox", { name: "Buscar categorías activas" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardando cambios…" })).toBeDisabled();
    expect(screen.queryByText("Producto actualizado correctamente.")).not.toBeInTheDocument();

    patchResponse.resolve(
      HttpResponse.json({
        data: { ...product(true), name: "Monitor actualizado" },
      }),
    );

    expect(await screen.findByText("Producto actualizado correctamente.")).toBeVisible();
    expect(patchRequests).toEqual([{ name: "Monitor actualizado" }]);
  });

  it("cancels Back and Forward while saving, then permits editing and requires a new exit attempt after failure", async () => {
    const user = userEvent.setup();
    const editPath = `/products/${productUuid}/edit`;
    const patchResponse = deferred<Response>();

    server.use(
      http.patch(productUrl, () => patchResponse.promise),
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(/\/api\/categories/, () => HttpResponse.json(categoryListResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    const { router } = renderProductEditRoute(editPath, ["/", editPath, "/products"]);
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Nombre guardado pendiente");
    fireEvent.submit(screen.getByRole("form", { name: "Datos del producto" }));

    expect(await screen.findByText("Guardando cambios del producto…")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "SKU (obligatorio)" })).toBeDisabled();
    expect(name).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Precio de compra (obligatorio)" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Precio de venta (obligatorio)" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Descripción (opcional)" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Categoría" })).toBeDisabled();
    expect(screen.getByRole("searchbox", { name: "Buscar categorías activas" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardando cambios…" })).toBeDisabled();

    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe(editPath);
    expect(
      await screen.findByText("Espera a que termine el guardado antes de salir de esta página."),
    ).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      await router.navigate(1);
    });
    expect(router.state.location.pathname).toBe(editPath);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    patchResponse.resolve(
      HttpResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "private backend detail" } },
        { status: 500 },
      ),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo confirmar el resultado de la actualización. Revisa el producto antes de volver a intentarlo.",
    );
    await waitFor(() => expect(name).toBeEnabled());
    expect(name).toHaveValue("Nombre guardado pendiente");
    expect(router.state.location.pathname).toBe(editPath);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      await router.navigate(1);
    });
    const discardPrompt = await screen.findByRole("dialog", { name: "¿Descartar los cambios?" });
    await user.click(within(discardPrompt).getByRole("button", { name: "Continuar editando" }));

    await user.type(name, " revisado");
    expect(name).toHaveValue("Nombre guardado pendiente revisado");
    expect(router.state.location.pathname).toBe(editPath);
  });

  it("does not confirm success when the PATCH response violates the product contract", async () => {
    const user = userEvent.setup();

    server.use(
      http.patch(productUrl, () => HttpResponse.json({ data: { uuid: productUuid } })),
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    renderProductEditRoute();

    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Monitor actualizado");

    const dirtyUnloadEvent = new Event("beforeunload", { cancelable: true });
    fireEvent(window, dirtyUnloadEvent);
    expect(dirtyUnloadEvent.defaultPrevented).toBe(true);

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled(),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La respuesta de actualización no se pudo validar. Revisa el producto antes de volver a intentarlo.",
    );
    expect(screen.queryByText("Producto actualizado correctamente.")).not.toBeInTheDocument();
  });

  it("returns to the source list criteria after a successful edit", async () => {
    const user = userEvent.setup();
    const sourceListUrl = "/products?page=3&search=monitor&status=inactive&sort=sku&order=desc";
    const listRequests: URL[] = [];

    server.use(
      http.patch(productUrl, () =>
        HttpResponse.json({ data: { ...product(true), name: "Monitor actualizado" } }),
      ),
      http.get(productsUrl, ({ request }) => {
        listRequests.push(new URL(request.url));
        return HttpResponse.json({
          data: [product(true)],
          pagination: { total: 1, page: 3, limit: 15 },
        });
      }),
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    const { router } = renderProductEditRoute(buildProductEditLocation(productUuid, sourceListUrl));

    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Monitor actualizado");

    const dirtyUnloadEvent = new Event("beforeunload", { cancelable: true });
    fireEvent(window, dirtyUnloadEvent);
    expect(dirtyUnloadEvent.defaultPrevented).toBe(true);

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Producto actualizado correctamente.")).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe("/products"));
    expect(router.state.location.search).toBe(
      "?page=3&search=monitor&status=inactive&sort=sku&order=desc",
    );
    await waitFor(() => expect(listRequests).toHaveLength(1));
    expect(Object.fromEntries(listRequests[0]!.searchParams)).toMatchObject({
      page: "3",
      search: "monitor",
      isActive: "false",
      sort: "sku",
      order: "desc",
    });

    const afterSaveUnloadEvent = new Event("beforeunload", { cancelable: true });
    fireEvent(window, afterSaveUnloadEvent);
    expect(afterSaveUnloadEvent.defaultPrevented).toBe(false);
  });

  it("cancels a clean edit directly to its originating list criteria", async () => {
    const user = userEvent.setup();
    const sourceListUrl = "/products?page=2&search=keyboard&status=inactive&sort=sku&order=desc";
    const listRequests: URL[] = [];

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(false) })),
      http.get(productsUrl, ({ request }) => {
        listRequests.push(new URL(request.url));
        return HttpResponse.json({
          data: [product(false)],
          pagination: { total: 16, page: 2, limit: 15 },
        });
      }),
    );

    const { router } = renderProductEditRoute(buildProductEditLocation(productUuid, sourceListUrl));
    await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/products"));
    expect(router.state.location.search).toBe(sourceListUrl.slice("/products".length));
    await waitFor(() => expect(listRequests).toHaveLength(1));
    expect(Object.fromEntries(listRequests[0]!.searchParams)).toMatchObject({
      page: "2",
      search: "keyboard",
      isActive: "false",
      sort: "sku",
      order: "desc",
    });
  });

  it("asks before cancelling a dirty edit and returns to its originating list on discard", async () => {
    const user = userEvent.setup();
    const sourceListUrl = "/products?page=2&search=keyboard&status=inactive&sort=sku&order=desc";

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(false) })),
      http.get(productsUrl, () =>
        HttpResponse.json({
          data: [product(false)],
          pagination: { total: 16, page: 2, limit: 15 },
        }),
      ),
    );

    const { router } = renderProductEditRoute(buildProductEditLocation(productUuid, sourceListUrl));
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Nombre sin guardar");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    const discardDialog = await screen.findByRole("dialog", { name: "¿Descartar los cambios?" });
    expect(router.state.location.pathname).toBe(`/products/${productUuid}/edit`);
    await user.click(within(discardDialog).getByRole("button", { name: "Continuar editando" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(name).toHaveValue("Nombre sin guardar");
    expect(router.state.location.pathname).toBe(`/products/${productUuid}/edit`);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    const confirmDiscardDialog = await screen.findByRole("dialog", {
      name: "¿Descartar los cambios?",
    });
    await user.click(
      within(confirmDiscardDialog).getByRole("button", { name: "Descartar cambios" }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe("/products"));
    expect(router.state.location.search).toBe(sourceListUrl.slice("/products".length));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("retains the source query in the edit URL across a reload", async () => {
    const user = userEvent.setup();
    const sourceListUrl = "/products?page=3&search=monitor&status=inactive&sort=sku&order=desc";
    const originalEditLocation = buildProductEditLocation(productUuid, sourceListUrl);

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(false) })),
      http.get(productsUrl, () =>
        HttpResponse.json({
          data: [product(false)],
          pagination: { total: 31, page: 3, limit: 15 },
        }),
      ),
    );

    const { router: originalRouter } = renderProductEditRoute(originalEditLocation);
    await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    const reloadLocation =
      originalRouter.state.location.pathname + originalRouter.state.location.search;

    cleanup();
    const { router: reloadedRouter } = renderProductEditRoute(reloadLocation);
    await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(reloadedRouter.state.location.pathname).toBe("/products"));
    expect(reloadedRouter.state.location.search).toBe(sourceListUrl.slice("/products".length));
  });

  it("keeps edit success when refreshing the list fails and retries only the list query", async () => {
    const user = userEvent.setup();
    let listRequests = 0;
    let patchRequests = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productsUrl, () => {
        listRequests += 1;

        if (listRequests === 2) {
          return HttpResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "private list detail" } },
            { status: 500 },
          );
        }

        return HttpResponse.json({
          data: [
            { ...product(true), name: listRequests > 2 ? "Monitor actualizado" : "Monitor activo" },
          ],
          pagination: { total: 1, page: 1, limit: 15 },
        });
      }),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
      http.patch(productUrl, () => {
        patchRequests += 1;
        return HttpResponse.json({ data: { ...product(true), name: "Monitor actualizado" } });
      }),
    );

    const { router } = renderProductEditRoute("/products");
    await screen.findByRole("cell", { name: "Monitor activo" });
    await user.click(screen.getByRole("button", { name: "Editar" }));

    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Monitor actualizado");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Producto actualizado correctamente.")).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe("/products"));
    expect(await screen.findByText("No se pudieron cargar los productos.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
    expect(screen.getByText("Producto actualizado correctamente.")).toBeVisible();
    expect(screen.queryByText("private list detail")).not.toBeInTheDocument();
    expect(listRequests).toBe(2);
    expect(patchRequests).toBe(1);

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("cell", { name: "Monitor actualizado" })).toBeVisible();
    expect(listRequests).toBe(3);
    expect(patchRequests).toBe(1);
  });

  it("uses default list criteria after an edit opened without a source URL", async () => {
    const user = userEvent.setup();
    const listRequests: URL[] = [];

    server.use(
      http.patch(productUrl, () =>
        HttpResponse.json({ data: { ...product(true), name: "Monitor actualizado" } }),
      ),
      http.get(productsUrl, ({ request }) => {
        listRequests.push(new URL(request.url));
        return HttpResponse.json({
          data: [product(true)],
          pagination: { total: 1, page: 1, limit: 15 },
        });
      }),
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    const { router } = renderProductEditRoute();
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Monitor actualizado");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Producto actualizado correctamente.")).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe("/products"));
    expect(router.state.location.search).toBe(
      DEFAULT_PRODUCT_LIST_RETURN_TO.slice("/products".length),
    );
    await waitFor(() => expect(listRequests).toHaveLength(1));
    expect(Object.fromEntries(listRequests[0]!.searchParams)).toMatchObject({
      page: "1",
      isActive: "true",
      sort: "name",
      order: "asc",
    });
  });

  it.each(["network", "server"] as const)(
    "preserves edits and reports an uncertain outcome after an update %s failure",
    async (failureKind) => {
      const user = userEvent.setup();
      let patchRequests = 0;

      server.use(
        http.patch(productUrl, () => {
          patchRequests += 1;
          return failureKind === "network"
            ? HttpResponse.error()
            : HttpResponse.json(
                { error: { code: "INTERNAL_ERROR", message: "private backend details" } },
                { status: 503 },
              );
        }),
        http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
        http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
      );

      const { router } = renderProductEditRoute();
      const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
      await user.clear(name);
      await user.type(name, "Nombre local conservado");
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      const error = await screen.findByRole("alert");
      expect(error).toHaveTextContent(
        "No se pudo confirmar el resultado de la actualización. Revisa el producto antes de volver a intentarlo.",
      );
      expect(error).not.toHaveTextContent("private backend details");
      await waitFor(() => expect(name).toBeEnabled());
      expect(name).toHaveValue("Nombre local conservado");
      expect(router.state.location.pathname).toBe(`/products/${productUuid}/edit`);
      expect(screen.queryByText("Producto actualizado correctamente.")).not.toBeInTheDocument();
      expect(patchRequests).toBe(1);
    },
  );

  it("rechecks the session after a 401 and lets SessionBoundary replace the edit form", async () => {
    const user = userEvent.setup();
    let mutationRejected = false;
    let sessionRefreshRequests = 0;
    let patchRequests = 0;
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
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
      http.patch(productUrl, () => {
        patchRequests += 1;
        mutationRejected = true;
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "private authentication detail" } },
          { status: 401 },
        );
      }),
    );

    renderProductEditRoute();
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Nombre editado");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("heading", { name: "Comprobando tu sesión" })).toBeVisible();
    await waitFor(() => expect(sessionRefreshRequests).toBe(1));
    expect(patchRequests).toBe(1);
    expect(screen.queryByRole("textbox", { name: "Nombre (obligatorio)" })).not.toBeInTheDocument();
    expect(screen.queryByText("Producto actualizado correctamente.")).not.toBeInTheDocument();

    resolveSessionRefresh(HttpResponse.json(publicAuthResponse()));

    expect(await screen.findByRole("textbox", { name: "Nombre (obligatorio)" })).toBeVisible();
    expect(
      await screen.findByText(
        "La sesión se verificó, pero no se confirmó el resultado de la actualización. Revisa el producto antes de volver a intentarlo.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("private authentication detail")).not.toBeInTheDocument();
    expect(patchRequests).toBe(1);
  });

  it.each([
    { existingProductState: "active", privateMessage: "The SKU belongs to an active product." },
    { existingProductState: "inactive", privateMessage: "The SKU belongs to an inactive product." },
  ])(
    "explains an occupied SKU without exposing whether the existing product is $existingProductState",
    async ({ privateMessage }) => {
      const user = userEvent.setup();

      server.use(
        http.patch(productUrl, () =>
          HttpResponse.json(
            { error: { code: "PRODUCT_SKU_ALREADY_EXISTS", message: privateMessage } },
            { status: 409 },
          ),
        ),
        http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
        http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
      );

      const { router } = renderProductEditRoute();
      const sku = await screen.findByRole("textbox", { name: "SKU (obligatorio)" });
      await user.clear(sku);
      await user.type(sku, "SKU-DUPLICATE");
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      const error = await screen.findByText(
        "Este SKU ya está registrado. Desactivar un producto no libera su SKU; comprueba el valor e inténtalo con otro.",
      );

      expect(sku).toHaveAttribute("aria-invalid", "true");
      expect(sku).toHaveAccessibleDescription(error.textContent ?? "");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText(privateMessage)).not.toBeInTheDocument();
      expect(
        screen.queryByText("No se pudieron guardar los cambios. Inténtalo de nuevo."),
      ).toBeNull();
      expect(screen.queryByText("Producto actualizado correctamente.")).not.toBeInTheDocument();
      expect(router.state.location.pathname).toBe(`/products/${productUuid}/edit`);
      expect(sku).toHaveValue("SKU-DUPLICATE");
    },
  );

  it("shows a permission rejection when product editing returns 403", async () => {
    const user = userEvent.setup();

    server.use(
      http.patch(productUrl, () =>
        HttpResponse.json(
          { error: { code: "FORBIDDEN", message: "private permission detail" } },
          { status: 403 },
        ),
      ),
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    const { router } = renderProductEditRoute();
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Nombre local conservado");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No tienes permiso para editar este producto.",
    );
    expect(screen.queryByText("private permission detail")).not.toBeInTheDocument();
    await waitFor(() => expect(name).toBeEnabled());
    expect(name).toHaveValue("Nombre local conservado");
    expect(router.state.location.pathname).toBe(`/products/${productUuid}/edit`);
    expect(screen.queryByText("Producto actualizado correctamente.")).not.toBeInTheDocument();
  });

  it("moves focus to the first invalid field after a keyboard save attempt", async () => {
    const user = userEvent.setup();

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    renderProductEditRoute();

    const sku = await screen.findByRole("textbox", { name: "SKU (obligatorio)" });
    await user.clear(sku);
    screen.getByRole("button", { name: "Guardar cambios" }).focus();
    await user.keyboard("{Enter}");

    const skuError = await screen.findByText("El SKU es obligatorio.");
    await waitFor(() => expect(sku).toHaveFocus());
    expect(sku).toHaveAttribute("aria-invalid", "true");
    expect(sku).toHaveAccessibleDescription(skuError.textContent ?? "");
  });

  it.each([
    {
      field: "SKU (obligatorio)",
      value: "",
      message: "El SKU es obligatorio.",
    },
    {
      field: "Nombre (obligatorio)",
      value: "   ",
      message: "El nombre es obligatorio.",
    },
    {
      field: "Precio de compra (obligatorio)",
      value: "-1",
      message: "El precio de compra no puede ser negativo.",
    },
    {
      field: "Precio de venta (obligatorio)",
      value: "1.234",
      message: "El precio de venta admite como máximo dos decimales.",
    },
  ])("shows the creation validation for $field on blur", async ({ field, value, message }) => {
    const user = userEvent.setup();

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    renderProductEditRoute();

    const input = await screen.findByRole("textbox", { name: field });
    await user.clear(input);
    if (value) {
      await user.type(input, value);
    }
    await user.tab();

    const error = await screen.findByText(message);

    expect(error).toBeVisible();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", expect.stringContaining(error.id));
  });
});
