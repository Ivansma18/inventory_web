import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { components } from "@/shared/api/generated/auth-contracts";
import { afterEach, describe, expect, it } from "vitest";

import { appRoutes } from "@/app/router/router";
import { UiProvider } from "@/app/providers/ui.provider";
import { createQueryClient } from "@/shared/api/query-client";
import { server } from "../mocks/server";

const productUrl = "https://inventory.test/api/products";

const publicAuthResponse = (): components["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: {
      id: "product-list-user",
      email: "operator@example.com",
      role: "OPERATOR",
    },
    session: {
      id: "product-list-session",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
});

const product = (index: number) => ({
  uuid: `550e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}`,
  sku: `SKU-${String(index).padStart(3, "0")}`,
  name: `Producto ${String(index).padStart(3, "0")}`,
  description: null,
  purchasePrice: 25.5,
  salePrice: 31.25,
  categoryUuid: "550e8400-e29b-41d4-a716-446655440000",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const routeResources: Array<{
  queryClient: ReturnType<typeof createQueryClient>;
  router: ReturnType<typeof createMemoryRouter>;
}> = [];

const renderProductRoute = (initialEntry = "/products", queryClient = createQueryClient()) => {
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] });
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

describe("Product list remote query", () => {
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

    expect(router.state.location.search).toBe("");
    expect(screen.queryByRole("button", { name: "Limpiar búsqueda" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("No hay productos activos para mostrar.");
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
