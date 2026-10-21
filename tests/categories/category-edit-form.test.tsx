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
const categoryUrl = `${categoriesUrl}/${categoryUuid}`;

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

const publicAuthResponse = (
  role: components["schemas"]["PublicAuthResponse"]["data"]["user"]["role"] = "OPERATOR",
): components["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: { id: "category-edit-user", email: "operator@example.com", role },
    session: { id: "category-edit-session", createdAt: "2026-01-01T00:00:00.000Z" },
  },
});

const category = (name = "Herramientas", description: string | null = "Para mantenimiento") => ({
  uuid: categoryUuid,
  name,
  description,
  isActive: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
});

const routeResources: Array<{
  queryClient: ReturnType<typeof createQueryClient>;
  router: ReturnType<typeof createMemoryRouter>;
}> = [];

const renderCategoryEditRoute = (
  role?: components["schemas"]["PublicAuthResponse"]["data"]["user"]["role"],
  returnTo?: string,
) => {
  const queryClient = createQueryClient();
  const route = `/categories/${categoryUuid}/edit`;
  const initialEntry = returnTo
    ? `${route}?${new URLSearchParams({ returnTo }).toString()}`
    : route;
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] });
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

describe("category edit form", () => {
  it.each(["ADMIN", "MANAGER", "OPERATOR", "VIEWER"] as const)(
    "keeps the save action visible for the %s role",
    async (role) => {
      server.use(http.get(categoryUrl, () => HttpResponse.json({ data: category() })));

      renderCategoryEditRoute(role);

      expect(await screen.findByRole("button", { name: "Guardar cambios" })).toBeVisible();
    },
  );

  it("locks the fields and sends one partial update while pending, then confirms and returns to its source list", async () => {
    const user = userEvent.setup();
    const sourceListUrl =
      "/categories?page=3&search=tools&status=inactive&sort=updatedAt&order=desc";
    const patchResponse = deferred<Response>();
    const updateStarted = deferred<void>();
    const listRequests: URL[] = [];
    const patchBodies: unknown[] = [];

    server.use(
      http.get(categoryUrl, () => HttpResponse.json({ data: category() })),
      http.patch(categoryUrl, async ({ request }) => {
        patchBodies.push(await request.json());
        updateStarted.resolve();
        return patchResponse.promise;
      }),
      http.get(categoriesUrl, ({ request }) => {
        listRequests.push(new URL(request.url));
        return HttpResponse.json({
          data: [category("Herramientas actualizadas")],
          pagination: { total: 46, page: 3, limit: 15 },
        });
      }),
    );

    const { router } = renderCategoryEditRoute("VIEWER", sourceListUrl);
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    const description = screen.getByRole("textbox", { name: "Descripción (opcional)" });
    await user.clear(name);
    await user.type(name, "Herramientas actualizadas");

    const form = screen.getByRole("form", { name: "Datos de la categoría" });
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await updateStarted.promise;

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Guardando cambios de la categoría…",
    );
    expect(name).toBeDisabled();
    expect(description).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardando cambios…" })).toBeDisabled();
    expect(patchBodies).toEqual([{ name: "Herramientas actualizadas" }]);
    expect(screen.queryByText("Categoría actualizada correctamente.")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/categories/${categoryUuid}/edit`);

    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(patchBodies).toHaveLength(1);

    await act(async () => {
      patchResponse.resolve(HttpResponse.json({ data: category("Herramientas actualizadas") }));
    });

    expect(await screen.findByText("Categoría actualizada correctamente.")).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe("/categories"));
    expect(router.state.location.search).toBe(
      "?page=3&search=tools&status=inactive&sort=updatedAt&order=desc",
    );
    expect(await screen.findByRole("heading", { level: 1, name: "Categorías" })).toBeVisible();
    await waitFor(() => expect(listRequests).toHaveLength(1));
    expect(Object.fromEntries(listRequests[0]!.searchParams)).toEqual({
      page: "3",
      limit: "15",
      search: "tools",
      isActive: "false",
      sort: "updatedAt",
      order: "desc",
    });
    expect(patchBodies).toHaveLength(1);
  });

  it("does not announce success or leave the form when the update response is invalid", async () => {
    const user = userEvent.setup();
    let patchRequests = 0;

    server.use(
      http.get(categoryUrl, () => HttpResponse.json({ data: category() })),
      http.patch(categoryUrl, () => {
        patchRequests += 1;
        return HttpResponse.json({ data: { uuid: categoryUuid, name: "Respuesta incompleta" } });
      }),
    );

    const { router } = renderCategoryEditRoute();
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Nombre nuevo");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo confirmar la actualización. Revisa la categoría antes de volver a intentarlo.",
    );
    expect(screen.queryByText("Categoría actualizada correctamente.")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/categories/${categoryUuid}/edit`);
    expect(name).toHaveValue("Nombre nuevo");
    expect(name).toBeEnabled();
    expect(patchRequests).toBe(1);
  });

  it("does not send an update when the values match the loaded category", async () => {
    let patchRequests = 0;
    server.use(
      http.get(categoryUrl, () => HttpResponse.json({ data: category() })),
      http.patch(categoryUrl, () => {
        patchRequests += 1;
        return HttpResponse.json({ data: category() });
      }),
    );

    renderCategoryEditRoute();
    const saveButton = await screen.findByRole("button", { name: "Guardar cambios" });

    expect(saveButton).toBeDisabled();
    fireEvent.submit(screen.getByRole("form", { name: "Datos de la categoría" }));
    await waitFor(() => expect(patchRequests).toBe(0));
  });
});
