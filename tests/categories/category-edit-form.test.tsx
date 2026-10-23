import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  sessionId = "category-edit-session",
): components["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: { id: "category-edit-user", email: "operator@example.com", role },
    session: { id: sessionId, createdAt: "2026-01-01T00:00:00.000Z" },
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

const updateFailureScenarios = [
  {
    description: "a permission rejection",
    status: 403,
    code: "FORBIDDEN",
    placement: "root",
    expectedMessage: "No tienes permiso para editar esta categoría.",
  },
  {
    description: "an identifiable name validation rejection",
    status: 400,
    code: "INVALID_CATEGORY_DATA",
    placement: "name",
    expectedMessage: "El nombre no es válido. Revísalo e inténtalo de nuevo.",
  },
  {
    description: "a general validation rejection",
    status: 400,
    code: "VALIDATION_ERROR",
    placement: "root",
    expectedMessage:
      "El servidor rechazó los datos enviados. Revisa el formulario e inténtalo de nuevo.",
  },
  {
    description: "a server failure",
    status: 503,
    code: "INTERNAL_ERROR",
    placement: "root",
    expectedMessage:
      "No se pudo confirmar el resultado de la actualización. Revisa la categoría antes de volver a intentarlo.",
  },
  {
    description: "a network failure",
    status: null,
    code: "",
    placement: "root",
    expectedMessage:
      "No se pudo confirmar el resultado de la actualización. Revisa la categoría antes de volver a intentarlo.",
  },
] as const;

const routeResources: Array<{
  queryClient: ReturnType<typeof createQueryClient>;
  router: ReturnType<typeof createMemoryRouter>;
}> = [];

const renderCategoryEditRoute = (
  role?: components["schemas"]["PublicAuthResponse"]["data"]["user"]["role"],
  returnTo?: string,
  sessionResponse?: () => Response | Promise<Response>,
  initialEntries?: string[],
) => {
  const queryClient = createQueryClient();
  const route = `/categories/${categoryUuid}/edit`;
  const initialEntry = returnTo
    ? `${route}?${new URLSearchParams({ returnTo }).toString()}`
    : route;
  const entries = initialEntries ?? [initialEntry];
  const router = createMemoryRouter(appRoutes, {
    initialEntries: entries,
    initialIndex: entries.indexOf(initialEntry),
  });
  routeResources.push({ queryClient, router });

  server.use(
    http.get(
      /\/api\/auth\/get-session/,
      () => sessionResponse?.() ?? HttpResponse.json(publicAuthResponse(role)),
    ),
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

  it("confirms Back navigation from a dirty edit and preserves or discards to the requested history entry", async () => {
    const user = userEvent.setup();
    const sourceListUrl =
      "/categories?page=3&search=tools&status=inactive&sort=updatedAt&order=desc";
    const editEntry = `/categories/${categoryUuid}/edit?${new URLSearchParams({ returnTo: sourceListUrl }).toString()}`;

    server.use(
      http.get(categoryUrl, () => HttpResponse.json({ data: category() })),
      http.get(categoriesUrl, () =>
        HttpResponse.json({
          data: [category()],
          pagination: { total: 46, page: 3, limit: 15 },
        }),
      ),
    );

    const { router } = renderCategoryEditRoute(undefined, sourceListUrl, undefined, [
      sourceListUrl,
      editEntry,
    ]);
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    const description = screen.getByRole("textbox", { name: "Descripción (opcional)" });
    await user.clear(name);
    await user.type(name, "Nombre local pendiente");
    await user.clear(description);
    await user.type(description, "Descripción local pendiente");

    await act(async () => router.navigate(-1));
    const continuePrompt = await screen.findByRole("dialog", { name: "¿Descartar los cambios?" });
    await user.click(within(continuePrompt).getByRole("button", { name: "Continuar editando" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe(`/categories/${categoryUuid}/edit`);
    expect(name).toHaveValue("Nombre local pendiente");
    expect(description).toHaveValue("Descripción local pendiente");

    await act(async () => router.navigate(-1));
    const discardPrompt = await screen.findByRole("dialog", { name: "¿Descartar los cambios?" });
    await user.click(within(discardPrompt).getByRole("button", { name: "Descartar cambios" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Categorías" })).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe("/categories"));
    expect(router.state.location.search).toBe(sourceListUrl.slice("/categories".length));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => router.navigate(1));
    const restoredName = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    expect(restoredName).toHaveValue("Herramientas");
    expect(screen.getByRole("textbox", { name: "Descripción (opcional)" })).toHaveValue(
      "Para mantenimiento",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => router.navigate(-1));
    expect(await screen.findByRole("heading", { level: 1, name: "Categorías" })).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("returns to its source when cancelling a clean edit or after confirming dirty discard", async () => {
    const user = userEvent.setup();
    const sourceListUrl =
      "/categories?page=3&search=tools&status=inactive&sort=updatedAt&order=desc";
    server.use(
      http.get(categoryUrl, () => HttpResponse.json({ data: category() })),
      http.get(categoriesUrl, () =>
        HttpResponse.json({
          data: [category()],
          pagination: { total: 46, page: 3, limit: 15 },
        }),
      ),
    );

    const { router } = renderCategoryEditRoute(undefined, sourceListUrl);
    await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Categorías" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/categories");
    expect(router.state.location.search).toBe(sourceListUrl.slice("/categories".length));

    await act(async () =>
      router.navigate(
        `/categories/${categoryUuid}/edit?${new URLSearchParams({ returnTo: sourceListUrl })}`,
      ),
    );
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Borrador local");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    const prompt = await screen.findByRole("dialog", { name: "¿Descartar los cambios?" });
    expect(router.state.location.pathname).toBe(`/categories/${categoryUuid}/edit`);
    await user.click(within(prompt).getByRole("button", { name: "Continuar editando" }));
    expect(name).toHaveValue("Borrador local");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    const discardPrompt = await screen.findByRole("dialog", { name: "¿Descartar los cambios?" });
    await user.click(within(discardPrompt).getByRole("button", { name: "Descartar cambios" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Categorías" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/categories");
    expect(router.state.location.search).toBe(sourceListUrl.slice("/categories".length));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps a category-not-found edit read-only and refreshes its source list after discard", async () => {
    const user = userEvent.setup();
    const sourceListUrl =
      "/categories?page=3&search=tools&status=inactive&sort=updatedAt&order=desc";
    const sourceListParams = {
      page: 3,
      limit: 15,
      search: "tools",
      isActive: "false",
      sort: "updatedAt",
      order: "desc",
    };
    let patchRequests = 0;
    const patchBodies: unknown[] = [];
    const listRequests: URL[] = [];

    server.use(
      http.get(categoryUrl, () => HttpResponse.json({ data: category() })),
      http.patch(categoryUrl, async ({ request }) => {
        patchRequests += 1;
        patchBodies.push(await request.json());
        return HttpResponse.json(
          { error: { code: "CATEGORY_NOT_FOUND", message: "private category detail" } },
          { status: 404 },
        );
      }),
      http.get(categoriesUrl, ({ request }) => {
        listRequests.push(new URL(request.url));
        return HttpResponse.json({
          data: [category("Resultado actualizado")],
          pagination: { total: 46, page: 3, limit: 15 },
        });
      }),
    );

    const { queryClient, router } = renderCategoryEditRoute(undefined, sourceListUrl);
    queryClient.setQueryData(
      ["categories", "management-list", "category-edit-session", sourceListParams],
      {
        data: [category("Resultado almacenado")],
        pagination: { total: 46, page: 3, limit: 15 },
      },
    );

    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    const description = screen.getByRole("textbox", { name: "Descripción (opcional)" });
    await user.clear(name);
    await user.type(name, "Borrador retenido");
    await user.clear(description);
    await user.type(description, "Descripción retenida");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se encontró la categoría. Los datos introducidos quedan en solo lectura y no se pueden guardar.",
    );
    expect(name).toHaveValue("Borrador retenido");
    expect(description).toHaveValue("Descripción retenida");
    expect(name).toHaveAttribute("readonly");
    expect(description).toHaveAttribute("readonly");
    expect(name).toBeEnabled();
    expect(description).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volver al listado" })).toBeEnabled();
    expect(screen.queryByText("private category detail")).not.toBeInTheDocument();

    fireEvent.change(name, { target: { value: "No debe cambiar" } });
    fireEvent.submit(screen.getByRole("form", { name: "Datos de la categoría" }));
    expect(name).toHaveValue("Borrador retenido");
    expect(patchRequests).toBe(1);
    expect(patchBodies).toEqual([
      { name: "Borrador retenido", description: "Descripción retenida" },
    ]);

    await user.click(screen.getByRole("button", { name: "Volver al listado" }));
    const continuePrompt = await screen.findByRole("dialog", { name: "¿Descartar los cambios?" });
    await user.click(within(continuePrompt).getByRole("button", { name: "Continuar editando" }));
    expect(name).toHaveValue("Borrador retenido");
    expect(name).toHaveAttribute("readonly");
    expect(router.state.location.pathname).toBe(`/categories/${categoryUuid}/edit`);

    await user.click(screen.getByRole("button", { name: "Volver al listado" }));
    const discardPrompt = await screen.findByRole("dialog", { name: "¿Descartar los cambios?" });
    await user.click(within(discardPrompt).getByRole("button", { name: "Descartar cambios" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Categorías" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/categories");
    expect(router.state.location.search).toBe(sourceListUrl.slice("/categories".length));
    expect(await screen.findByRole("row", { name: /Resultado actualizado/ })).toBeVisible();
    expect(listRequests).toHaveLength(1);
    expect(Object.fromEntries(listRequests[0]!.searchParams)).toEqual({
      page: "3",
      limit: "15",
      search: "tools",
      isActive: "false",
      sort: "updatedAt",
      order: "desc",
    });
    expect(patchRequests).toBe(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("blocks Back and Forward while updating and does not run either exit after failure", async () => {
    const user = userEvent.setup();
    const editPath = `/categories/${categoryUuid}/edit`;
    const patchResponse = deferred<Response>();
    const patchStarted = deferred<void>();

    server.use(
      http.get(categoryUrl, () => HttpResponse.json({ data: category() })),
      http.get(categoriesUrl, () =>
        HttpResponse.json({ data: [category()], pagination: { total: 1, page: 1, limit: 15 } }),
      ),
      http.patch(categoryUrl, () => {
        patchStarted.resolve();
        return patchResponse.promise;
      }),
    );

    const { router } = renderCategoryEditRoute(undefined, undefined, undefined, [
      "/categories",
      editPath,
      "/",
    ]);
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Nombre pendiente");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await patchStarted.promise;

    expect(await screen.findByText("Guardando cambios de la categoría…")).toBeVisible();
    await act(async () => {
      await router.navigate(-1);
    });
    expect(
      await screen.findByText("Espera a que termine el guardado antes de salir de esta página."),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe(editPath);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      await router.navigate(1);
    });
    expect(router.state.location.pathname).toBe(editPath);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      patchResponse.resolve(
        HttpResponse.json(
          { error: { code: "INTERNAL_ERROR", message: "private details" } },
          { status: 503 },
        ),
      );
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo confirmar el resultado de la actualización. Revisa la categoría antes de volver a intentarlo.",
    );
    await waitFor(() => expect(name).toBeEnabled());
    expect(name).toHaveValue("Nombre pendiente");
    expect(router.state.location.pathname).toBe(editPath);
    expect(
      screen.queryByText("Espera a que termine el guardado antes de salir de esta página."),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      await router.navigate(-1);
    });
    const discardPrompt = await screen.findByRole("dialog", { name: "¿Descartar los cambios?" });
    await user.click(within(discardPrompt).getByRole("button", { name: "Continuar editando" }));
    expect(router.state.location.pathname).toBe(editPath);
    expect(name).toHaveValue("Nombre pendiente");
  });

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
        if (listRequests.length === 1) {
          return HttpResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Refresh failed." } },
            { status: 503 },
          );
        }

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
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
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

    expect(
      await screen.findByText("Categoría actualizada correctamente.", {
        selector: ".p-toast-detail",
      }),
    ).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe("/categories"));
    expect(router.state.location.search).toBe(
      "?page=3&search=tools&status=inactive&sort=updatedAt&order=desc",
    );
    expect(router.state.location.state).toEqual({
      categoryWriteConfirmed: "updated",
      categoryWriteLocation: sourceListUrl,
    });
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
      "Categoría actualizada correctamente.No se pudo actualizar el listado. Reintenta únicamente la consulta; la escritura ya fue confirmada y no se volverá a enviar.",
    );
    expect(screen.getByRole("button", { name: "Reintentar solo la consulta" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Reintentar solo la consulta" }));

    expect(await screen.findByRole("row", { name: /Herramientas actualizadas/ })).toBeVisible();
    expect(listRequests).toHaveLength(2);
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
      "La respuesta de actualización no se pudo validar. Revisa la categoría antes de volver a intentarlo.",
    );
    expect(screen.queryByText("Categoría actualizada correctamente.")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/categories/${categoryUuid}/edit`);
    expect(name).toHaveValue("Nombre nuevo");
    expect(screen.getByRole("textbox", { name: "Descripción (opcional)" })).toHaveValue(
      "Para mantenimiento",
    );
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

  it.each([
    {
      scenario: "a name that differs only by letter case",
      name: "HERRAMIENTAS",
      occupiedName: "Herramientas",
      privateMessage: "The name belongs to an active category.",
    },
    {
      scenario: "a name with surrounding whitespace reserved by an inactive category",
      name: "  herramientas  ",
      occupiedName: "HERRAMIENTAS",
      privateMessage: "The name belongs to an inactive category.",
    },
  ])(
    "places $scenario conflicts beside the name without revealing the existing category state",
    async ({ name: submittedName, occupiedName, privateMessage }) => {
      const user = userEvent.setup();
      const patchBodies: unknown[] = [];
      const conflictMessage = "Ya existe una categoría con este nombre. Elige otro nombre.";

      server.use(
        http.get(categoryUrl, () => HttpResponse.json({ data: category("Oficina") })),
        http.patch(categoryUrl, async ({ request }) => {
          const body = (await request.json()) as { name: string };
          patchBodies.push(body);
          expect(body.name.trim().toLowerCase()).toBe(occupiedName.trim().toLowerCase());
          return HttpResponse.json(
            { error: { code: "CATEGORY_NAME_ALREADY_EXISTS", message: privateMessage } },
            { status: 409 },
          );
        }),
      );

      const { router } = renderCategoryEditRoute();
      const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
      await user.clear(name);
      await user.type(name, submittedName);
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      const error = await screen.findByText(conflictMessage);
      expect(name).toHaveValue(submittedName);
      expect(name).toHaveAttribute("aria-invalid", "true");
      expect(name).toHaveAccessibleDescription(error.textContent ?? "");
      expect(patchBodies).toEqual([{ name: submittedName.trim() }]);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText(privateMessage)).not.toBeInTheDocument();
      expect(screen.queryByText("Categoría actualizada correctamente.")).not.toBeInTheDocument();
      expect(router.state.location.pathname).toBe(`/categories/${categoryUuid}/edit`);
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();

      await user.clear(name);
      await user.type(name, "Nombre disponible");
      expect(screen.queryByText(conflictMessage)).not.toBeInTheDocument();
      expect(name).not.toHaveAttribute("aria-invalid", "true");
    },
  );

  it.each(updateFailureScenarios)(
    "preserves and unlocks the form after $description without retrying automatically",
    async ({ status, code, placement, expectedMessage }) => {
      const user = userEvent.setup();
      const privateMessage = "private category mutation details";
      let patchRequests = 0;

      server.use(
        http.get(categoryUrl, () => HttpResponse.json({ data: category() })),
        http.patch(categoryUrl, () => {
          patchRequests += 1;
          return status === null
            ? HttpResponse.error()
            : HttpResponse.json(
                {
                  error: {
                    code,
                    message: privateMessage,
                    ...(code === "VALIDATION_ERROR"
                      ? { fieldErrors: { description: ["private field detail"] } }
                      : {}),
                  },
                },
                { status },
              );
        }),
      );

      const { router } = renderCategoryEditRoute();
      const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
      const description = screen.getByRole("textbox", { name: "Descripción (opcional)" });
      await user.clear(name);
      await user.type(name, "Nombre local");
      await user.clear(description);
      await user.type(description, "Descripción local");
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      if (placement === "name") {
        const error = await screen.findByText(expectedMessage);
        expect(name).toHaveAttribute("aria-invalid", "true");
        expect(name).toHaveAccessibleDescription(error.textContent ?? "");
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      } else {
        expect(await screen.findByRole("alert")).toHaveTextContent(expectedMessage);
        expect(name).not.toHaveAttribute("aria-invalid", "true");
      }

      expect(name).toHaveValue("Nombre local");
      expect(description).toHaveValue("Descripción local");
      expect(name).toBeEnabled();
      expect(description).toBeEnabled();
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
      expect(screen.queryByText(privateMessage)).not.toBeInTheDocument();
      expect(screen.queryByText("private field detail")).not.toBeInTheDocument();
      expect(screen.queryByText("Categoría actualizada correctamente.")).not.toBeInTheDocument();
      expect(router.state.location.pathname).toBe(`/categories/${categoryUuid}/edit`);
      expect(patchRequests).toBe(1);

      if (placement === "name") {
        await user.clear(name);
        await user.type(name, "Nombre corregido");
        expect(screen.queryByText(expectedMessage)).not.toBeInTheDocument();
      } else {
        await user.clear(description);
        await user.type(description, "Descripción corregida");
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      }

      expect(name).toBeEnabled();
      expect(description).toBeEnabled();
      expect(patchRequests).toBe(1);
    },
  );

  it("rechecks Auth after a 401 and does not repeat the category update", async () => {
    const user = userEvent.setup();
    let mutationRejected = false;
    let sessionRefreshRequests = 0;
    let patchRequests = 0;
    let resolveSessionRefresh!: (response: Response) => void;
    const sessionRefresh = new Promise<Response>((resolve) => {
      resolveSessionRefresh = resolve;
    });

    server.use(
      http.get(categoryUrl, () => HttpResponse.json({ data: category() })),
      http.patch(categoryUrl, () => {
        patchRequests += 1;
        mutationRejected = true;
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "private authentication detail" } },
          { status: 401 },
        );
      }),
    );

    renderCategoryEditRoute(undefined, undefined, () => {
      if (mutationRejected) {
        sessionRefreshRequests += 1;
        return sessionRefresh;
      }
      return HttpResponse.json(publicAuthResponse());
    });
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Nombre local");
    fireEvent.submit(screen.getByRole("form", { name: "Datos de la categoría" }));

    await waitFor(() => {
      expect(patchRequests).toBe(1);
      expect(sessionRefreshRequests).toBe(1);
    });
    expect(await screen.findByRole("heading", { name: "Comprobando tu sesión" })).toBeVisible();
    expect(patchRequests).toBe(1);
    expect(screen.queryByRole("form", { name: "Datos de la categoría" })).not.toBeInTheDocument();
    expect(screen.queryByText("Categoría actualizada correctamente.")).not.toBeInTheDocument();

    resolveSessionRefresh(HttpResponse.json(publicAuthResponse()));

    expect(
      await screen.findByText(
        "La sesión se verificó, pero no se confirmó el resultado de la actualización. Revisa la categoría antes de volver a intentarlo.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("private authentication detail")).not.toBeInTheDocument();
    expect(patchRequests).toBe(1);
  });

  it("does not carry a rejected update result into a replacement session", async () => {
    const user = userEvent.setup();
    let mutationRejected = false;
    let sessionRefreshRequests = 0;
    let patchRequests = 0;
    let resolveSessionRefresh!: (response: Response) => void;
    const sessionRefresh = new Promise<Response>((resolve) => {
      resolveSessionRefresh = resolve;
    });

    server.use(
      http.get(categoryUrl, () => HttpResponse.json({ data: category() })),
      http.patch(categoryUrl, () => {
        patchRequests += 1;
        mutationRejected = true;
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "private authentication detail" } },
          { status: 401 },
        );
      }),
    );

    renderCategoryEditRoute(undefined, undefined, () => {
      if (mutationRejected) {
        sessionRefreshRequests += 1;
        return sessionRefresh;
      }
      return HttpResponse.json(publicAuthResponse());
    });
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.clear(name);
    await user.type(name, "Valor de la sesión anterior");
    fireEvent.submit(screen.getByRole("form", { name: "Datos de la categoría" }));

    await waitFor(() => expect(sessionRefreshRequests).toBe(1));
    expect(screen.queryByRole("form", { name: "Datos de la categoría" })).not.toBeInTheDocument();
    resolveSessionRefresh(
      HttpResponse.json(publicAuthResponse("OPERATOR", "replacement-category-session")),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Editar categoría" }),
    ).toBeVisible();
    expect(await screen.findByRole("textbox", { name: "Nombre (obligatorio)" })).toHaveValue(
      "Herramientas",
    );
    expect(screen.queryByText("Valor de la sesión anterior")).not.toBeInTheDocument();
    expect(screen.queryByText("Categoría actualizada correctamente.")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "La sesión se verificó, pero no se confirmó el resultado de la actualización. Revisa la categoría antes de volver a intentarlo.",
      ),
    ).not.toBeInTheDocument();
    expect(patchRequests).toBe(1);
  });
});
