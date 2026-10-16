import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { components as authComponents } from "@/shared/api/generated/auth-contracts";
import type { components as productComponents } from "@/shared/api/generated/product-contracts";
import { afterEach, describe, expect, it } from "vitest";

import { appRoutes } from "@/app/router/router";
import { UiProvider } from "@/app/providers/ui.provider";
import { createQueryClient } from "@/shared/api/query-client";
import { server } from "../mocks/server";

const productUuid = "650e8400-e29b-41d4-a716-446655440000";
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

const product = (isActive: boolean): productComponents["schemas"]["Product"] => ({
  uuid: productUuid,
  sku: "SKU-EDIT-01",
  name: isActive ? "Monitor activo" : "Monitor inactivo",
  description: "Monitor de referencia",
  purchasePrice: 125.5,
  salePrice: 189.99,
  categoryUuid: "550e8400-e29b-41d4-a716-446655440000",
  isActive,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
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

const renderProductEditRoute = () => {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [`/products/${productUuid}/edit`],
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
