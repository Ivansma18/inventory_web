import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { components } from "@/shared/api/generated/auth-contracts";
import { afterEach, describe, expect, it } from "vitest";

import { UiProvider } from "@/app/providers/ui.provider";
import { appRoutes } from "@/app/router/router";
import { createQueryClient } from "@/shared/api/query-client";
import { server } from "../mocks/server";

const categoriesUrl = "https://inventory.test/api/categories";
const categoryUuid = "550e8400-e29b-41d4-a716-446655440000";

const publicAuthResponse = (
  role: components["schemas"]["PublicAuthResponse"]["data"]["user"]["role"] = "OPERATOR",
): components["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: { id: "category-create-user", email: "operator@example.com", role },
    session: { id: "category-create-session", createdAt: "2026-01-01T00:00:00.000Z" },
  },
});

const category = (name: string, description: string | null = null) => ({
  uuid: categoryUuid,
  name,
  description,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const routeResources: Array<{
  queryClient: ReturnType<typeof createQueryClient>;
  router: ReturnType<typeof createMemoryRouter>;
}> = [];

const renderCategoryCreateRoute = (
  role?: components["schemas"]["PublicAuthResponse"]["data"]["user"]["role"],
) => {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(appRoutes, { initialEntries: ["/categories/new"] });
  routeResources.push({ queryClient, router });

  server.use(
    http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse(role))),
  );

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

describe("category creation page", () => {
  it.each(["ADMIN", "MANAGER", "OPERATOR", "VIEWER"] as const)(
    "keeps the create action visible for the %s role",
    async (role) => {
      renderCategoryCreateRoute(role);

      expect(await screen.findByRole("button", { name: "Crear categoría" })).toBeVisible();
    },
  );

  it("locks the form while creating and returns to the default active list after confirmation", async () => {
    const user = userEvent.setup();
    let createRequestCount = 0;
    let submittedBody: unknown;
    let requestedListUrl: URL | undefined;
    let markCreateRequestStarted!: () => void;
    let resolveCreate!: (response: Response) => void;
    const createRequestStarted = new Promise<void>((resolve) => {
      markCreateRequestStarted = resolve;
    });
    const deferredCreate = new Promise<Response>((resolve) => {
      resolveCreate = resolve;
    });

    server.use(
      http.post(categoriesUrl, async ({ request }) => {
        createRequestCount += 1;
        submittedBody = await request.json();
        markCreateRequestStarted();
        return deferredCreate;
      }),
      http.get(categoriesUrl, ({ request }) => {
        requestedListUrl = new URL(request.url);
        return HttpResponse.json({
          data: [category("Herramientas", "Para mantenimiento")],
          pagination: { total: 1, page: 1, limit: 15 },
        });
      }),
    );

    const { router } = renderCategoryCreateRoute();
    await screen.findByRole("heading", { level: 1, name: "Crear categoría" });
    const name = screen.getByRole("textbox", { name: "Nombre (obligatorio)" });
    const description = screen.getByRole("textbox", { name: "Descripción (opcional)" });
    await user.type(name, "Herramientas");
    await user.type(description, "Para mantenimiento");

    const form = screen.getByRole("form", { name: "Datos de la categoría" });
    await user.click(screen.getByRole("button", { name: "Crear categoría" }));
    await createRequestStarted;

    expect(await screen.findByRole("status")).toHaveTextContent("Creando categoría…");
    expect(name).toBeDisabled();
    expect(description).toBeDisabled();
    expect(screen.getByRole("button", { name: "Creando categoría…" })).toBeDisabled();
    expect(submittedBody).toEqual({ name: "Herramientas", description: "Para mantenimiento" });
    expect(screen.queryByText("Categoría creada correctamente.")).not.toBeInTheDocument();

    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(createRequestCount).toBe(1);

    await act(async () => {
      resolveCreate(
        HttpResponse.json(
          { data: category("Herramientas", "Para mantenimiento") },
          { status: 201 },
        ),
      );
    });

    expect(await screen.findByText("Categoría creada correctamente.")).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe("/categories"));
    expect(router.state.location.search).toBe("?page=1&status=active&sort=name&order=asc");
    expect(await screen.findByRole("heading", { level: 1, name: "Categorías" })).toBeVisible();
    await waitFor(() => expect(requestedListUrl).toBeDefined());
    expect(Object.fromEntries(requestedListUrl!.searchParams)).toEqual({
      page: "1",
      limit: "15",
      isActive: "true",
      sort: "name",
      order: "asc",
    });
    expect(createRequestCount).toBe(1);
  });
});
