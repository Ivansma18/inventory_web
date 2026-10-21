import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, useNavigate, type RouteObject } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { components } from "@/shared/api/generated/auth-contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppLayout } from "@/app/layouts/app-layout";
import { SessionBoundary } from "@/app/layouts/session-boundary";
import { UiProvider } from "@/app/providers/ui.provider";
import { useCategoryOperations, type CategoryOperation } from "@/features/categories";
import { createQueryClient } from "@/shared/api/query-client";
import { server } from "../mocks/server";

const sessionId = "category-operations-session";
const operation: CategoryOperation = {
  id: "operation-1",
  sessionId,
  uuid: "550e8400-e29b-41d4-a716-446655440000",
  previousIsActive: true,
  requestedIsActive: false,
  phase: "pending",
};

const publicAuthResponse = (): components["schemas"]["PublicAuthResponse"] => ({
  data: {
    user: { id: "category-operations-user", email: "operator@example.com", role: "OPERATOR" },
    session: { id: sessionId, createdAt: "2026-01-01T00:00:00.000Z" },
  },
});

interface RegisterOperationPageProps {
  onRegisterEffect: () => void;
}

const RegisterOperationPage = ({ onRegisterEffect }: RegisterOperationPageProps) => {
  const navigate = useNavigate();
  const { operations, registerOperation, setOperationPhase } = useCategoryOperations();

  useEffect(() => {
    onRegisterEffect();
    registerOperation(operation);
  }, [onRegisterEffect, registerOperation]);

  return (
    <section>
      <h1>Operación de categoría</h1>
      <output data-testid="category-operations">{JSON.stringify(operations)}</output>
      <button onClick={() => setOperationPhase(operation.id, "uncertain")} type="button">
        Actualizar fase
      </button>
      <button onClick={() => void navigate("/other-page")} type="button">
        Ir a otra página
      </button>
    </section>
  );
};

const ReadOperationPage = () => {
  const { operations } = useCategoryOperations();

  return (
    <section>
      <h1>Otra página</h1>
      <output data-testid="category-operations">{JSON.stringify(operations)}</output>
    </section>
  );
};

const createRouteObjects = (onRegisterEffect: () => void) =>
  [
    {
      path: "/",
      element: (
        <SessionBoundary>
          <AppLayout />
        </SessionBoundary>
      ),
      children: [
        {
          path: "categories-operation-test",
          element: <RegisterOperationPage onRegisterEffect={onRegisterEffect} />,
        },
        { path: "other-page", Component: ReadOperationPage },
      ],
    },
  ] satisfies RouteObject[];

const routeResources: Array<{
  queryClient: ReturnType<typeof createQueryClient>;
  router: ReturnType<typeof createMemoryRouter>;
}> = [];

afterEach(() => {
  for (const { queryClient, router } of routeResources.splice(0)) {
    router.dispose();
    queryClient.clear();
  }
});

describe("CategoryOperationsProvider", () => {
  it("keeps one session-scoped operation record above the Outlet under StrictMode navigation", async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    const onRegisterEffect = vi.fn();
    const router = createMemoryRouter(createRouteObjects(onRegisterEffect), {
      initialEntries: ["/categories-operation-test"],
    });
    routeResources.push({ queryClient, router });

    server.use(http.get(/\/api\/auth\/get-session/, () => HttpResponse.json(publicAuthResponse())));

    render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <UiProvider>
            <RouterProvider router={router} />
          </UiProvider>
        </QueryClientProvider>
      </StrictMode>,
    );

    await screen.findByRole("heading", { name: "Operación de categoría" });
    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId("category-operations").textContent ?? "[]")).toEqual([
        operation,
      ]);
    });
    expect(onRegisterEffect).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole("button", { name: "Actualizar fase" }));
    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId("category-operations").textContent ?? "[]")).toEqual([
        { ...operation, phase: "uncertain" },
      ]);
    });

    await user.click(screen.getByRole("button", { name: "Ir a otra página" }));
    expect(await screen.findByRole("heading", { name: "Otra página" })).toBeVisible();
    expect(JSON.parse(screen.getByTestId("category-operations").textContent ?? "[]")).toEqual([
      { ...operation, phase: "uncertain" },
    ]);
    expect(router.state.location.pathname).toBe("/other-page");
    expect(screen.getByTestId("category-operations").textContent).not.toContain('"name"');
  });
});
