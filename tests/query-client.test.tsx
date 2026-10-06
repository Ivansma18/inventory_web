import type { PropsWithChildren } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useQuery } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";

import { QueryProvider } from "@/app/providers/query.provider";
import { httpClient } from "@/shared/api/http-client";
import { queryClient } from "@/shared/api/query-client";
import { server } from "./mocks/server";

const resourceUrl = "https://inventory.test/api/mock-resource";
const wrapper = ({ children }: PropsWithChildren) => <QueryProvider>{children}</QueryProvider>;

afterEach(() => {
  queryClient.clear();
});

describe("business Query Client", () => {
  it("uses the initial cache, retry, and refetch defaults", () => {
    const defaults = queryClient.getDefaultOptions();

    expect(defaults.queries).toMatchObject({
      staleTime: 30_000,
      retry: false,
      refetchOnWindowFocus: false,
    });
    expect(defaults.mutations).toMatchObject({ retry: false });
  });

  it("fetches and caches a response through the shared HTTP client", async () => {
    server.use(
      http.get(resourceUrl, () => HttpResponse.json({ id: "mock-1", label: "Mock resource" })),
    );

    const { result, unmount } = renderHook(
      () =>
        useQuery({
          queryKey: ["mock-resource", "mock-1"],
          queryFn: () =>
            httpClient.request<{ id: string; label: string }>({
              method: "GET",
              path: "/mock-resource",
            }),
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "mock-1", label: "Mock resource" });
    expect(queryClient.getQueryData(["mock-resource", "mock-1"])).toEqual(result.current.data);
    unmount();
  });

  it("does not retry a failed query automatically", async () => {
    let attempts = 0;
    server.use(
      http.get(resourceUrl, () => {
        attempts += 1;
        return HttpResponse.json(
          { error: { code: "UPSTREAM_FAILURE", message: "Failed." } },
          {
            status: 503,
          },
        );
      }),
    );

    const { result, unmount } = renderHook(
      () =>
        useQuery({
          queryKey: ["mock-resource", "failure"],
          queryFn: () => httpClient.request({ method: "GET", path: "/mock-resource" }),
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(attempts).toBe(1);
    unmount();
  });
});
