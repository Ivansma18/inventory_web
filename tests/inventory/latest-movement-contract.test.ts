import type { components } from "@/shared/api/generated/inventory-contracts";
import { describe, expect, it } from "vitest";

import {
  LatestStockMovementResponseContractError,
  parseLatestStockMovementResponse,
} from "@/features/inventory/api/latest-movement-contract";

const productUuid = "550e8400-e29b-41d4-a716-446655440000";
const expected = { productUuid, limit: 1 };

const validMovement: components["schemas"]["StockMovement"] = {
  uuid: "550e8400-e29b-41d4-a716-446655440001",
  productUuid,
  type: "ADJUSTMENT",
  quantity: 5,
  previousStock: 2,
  newStock: 5,
  reason: "Inventory count",
  reference: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const validResponse: components["schemas"]["StockMovementListResponse"] = {
  data: [validMovement],
  pagination: { total: 1, page: 1, limit: 1 },
};

describe("latest stock movement response contract", () => {
  it("accepts a generated response and returns its movement unchanged", () => {
    expect(parseLatestStockMovementResponse(validResponse, expected)).toEqual(validMovement);
  });

  it.each(["IN", "OUT", "ADJUSTMENT"] as const)("accepts the %s movement type", (type) => {
    const movement = { ...validMovement, type };
    const response = { ...validResponse, data: [movement] };

    expect(parseLatestStockMovementResponse(response, expected)).toEqual(movement);
  });

  it("returns null only when the response successfully confirms there are no movements", () => {
    const emptyResponse: components["schemas"]["StockMovementListResponse"] = {
      data: [],
      pagination: { total: 0, page: 1, limit: 1 },
    };

    expect(parseLatestStockMovementResponse(emptyResponse, expected)).toBeNull();
  });

  it.each([
    ["quantity", -1],
    ["quantity", 1.5],
    ["quantity", Number.NaN],
    ["quantity", Number.POSITIVE_INFINITY],
    ["quantity", Number.NEGATIVE_INFINITY],
    ["previousStock", -1],
    ["previousStock", 1.5],
    ["newStock", -1],
    ["newStock", 1.5],
  ] as const)("rejects invalid %s value %s", (field, value) => {
    const movement = { ...validMovement, [field]: value };
    const response = { ...validResponse, data: [movement] };

    expect(() => parseLatestStockMovementResponse(response, expected)).toThrow(
      LatestStockMovementResponseContractError,
    );
  });

  it.each([
    "uuid",
    "productUuid",
    "type",
    "quantity",
    "previousStock",
    "newStock",
    "reason",
    "reference",
    "createdAt",
  ])("rejects a movement missing %s", (field) => {
    const movement: Record<string, unknown> = { ...validMovement };
    delete movement[field];

    expect(() =>
      parseLatestStockMovementResponse({ ...validResponse, data: [movement] }, expected),
    ).toThrow(LatestStockMovementResponseContractError);
  });

  it("rejects invalid UUID, type, and creation date instead of substituting inventory update time", () => {
    expect(() =>
      parseLatestStockMovementResponse(
        { ...validResponse, data: [{ ...validMovement, uuid: "not-a-uuid" }] },
        expected,
      ),
    ).toThrow(LatestStockMovementResponseContractError);
    expect(() =>
      parseLatestStockMovementResponse(
        { ...validResponse, data: [{ ...validMovement, type: "UNKNOWN" }] },
        expected,
      ),
    ).toThrow(LatestStockMovementResponseContractError);
    expect(() =>
      parseLatestStockMovementResponse(
        { ...validResponse, data: [{ ...validMovement, createdAt: "not-a-date" }] },
        expected,
      ),
    ).toThrow(LatestStockMovementResponseContractError);
  });

  it("rejects a movement that belongs to another product", () => {
    const foreignMovement = {
      ...validMovement,
      productUuid: "550e8400-e29b-41d4-a716-446655440002",
    };

    expect(() =>
      parseLatestStockMovementResponse({ ...validResponse, data: [foreignMovement] }, expected),
    ).toThrow(LatestStockMovementResponseContractError);
  });

  it("rejects more returned movements than requested", () => {
    const secondMovement = {
      ...validMovement,
      uuid: "550e8400-e29b-41d4-a716-446655440003",
    };

    expect(() =>
      parseLatestStockMovementResponse(
        { ...validResponse, data: [validMovement, secondMovement] },
        expected,
      ),
    ).toThrow(LatestStockMovementResponseContractError);
  });

  it("rejects pagination whose limit does not match the requested limit", () => {
    expect(() =>
      parseLatestStockMovementResponse(
        { ...validResponse, pagination: { ...validResponse.pagination, limit: 2 } },
        expected,
      ),
    ).toThrow(LatestStockMovementResponseContractError);
  });

  it("rejects a response for a page other than the requested first page", () => {
    expect(() =>
      parseLatestStockMovementResponse(
        { ...validResponse, pagination: { ...validResponse.pagination, page: 2 } },
        expected,
      ),
    ).toThrow(LatestStockMovementResponseContractError);
  });

  it.each([
    ["empty data with a positive total", [], 1],
    ["movement data with a zero total", [validMovement], 0],
  ] as const)("rejects %s", (_scenario, data, total) => {
    const response = {
      ...validResponse,
      data,
      pagination: { ...validResponse.pagination, total },
    };

    expect(() => parseLatestStockMovementResponse(response, expected)).toThrow(
      LatestStockMovementResponseContractError,
    );
  });

  it.each([
    ["negative total", { total: -1, page: 1, limit: 1 }],
    ["fractional total", { total: 1.5, page: 1, limit: 1 }],
    ["zero page", { total: 1, page: 0, limit: 1 }],
    ["zero limit", { total: 1, page: 1, limit: 0 }],
    ["limit over API maximum", { total: 1, page: 1, limit: 101 }],
  ] as const)("rejects invalid pagination: %s", (_scenario, pagination) => {
    expect(() =>
      parseLatestStockMovementResponse({ ...validResponse, pagination }, expected),
    ).toThrow(LatestStockMovementResponseContractError);
  });
});
