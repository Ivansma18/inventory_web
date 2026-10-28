import type { components } from "@/shared/api/generated/inventory-contracts";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InventoryResponseContractError } from "@/features/inventory/api/inventory-contract";
import { listInventory } from "@/features/inventory/api/inventory-api";
import {
  buildInventoryListQuery,
  DEFAULT_INVENTORY_LIST_CRITERIA,
} from "@/features/inventory/utils/inventory-list-url-state";
import { httpClient } from "@/shared/api/http-client";
import { server } from "../mocks/server";

const inventoryUrl = "https://inventory.test/api/inventory";
const productUuid = "550e8400-e29b-41d4-a716-446655440000";

const inventory: components["schemas"]["Inventory"] = {
  productUuid,
  sku: "DSK-001",
  name: "Desk",
  categoryUuid: null,
  isActive: true,
  quantity: 2,
  minimumStock: 2,
  status: "LOW_STOCK",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const inventoryList: components["schemas"]["InventoryListResponse"] = {
  data: [inventory],
  pagination: { total: 1, page: 1, limit: 15 },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("inventory list API", () => {
  it("sends a GET with the explicit default parameters and parses the complete response", async () => {
    const requests: Array<{ method: string; url: URL }> = [];
    server.use(
      http.get(inventoryUrl, ({ request }) => {
        requests.push({ method: request.method, url: new URL(request.url) });
        return HttpResponse.json(inventoryList);
      }),
    );

    const params = buildInventoryListQuery(DEFAULT_INVENTORY_LIST_CRITERIA, 1);
    const result = await listInventory(params);

    expect(result).toEqual(inventoryList);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url.pathname).toBe("/api/inventory");
    expect([...requests[0]!.url.searchParams.entries()].sort()).toEqual(
      [
        ["isActive", "true"],
        ["limit", "15"],
        ["order", "asc"],
        ["page", "1"],
        ["sort", "name"],
      ].sort(),
    );
    expect(requests[0]?.url.searchParams.has("search")).toBe(false);
    expect(requests[0]?.url.searchParams.has("status")).toBe(false);
  });

  it("forwards filtered query parameters and the caller's cancellation signal", async () => {
    const requestSpy = vi.spyOn(httpClient, "request");
    const requests: URL[] = [];
    server.use(
      http.get(inventoryUrl, ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json(inventoryList);
      }),
    );

    const controller = new AbortController();
    const params = buildInventoryListQuery(
      {
        search: "  desk  ",
        status: "inactive",
        stockStatus: "LOW_STOCK",
        sort: "minimumStock",
        order: "desc",
      },
      3,
    );

    await listInventory(params, controller.signal);

    expect(requestSpy).toHaveBeenCalledWith({
      path: "/inventory",
      method: "GET",
      params,
      signal: controller.signal,
    });
    expect(requests).toHaveLength(1);
    expect(Object.fromEntries(requests[0]!.searchParams)).toEqual({
      page: "3",
      limit: "15",
      search: "desk",
      isActive: "false",
      status: "LOW_STOCK",
      sort: "minimumStock",
      order: "desc",
    });
  });

  it("rejects the entire response when an inventory row violates the runtime contract", async () => {
    server.use(
      http.get(inventoryUrl, () =>
        HttpResponse.json({
          ...inventoryList,
          data: [inventory, { ...inventory, productUuid: "invalid-uuid" }],
        }),
      ),
    );

    await expect(
      listInventory(buildInventoryListQuery(DEFAULT_INVENTORY_LIST_CRITERIA, 1)),
    ).rejects.toBeInstanceOf(InventoryResponseContractError);
  });

  it("propagates normalized HTTP errors without exposing server response details", async () => {
    const privateMessage = "internal database connection details";
    server.use(
      http.get(inventoryUrl, () => HttpResponse.json({ message: privateMessage }, { status: 503 })),
    );

    const error = await listInventory(
      buildInventoryListQuery(DEFAULT_INVENTORY_LIST_CRITERIA, 1),
    ).catch((caught: unknown) => caught);

    expect(error).toEqual({ kind: "http", status: 503, message: "The request failed." });
    expect(JSON.stringify(error)).not.toContain(privateMessage);
  });

  it("propagates a normalized network error", async () => {
    server.use(http.get(inventoryUrl, () => HttpResponse.error()));

    await expect(
      listInventory(buildInventoryListQuery(DEFAULT_INVENTORY_LIST_CRITERIA, 1)),
    ).rejects.toEqual({ kind: "network", message: "Unable to reach the server." });
  });
});
