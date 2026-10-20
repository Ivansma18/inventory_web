import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";

import { useActiveCategories, useCategory } from "@/features/categories";
import { CategoryResponseContractError } from "@/features/categories/api/category-contract";
import { createQueryClient } from "@/shared/api/query-client";
import { server } from "../mocks/server";

const categoriesUrl = "https://inventory.test/api/categories";
const categoryUuid = "550e8400-e29b-41d4-a716-446655440000";
const sessionId = "categories-test-session";

const category = (name: string) => ({
  uuid: categoryUuid,
  name,
  description: null,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const queryClients: Array<ReturnType<typeof createQueryClient>> = [];

const createWrapper = (queryClient: ReturnType<typeof createQueryClient>) => {
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return Wrapper;
};

afterEach(() => {
  for (const queryClient of queryClients.splice(0)) {
    queryClient.clear();
  }
});

describe("public active categories query", () => {
  it("searches and requests active categories from pages beyond the first", async () => {
    const requests: URL[] = [];
    const queryClient = createQueryClient();
    queryClients.push(queryClient);

    server.use(
      http.get(categoriesUrl, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const page = Number(url.searchParams.get("page"));
        const search = url.searchParams.get("search") ?? "";

        return HttpResponse.json({
          data: [category(`Categoría ${search} ${page}`)],
          pagination: { total: 31, page, limit: 15 },
        });
      }),
    );

    const { result, rerender } = renderHook(
      ({ page, search }) => useActiveCategories(sessionId, { page, search }),
      {
        initialProps: { page: 1, search: "  tools  " },
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data[0]?.name).toBe("Categoría tools 1");
    expect(Object.fromEntries(requests[0]!.searchParams)).toEqual({
      page: "1",
      limit: "15",
      isActive: "true",
      sort: "name",
      order: "asc",
      search: "tools",
    });

    rerender({ page: 3, search: "  tools  " });

    await waitFor(() => expect(result.current.data?.pagination.page).toBe(3));
    expect(result.current.data?.data[0]?.name).toBe("Categoría tools 3");
    expect(requests).toHaveLength(2);
    expect(Object.fromEntries(requests[1]!.searchParams)).toEqual({
      page: "3",
      limit: "15",
      isActive: "true",
      sort: "name",
      order: "asc",
      search: "tools",
    });
  });

  it("exposes loading and error states and retries only after an explicit request", async () => {
    let resolveFirstResponse!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirstResponse = resolve;
    });
    let requestCount = 0;
    const queryClient = createQueryClient();
    queryClients.push(queryClient);

    server.use(
      http.get(categoriesUrl, () => {
        requestCount += 1;

        if (requestCount === 1) {
          return firstResponse;
        }

        return HttpResponse.json({
          data: [category("Herramientas")],
          pagination: { total: 1, page: 1, limit: 15 },
        });
      }),
    );

    const { result } = renderHook(() => useActiveCategories(sessionId, { page: 1, search: "" }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isPending).toBe(true);

    await act(async () => {
      resolveFirstResponse(HttpResponse.json({ error: "Unavailable" }, { status: 503 }));
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(requestCount).toBe(1);

    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data[0]?.name).toBe("Herramientas");
    expect(requestCount).toBe(2);
  });

  it("retrieves an associated category by UUID through the public API", async () => {
    const requestedUrls: URL[] = [];
    const queryClient = createQueryClient();
    queryClients.push(queryClient);

    server.use(
      http.get(`https://inventory.test/api/categories/${categoryUuid}`, ({ request }) => {
        requestedUrls.push(new URL(request.url));
        return HttpResponse.json({ data: { ...category("Oficina"), isActive: false } });
      }),
    );

    const { result } = renderHook(() => useCategory(sessionId, categoryUuid), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ ...category("Oficina"), isActive: false });
    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0]?.pathname).toBe(`/api/categories/${categoryUuid}`);
  });

  it("rejects a detail response whose UUID differs from the requested category", async () => {
    const queryClient = createQueryClient();
    queryClients.push(queryClient);

    server.use(
      http.get(`https://inventory.test/api/categories/${categoryUuid}`, () =>
        HttpResponse.json({
          data: {
            ...category("Otra categoría"),
            uuid: "550e8400-e29b-41d4-a716-446655440001",
          },
        }),
      ),
    );

    const { result } = renderHook(() => useCategory(sessionId, categoryUuid), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(CategoryResponseContractError);
  });
});
