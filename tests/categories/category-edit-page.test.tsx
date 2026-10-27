import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { components } from "@/shared/api/generated/auth-contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

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

const publicAuthResponse = (): components["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: { id: "category-edit-user", email: "operator@example.com", role: "OPERATOR" },
    session: { id: "category-edit-session", createdAt: "2026-01-01T00:00:00.000Z" },
  },
});

const category = (
  isActive: boolean,
  name = "Herramientas",
  description = "Para mantenimiento",
) => ({
  uuid: categoryUuid,
  name,
  description,
  isActive,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const listResponse = () =>
  HttpResponse.json({
    data: [category(true)],
    pagination: { total: 1, page: 1, limit: 15 },
  });

const routeResources: Array<{
  queryClient: ReturnType<typeof createQueryClient>;
  router: ReturnType<typeof createMemoryRouter>;
}> = [];

const renderCategoryEditRoute = (initialEntry = `/categories/${categoryUuid}/edit`) => {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] });
  routeResources.push({ queryClient, router });

  server.use(http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())));

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
  vi.restoreAllMocks();
  for (const { queryClient, router } of routeResources.splice(0)) {
    router.dispose();
    queryClient.clear();
  }
});

describe("category edit page", () => {
  it("preserves long values and retries with the exact safe PATCH payload", async () => {
    const user = userEvent.setup();
    const rawName = `  ${"Categoría editada con nombre extenso ".repeat(65)}  `;
    const expectedName = rawName.trim();
    const longDescription = "Descripción detallada para almacenamiento y logística. ".repeat(150);
    const privateMessage = "backend-secret-update-message-5d41";
    const privateFieldDetail = "backend-secret-update-field-3e89";
    const privateStack = "backend-secret-update-stack-a60f";
    const expectedPayload = { name: expectedName, description: longDescription };
    const requestBodies: unknown[] = [];
    const consoleSpies = [
      vi.spyOn(console, "debug").mockImplementation(() => {}),
      vi.spyOn(console, "info").mockImplementation(() => {}),
      vi.spyOn(console, "warn").mockImplementation(() => {}),
      vi.spyOn(console, "error").mockImplementation(() => {}),
      vi.spyOn(console, "log").mockImplementation(() => {}),
    ];

    server.use(
      http.get(categoryUrl, () => HttpResponse.json({ data: category(false) })),
      http.patch(categoryUrl, async ({ request }) => {
        requestBodies.push(await request.json());

        if (requestBodies.length === 1) {
          return HttpResponse.json(
            {
              error: {
                code: "VALIDATION_ERROR",
                message: privateMessage,
                fieldErrors: { description: [privateFieldDetail] },
                stack: privateStack,
              },
            },
            { status: 400 },
          );
        }

        return HttpResponse.json({ data: category(false, expectedName, longDescription) });
      }),
    );

    const { router } = renderCategoryEditRoute();
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    const description = screen.getByRole("textbox", { name: "Descripción (opcional)" });
    fireEvent.change(name, { target: { value: rawName } });
    fireEvent.change(description, { target: { value: longDescription } });

    expect(name).toHaveValue(rawName);
    expect(description).toHaveValue(longDescription);
    expect(name).not.toHaveAttribute("maxLength");
    expect(description).not.toHaveAttribute("maxLength");

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El servidor rechazó los datos enviados. Revisa el formulario e inténtalo de nuevo.",
    );
    expect(name).toHaveValue(rawName);
    expect(description).toHaveValue(longDescription);
    expect(requestBodies).toEqual([expectedPayload]);
    expect(screen.queryByText(privateMessage)).not.toBeInTheDocument();
    expect(screen.queryByText(privateFieldDetail)).not.toBeInTheDocument();
    expect(screen.queryByText(privateStack)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Categoría actualizada correctamente.")).toBeVisible();
    expect(router.state.location.pathname).toBe("/categories");
    expect(requestBodies).toEqual([expectedPayload, expectedPayload]);
    expect(screen.queryByText(privateMessage)).not.toBeInTheDocument();

    const loggedOutput = consoleSpies
      .flatMap((spy) => spy.mock.calls)
      .map((call) =>
        call
          .map((value) =>
            value instanceof Error
              ? `${value.message} ${value.stack ?? ""}`
              : (JSON.stringify(value) ?? String(value)),
          )
          .join(" "),
      )
      .join("\n");
    for (const sentinel of [privateMessage, privateFieldDetail, privateStack]) {
      expect(loggedOutput).not.toContain(sentinel);
    }
  });

  it("keeps fields unavailable during the initial request and fills them when it resolves", async () => {
    const detail = deferred<Response>();
    const requestStarted = deferred<void>();

    server.use(
      http.get(categoryUrl, () => {
        requestStarted.resolve();
        return detail.promise;
      }),
    );

    renderCategoryEditRoute();
    expect(await screen.findByText("Cargando datos de la categoría…")).toBeVisible();
    await requestStarted.promise;
    expect(screen.queryByRole("textbox", { name: "Nombre (obligatorio)" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Descripción (opcional)" }),
    ).not.toBeInTheDocument();

    await act(async () => {
      detail.resolve(HttpResponse.json({ data: category(true) }));
    });

    expect(await screen.findByRole("textbox", { name: "Nombre (obligatorio)" })).toHaveValue(
      "Herramientas",
    );
    expect(screen.getByRole("textbox", { name: "Descripción (opcional)" })).toHaveValue(
      "Para mantenimiento",
    );
    expect(screen.getByText("Activa")).toBeVisible();
  });

  it.each([true, false])("loads editable values for an %s category", async (isActive) => {
    const user = userEvent.setup();
    server.use(http.get(categoryUrl, () => HttpResponse.json({ data: category(isActive) })));

    renderCategoryEditRoute();

    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    expect(name).toBeEnabled();
    expect(name).toHaveValue("Herramientas");
    expect(screen.getByRole("textbox", { name: "Descripción (opcional)" })).toHaveValue(
      "Para mantenimiento",
    );
    expect(screen.getByText(isActive ? "Activa" : "Inactiva")).toBeVisible();

    await user.clear(name);
    await user.type(name, "Nombre actualizado localmente");
    expect(name).toHaveValue("Nombre actualizado localmente");
  });

  it("preserves edited values and dirty state when refreshed details arrive", async () => {
    const user = userEvent.setup();
    let detailRequests = 0;
    server.use(
      http.get(categoryUrl, () => {
        detailRequests += 1;
        return HttpResponse.json({
          data:
            detailRequests === 1
              ? category(false)
              : category(false, "Nombre remoto", "Descripción remota"),
        });
      }),
    );

    const { queryClient } = renderCategoryEditRoute();
    const name = await screen.findByRole("textbox", { name: "Nombre (obligatorio)" });
    const description = screen.getByRole("textbox", { name: "Descripción (opcional)" });
    const saveButton = screen.getByRole("button", { name: "Guardar cambios" });

    await user.clear(name);
    await user.type(name, "Nombre local");
    await user.clear(description);
    await user.type(description, "Descripción local");
    expect(saveButton).toBeEnabled();

    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: ["categories", "detail", "category-edit-session", categoryUuid],
        exact: true,
      });
    });

    expect(detailRequests).toBe(2);
    expect(name).toHaveValue("Nombre local");
    expect(description).toHaveValue("Descripción local");
    expect(saveButton).toBeEnabled();
  });

  it("shows an invalid-address state without requesting a category", async () => {
    let detailRequests = 0;
    server.use(
      http.get(/\/api\/categories\/.+/, () => {
        detailRequests += 1;
        return HttpResponse.json({ data: category(true) });
      }),
    );

    renderCategoryEditRoute("/categories/not-a-uuid/edit");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La dirección de la categoría no es válida.",
    );
    expect(screen.getByRole("button", { name: "Volver al listado" })).toBeVisible();
    expect(detailRequests).toBe(0);
  });

  it("returns to the validated source after an invalid category address", async () => {
    const user = userEvent.setup();
    const sourceListUrl =
      "/categories?page=2&search=oficina&status=inactive&sort=createdAt&order=desc";
    server.use(
      http.get(categoriesUrl, ({ request }) =>
        HttpResponse.json({
          data: [category(true)],
          pagination: {
            total: 16,
            page: Number(new URL(request.url).searchParams.get("page")),
            limit: 15,
          },
        }),
      ),
    );

    const route = `/categories/not-a-uuid/edit?${new URLSearchParams({ returnTo: sourceListUrl })}`;
    const { router } = renderCategoryEditRoute(route);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La dirección de la categoría no es válida.",
    );
    await user.click(screen.getByRole("button", { name: "Volver al listado" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Categorías" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/categories");
    expect(router.state.location.search).toBe(sourceListUrl.slice("/categories".length));
  });

  it.each([
    ["missing", ""],
    ["external", `?${new URLSearchParams({ returnTo: "https://attacker.test/categories" })}`],
    ["malformed", `?${new URLSearchParams({ returnTo: "/categories?page=0" })}`],
    [
      "duplicated",
      `?${new URLSearchParams({ returnTo: "/categories?page=2" })}&returnTo=%2Fcategories%3Fpage%3D3`,
    ],
  ])("uses the default list when the %s return origin is provided", async (_case, search) => {
    const user = userEvent.setup();
    server.use(
      http.get(categoriesUrl, () =>
        HttpResponse.json({ data: [], pagination: { total: 0, page: 1, limit: 15 } }),
      ),
    );

    const { router } = renderCategoryEditRoute(`/categories/not-a-uuid/edit${search}`);
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Volver al listado" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Categorías" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/categories");
    expect(router.state.location.search).toBe("?page=1&status=active&sort=name&order=asc");
  });

  it("offers a return to the default list when the category is not found", async () => {
    const user = userEvent.setup();
    let detailRequests = 0;
    server.use(
      http.get(categoryUrl, () => {
        detailRequests += 1;
        return HttpResponse.json(
          { error: { code: "CATEGORY_NOT_FOUND", message: "Missing" } },
          { status: 404 },
        );
      }),
      http.get(categoriesUrl, listResponse),
    );

    const { router } = renderCategoryEditRoute();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se encontró la categoría.");
    expect(screen.getByRole("button", { name: "Volver al listado" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    expect(detailRequests).toBe(1);

    await user.click(screen.getByRole("button", { name: "Volver al listado" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/categories"));
    expect(router.state.location.search).toBe("?page=1&status=active&sort=name&order=asc");
  });

  it("returns to the validated source after a category is not found", async () => {
    const user = userEvent.setup();
    const sourceListUrl =
      "/categories?page=4&search=ferreteria&status=inactive&sort=name&order=asc";
    server.use(
      http.get(categoryUrl, () =>
        HttpResponse.json(
          { error: { code: "CATEGORY_NOT_FOUND", message: "Missing" } },
          { status: 404 },
        ),
      ),
      http.get(categoriesUrl, ({ request }) =>
        HttpResponse.json({
          data: [category(false)],
          pagination: {
            total: 46,
            page: Number(new URL(request.url).searchParams.get("page")),
            limit: 15,
          },
        }),
      ),
    );

    const route = `/categories/${categoryUuid}/edit?${new URLSearchParams({ returnTo: sourceListUrl })}`;
    const { router } = renderCategoryEditRoute(route);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se encontró la categoría.");
    await user.click(screen.getByRole("button", { name: "Volver al listado" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Categorías" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/categories");
    expect(router.state.location.search).toBe(sourceListUrl.slice("/categories".length));
  });

  it.each(["network", "server"] as const)(
    "allows retrying a category load after a %s failure",
    async (failureKind) => {
      const user = userEvent.setup();
      let detailRequests = 0;
      server.use(
        http.get(categoryUrl, () => {
          detailRequests += 1;

          if (detailRequests === 1) {
            return failureKind === "network"
              ? HttpResponse.error()
              : HttpResponse.json(
                  { error: { code: "INTERNAL_ERROR", message: "Unavailable" } },
                  { status: 503 },
                );
          }

          return HttpResponse.json({ data: category(false) });
        }),
      );

      renderCategoryEditRoute();

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "No se pudo cargar la categoría por un problema de conexión o del servidor.",
      );
      expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
      expect(detailRequests).toBe(1);

      await user.click(screen.getByRole("button", { name: "Reintentar" }));

      expect(await screen.findByRole("textbox", { name: "Nombre (obligatorio)" })).toHaveValue(
        "Herramientas",
      );
      expect(screen.getByText("Inactiva")).toBeVisible();
      expect(detailRequests).toBe(2);
    },
  );
});
