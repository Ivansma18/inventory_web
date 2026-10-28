import type { components } from "@/shared/api/generated/inventory-contracts";
import { describe, expect, it } from "vitest";

import {
  InventoryResponseContractError,
  parseInventoryListResponse,
} from "@/features/inventory/api/inventory-contract";

const validInventory: components["schemas"]["Inventory"] = {
  productUuid: "550e8400-e29b-41d4-a716-446655440000",
  sku: "DSK-001",
  name: "Desk",
  categoryUuid: null,
  isActive: true,
  quantity: 2,
  minimumStock: 2,
  status: "LOW_STOCK",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const validListResponse: components["schemas"]["InventoryListResponse"] = {
  data: [validInventory],
  pagination: { total: 1, page: 1, limit: 15 },
};

const responseWithoutInventoryField = (field: string): unknown => {
  const inventory: Record<string, unknown> = { ...validInventory };
  delete inventory[field];

  return {
    data: [inventory],
    pagination: validListResponse.pagination,
  };
};

const responseWithoutPaginationField = (field: string): unknown => {
  const pagination: Record<string, unknown> = { ...validListResponse.pagination };
  delete pagination[field];

  return { data: validListResponse.data, pagination };
};

describe("Inventory list response contract", () => {
  it("accepts a complete generated response without changing its values", () => {
    expect(parseInventoryListResponse(validListResponse)).toEqual(validListResponse);
  });

  it("accepts an empty result with valid pagination", () => {
    const emptyResponse: components["schemas"]["InventoryListResponse"] = {
      data: [],
      pagination: { total: 0, page: 1, limit: 15 },
    };

    expect(parseInventoryListResponse(emptyResponse)).toEqual(emptyResponse);
  });

  it.each([
    "productUuid",
    "sku",
    "name",
    "categoryUuid",
    "isActive",
    "quantity",
    "minimumStock",
    "status",
    "updatedAt",
  ])("rejects an inventory record missing %s", (field) => {
    expect(() => parseInventoryListResponse(responseWithoutInventoryField(field))).toThrow(
      InventoryResponseContractError,
    );
  });

  it.each(["total", "page", "limit"])("rejects pagination missing %s", (field) => {
    expect(() => parseInventoryListResponse(responseWithoutPaginationField(field))).toThrow(
      InventoryResponseContractError,
    );
  });

  it.each([
    ["quantity", -1],
    ["quantity", 1.5],
    ["quantity", Number.NaN],
    ["quantity", Number.POSITIVE_INFINITY],
    ["quantity", Number.NEGATIVE_INFINITY],
    ["minimumStock", -1],
    ["minimumStock", 1.5],
    ["minimumStock", Number.NaN],
    ["minimumStock", Number.POSITIVE_INFINITY],
    ["minimumStock", Number.NEGATIVE_INFINITY],
  ] as const)("rejects invalid %s value %s", (field, value) => {
    const inventory = { ...validInventory, [field]: value };

    expect(() => parseInventoryListResponse({ ...validListResponse, data: [inventory] })).toThrow(
      InventoryResponseContractError,
    );
  });

  it.each([
    ["negative total", { total: -1, page: 1, limit: 15 }],
    ["fractional total", { total: 1.5, page: 1, limit: 15 }],
    ["non-finite total", { total: Number.POSITIVE_INFINITY, page: 1, limit: 15 }],
    ["zero page", { total: 1, page: 0, limit: 15 }],
    ["fractional page", { total: 1, page: 1.5, limit: 15 }],
    ["non-finite page", { total: 1, page: Number.NaN, limit: 15 }],
    ["zero limit", { total: 1, page: 1, limit: 0 }],
    ["fractional limit", { total: 1, page: 1, limit: 1.5 }],
    ["limit above API maximum", { total: 1, page: 1, limit: 101 }],
  ] as const)("rejects invalid pagination: %s", (_label, pagination) => {
    expect(() => parseInventoryListResponse({ ...validListResponse, pagination })).toThrow(
      InventoryResponseContractError,
    );
  });

  it("rejects an incomplete response envelope or invalid required fields", () => {
    expect(() => parseInventoryListResponse({ data: [validInventory] })).toThrow(
      InventoryResponseContractError,
    );
    expect(() => parseInventoryListResponse({ pagination: validListResponse.pagination })).toThrow(
      InventoryResponseContractError,
    );
    expect(() =>
      parseInventoryListResponse({
        ...validListResponse,
        data: [{ ...validInventory, productUuid: "not-a-uuid" }],
      }),
    ).toThrow(InventoryResponseContractError);
    expect(() =>
      parseInventoryListResponse({
        ...validListResponse,
        data: [{ ...validInventory, updatedAt: "not-a-date" }],
      }),
    ).toThrow(InventoryResponseContractError);
    expect(() =>
      parseInventoryListResponse({
        ...validListResponse,
        data: [{ ...validInventory, isActive: "true" }],
      }),
    ).toThrow(InventoryResponseContractError);
    expect(() =>
      parseInventoryListResponse({
        ...validListResponse,
        data: [{ ...validInventory, status: "UNKNOWN" }],
      }),
    ).toThrow(InventoryResponseContractError);
  });

  it.each([
    { quantity: 0, minimumStock: 0, status: "OUT_OF_STOCK" },
    { quantity: 1, minimumStock: 1, status: "LOW_STOCK" },
    { quantity: 3, minimumStock: 2, status: "IN_STOCK" },
  ] as const)("accepts status consistent with quantity and minimum: %s", (inventory) => {
    const response = {
      ...validListResponse,
      data: [{ ...validInventory, ...inventory }],
    };

    expect(parseInventoryListResponse(response).data[0]).toMatchObject(inventory);
  });

  it.each([
    { quantity: 0, minimumStock: 0, status: "LOW_STOCK" },
    { quantity: 1, minimumStock: 2, status: "IN_STOCK" },
    { quantity: 3, minimumStock: 2, status: "LOW_STOCK" },
    { quantity: 3, minimumStock: 2, status: "OUT_OF_STOCK" },
  ] as const)("rejects status inconsistent with quantity and minimum: %s", (inventory) => {
    const response = {
      ...validListResponse,
      data: [{ ...validInventory, ...inventory }],
    };

    expect(() => parseInventoryListResponse(response)).toThrow(InventoryResponseContractError);
  });

  it("rejects the entire list when one record is invalid", () => {
    const response = {
      ...validListResponse,
      data: [validInventory, { ...validInventory, quantity: -1 }],
    };

    expect(() => parseInventoryListResponse(response)).toThrow(InventoryResponseContractError);
  });
});
