import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { components } from "@/shared/api/generated/auth-contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { appRoutes } from "@/app/router/router";
import { UiProvider } from "@/app/providers/ui.provider";
import { useSession } from "@/features/auth";
import type { UseSessionResult } from "@/features/auth";
import { createQueryClient } from "@/shared/api/query-client";
import { categoryDetailQueryKey } from "@/features/categories/hooks/use-category";
import { server } from "../mocks/server";

const categoriesUrl = "https://inventory.test/api/categories";
const categoryUuid = "550e8400-e29b-41d4-a716-446655440000";
const categoryStatusSessionId = "category-status-session";
const categoryUrl = `${categoriesUrl}/${categoryUuid}`;

const publicAuthResponse = (
  role: components["schemas"]["PublicAuthResponse"]["data"]["user"]["role"],
  sessionId = categoryStatusSessionId,
): components["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: { id: "category-status-user", email: "operator@example.com", role },
    session: { id: sessionId, createdAt: "2026-01-01T00:00:00.000Z" },
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

const renderCategoryList = (
  role: components["schemas"]["PublicAuthResponse"]["data"]["user"]["role"],
  isActive: boolean,
  initialEntry?: string,
  queryClient = createQueryClient(),
  sessionResponse?: () => Response | Promise<Response>,
  onSessionRefetch?: (refetch: UseSessionResult["refetch"]) => void,
) => {
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [initialEntry ?? (isActive ? "/categories" : "/categories?status=inactive")],
  });
  routeResources.push({ queryClient, router });
  const SessionRefreshDriver = () => {
    const session = useSession();
    onSessionRefetch?.(session.refetch);
    return null;
  };

  server.use(
    http.get(
      /\/api\/auth\/get-session/,
      () => sessionResponse?.() ?? HttpResponse.json(publicAuthResponse(role)),
    ),
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

describe("category status actions", () => {
  it("discards a late status result after the session is replaced", async () => {
    const patchResponse = deferred<Response>();
    const patchStarted = deferred<void>();
    const sessionRefresh = deferred<Response>();
    const sessionRefreshStarted = deferred<void>();
    let shouldHoldSessionRefresh = false;
    let refetchSession: UseSessionResult["refetch"] | undefined;
    let patchRequestCount = 0;
    let listRequestCount = 0;

    const { queryClient, router } = renderCategoryList(
      "OPERATOR",
      true,
      undefined,
      undefined,
      () => {
        if (shouldHoldSessionRefresh) {
          sessionRefreshStarted.resolve();
          return sessionRefresh.promise;
        }

        return HttpResponse.json(publicAuthResponse("OPERATOR", categoryStatusSessionId));
      },
      (refetch) => {
        refetchSession = refetch;
      },
    );
    const row = await screen.findByRole("row", { name: /Herramientas/ });

    server.use(
      http.patch(categoryUrl, () => {
        patchRequestCount += 1;
        patchStarted.resolve();
        return patchResponse.promise;
      }),
      http.get(categoriesUrl, ({ request }) => {
        listRequestCount += 1;
        const isActive = new URL(request.url).searchParams.get("isActive") !== "false";
        return HttpResponse.json({
          data: [category(isActive)],
          pagination: { total: 1, page: 1, limit: 15 },
        });
      }),
    );

    await userEvent.setup().click(within(row).getByRole("button", { name: "Desactivar" }));
    const confirmation = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await userEvent.setup().click(within(confirmation).getByRole("button", { name: "Desactivar" }));
    await patchStarted.promise;

    shouldHoldSessionRefresh = true;
    if (!refetchSession) {
      throw new Error("The session refresh driver did not expose refetch.");
    }
    let refreshResult!: ReturnType<UseSessionResult["refetch"]>;
    act(() => {
      refreshResult = refetchSession!();
    });
    await sessionRefreshStarted.promise;
    expect(await screen.findByRole("heading", { name: "Comprobando tu sesión" })).toBeVisible();

    sessionRefresh.resolve(
      HttpResponse.json(publicAuthResponse("OPERATOR", "category-status-session-b")),
    );
    await act(async () => refreshResult);

    const newSessionRow = await screen.findByRole("row", { name: /Herramientas/ });
    expect(within(newSessionRow).getByText("Activa")).toBeVisible();
    expect(within(newSessionRow).getByRole("button", { name: "Desactivar" })).toBeEnabled();
    expect(router.state.location.pathname).toBe("/categories");
    expect(listRequestCount).toBeGreaterThan(0);
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const focusAfterReplacement = document.activeElement;

    await act(async () => {
      patchResponse.resolve(HttpResponse.json({ data: category(false) }));
    });

    expect(patchRequestCount).toBe(1);
    expect(router.state.location.pathname).toBe("/categories");
    expect(within(newSessionRow).getByText("Activa")).toBeVisible();
    expect(within(newSessionRow).getByRole("button", { name: "Desactivar" })).toBeEnabled();
    expect(screen.queryByText("Categoría desactivada correctamente.")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(focusAfterReplacement);
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .filter((query) => query.queryKey[0] === "categories")
        .every((query) => query.queryKey[2] === "category-status-session-b"),
    ).toBe(true);
    expect(
      invalidateQueries.mock.calls.every(
        ([filters]) => filters?.queryKey?.[2] !== categoryStatusSessionId,
      ),
    ).toBe(true);

    shouldHoldSessionRefresh = false;
    let restoreSessionResult!: ReturnType<UseSessionResult["refetch"]>;
    act(() => {
      restoreSessionResult = refetchSession!();
    });
    await act(async () => restoreSessionResult);
  });

  it("discards a late uncertainty check after the session is replaced and releases the new session action", async () => {
    const detailResponse = deferred<Response>();
    const detailStarted = deferred<void>();
    const sessionRefresh = deferred<Response>();
    const sessionRefreshStarted = deferred<void>();
    let shouldHoldSessionRefresh = false;
    let refetchSession: UseSessionResult["refetch"] | undefined;
    let patchRequestCount = 0;
    let detailRequestCount = 0;

    const { queryClient, router } = renderCategoryList(
      "OPERATOR",
      true,
      undefined,
      undefined,
      () => {
        if (shouldHoldSessionRefresh) {
          sessionRefreshStarted.resolve();
          return sessionRefresh.promise;
        }

        return HttpResponse.json(publicAuthResponse("OPERATOR", categoryStatusSessionId));
      },
      (refetch) => {
        refetchSession = refetch;
      },
    );
    const row = await screen.findByRole("row", { name: /Herramientas/ });

    server.use(
      http.patch(categoryUrl, () => {
        patchRequestCount += 1;
        return HttpResponse.json(
          { error: { code: "SERVICE_UNAVAILABLE", message: "private mutation detail" } },
          { status: 503 },
        );
      }),
      http.get(categoryUrl, () => {
        detailRequestCount += 1;
        detailStarted.resolve();
        return detailResponse.promise;
      }),
    );

    await userEvent.setup().click(within(row).getByRole("button", { name: "Desactivar" }));
    const confirmation = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await userEvent.setup().click(within(confirmation).getByRole("button", { name: "Desactivar" }));
    await detailStarted.promise;
    expect(patchRequestCount).toBe(1);
    expect(detailRequestCount).toBe(1);

    shouldHoldSessionRefresh = true;
    if (!refetchSession) {
      throw new Error("The session refresh driver did not expose refetch.");
    }
    let refreshResult!: ReturnType<UseSessionResult["refetch"]>;
    act(() => {
      refreshResult = refetchSession!();
    });
    await sessionRefreshStarted.promise;
    expect(await screen.findByRole("heading", { name: "Comprobando tu sesión" })).toBeVisible();

    sessionRefresh.resolve(
      HttpResponse.json(publicAuthResponse("OPERATOR", "category-status-session-b")),
    );
    await act(async () => refreshResult);

    const newSessionRow = await screen.findByRole("row", { name: /Herramientas/ });
    expect(within(newSessionRow).getByText("Activa")).toBeVisible();
    expect(within(newSessionRow).getByRole("button", { name: "Desactivar" })).toBeEnabled();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const focusAfterReplacement = document.activeElement;

    await act(async () => {
      detailResponse.resolve(HttpResponse.json({ data: category(false) }));
      await detailResponse.promise;
    });

    expect(within(newSessionRow).getByText("Activa")).toBeVisible();
    expect(within(newSessionRow).getByRole("button", { name: "Desactivar" })).toBeEnabled();
    expect(screen.queryByText(/Esta lectura no confirma/)).not.toBeInTheDocument();
    expect(screen.queryByText("private mutation detail")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/categories");
    expect(document.activeElement).toBe(focusAfterReplacement);
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .filter((query) => query.queryKey[0] === "categories")
        .every((query) => query.queryKey[2] === "category-status-session-b"),
    ).toBe(true);
    expect(
      invalidateQueries.mock.calls.every(
        ([filters]) => filters?.queryKey?.[2] !== categoryStatusSessionId,
      ),
    ).toBe(true);

    await userEvent
      .setup()
      .click(within(newSessionRow).getByRole("button", { name: "Desactivar" }));
    const newConfirmation = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await userEvent
      .setup()
      .click(within(newConfirmation).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(patchRequestCount).toBe(1);

    shouldHoldSessionRefresh = false;
    let restoreSessionResult!: ReturnType<UseSessionResult["refetch"]>;
    act(() => {
      restoreSessionResult = refetchSession!();
    });
    await act(async () => restoreSessionResult);
  });

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
    let detailRequestCount = 0;
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
      http.get(categoryUrl, () => {
        detailRequestCount += 1;
        return HttpResponse.json({ data: category(true) });
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
    await waitFor(() => expect(detailRequestCount).toBe(1));
    await waitFor(() => expect(listRequestCount).toBe(1));
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

  it("keeps the confirmed status change visible when list refresh fails and retries only the read", async () => {
    const user = userEvent.setup();
    const { router } = renderCategoryList("OPERATOR", true);
    const row = await screen.findByRole("row", { name: /Herramientas/ });
    let patchRequestCount = 0;
    let listRequestCount = 0;

    server.use(
      http.patch(categoryUrl, () => {
        patchRequestCount += 1;
        return HttpResponse.json({ data: category(false) });
      }),
      http.get(categoriesUrl, () => {
        listRequestCount += 1;
        if (listRequestCount === 1) {
          return HttpResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Refresh failed." } },
            { status: 503 },
          );
        }

        return HttpResponse.json({
          data: [category(false)],
          pagination: { total: 1, page: 1, limit: 15 },
        });
      }),
    );

    await user.click(within(row).getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    await waitFor(() =>
      expect(
        screen
          .getAllByRole("status")
          .some((status) => status.textContent?.includes("escritura ya fue confirmada")),
      ).toBe(true),
    );
    expect(
      screen
        .getAllByRole("status")
        .find((status) => status.textContent?.includes("escritura ya fue confirmada")),
    ).toHaveTextContent(
      "Categoría desactivada correctamente.No se pudo actualizar el listado. Reintenta únicamente la consulta; la escritura ya fue confirmada y no se volverá a enviar.",
    );
    expect(
      await screen.findByRole("button", { name: "Reintentar solo la consulta" }),
    ).toBeEnabled();
    expect(patchRequestCount).toBe(1);
    await waitFor(() => expect(listRequestCount).toBe(1));

    await user.click(screen.getByRole("button", { name: "Reintentar solo la consulta" }));

    expect(await screen.findByRole("row", { name: /Herramientas/ })).toHaveTextContent("Inactiva");
    expect(patchRequestCount).toBe(1);
    expect(listRequestCount).toBe(2);
    expect(router.state.location.pathname).toBe("/categories");
  });

  it.each([
    {
      scenario: "a 404 category-not-found response",
      status: 404,
      body: { error: { code: "CATEGORY_NOT_FOUND", message: "Not found." } },
      expectedDetailRequests: 0,
      expectedListRequests: 1,
      expectedDialogTitle: "Categoría no encontrada",
      returnAction: "Volver al listado",
    },
    {
      scenario: "a 5xx uncertain response",
      status: 503,
      body: { error: { code: "SERVICE_UNAVAILABLE", message: "Unavailable." } },
      expectedDetailRequests: 1,
      expectedListRequests: 1,
      expectedDialogTitle: "Confirmar desactivación",
      returnAction: "Cerrar",
    },
    {
      scenario: "an invalid successful response with uncertain outcome",
      status: 200,
      body: { data: category(true) },
      expectedDetailRequests: 1,
      expectedListRequests: 1,
      expectedDialogTitle: "Confirmar desactivación",
      returnAction: "Cerrar",
    },
  ])(
    "does not offer manual retry for $scenario",
    async ({
      status,
      body,
      expectedDetailRequests,
      expectedListRequests,
      expectedDialogTitle,
      returnAction,
    }) => {
      const user = userEvent.setup();
      let patchRequestCount = 0;
      let detailRequestCount = 0;
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
        http.get(categoryUrl, () => {
          detailRequestCount += 1;
          return HttpResponse.json({ data: category(true) });
        }),
        http.patch(categoryUrl, () => {
          patchRequestCount += 1;
          return HttpResponse.json(body, { status });
        }),
      );

      await user.click(within(row).getByRole("button", { name: "Desactivar" }));
      const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
      await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

      const resultDialog = await screen.findByRole("dialog", { name: expectedDialogTitle });
      expect(await within(dialog).findByRole("alert")).toBeVisible();
      expect(
        within(resultDialog).queryByRole("button", { name: "Reintentar" }),
      ).not.toBeInTheDocument();
      expect(
        within(resultDialog).queryByRole("button", { name: "Desactivar" }),
      ).not.toBeInTheDocument();
      expect(within(resultDialog).getByRole("button", { name: returnAction })).toBeVisible();
      expect(within(row).getByText("Activa")).toBeVisible();
      expect(patchRequestCount).toBe(1);
      await waitFor(() => expect(detailRequestCount).toBe(expectedDetailRequests));
      if (status === 404) {
        expect(listRequestCount).toBe(0);
      } else {
        await waitFor(() => expect(listRequestCount).toBe(expectedListRequests));
      }

      await user.click(within(resultDialog).getByRole("button", { name: returnAction }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(patchRequestCount).toBe(1);
      if (status === 404) {
        await waitFor(() => expect(listRequestCount).toBe(expectedListRequests));
      }
    },
  );

  it("does not offer manual retry for a network result with uncertain outcome", async () => {
    const user = userEvent.setup();
    let patchRequestCount = 0;
    let detailRequestCount = 0;
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
      http.get(categoryUrl, () => {
        detailRequestCount += 1;
        return HttpResponse.json({ data: category(true) });
      }),
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
    await waitFor(() => expect(detailRequestCount).toBe(1));
    await waitFor(() => expect(listRequestCount).toBe(1));
  });

  it.each([
    {
      scenario: "a network failure",
      responseKind: "network" as const,
      status: 0,
      body: undefined,
    },
    {
      scenario: "a 5xx response",
      responseKind: "http" as const,
      status: 503,
      body: { error: { code: "SERVICE_UNAVAILABLE", message: "Internal details." } },
    },
    {
      scenario: "a successful response that does not confirm the requested status",
      responseKind: "http" as const,
      status: 200,
      body: { data: category(true) },
    },
  ])(
    "requires a fresh detail read after $scenario and blocks further PATCH requests until it completes",
    async ({ responseKind, status, body }) => {
      const user = userEvent.setup();
      const queryClient = createQueryClient();
      queryClient.setQueryData(
        categoryDetailQueryKey(categoryStatusSessionId, categoryUuid),
        category(true),
      );
      const { queryClient: renderedQueryClient } = renderCategoryList(
        "OPERATOR",
        true,
        undefined,
        queryClient,
      );
      const row = await screen.findByRole("row", { name: /Herramientas/ });
      let patchRequestCount = 0;
      let detailRequestCount = 0;
      let listRequestCount = 0;
      let resolveDetailResponse!: (response: Response) => void;

      server.use(
        http.get(categoriesUrl, ({ request }) => {
          listRequestCount += 1;
          const url = new URL(request.url);
          expect(url.searchParams.get("isActive")).toBe("true");
          return HttpResponse.json({
            data: [category(true)],
            pagination: { total: 1, page: 1, limit: 15 },
          });
        }),
        http.get(categoryUrl, () => {
          detailRequestCount += 1;
          return new Promise<Response>((resolve) => {
            resolveDetailResponse = resolve;
          });
        }),
        http.patch(categoryUrl, () => {
          patchRequestCount += 1;
          if (responseKind === "network") {
            return HttpResponse.error();
          }

          return HttpResponse.json(body, { status });
        }),
      );

      await user.click(within(row).getByRole("button", { name: "Desactivar" }));
      const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
      await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

      await waitFor(() => {
        expect(patchRequestCount).toBe(1);
        expect(detailRequestCount).toBe(1);
      });
      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "No se pudo confirmar el cambio de estado. Se está comprobando el estado vigente antes de permitir otro cambio.",
      );
      expect(await within(dialog).findByRole("status")).toHaveTextContent(
        "Comprobando el estado vigente de la categoría…",
      );
      expect(
        renderedQueryClient.getQueryData(
          categoryDetailQueryKey(categoryStatusSessionId, categoryUuid),
        ),
      ).toEqual(category(true));

      await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      const lockedRow = screen.getByRole("row", { name: /Herramientas/ });
      const lockedAction = within(lockedRow).getByRole("button", {
        name: "Comprobando estado…",
      });
      expect(lockedAction).toBeDisabled();
      await user.click(lockedAction);
      expect(patchRequestCount).toBe(1);
      expect(listRequestCount).toBe(0);

      resolveDetailResponse(HttpResponse.json({ data: category(true) }));
      await waitFor(() => expect(listRequestCount).toBe(1));
      expect(
        renderedQueryClient.getQueryData(
          categoryDetailQueryKey(categoryStatusSessionId, categoryUuid),
        ),
      ).toEqual(category(true));
      await waitFor(() => {
        expect(
          within(screen.getByRole("row", { name: /Herramientas/ })).getByRole("button", {
            name: "Desactivar",
          }),
        ).toBeEnabled();
      });
      expect(patchRequestCount).toBe(1);
      expect(screen.queryByText("Categoría desactivada correctamente.")).not.toBeInTheDocument();
    },
  );

  it("keeps a failed detail check locked across navigation and retries only the detail GET", async () => {
    const user = userEvent.setup();
    const { router } = renderCategoryList("OPERATOR", true);
    const initialRow = await screen.findByRole("row", { name: /Herramientas/ });
    let patchRequestCount = 0;
    let detailRequestCount = 0;
    let listRequestCount = 0;
    let resolveRetryDetail!: (response: Response) => void;

    server.use(
      http.get(categoriesUrl, () => {
        listRequestCount += 1;
        return HttpResponse.json({
          data: [category(true)],
          pagination: { total: 1, page: 1, limit: 15 },
        });
      }),
      http.get(categoryUrl, () => {
        detailRequestCount += 1;
        if (detailRequestCount === 1) {
          return HttpResponse.json(
            { error: { code: "SERVICE_UNAVAILABLE", message: "Internal details." } },
            { status: 503 },
          );
        }

        return new Promise<Response>((resolve) => {
          resolveRetryDetail = resolve;
        });
      }),
      http.patch(categoryUrl, () => {
        patchRequestCount += 1;
        return HttpResponse.error();
      }),
    );

    await user.click(within(initialRow).getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    await waitFor(() => {
      expect(patchRequestCount).toBe(1);
      expect(detailRequestCount).toBe(1);
    });
    expect(await within(dialog).findByRole("alert")).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("link", { name: "Inicio" }));
    await screen.findByRole("heading", { level: 1, name: "Bienvenido a Inventory" });
    expect(router.state.location.pathname).toBe("/");
    expect(patchRequestCount).toBe(1);

    await user.click(screen.getByRole("link", { name: "Categorías" }));
    const returnedRow = await screen.findByRole("row", { name: /Herramientas/ });
    expect(
      within(returnedRow).queryByRole("button", { name: "Desactivar" }),
    ).not.toBeInTheDocument();
    expect(
      within(returnedRow).getByRole("button", { name: "Reintentar comprobación" }),
    ).toBeVisible();
    expect(within(returnedRow).getByRole("alert")).toHaveTextContent(
      "No se pudo comprobar el estado. Reintenta la consulta para habilitar el cambio.",
    );
    expect(listRequestCount).toBe(0);

    await user.click(within(returnedRow).getByRole("button", { name: "Reintentar comprobación" }));
    await waitFor(() => expect(detailRequestCount).toBe(2));
    expect(patchRequestCount).toBe(1);
    const checkingRow = screen.getByRole("row", { name: /Herramientas/ });
    const checkingButton = within(checkingRow).getByRole("button", {
      name: "Comprobando estado…",
    });
    expect(checkingButton).toBeDisabled();

    resolveRetryDetail(HttpResponse.json({ data: category(true) }));

    await waitFor(() => expect(listRequestCount).toBe(1));
    await waitFor(() => {
      expect(
        within(screen.getByRole("row", { name: /Herramientas/ })).getByRole("button", {
          name: "Desactivar",
        }),
      ).toBeEnabled();
    });
    expect(detailRequestCount).toBe(2);
    expect(patchRequestCount).toBe(1);
  });

  it("announces a status observed by the detail check without attributing it to the uncertain PATCH", async () => {
    const user = userEvent.setup();
    let patchRequestCount = 0;
    let detailRequestCount = 0;
    let listRequestCount = 0;
    let categoryIsActive = true;

    renderCategoryList("OPERATOR", true);
    const row = await screen.findByRole("row", { name: /Herramientas/ });
    server.use(
      http.get(categoriesUrl, ({ request }) => {
        listRequestCount += 1;
        const requestedIsActive = new URL(request.url).searchParams.get("isActive") === "true";
        const rows = requestedIsActive === categoryIsActive ? [category(categoryIsActive)] : [];
        return HttpResponse.json({
          data: rows,
          pagination: { total: rows.length, page: 1, limit: 15 },
        });
      }),
      http.patch(categoryUrl, () => {
        patchRequestCount += 1;
        categoryIsActive = false;
        return HttpResponse.json(
          { error: { code: "SERVICE_UNAVAILABLE", message: "Internal details." } },
          { status: 503 },
        );
      }),
      http.get(categoryUrl, () => {
        detailRequestCount += 1;
        return HttpResponse.json({ data: category(false) });
      }),
    );

    await user.click(within(row).getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    const observedStatusMessage =
      'La categoría "Herramientas" está inactiva actualmente. Esta lectura no confirma si la solicitud anterior causó el cambio.';
    expect(await screen.findByText(observedStatusMessage)).toBeVisible();
    expect(
      screen
        .getAllByRole("status")
        .some((announcement) => announcement.textContent?.includes(observedStatusMessage)),
    ).toBe(true);
    expect(screen.queryByText("Categoría desactivada correctamente.")).not.toBeInTheDocument();
    expect(await screen.findByText("No hay categorías para mostrar.")).toBeVisible();
    expect(patchRequestCount).toBe(1);
    expect(detailRequestCount).toBe(1);
    expect(listRequestCount).toBe(1);
  });

  it("shows category not found after an uncertain check returns 404 and returns to the updated list", async () => {
    const user = userEvent.setup();
    const sourceSearch = "?page=1&search=almacen&status=active&sort=updatedAt&order=desc";
    const { router } = renderCategoryList("OPERATOR", true, `/categories${sourceSearch}`);
    const row = await screen.findByRole("row", { name: /Herramientas/ });
    let patchRequestCount = 0;
    let detailRequestCount = 0;
    let listRequestCount = 0;

    server.use(
      http.get(categoriesUrl, ({ request }) => {
        listRequestCount += 1;
        const url = new URL(request.url);
        expect(url.searchParams.get("page")).toBe("1");
        expect(url.searchParams.get("search")).toBe("almacen");
        expect(url.searchParams.get("isActive")).toBe("true");
        expect(url.searchParams.get("sort")).toBe("updatedAt");
        expect(url.searchParams.get("order")).toBe("desc");
        return HttpResponse.json({
          data: [],
          pagination: { total: 0, page: 1, limit: 15 },
        });
      }),
      http.get(categoryUrl, () => {
        detailRequestCount += 1;
        return HttpResponse.json(
          { error: { code: "CATEGORY_NOT_FOUND", message: "Internal not-found detail." } },
          { status: 404 },
        );
      }),
      http.patch(categoryUrl, () => {
        patchRequestCount += 1;
        return HttpResponse.json(
          { error: { code: "SERVICE_UNAVAILABLE", message: "Internal mutation detail." } },
          { status: 503 },
        );
      }),
    );

    await user.click(within(row).getByRole("button", { name: "Desactivar" }));
    const confirmation = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(confirmation).getByRole("button", { name: "Desactivar" }));

    const notFoundDialog = await screen.findByRole("dialog", { name: "Categoría no encontrada" });
    expect(await within(notFoundDialog).findByRole("alert")).toHaveTextContent(
      "No se encontró la categoría Herramientas. No se puede confirmar su estado y no se volverá a enviar el cambio.",
    );
    expect(
      within(notFoundDialog).queryByRole("button", { name: "Desactivar" }),
    ).not.toBeInTheDocument();
    expect(
      within(notFoundDialog).queryByRole("button", { name: "Activar" }),
    ).not.toBeInTheDocument();
    expect(
      within(notFoundDialog).queryByRole("button", { name: "Reintentar" }),
    ).not.toBeInTheDocument();
    expect(within(notFoundDialog).getByRole("button", { name: "Volver al listado" })).toBeVisible();
    expect(detailRequestCount).toBe(1);
    expect(patchRequestCount).toBe(1);
    expect(listRequestCount).toBe(0);

    await user.click(within(notFoundDialog).getByRole("button", { name: "Volver al listado" }));
    expect(
      await screen.findByText("No se encontraron categorías con esta búsqueda."),
    ).toBeVisible();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe("/categories");
    expect(router.state.location.search).toBe(sourceSearch);
    expect(detailRequestCount).toBe(1);
    expect(patchRequestCount).toBe(1);
    expect(listRequestCount).toBe(1);
  });

  it("shows category not found for a PATCH 404 and returns to the updated origin query without retrying", async () => {
    const user = userEvent.setup();
    const sourceSearch = "?page=1&search=almacen&status=active&sort=updatedAt&order=desc";
    const { router } = renderCategoryList("OPERATOR", true, `/categories${sourceSearch}`);
    const row = await screen.findByRole("row", { name: /Herramientas/ });
    let patchRequestCount = 0;
    let deleteRequestCount = 0;
    let listRequestCount = 0;

    server.use(
      http.get(categoriesUrl, ({ request }) => {
        listRequestCount += 1;
        const url = new URL(request.url);
        expect(url.searchParams.get("page")).toBe("1");
        expect(url.searchParams.get("search")).toBe("almacen");
        expect(url.searchParams.get("isActive")).toBe("true");
        expect(url.searchParams.get("sort")).toBe("updatedAt");
        expect(url.searchParams.get("order")).toBe("desc");
        return HttpResponse.json({
          data: [],
          pagination: { total: 0, page: 1, limit: 15 },
        });
      }),
      http.patch(categoryUrl, () => {
        patchRequestCount += 1;
        return HttpResponse.json(
          { error: { code: "CATEGORY_NOT_FOUND", message: "Internal not-found details." } },
          { status: 404 },
        );
      }),
      http.delete(categoryUrl, () => {
        deleteRequestCount += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await user.click(within(row).getByRole("button", { name: "Desactivar" }));
    const confirmation = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    await user.click(within(confirmation).getByRole("button", { name: "Desactivar" }));

    const notFoundDialog = await screen.findByRole("dialog", { name: "Categoría no encontrada" });
    expect(await within(notFoundDialog).findByRole("alert")).toHaveTextContent(
      "No se encontró la categoría Herramientas. No se puede confirmar su estado y no se volverá a enviar el cambio.",
    );
    expect(
      within(notFoundDialog).queryByRole("button", { name: "Desactivar" }),
    ).not.toBeInTheDocument();
    expect(
      within(notFoundDialog).queryByRole("button", { name: "Reintentar" }),
    ).not.toBeInTheDocument();
    expect(within(notFoundDialog).getByRole("button", { name: "Volver al listado" })).toBeVisible();
    expect(patchRequestCount).toBe(1);
    expect(deleteRequestCount).toBe(0);
    expect(listRequestCount).toBe(0);

    await user.click(within(notFoundDialog).getByRole("button", { name: "Volver al listado" }));
    expect(
      await screen.findByText("No se encontraron categorías con esta búsqueda."),
    ).toBeVisible();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe("/categories");
    expect(router.state.location.search).toBe(sourceSearch);
    expect(listRequestCount).toBe(1);
    expect(patchRequestCount).toBe(1);
    expect(deleteRequestCount).toBe(0);
  });

  it("requires a new status confirmation after the detail check observes the previous state", async () => {
    const user = userEvent.setup();
    let patchRequestCount = 0;
    let detailRequestCount = 0;
    let listRequestCount = 0;
    let categoryIsActive = true;
    const requestBodies: unknown[] = [];

    renderCategoryList("OPERATOR", true);
    let row = await screen.findByRole("row", { name: /Herramientas/ });
    server.use(
      http.get(categoriesUrl, ({ request }) => {
        listRequestCount += 1;
        const requestedIsActive = new URL(request.url).searchParams.get("isActive") === "true";
        const rows = requestedIsActive === categoryIsActive ? [category(categoryIsActive)] : [];
        return HttpResponse.json({
          data: rows,
          pagination: { total: rows.length, page: 1, limit: 15 },
        });
      }),
      http.get(categoryUrl, () => {
        detailRequestCount += 1;
        return HttpResponse.json({ data: category(categoryIsActive) });
      }),
      http.patch(categoryUrl, async ({ request }) => {
        patchRequestCount += 1;
        requestBodies.push(await request.json());
        if (patchRequestCount === 1) {
          return HttpResponse.json(
            { error: { code: "SERVICE_UNAVAILABLE", message: "Internal details." } },
            { status: 503 },
          );
        }

        categoryIsActive = false;
        return HttpResponse.json({ data: category(false) });
      }),
    );

    await user.click(within(row).getByRole("button", { name: "Desactivar" }));
    const uncertainConfirmation = await screen.findByRole("dialog", {
      name: "Confirmar desactivación",
    });
    await user.click(within(uncertainConfirmation).getByRole("button", { name: "Desactivar" }));

    expect(await within(uncertainConfirmation).findByRole("alert")).toHaveTextContent(
      "No se pudo confirmar el cambio de estado. Revisa el estado de la categoría antes de volver a intentarlo.",
    );
    expect(detailRequestCount).toBe(1);
    await waitFor(() => expect(listRequestCount).toBe(1));
    expect(patchRequestCount).toBe(1);
    expect(screen.queryByText("Categoría desactivada correctamente.")).not.toBeInTheDocument();
    expect(
      within(uncertainConfirmation).queryByRole("button", { name: "Desactivar" }),
    ).not.toBeInTheDocument();

    await user.click(within(uncertainConfirmation).getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    row = screen.getByRole("row", { name: /Herramientas/ });
    expect(within(row).getByText("Activa")).toBeVisible();
    expect(within(row).getByRole("button", { name: "Desactivar" })).toBeEnabled();
    expect(patchRequestCount).toBe(1);

    await user.click(within(row).getByRole("button", { name: "Desactivar" }));
    const newConfirmation = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
    expect(patchRequestCount).toBe(1);
    await user.click(within(newConfirmation).getByRole("button", { name: "Desactivar" }));

    expect(await screen.findByText("Categoría desactivada correctamente.")).toBeVisible();
    expect(await screen.findByText("No hay categorías para mostrar.")).toBeVisible();
    expect(requestBodies).toEqual([{ isActive: false }, { isActive: false }]);
    expect(patchRequestCount).toBe(2);
    expect(detailRequestCount).toBe(1);
    expect(listRequestCount).toBe(2);
  });

  it.each([
    {
      outcome: "success",
      status: 200,
      response: { data: category(false) },
      expectedAnnouncement: "Categoría desactivada correctamente.",
      announcementRole: "status",
    },
    {
      outcome: "failure",
      status: 503,
      response: { error: { code: "SERVICE_UNAVAILABLE", message: "Internal details." } },
      expectedAnnouncement:
        'La categoría "Herramientas" está inactiva actualmente. Esta lectura no confirma si la solicitud anterior causó el cambio.',
      announcementRole: "status",
    },
  ] as const)(
    "announces a delayed $outcome after leaving the list without changing route or focus and refreshes on return",
    async ({ status, response, expectedAnnouncement, announcementRole }) => {
      const user = userEvent.setup();
      const { queryClient, router } = renderCategoryList("OPERATOR", true);
      const categoryRow = await screen.findByRole("row", { name: /Herramientas/ });
      let listRequestCount = 0;
      let patchRequestCount = 0;
      let detailRequestCount = 0;
      let categoryIsActive = true;
      let resolvePatchResponse!: (response: Response) => void;
      let resolveCheckDetail!: (response: Response) => void;

      server.use(
        http.get(categoriesUrl, ({ request }) => {
          listRequestCount += 1;
          const url = new URL(request.url);
          const requestedIsActive = url.searchParams.get("isActive") === "true";
          const rows = requestedIsActive === categoryIsActive ? [category(categoryIsActive)] : [];
          return HttpResponse.json({
            data: rows,
            pagination: { total: rows.length, page: 1, limit: 15 },
          });
        }),
        http.get(categoryUrl, () => {
          detailRequestCount += 1;
          return new Promise<Response>((resolve) => {
            resolveCheckDetail = resolve;
          });
        }),
        http.patch(categoryUrl, () => {
          patchRequestCount += 1;
          return new Promise<Response>((resolve) => {
            resolvePatchResponse = (patchResponse) => {
              categoryIsActive = false;
              resolve(patchResponse);
            };
          });
        }),
      );

      await user.click(within(categoryRow).getByRole("button", { name: "Desactivar" }));
      const confirmation = await screen.findByRole("dialog", { name: "Confirmar desactivación" });
      await user.click(within(confirmation).getByRole("button", { name: "Desactivar" }));
      await waitFor(() => expect(patchRequestCount).toBe(1));
      await user.click(within(confirmation).getByRole("button", { name: "Cerrar" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

      await user.click(screen.getByRole("link", { name: "Inicio" }));
      const homeHeading = await screen.findByRole("heading", {
        level: 1,
        name: "Bienvenido a Inventory",
      });
      const focusAfterNavigation = document.activeElement;
      expect(router.state.location.pathname).toBe("/");
      expect(homeHeading).toBeVisible();

      resolvePatchResponse(HttpResponse.json(response, { status }));

      if (status === 503) {
        await waitFor(() => expect(detailRequestCount).toBe(1));
        resolveCheckDetail(HttpResponse.json({ data: category(false) }));
        await waitFor(() =>
          expect(
            queryClient
              .getQueryCache()
              .findAll({
                queryKey: ["categories", "management-list", categoryStatusSessionId],
              })
              .some((query) => query.state.isInvalidated),
          ).toBe(true),
        );
      }

      expect(await screen.findByText(expectedAnnouncement)).toBeVisible();
      expect(screen.getByRole(announcementRole)).toHaveTextContent(expectedAnnouncement);
      expect(router.state.location.pathname).toBe("/");
      expect(document.activeElement).toBe(focusAfterNavigation);
      expect(listRequestCount).toBe(0);

      await user.click(screen.getByRole("link", { name: "Categorías" }));
      expect(await screen.findByText("No hay categorías para mostrar.")).toBeVisible();
      expect(router.state.location.pathname).toBe("/categories");
      await waitFor(() => {
        const managementQueries = queryClient
          .getQueryCache()
          .findAll({ queryKey: ["categories", "management-list", categoryStatusSessionId] });
        expect(managementQueries.length).toBeGreaterThan(0);
        expect(managementQueries.every((query) => query.state.fetchStatus === "idle")).toBe(true);
        expect(managementQueries.every((query) => !query.state.isInvalidated)).toBe(true);
      });
      expect(listRequestCount).toBe(1);
      expect(patchRequestCount).toBe(1);
      expect(homeHeading).not.toHaveFocus();
    },
  );
});
