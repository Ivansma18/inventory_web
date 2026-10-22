import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
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
) => {
  const queryClient = createQueryClient();
  const initialEntry = isActive ? "/categories" : "/categories?status=inactive";
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] });
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
});
