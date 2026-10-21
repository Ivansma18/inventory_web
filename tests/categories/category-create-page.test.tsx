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
import { useSession } from "@/features/auth";
import type { UseSessionResult } from "@/features/auth";
import { createQueryClient } from "@/shared/api/query-client";
import { server } from "../mocks/server";

const categoriesUrl = "https://inventory.test/api/categories";
const categoryUuid = "550e8400-e29b-41d4-a716-446655440000";

const publicAuthResponse = (
  role: components["schemas"]["PublicAuthResponse"]["data"]["user"]["role"] = "OPERATOR",
  sessionId = "category-create-session",
): components["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: { id: "category-create-user", email: "operator@example.com", role },
    session: { id: sessionId, createdAt: "2026-01-01T00:00:00.000Z" },
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

const creationFailureScenarios = [
  {
    description: "a permission rejection",
    status: 403,
    code: "FORBIDDEN",
    placement: "root",
    expectedMessage: "No tienes permiso para crear categorías.",
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
      "No se pudo confirmar el resultado de la creación. Revisa el listado antes de volver a intentarlo.",
  },
  {
    description: "a network failure",
    status: null,
    code: "",
    placement: "root",
    expectedMessage:
      "No se pudo confirmar el resultado de la creación. Revisa el listado antes de volver a intentarlo.",
  },
] as const;

const routeResources: Array<{
  queryClient: ReturnType<typeof createQueryClient>;
  router: ReturnType<typeof createMemoryRouter>;
}> = [];

const renderCategoryCreateRoute = (
  role?: components["schemas"]["PublicAuthResponse"]["data"]["user"]["role"],
  sessionResponse?: () => Response | Promise<Response>,
  onSessionRefetch?: (refetch: UseSessionResult["refetch"]) => void,
) => {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(appRoutes, { initialEntries: ["/categories/new"] });
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

describe("category creation page", () => {
  it.each(["ADMIN", "MANAGER", "OPERATOR", "VIEWER"] as const)(
    "keeps the create action visible for the %s role",
    async (role) => {
      renderCategoryCreateRoute(role);

      expect(await screen.findByRole("button", { name: "Crear categoría" })).toBeVisible();
    },
  );

  it("asks before leaving a dirty create form and can continue or discard to the requested link", async () => {
    const user = userEvent.setup();
    const { router } = renderCategoryCreateRoute();
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    const description = screen.getByRole("textbox", { name: "Descripción (opcional)" });
    await user.type(name, "Borrador de categoría");
    await user.type(description, "Descripción pendiente");

    const navigation = within(screen.getByRole("navigation", { name: "Navegación principal" }));
    const homeLink = navigation.getByRole("link", { name: "Inicio" });
    await user.click(homeLink);

    const continuePrompt = await screen.findByRole("dialog", { name: "¿Descartar los cambios?" });
    expect(continuePrompt).toHaveTextContent("Hay cambios sin guardar");
    await user.click(within(continuePrompt).getByRole("button", { name: "Continuar editando" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe("/categories/new");
    expect(name).toHaveValue("Borrador de categoría");
    expect(description).toHaveValue("Descripción pendiente");

    await user.click(homeLink);
    const discardPrompt = await screen.findByRole("dialog", { name: "¿Descartar los cambios?" });
    await user.click(within(discardPrompt).getByRole("button", { name: "Descartar cambios" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
    ).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => router.navigate(-1));
    expect(await screen.findByRole("form", { name: "Datos de la categoría" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Nombre (obligatorio)" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Descripción (opcional)" })).toHaveValue("");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(navigation.getByRole("link", { name: "Inicio" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Bienvenido a Inventory" }),
    ).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

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

  it("blocks a link exit during creation and requires a new exit attempt after failure", async () => {
    const user = userEvent.setup();
    let createRequests = 0;
    let markCreateStarted!: () => void;
    let resolveCreate!: (response: Response) => void;
    const createStarted = new Promise<void>((resolve) => {
      markCreateStarted = resolve;
    });
    const deferredCreate = new Promise<Response>((resolve) => {
      resolveCreate = resolve;
    });

    server.use(
      http.post(categoriesUrl, () => {
        createRequests += 1;
        markCreateStarted();
        return deferredCreate;
      }),
    );

    const { router } = renderCategoryCreateRoute();
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.type(name, "Categoría pendiente");
    await user.click(screen.getByRole("button", { name: "Crear categoría" }));
    await createStarted;

    expect(await screen.findByRole("status")).toHaveTextContent("Creando categoría…");
    const homeLink = within(
      screen.getByRole("navigation", { name: "Navegación principal" }),
    ).getByRole("link", { name: "Inicio" });
    await user.click(homeLink);

    expect(
      await screen.findByText("Espera a que termine el guardado antes de salir de esta página."),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe("/categories/new");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      resolveCreate(
        HttpResponse.json(
          { error: { code: "INTERNAL_ERROR", message: "private details" } },
          { status: 503 },
        ),
      );
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo confirmar el resultado de la creación. Revisa el listado antes de volver a intentarlo.",
    );
    await waitFor(() => expect(name).toBeEnabled());
    expect(name).toHaveValue("Categoría pendiente");
    expect(router.state.location.pathname).toBe("/categories/new");
    expect(
      screen.queryByText("Espera a que termine el guardado antes de salir de esta página."),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(createRequests).toBe(1);

    await user.click(homeLink);
    const discardPrompt = await screen.findByRole("dialog", { name: "¿Descartar los cambios?" });
    await user.click(within(discardPrompt).getByRole("button", { name: "Continuar editando" }));
    expect(router.state.location.pathname).toBe("/categories/new");
  });

  it("gives the session boundary priority over a pending creation and blocked exit", async () => {
    let refetchSession: UseSessionResult["refetch"] | undefined;
    let shouldHoldSessionRefresh = false;
    let markSessionRefreshRequested!: () => void;
    let resolveSessionRefresh!: (response: Response) => void;
    let resolveCreate!: (response: Response) => void;
    const sessionRefreshRequested = new Promise<void>((resolve) => {
      markSessionRefreshRequested = resolve;
    });
    const sessionRefresh = new Promise<Response>((resolve) => {
      resolveSessionRefresh = resolve;
    });
    const deferredCreate = new Promise<Response>((resolve) => {
      resolveCreate = resolve;
    });

    server.use(http.post(categoriesUrl, () => deferredCreate));

    const { router } = renderCategoryCreateRoute(
      undefined,
      () => {
        if (shouldHoldSessionRefresh) {
          markSessionRefreshRequested();
          return sessionRefresh;
        }
        return HttpResponse.json(publicAuthResponse());
      },
      (refetch) => {
        refetchSession = refetch;
      },
    );

    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    await userEvent.setup().type(name, "Borrador de sesión anterior");
    fireEvent.submit(screen.getByRole("form", { name: "Datos de la categoría" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Creando categoría…");

    const homeLink = within(
      screen.getByRole("navigation", { name: "Navegación principal" }),
    ).getByRole("link", { name: "Inicio" });
    await userEvent.setup().click(homeLink);
    expect(
      await screen.findByText("Espera a que termine el guardado antes de salir de esta página."),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe("/categories/new");

    shouldHoldSessionRefresh = true;
    if (!refetchSession) {
      throw new Error("The session refresh driver did not expose refetch.");
    }
    let refreshResult!: ReturnType<UseSessionResult["refetch"]>;
    act(() => {
      refreshResult = refetchSession!();
    });
    await sessionRefreshRequested;

    expect(await screen.findByRole("heading", { name: "Comprobando tu sesión" })).toBeVisible();
    expect(screen.queryByRole("form", { name: "Datos de la categoría" })).not.toBeInTheDocument();
    expect(
      screen.queryByText("Espera a que termine el guardado antes de salir de esta página."),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    resolveCreate(
      HttpResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "private details" } },
        { status: 503 },
      ),
    );
    resolveSessionRefresh(HttpResponse.json(publicAuthResponse()));
    await act(async () => refreshResult);

    expect(await screen.findByRole("heading", { level: 1, name: "Crear categoría" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Nombre (obligatorio)" })).toHaveValue("");
    expect(router.state.location.pathname).toBe("/categories/new");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Categoría creada correctamente.")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([
    {
      scenario: "a case-only name variation",
      name: "HERRAMIENTAS",
      occupiedName: "Herramientas",
      privateMessage: "The name belongs to an active category.",
    },
    {
      scenario: "surrounding whitespace around a name reserved by an inactive category",
      name: "  herramientas  ",
      occupiedName: "HERRAMIENTAS",
      privateMessage: "The name belongs to an inactive category.",
    },
  ])(
    "places $scenario conflicts beside the name without revealing the existing category state",
    async ({ name: submittedName, occupiedName, privateMessage }) => {
      const user = userEvent.setup();
      const submittedBodies: unknown[] = [];
      const conflictMessage = "Ya existe una categoría con este nombre. Elige otro nombre.";

      server.use(
        http.post(categoriesUrl, async ({ request }) => {
          const body = (await request.json()) as { name: string };
          submittedBodies.push(body);
          expect(body.name.trim().toLowerCase()).toBe(occupiedName.trim().toLowerCase());
          return HttpResponse.json(
            { error: { code: "CATEGORY_NAME_ALREADY_EXISTS", message: privateMessage } },
            { status: 409 },
          );
        }),
      );

      const { router } = renderCategoryCreateRoute();
      const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
      await user.type(name, submittedName);
      await user.click(screen.getByRole("button", { name: "Crear categoría" }));

      const error = await screen.findByText(conflictMessage);
      expect(name).toHaveValue(submittedName);
      expect(name).toHaveAttribute("aria-invalid", "true");
      expect(name).toHaveAccessibleDescription(error.textContent ?? "");
      expect(submittedBodies).toEqual([{ name: submittedName.trim() }]);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText(privateMessage)).not.toBeInTheDocument();
      expect(screen.queryByText("Categoría creada correctamente.")).not.toBeInTheDocument();
      expect(router.state.location.pathname).toBe("/categories/new");

      await user.clear(name);
      await user.type(name, "Herramientas nuevas");
      expect(screen.queryByText(conflictMessage)).not.toBeInTheDocument();
      expect(name).not.toHaveAttribute("aria-invalid", "true");
    },
  );

  it.each(creationFailureScenarios)(
    "preserves and unlocks the form after $description without retrying automatically",
    async ({ status, code, placement, expectedMessage }) => {
      const user = userEvent.setup();
      const privateMessage = "private category mutation details";
      let createRequests = 0;

      server.use(
        http.post(categoriesUrl, () => {
          createRequests += 1;
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

      const { router } = renderCategoryCreateRoute();
      const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
      const description = screen.getByRole("textbox", { name: "Descripción (opcional)" });
      await user.type(name, "Nombre local");
      await user.type(description, "Descripción local");
      await user.click(screen.getByRole("button", { name: "Crear categoría" }));

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
      expect(screen.getByRole("button", { name: "Crear categoría" })).toBeEnabled();
      expect(screen.queryByText(privateMessage)).not.toBeInTheDocument();
      expect(screen.queryByText("private field detail")).not.toBeInTheDocument();
      expect(screen.queryByText("Categoría creada correctamente.")).not.toBeInTheDocument();
      expect(router.state.location.pathname).toBe("/categories/new");
      expect(createRequests).toBe(1);

      await user.clear(name);
      await user.type(name, "Nombre corregido");
      expect(name).toHaveValue("Nombre corregido");
      expect(createRequests).toBe(1);
    },
  );

  it("shows an uncertain response error after an invalid successful creation response", async () => {
    const user = userEvent.setup();
    let createRequests = 0;

    server.use(
      http.post(categoriesUrl, () => {
        createRequests += 1;
        return HttpResponse.json(
          { data: { uuid: categoryUuid, name: "Incomplete" } },
          { status: 201 },
        );
      }),
    );

    const { router } = renderCategoryCreateRoute();
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    const description = screen.getByRole("textbox", { name: "Descripción (opcional)" });
    await user.type(name, "Nombre local");
    await user.type(description, "Descripción local");
    await user.click(screen.getByRole("button", { name: "Crear categoría" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La respuesta de creación no se pudo validar. Revisa el listado antes de volver a intentarlo.",
    );
    expect(name).toHaveValue("Nombre local");
    expect(description).toHaveValue("Descripción local");
    expect(name).toBeEnabled();
    expect(description).toBeEnabled();
    expect(screen.queryByText("Categoría creada correctamente.")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/categories/new");
    expect(createRequests).toBe(1);
  });

  it("rechecks Auth after a 401 and does not repeat category creation", async () => {
    const user = userEvent.setup();
    let mutationRejected = false;
    let sessionRefreshRequests = 0;
    let createRequests = 0;
    let resolveSessionRefresh!: (response: Response) => void;
    const sessionRefresh = new Promise<Response>((resolve) => {
      resolveSessionRefresh = resolve;
    });

    server.use(
      http.post(categoriesUrl, () => {
        createRequests += 1;
        mutationRejected = true;
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "private authentication detail" } },
          { status: 401 },
        );
      }),
    );

    renderCategoryCreateRoute(undefined, () => {
      if (mutationRejected) {
        sessionRefreshRequests += 1;
        return sessionRefresh;
      }
      return HttpResponse.json(publicAuthResponse());
    });
    await screen.findByRole("heading", { level: 1, name: "Crear categoría" });
    await user.type(screen.getByRole("textbox", { name: "Nombre (obligatorio)" }), "Nueva");
    fireEvent.submit(screen.getByRole("form", { name: "Datos de la categoría" }));

    await waitFor(() => {
      expect(createRequests).toBe(1);
      expect(sessionRefreshRequests).toBe(1);
    });
    expect(await screen.findByRole("heading", { name: "Comprobando tu sesión" })).toBeVisible();
    expect(createRequests).toBe(1);
    expect(screen.queryByRole("form", { name: "Datos de la categoría" })).not.toBeInTheDocument();
    expect(screen.queryByText("Categoría creada correctamente.")).not.toBeInTheDocument();

    resolveSessionRefresh(HttpResponse.json(publicAuthResponse()));

    expect(
      await screen.findByText(
        "La sesión se verificó, pero no se confirmó el resultado de la creación. Revisa el listado antes de volver a intentarlo.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("private authentication detail")).not.toBeInTheDocument();
    expect(createRequests).toBe(1);
  });

  it("does not carry a rejected creation result into a replacement session", async () => {
    const user = userEvent.setup();
    let mutationRejected = false;
    let sessionRefreshRequests = 0;
    let createRequests = 0;
    let resolveSessionRefresh!: (response: Response) => void;
    const sessionRefresh = new Promise<Response>((resolve) => {
      resolveSessionRefresh = resolve;
    });

    server.use(
      http.post(categoriesUrl, () => {
        createRequests += 1;
        mutationRejected = true;
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "private authentication detail" } },
          { status: 401 },
        );
      }),
    );

    renderCategoryCreateRoute(undefined, () => {
      if (mutationRejected) {
        sessionRefreshRequests += 1;
        return sessionRefresh;
      }
      return HttpResponse.json(publicAuthResponse());
    });
    await screen.findByRole("heading", { level: 1, name: "Crear categoría" });
    const name = screen.getByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.type(name, "Valor de la sesión anterior");
    fireEvent.submit(screen.getByRole("form", { name: "Datos de la categoría" }));

    await waitFor(() => expect(sessionRefreshRequests).toBe(1));
    expect(screen.queryByRole("form", { name: "Datos de la categoría" })).not.toBeInTheDocument();
    resolveSessionRefresh(
      HttpResponse.json(publicAuthResponse("OPERATOR", "replacement-category-session")),
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Crear categoría" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Nombre (obligatorio)" })).toHaveValue("");
    expect(screen.queryByText("Valor de la sesión anterior")).not.toBeInTheDocument();
    expect(screen.queryByText("Categoría creada correctamente.")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "La sesión se verificó, pero no se confirmó el resultado de la creación. Revisa el listado antes de volver a intentarlo.",
      ),
    ).not.toBeInTheDocument();
    expect(createRequests).toBe(1);
  });
});
