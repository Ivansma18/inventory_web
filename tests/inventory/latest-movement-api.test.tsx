import type { components } from "@/shared/api/generated/inventory-contracts";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LatestStockMovementResponseContractError } from "@/features/inventory/api/latest-movement-contract";
import { getLatestStockMovement } from "@/features/inventory/api/latest-movement-api";
import { httpClient } from "@/shared/api/http-client";
import { server } from "../mocks/server";

const productUuid = "550e8400-e29b-41d4-a716-446655440000";
const movementUuid = "750e8400-e29b-41d4-a716-446655440000";
const movementsUrl = `https://inventory.test/api/inventory/${productUuid}/movements`;

const movement: components["schemas"]["StockMovement"] = {
  uuid: movementUuid,
  productUuid,
  type: "IN",
  quantity: 4,
  previousStock: 2,
  newStock: 6,
  reason: "Restock",
  reference: null,
  createdAt: "2026-01-02T10:00:00.000Z",
};

const movementList: components["schemas"]["StockMovementListResponse"] = {
  data: [movement],
  pagination: { total: 1, page: 1, limit: 1 },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("latest inventory movement API", () => {
  it("requests only the first movement by product with page=1 and limit=1", async () => {
    const requests: Array<{ method: string; url: URL }> = [];
    server.use(
      http.get(movementsUrl, ({ request }) => {
        requests.push({ method: request.method, url: new URL(request.url) });
        return HttpResponse.json(movementList);
      }),
    );

    await expect(getLatestStockMovement(productUuid)).resolves.toEqual(movement);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url.pathname).toBe(`/api/inventory/${productUuid}/movements`);
    expect([...requests[0]!.url.searchParams.entries()].sort()).toEqual(
      [
        ["limit", "1"],
        ["page", "1"],
      ].sort(),
    );
    expect([...requests[0]!.url.searchParams.keys()].sort()).toEqual(["limit", "page"]);
  });

  it("passes the cancellation signal through to the HTTP client", async () => {
    const requestSpy = vi.spyOn(httpClient, "request");
    server.use(http.get(movementsUrl, () => HttpResponse.json(movementList)));
    const controller = new AbortController();

    await getLatestStockMovement(productUuid, controller.signal);

    expect(requestSpy).toHaveBeenCalledWith({
      path: `/inventory/${productUuid}/movements`,
      method: "GET",
      params: { page: 1, limit: 1 },
      signal: controller.signal,
    });
  });

  it("returns null only for a valid empty response with zero total", async () => {
    server.use(
      http.get(movementsUrl, () =>
        HttpResponse.json({
          data: [],
          pagination: { total: 0, page: 1, limit: 1 },
        }),
      ),
    );

    await expect(getLatestStockMovement(productUuid)).resolves.toBeNull();
  });

  it("rejects a malformed successful response instead of treating it as empty", async () => {
    server.use(
      http.get(movementsUrl, () =>
        HttpResponse.json({
          data: [],
          pagination: { total: 1, page: 1, limit: 1 },
        }),
      ),
    );

    await expect(getLatestStockMovement(productUuid)).rejects.toBeInstanceOf(
      LatestStockMovementResponseContractError,
    );
  });

  it.each([
    {
      description: "a network error",
      response: () => HttpResponse.error(),
      expectedError: { kind: "network", message: "Unable to reach the server." },
    },
    {
      description: "a 5xx response",
      response: () => HttpResponse.json({ message: "private server detail" }, { status: 503 }),
      expectedError: { kind: "http", status: 503, message: "The request failed." },
    },
    {
      description: "a 404 response",
      response: () => HttpResponse.json({ message: "private product detail" }, { status: 404 }),
      expectedError: { kind: "http", status: 404, message: "The request failed." },
    },
  ])(
    "propagates $description instead of returning absence",
    async ({ response, expectedError }) => {
      server.use(http.get(movementsUrl, () => response()));

      await expect(getLatestStockMovement(productUuid)).rejects.toEqual(expectedError);
    },
  );
});
