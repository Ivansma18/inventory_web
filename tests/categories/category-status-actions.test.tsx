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
import { createQueryClient } from "@/shared/api/query-client";
import { server } from "../mocks/server";

const categoriesUrl = "https://inventory.test/api/categories";
const categoryUuid = "550e8400-e29b-41d4-a716-446655440000";
const categoryUrl = `${categoriesUrl}/${categoryUuid}`;

const publicAuthResponse = (
  role: components["schemas"]["PublicAuthResponse"]["data"]["user"]["role"],
): components["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: { id: "category-status-user", email: "operator@example.com", role },
    session: { id: "category-status-session", createdAt: "2026-01-01T00:00:00.000Z" },
  },
});

const category = (isActive: boolean, name = "Herramientas") => ({
  uuid: categoryUuid,
  name,
  description: null,
  isActive,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
});

const routeResources: Array<{
  queryClient: ReturnType<typeof createQueryClient>;
  router: ReturnType<typeof createMemoryRouter>;
}> = [];

const renderCategoryList = (
  role: components["schemas"]["PublicAuthResponse"]["data"]["user"]["role"],
  isActive: boolean,
  initialEntry?: string,
  queryClient = createQueryClient(),
) => {
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [initialEntry ?? (isActive ? "/categories" : "/categories?status=inactive")],
  });
  routeResources.push({ queryClient, router });

  server.use(
    http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse(role))),
    http.get(categoriesUrl, ({ request }) => {
      const isRequestedActive = new URL(request.url).searchParams.get("isActive") !== "false";

      return HttpResponse.json({
        data: [category(isRequestedActive)],
        pagination: { total: 1, page: 1, limit: 15 },
      });
    }),
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

describe("category status actions", () => {
  it.each(["ADMIN", "MANAGER", "OPERATOR", "VIEWER"] as const)(
    "shows the status-appropriate action to %s for active and inactive categories",
    async (role) => {
      const { router } = renderCategoryList(role, true);
      const activeRow = await screen.findByRole("row", { name: /Herramientas/ });

      expect(within(activeRow).getByText("Activa")).toBeVisible();
      expect(within(activeRow).getByRole("button", { name: "Desactivar" })).toBeVisible();

      await router.navigate("/categories?status=inactive");
      await screen.findByText("Inactiva");
      const inactiveRow = await screen.findByRole("row", { name: /Herramientas/ });

      expect(within(inactiveRow).getByText("Inactiva")).toBeVisible();
      expect(within(inactiveRow).getByRole("button", { name: "Activar" })).toBeVisible();
    },
  );

  it.each([
    {
      isActive: true,
      action: "Desactivar",
      title: "Confirmar desactivación",
      expectedState: "Activa",
    },
    {
      isActive: false,
      action: "Activar",
      title: "Confirmar activación",
      expectedState: "Inactiva",
    },
  ])(
    "identifies the category before $action and cancellation preserves state without a request",
    async ({ isActive, action, title, expectedState }) => {
      const user = userEvent.setup();
      let mutationRequests = 0;

      const { router } = renderCategoryList("OPERATOR", isActive);
      server.use(
        http.patch(categoryUrl, () => {
          mutationRequests += 1;
          return HttpResponse.json({ data: category(!isActive) });
        }),
        http.delete(categoryUrl, () => {
          mutationRequests += 1;
          return HttpResponse.json({ data: category(!isActive) });
        }),
      );

      const row = await screen.findByRole("row", { name: /Herramientas/ });
      await user.click(within(row).getByRole("button", { name: action }));

      const dialog = await screen.findByRole("dialog", { name: title });
      expect(dialog).toHaveTextContent("Herramientas");
      if (isActive) {
        expect(dialog).toHaveTextContent(
          "La categoría se conservará en el catálogo; desactivarla no la elimina.",
        );
      } else {
        expect(dialog).not.toHaveTextContent("desactivarla no la elimina");
      }
      expect(mutationRequests).toBe(0);

      await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(within(row).getByText(expectedState)).toBeVisible();
      expect(within(row).getByRole("button", { name: action })).toBeVisible();
      expect(mutationRequests).toBe(0);
      expect(router.state.location.pathname).toBe("/categories");
    },
  );

  it("opens category editing with the current list criteria as its safe return location", async () => {
    const user = userEvent.setup();
    const sourceSearch = "?page=1&search=almacen&status=active&sort=updatedAt&order=desc";
    const { router } = renderCategoryList("OPERATOR", true, `/categories${sourceSearch}`);
    const row = await screen.findByRole("row", { name: /Herramientas/ });

    server.use(http.get(categoryUrl, () => HttpResponse.json({ data: category(true) })));
    await user.click(within(row).getByRole("button", { name: "Editar" }));

    expect(await screen.findByRole("heading", { name: "Editar categoría" })).toBeVisible();
    expect(router.state.location.pathname).toBe(`/categories/${categoryUuid}/edit`);
    expect(new URLSearchParams(router.state.location.search).get("returnTo")).toBe(
      `/categories${sourceSearch}`,
    );
    expect(screen.getByRole("textbox", { name: /Nombre/ })).toHaveValue("Herramientas");
  });

  it.each([
    {
      scenario: "the category is no longer present in the current query",
      updatedRows: [],
      message:
        "La categoría ya no aparece en la consulta actual. Se actualizará el listado; comprueba su disponibilidad antes de iniciar otra acción.",
      updatedBadge: null,
    },
    {
      scenario: "the category now has a different status",
      updatedRows: [category(false)],
      message:
        "El estado de la categoría cambió desde que abriste la confirmación. Se actualizará el listado; revisa su estado antes de iniciar otra acción.",
      updatedBadge: "Inactiva",
    },
  ])(
    "blocks a stale confirmation when refreshed information shows that $scenario",
    async ({ updatedRows, message, updatedBadge }) => {
      const user = userEvent.setup();
      const { queryClient, router } = renderCategoryList("OPERATOR", true);
      const row = await screen.findByRole("row", { name: /Herramientas/ });
      let listRequestCount = 0;
      let patchRequestCount = 0;

      server.use(
        http.get(categoriesUrl, ({ request }) => {
          listRequestCount += 1;
          const url = new URL(request.url);
          expect(url.searchParams.get("isActive")).toBe("true");
          return HttpResponse.json({
            data: updatedRows,
            pagination: { total: updatedRows.length, page: 1, limit: 15 },
          });
        }),
        http.patch(categoryUrl, () => {
          patchRequestCount += 1;
          return HttpResponse.json({ data: category(false) });
        }),
      );

      await user.click(within(row).getByRole("button", { name: "Desactivar" }));
      const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });

      await act(async () => {
        await queryClient.invalidateQueries({
          queryKey: ["categories", "management-list", "category-status-session"],
        });
      });

      expect(listRequestCount).toBe(1);
      expect(
        queryClient
          .getQueryCache()
          .findAll({ queryKey: ["categories", "management-list", "category-status-session"] })
          .at(0)?.state.data,
      ).toMatchObject({ data: updatedRows });
      await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(message);
      expect(within(dialog).getByRole("button", { name: "Cerrar" })).toBeVisible();
      expect(within(dialog).queryByRole("button", { name: "Desactivar" })).not.toBeInTheDocument();
      await waitFor(() => expect(listRequestCount).toBe(2));
      expect(patchRequestCount).toBe(0);
      expect(router.state.location.pathname).toBe("/categories");
      expect(screen.queryByText("Categoría desactivada correctamente.")).not.toBeInTheDocument();

      await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      if (updatedBadge) {
        const refreshedRow = await screen.findByRole("row", { name: /Herramientas/ });
        expect(within(refreshedRow).getByText(updatedBadge)).toBeVisible();
      } else {
        expect(await screen.findByText("No hay categorías para mostrar.")).toBeVisible();
      }
    },
  );

  it.each([
    {
      initialIsActive: true,
      targetIsActive: false,
      action: "Desactivar",
      confirmAction: "Desactivar",
      expectedState: "Activa",
      status: "active",
    },
    {
      initialIsActive: false,
      targetIsActive: true,
      action: "Activar",
      confirmAction: "Activar",
      expectedState: "Inactiva",
      status: "inactive",
    },
  ])(
    "keeps $expectedState while the $confirmAction request is pending, blocks duplicate/edit actions, then refreshes the applied query",
    async ({ initialIsActive, targetIsActive, action, confirmAction, expectedState, status }) => {
      const user = userEvent.setup();
      const sourceSearch = `?page=1&search=almacen&status=${status}&sort=updatedAt&order=desc`;
      const { router } = renderCategoryList(
        "OPERATOR",
        initialIsActive,
        `/categories${sourceSearch}`,
      );
      const row = await screen.findByRole("row", { name: /Herramientas/ });
      const listRequests: URL[] = [];
      let patchRequestCount = 0;
      let patchBody: unknown;
      let deleteRequestCount = 0;
      let currentIsActive = initialIsActive;
      let resolvePatchResponse!: (response: Response) => void;

      server.use(
        http.get(categoriesUrl, ({ request }) => {
          const url = new URL(request.url);
          listRequests.push(url);
          const requestedIsActive = url.searchParams.get("isActive") === "true";
          const rows = requestedIsActive === currentIsActive ? [category(currentIsActive)] : [];

          return HttpResponse.json({
            data: rows,
            pagination: { total: rows.length, page: 1, limit: 15 },
          });
        }),
        http.patch(categoryUrl, async ({ request }) => {
          patchRequestCount += 1;
          patchBody = await request.json();

          return new Promise<Response>((resolve) => {
            resolvePatchResponse = (response) => {
              currentIsActive = targetIsActive;
              resolve(response);
            };
          });
        }),
        http.delete(categoryUrl, () => {
          deleteRequestCount += 1;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await user.click(within(row).getByRole("button", { name: action }));
      const dialog = await screen.findByRole("dialog", {
        name: initialIsActive ? "Confirmar desactivación" : "Confirmar activación",
      });
      await user.click(within(dialog).getByRole("button", { name: confirmAction }));

      await waitFor(() => expect(patchRequestCount).toBe(1));
      expect(patchBody).toEqual({ isActive: targetIsActive });
      expect(within(row).getByText(expectedState)).toBeVisible();
      expect(dialog).toHaveTextContent("Actualizando el estado de la categoría…");

      const pendingConfirmButton = within(dialog).getByRole("button", {
        name: confirmAction,
      });
      expect(pendingConfirmButton).toBeDisabled();
      expect(pendingConfirmButton).toHaveAttribute("aria-busy", "true");
      await user.click(pendingConfirmButton);
      expect(patchRequestCount).toBe(1);

      await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      const pendingRow = screen.getByRole("row", { name: /Herramientas/ });
      expect(within(pendingRow).getByText(expectedState)).toBeVisible();

      const pendingAction = within(pendingRow).getByRole("button", { name: action });
      const editAction = within(pendingRow).getByRole("button", { name: "Editar" });
      expect(pendingAction).toBeDisabled();
      expect(pendingAction).toHaveAttribute("aria-busy", "true");
      expect(editAction).toBeDisabled();
      await user.click(pendingAction);
      await user.click(editAction);
      expect(patchRequestCount).toBe(1);
      expect(router.state.location.pathname).toBe("/categories");
      expect(router.state.location.search).toBe(sourceSearch);

      resolvePatchResponse(HttpResponse.json({ data: category(targetIsActive) }));

      expect(
        await screen.findByText(
          `Categoría ${targetIsActive ? "activada" : "desactivada"} correctamente.`,
        ),
      ).toBeVisible();
      await screen.findByText("No se encontraron categorías con esta búsqueda.");
      await waitFor(() => expect(listRequests.length).toBeGreaterThan(0));

      const refreshedRequest = listRequests.at(-1);
      expect(refreshedRequest?.searchParams.get("page")).toBe("1");
      expect(refreshedRequest?.searchParams.get("search")).toBe("almacen");
      expect(refreshedRequest?.searchParams.get("isActive")).toBe(String(initialIsActive));
      expect(refreshedRequest?.searchParams.get("sort")).toBe("updatedAt");
      expect(refreshedRequest?.searchParams.get("order")).toBe("desc");
      expect(deleteRequestCount).toBe(0);
      expect(router.state.location.search).toBe(sourceSearch);
    },
  );

  it("keeps the confirmation and existing state when the response cannot confirm the requested status", async () => {
    const user = userEvent.setup();
    let patchRequestCount = 0;
    let listRequestCount = 0;

    renderCategoryList("OPERATOR", true);
    const row = await screen.findByRole("row", { name: /Herramientas/ });
    server.use(
      http.get(categoriesUrl, () => {
        listRequestCount += 1;
        return HttpResponse.json({
          data: [category(true)],
          pagination: { total: 1, page: 1, limit: 15 },
        });
      }),
      http.patch(categoryUrl, () => {
        patchRequestCount += 1;
        return HttpResponse.json({ data: category(true) });
      }),
    );

    await user.click(within(row).getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "No se pudo confirmar el cambio de estado. Revisa el estado de la categoría antes de volver a intentarlo.",
    );
    expect(within(row).getByText("Activa")).toBeVisible();
    expect(screen.queryByText("Categoría desactivada correctamente.")).not.toBeInTheDocument();
    expect(patchRequestCount).toBe(1);
    expect(listRequestCount).toBe(0);
  });

  it.each([
    { associatedProductStatus: "activo", associatedProductIsActive: true },
    { associatedProductStatus: "inactivo", associatedProductIsActive: false },
  ])(
    "explains that an associated $associatedProductStatus product prevents deactivation without changing the category or offering direct retry",
    async ({ associatedProductIsActive }) => {
      const user = userEvent.setup();
      let patchRequestCount = 0;
      let deleteRequestCount = 0;
      let listRequestCount = 0;

      renderCategoryList("OPERATOR", true);
      const row = await screen.findByRole("row", { name: /Herramientas/ });
      server.use(
        http.get(categoriesUrl, () => {
          listRequestCount += 1;
          return HttpResponse.json({
            data: [category(true)],
            pagination: { total: 1, page: 1, limit: 15 },
          });
        }),
        http.patch(categoryUrl, () => {
          patchRequestCount += 1;
          return HttpResponse.json(
            {
              error: {
                code: "CATEGORY_HAS_ASSOCIATED_PRODUCTS",
                message: associatedProductIsActive
                  ? "Category has an active associated product."
                  : "Category has an inactive associated product.",
              },
            },
            { status: 409 },
          );
        }),
        http.delete(categoryUrl, () => {
          deleteRequestCount += 1;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await user.click(within(row).getByRole("button", { name: "Desactivar" }));
      const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
      await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "No se puede desactivar la categoría porque tiene productos asociados.",
      );
      expect(dialog).toHaveTextContent("La categoría seguirá activa.");
      expect(dialog).toHaveTextContent("Esta acción no reasigna productos.");
      expect(dialog).not.toHaveTextContent("Category has an");
      expect(within(dialog).queryByRole("button", { name: "Desactivar" })).not.toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Cerrar" })).toBeVisible();
      expect(within(row).getByText("Activa")).toBeVisible();
      expect(screen.queryByText("Categoría desactivada correctamente.")).not.toBeInTheDocument();
      expect(patchRequestCount).toBe(1);
      expect(deleteRequestCount).toBe(0);
      expect(listRequestCount).toBe(0);

      await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(within(row).getByText("Activa")).toBeVisible();
      expect(patchRequestCount).toBe(1);
    },
  );

  it("reports insufficient permission without success or a direct retry", async () => {
    const user = userEvent.setup();
    let patchRequestCount = 0;
    let deleteRequestCount = 0;
    let listRequestCount = 0;

    renderCategoryList("OPERATOR", true);
    const row = await screen.findByRole("row", { name: /Herramientas/ });
    server.use(
      http.get(categoriesUrl, () => {
        listRequestCount += 1;
        return HttpResponse.json({
          data: [category(true)],
          pagination: { total: 1, page: 1, limit: 15 },
        });
      }),
      http.patch(categoryUrl, () => {
        patchRequestCount += 1;
        return HttpResponse.json(
          { error: { code: "FORBIDDEN", message: "Sensitive backend authorization details." } },
          { status: 403 },
        );
      }),
      http.delete(categoryUrl, () => {
        deleteRequestCount += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await user.click(within(row).getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "No tienes permiso para cambiar el estado de esta categoría. No se realizaron cambios.",
    );
    expect(dialog).not.toHaveTextContent("Sensitive backend authorization details");
    expect(within(dialog).queryByRole("button", { name: "Desactivar" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cerrar" })).toBeVisible();
    expect(within(row).getByText("Activa")).toBeVisible();
    expect(screen.queryByText("Categoría desactivada correctamente.")).not.toBeInTheDocument();
    expect(patchRequestCount).toBe(1);
    expect(deleteRequestCount).toBe(0);
    expect(listRequestCount).toBe(0);

    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(row).getByText("Activa")).toBeVisible();
    expect(patchRequestCount).toBe(1);
  });

  it("offers manual retry for HTTP 429 only while the active category remains available", async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    queryClient.setMutationDefaults(
      ["categories", "mutation", "category-status-session", "status"],
      { retry: 3, retryDelay: 1 },
    );
    renderCategoryList("OPERATOR", true, undefined, queryClient);
    let patchRequestCount = 0;
    let deleteRequestCount = 0;
    let listRequestCount = 0;
    let isActive = true;
    const requestBodies: unknown[] = [];
    let resolveRetryResponse!: (response: Response) => void;

    const row = await screen.findByRole("row", { name: /Herramientas/ });
    server.use(
      http.get(categoriesUrl, ({ request }) => {
        listRequestCount += 1;
        const requestedIsActive = new URL(request.url).searchParams.get("isActive") === "true";
        const rows = requestedIsActive === isActive ? [category(isActive)] : [];

        return HttpResponse.json({
          data: rows,
          pagination: { total: rows.length, page: 1, limit: 15 },
        });
      }),
      http.patch(categoryUrl, async ({ request }) => {
        patchRequestCount += 1;
        requestBodies.push(await request.json());

        if (patchRequestCount === 1) {
          return HttpResponse.json(
            { error: { code: "RATE_LIMITED", message: "Internal rate-limit details." } },
            { status: 429 },
          );
        }

        return new Promise<Response>((resolve) => {
          resolveRetryResponse = (response) => {
            isActive = false;
            resolve(response);
          };
        });
      }),
      http.delete(categoryUrl, () => {
        deleteRequestCount += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await user.click(within(row).getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "El servidor rechazó temporalmente el cambio por límite de solicitudes. Puedes reintentarlo manualmente.",
    );
    expect(dialog).not.toHaveTextContent("Internal rate-limit details.");
    expect(within(dialog).getByRole("button", { name: "Reintentar" })).toBeVisible();
    expect(within(row).getByText("Activa")).toBeVisible();
    expect(screen.queryByText("Categoría desactivada correctamente.")).not.toBeInTheDocument();
    expect(patchRequestCount).toBe(1);
    expect(listRequestCount).toBe(0);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(patchRequestCount).toBe(1);

    await user.click(within(dialog).getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(patchRequestCount).toBe(2));
    expect(within(dialog).getByRole("button", { name: "Reintentar" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Reintentar" })).toHaveAttribute(
      "aria-busy",
      "true",
    );

    resolveRetryResponse(HttpResponse.json({ data: category(false) }));
    expect(await screen.findByText("Categoría desactivada correctamente.")).toBeVisible();
    expect(await screen.findByText("No hay categorías para mostrar.")).toBeVisible();
    expect(requestBodies).toEqual([{ isActive: false }, { isActive: false }]);
    expect(patchRequestCount).toBe(2);
    expect(deleteRequestCount).toBe(0);
    expect(listRequestCount).toBeGreaterThan(0);
  });

  it.each([
    {
      scenario: "a 404 category-not-found response",
      status: 404,
      body: { error: { code: "CATEGORY_NOT_FOUND", message: "Not found." } },
    },
    {
      scenario: "a 5xx uncertain response",
      status: 503,
      body: { error: { code: "SERVICE_UNAVAILABLE", message: "Unavailable." } },
    },
    {
      scenario: "an invalid successful response with uncertain outcome",
      status: 200,
      body: { data: category(true) },
    },
  ])("does not offer manual retry for $scenario", async ({ status, body }) => {
    const user = userEvent.setup();
    let patchRequestCount = 0;

    renderCategoryList("OPERATOR", true);
    const row = await screen.findByRole("row", { name: /Herramientas/ });
    server.use(
      http.patch(categoryUrl, () => {
        patchRequestCount += 1;
        return HttpResponse.json(body, { status });
      }),
    );

    await user.click(within(row).getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    expect(await within(dialog).findByRole("alert")).toBeVisible();
    expect(within(dialog).queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Desactivar" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cerrar" })).toBeVisible();
    expect(within(row).getByText("Activa")).toBeVisible();
    expect(patchRequestCount).toBe(1);

    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(patchRequestCount).toBe(1);
  });

  it("does not offer manual retry for a network result with uncertain outcome", async () => {
    const user = userEvent.setup();
    let patchRequestCount = 0;

    renderCategoryList("OPERATOR", true);
    const row = await screen.findByRole("row", { name: /Herramientas/ });
    server.use(
      http.patch(categoryUrl, () => {
        patchRequestCount += 1;
        return HttpResponse.error();
      }),
    );

    await user.click(within(row).getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    expect(await within(dialog).findByRole("alert")).toBeVisible();
    expect(within(dialog).queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cerrar" })).toBeVisible();
    expect(within(row).getByText("Activa")).toBeVisible();
    expect(patchRequestCount).toBe(1);
  });
});
