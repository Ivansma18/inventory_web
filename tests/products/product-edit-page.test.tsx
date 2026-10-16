import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
import { createQueryClient } from "@/shared/api/query-client";
import { server } from "../mocks/server";
import {
  buildProductEditLocation,
  DEFAULT_PRODUCT_LIST_RETURN_TO,
} from "@/features/products/utils/product-edit-return-to";

const productsUrl = "https://inventory.test/api/products";
const productUuid = "650e8400-e29b-41d4-a716-446655440000";
const categoryUuid = "550e8400-e29b-41d4-a716-446655440000";
const alternativeCategoryUuid = "550e8400-e29b-41d4-a716-446655440001";
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
    http.get(productsUrl, () =>
      HttpResponse.json({ data: [product(true)], pagination: { total: 1, page: 1, limit: 15 } }),
    ),
  );
});

const renderProductEditRoute = (initialEntry = `/products/${productUuid}/edit`) => {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [initialEntry],
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
  it("shows an invalid-address state without requesting a malformed UUID and returns to the list", async () => {
    const user = userEvent.setup();
    const productRequests: string[] = [];

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(/\/api\/products\/[^/]+$/, ({ request }) => {
        productRequests.push(request.url);
        return HttpResponse.json({ data: product(true) });
      }),
    );

    const { router } = renderProductEditRoute(
      buildProductEditLocation("not-a-uuid", DEFAULT_PRODUCT_LIST_RETURN_TO),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La dirección del producto no es válida.",
    );
    expect(productRequests).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Volver al listado" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/products"));
    expect(router.state.location.search).toBe(
      DEFAULT_PRODUCT_LIST_RETURN_TO.slice("/products".length),
    );
  });

  it("shows a distinct not-found state for a 404 and returns to the list", async () => {
    const user = userEvent.setup();

    server.use(
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () =>
        HttpResponse.json(
          { error: { code: "PRODUCT_NOT_FOUND", message: "Product not found" } },
          { status: 404 },
        ),
      ),
    );

    const { router } = renderProductEditRoute(
      buildProductEditLocation(productUuid, DEFAULT_PRODUCT_LIST_RETURN_TO),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("No se encontró el producto.");
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();

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

  it("keeps the current category selected while searching and paging active options", async () => {
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

    getCategorySelect().focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(getCategorySelect()).toHaveValue("Repuestos");

    await user.click(screen.getByRole("button", { name: "Página siguiente de categorías" }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]?.searchParams.get("page")).toBe("2");
    expect(getCategorySelect()).toHaveValue("Repuestos");

    const categorySearch = screen.getByRole("searchbox", { name: "Buscar categorías activas" });
    await user.type(categorySearch, "repuesto");
    await user.click(screen.getByRole("button", { name: "Buscar categorías" }));
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2]?.searchParams.get("search")).toBe("repuesto");
    expect(getCategorySelect()).toHaveValue("Repuestos");
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
    const description = screen.getByRole("textbox", { name: "Descripción (opcional)" });
    const purchasePrice = screen.getByRole("textbox", { name: "Precio de compra (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Monitor actualizado");
    await user.clear(description);
    await user.clear(purchasePrice);
    await user.type(purchasePrice, "130,75");

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
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled(),
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

  it("keeps edited values enabled and reports an ordinary update error", async () => {
    const user = userEvent.setup();
    const { router } = renderProductEditRoute();

    server.use(
      http.patch(productUrl, () =>
        HttpResponse.json(
          { error: { code: "INTERNAL_ERROR", message: "private backend details" } },
          { status: 500 },
        ),
      ),
      http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())),
      http.get(productUrl, () => HttpResponse.json({ data: product(true) })),
    );

    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Nombre local conservado");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("No se pudieron guardar los cambios. Inténtalo de nuevo.");
    expect(error).not.toHaveTextContent("private backend details");
    await waitFor(() => expect(name).toBeEnabled());
    expect(name).toHaveValue("Nombre local conservado");
    expect(router.state.location.pathname).toBe(`/products/${productUuid}/edit`);
    expect(screen.queryByText("Producto actualizado correctamente.")).not.toBeInTheDocument();
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
