import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const categoriesUrl = "https://inventory.test/api/categories";

const publicAuthResponse = (): components["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: {
      id: "product-create-user",
      email: "operator@example.com",
      role: "OPERATOR",
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

const routeResources: Array<{
  queryClient: ReturnType<typeof createQueryClient>;
  router: ReturnType<typeof createMemoryRouter>;
}> = [];

const renderProductCreateRoute = () => {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(appRoutes, { initialEntries: ["/products/new"] });
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

describe("product creation form", () => {
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
});
