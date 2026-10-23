import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CategoryOperationsProvider } from "@/features/categories/providers/category-operations.provider";
import { useActiveCategories } from "@/features/categories/hooks/use-active-categories";
import { useCategory } from "@/features/categories/hooks/use-category";
import { useCategoryList } from "@/features/categories/hooks/use-category-list";
import { createQueryClient } from "@/shared/api/query-client";
import { server } from "../mocks/server";

const authSession = vi.hoisted(() => ({
  currentSessionId: null as string | null,
  useSession: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  useSession: authSession.useSession,
  isCurrentSession: (sessionId: string) => authSession.currentSessionId === sessionId,
}));

const categoriesUrl = "https://inventory.test/api/categories";
const categoryUuid = "550e8400-e29b-41d4-a716-446655440000";

interface DeferredResponse {
  promise: Promise<Response>;
  resolve: (response: Response) => void;
}

const deferredResponse = (): DeferredResponse => {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

const category = (name: string, isActive: boolean) => ({
  uuid: categoryUuid,
  name,
  description: null,
  isActive,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
});

const authenticatedSession = (id: string) => ({
  status: "authenticated",
  session: { id, createdAt: "2026-01-01T00:00:00.000Z" },
});

const setSession = (sessionId: string | null) => {
  authSession.currentSessionId = sessionId;
  authSession.useSession.mockReturnValue(
    sessionId === null ? { status: "unauthenticated" } : authenticatedSession(sessionId),
  );
};

const CategoryQueries = () => {
  const session = authSession.useSession();
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const list = useCategoryList(sessionId, 1, {
    search: "",
    status: "inactive",
    sort: "name",
    order: "asc",
  });
  const detail = useCategory(sessionId, categoryUuid);
  const options = useActiveCategories(sessionId, { page: 1, search: "" });

  return (
    <div>
      <span data-testid="management-category">{list.data?.data[0]?.name ?? ""}</span>
      <span data-testid="detail-category">{detail.data?.name ?? ""}</span>
      <span data-testid="active-category">{options.data?.data[0]?.name ?? ""}</span>
    </div>
  );
};

const createTree = (queryClient: ReturnType<typeof createQueryClient>): ReactElement => (
  <QueryClientProvider client={queryClient}>
    <CategoryOperationsProvider>
      <CategoryQueries />
    </CategoryOperationsProvider>
  </QueryClientProvider>
);

const renderedRoutes: Array<{
  queryClient: ReturnType<typeof createQueryClient>;
  unmount: () => void;
}> = [];

afterEach(() => {
  for (const route of renderedRoutes.splice(0)) {
    route.unmount();
    route.queryClient.clear();
  }
});

describe("category query session scope", () => {
  it("cancels and removes the previous session queries when the session changes", async () => {
    const queryClient = createQueryClient();
    const managementResponses = [deferredResponse(), deferredResponse()];
    const activeResponses = [deferredResponse(), deferredResponse()];
    const detailResponses = [deferredResponse(), deferredResponse()];
    const requestCounts = { management: 0, active: 0, detail: 0 };

    server.use(
      http.get(categoriesUrl, ({ request }) => {
        const isActive = new URL(request.url).searchParams.get("isActive") === "true";
        if (isActive) {
          const index = requestCounts.active++;
          return activeResponses[index]!.promise;
        }

        const index = requestCounts.management++;
        return managementResponses[index]!.promise;
      }),
      http.get(`${categoriesUrl}/${categoryUuid}`, () => {
        const index = requestCounts.detail++;
        return detailResponses[index]!.promise;
      }),
    );

    setSession("session-a");
    const route = render(createTree(queryClient));
    renderedRoutes.push({ queryClient, unmount: route.unmount });

    await waitFor(() => {
      expect(requestCounts).toEqual({ management: 1, active: 1, detail: 1 });
    });
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .map((query) => query.queryKey),
    ).toEqual(
      expect.arrayContaining([
        expect.arrayContaining(["categories", "management-list", "session-a"]),
        expect.arrayContaining(["categories", "active-list", "session-a"]),
        ["categories", "detail", "session-a", categoryUuid],
      ]),
    );
    const sessionAQueries = queryClient
      .getQueryCache()
      .getAll()
      .filter((query) => query.queryKey[0] === "categories" && query.queryKey[2] === "session-a");
    expect(sessionAQueries).toHaveLength(3);
    expect(sessionAQueries.every((query) => query.state.fetchStatus === "fetching")).toBe(true);

    setSession("session-b");
    route.rerender(createTree(queryClient));

    await waitFor(() => {
      expect(requestCounts).toEqual({ management: 2, active: 2, detail: 2 });
      expect(
        queryClient.getQueryCache().findAll({
          predicate: ({ queryKey }) => queryKey[0] === "categories" && queryKey[2] === "session-a",
        }),
      ).toHaveLength(0);
      expect(sessionAQueries.every((query) => query.state.fetchStatus === "idle")).toBe(true);
    });

    expect(screen.getByTestId("management-category")).toBeEmptyDOMElement();
    expect(screen.getByTestId("detail-category")).toBeEmptyDOMElement();
    expect(screen.getByTestId("active-category")).toBeEmptyDOMElement();
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .filter((query) => query.queryKey[0] === "categories")
        .every((query) => query.queryKey[2] === "session-b"),
    ).toBe(true);

    managementResponses[1]!.resolve(
      HttpResponse.json({
        data: [category("Gestión sesión B", false)],
        pagination: { total: 1, page: 1, limit: 15 },
      }),
    );
    activeResponses[1]!.resolve(
      HttpResponse.json({
        data: [category("Opciones sesión B", true)],
        pagination: { total: 1, page: 1, limit: 15 },
      }),
    );
    detailResponses[1]!.resolve(HttpResponse.json({ data: category("Detalle sesión B", true) }));

    expect(await screen.findByText("Gestión sesión B")).toBeVisible();
    expect(screen.getByText("Detalle sesión B")).toBeVisible();
    expect(screen.getByText("Opciones sesión B")).toBeVisible();

    managementResponses[0]!.resolve(
      HttpResponse.json({
        data: [category("Gestión sesión A atrasada", false)],
        pagination: { total: 1, page: 1, limit: 15 },
      }),
    );
    activeResponses[0]!.resolve(
      HttpResponse.json({
        data: [category("Opciones sesión A atrasadas", true)],
        pagination: { total: 1, page: 1, limit: 15 },
      }),
    );
    detailResponses[0]!.resolve(
      HttpResponse.json({ data: category("Detalle sesión A atrasado", true) }),
    );

    await waitFor(() => {
      expect(screen.queryByText(/sesión A/)).not.toBeInTheDocument();
      expect(screen.getByText("Gestión sesión B")).toBeVisible();
      expect(screen.getByText("Detalle sesión B")).toBeVisible();
      expect(screen.getByText("Opciones sesión B")).toBeVisible();
    });
  });

  it("cancels and removes pending session queries when the session is lost", async () => {
    const queryClient = createQueryClient();
    const managementResponse = deferredResponse();
    const activeResponse = deferredResponse();
    const detailResponse = deferredResponse();
    const requestCounts = { management: 0, active: 0, detail: 0 };

    server.use(
      http.get(categoriesUrl, ({ request }) => {
        const isActive = new URL(request.url).searchParams.get("isActive") === "true";
        requestCounts[isActive ? "active" : "management"] += 1;
        return isActive ? activeResponse.promise : managementResponse.promise;
      }),
      http.get(`${categoriesUrl}/${categoryUuid}`, () => {
        requestCounts.detail += 1;
        return detailResponse.promise;
      }),
    );

    setSession("session-a");
    const route = render(createTree(queryClient));
    renderedRoutes.push({ queryClient, unmount: route.unmount });
    await waitFor(() => expect(requestCounts).toEqual({ management: 1, active: 1, detail: 1 }));

    const sessionAQueries = queryClient
      .getQueryCache()
      .getAll()
      .filter((query) => query.queryKey[0] === "categories" && query.queryKey[2] === "session-a");
    expect(sessionAQueries).toHaveLength(3);
    expect(sessionAQueries.every((query) => query.state.fetchStatus === "fetching")).toBe(true);

    setSession(null);
    route.rerender(createTree(queryClient));

    await waitFor(() => {
      expect(
        queryClient.getQueryCache().findAll({
          predicate: ({ queryKey }) => queryKey[0] === "categories" && queryKey[2] === "session-a",
        }),
      ).toHaveLength(0);
      expect(sessionAQueries.every((query) => query.state.fetchStatus === "idle")).toBe(true);
    });
    expect(screen.getByTestId("management-category")).toBeEmptyDOMElement();
    expect(screen.getByTestId("detail-category")).toBeEmptyDOMElement();
    expect(screen.getByTestId("active-category")).toBeEmptyDOMElement();

    managementResponse.resolve(
      HttpResponse.json({
        data: [category("Gestión obsoleta", false)],
        pagination: { total: 1, page: 1, limit: 15 },
      }),
    );
    activeResponse.resolve(
      HttpResponse.json({
        data: [category("Opciones obsoletas", true)],
        pagination: { total: 1, page: 1, limit: 15 },
      }),
    );
    detailResponse.resolve(HttpResponse.json({ data: category("Detalle obsoleto", true) }));

    await waitFor(() => {
      expect(screen.queryByText(/obsolet/)).not.toBeInTheDocument();
      expect(screen.getByTestId("management-category")).toBeEmptyDOMElement();
      expect(screen.getByTestId("detail-category")).toBeEmptyDOMElement();
      expect(screen.getByTestId("active-category")).toBeEmptyDOMElement();
    });
  });
});
