import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { components } from "@/shared/api/generated/auth-contracts";
import { describe, expect, it } from "vitest";

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

describe("Product list remote query", () => {
  it("loads the default active page and requests the next page from the backend", async () => {
    const user = userEvent.setup();
    const productRequests: URL[] = [];
    const queryClient = createQueryClient();

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

    const router = createMemoryRouter(appRoutes, { initialEntries: ["/products"] });
    render(
      <QueryClientProvider client={queryClient}>
        <UiProvider>
          <RouterProvider router={router} />
        </UiProvider>
      </QueryClientProvider>,
    );

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

    router.dispose();
    queryClient.clear();
  });
});
