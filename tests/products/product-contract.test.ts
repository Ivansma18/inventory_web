import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { components, paths } from "@/shared/api/generated/product-contracts";
import { describe, expect, it } from "vitest";

import {
  parseProductDataResponse,
  parseProductListResponse,
  ProductResponseContractError,
} from "@/features/products/api/product-contract";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const snapshot = JSON.parse(
  readFileSync(resolve(projectRoot, "tests/contracts/products.openapi.json"), "utf8"),
) as {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, unknown>>;
  components: Record<string, Record<string, unknown>>;
};

const generatedListQuery: NonNullable<paths["/products"]["get"]["parameters"]["query"]> = {
  page: 1,
  limit: 15,
  isActive: "true",
  sort: "name",
  order: "asc",
};

const generatedProduct: components["schemas"]["Product"] = {
  uuid: "550e8400-e29b-41d4-a716-446655440001",
  sku: "SKU-001",
  name: "Producto 001",
  description: null,
  purchasePrice: 25.5,
  salePrice: 31.25,
  categoryUuid: "550e8400-e29b-41d4-a716-446655440000",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const generatedProductList: components["schemas"]["ProductListResponse"] = {
  data: [generatedProduct],
  pagination: { total: 1, page: 1, limit: 15 },
};
const generatedProductData: components["schemas"]["ProductDataResponse"] = {
  data: generatedProduct,
};

describe("Products OpenAPI contracts", () => {
  it("snapshots only the published Products operations and preserves their security scheme", () => {
    expect(snapshot.openapi).toBe("3.0.3");
    expect(snapshot.info).toEqual({ title: "Inventory API", version: "0.1.0" });
    expect(Object.keys(snapshot.paths).sort()).toEqual(["/products", "/products/{uuid}"]);
    expect(snapshot.paths["/products"]).toMatchObject({
      get: { responses: { 200: {}, 400: {} } },
      post: { responses: { 201: {}, 401: {}, 403: {} } },
    });
    expect(snapshot.components.securitySchemes.sessionCookie).toMatchObject({
      type: "apiKey",
      in: "cookie",
      name: "better-auth.session_token",
    });
  });

  it("types the list query and response from the generated backend contracts", () => {
    expect(generatedListQuery).toEqual({
      page: 1,
      limit: 15,
      isActive: "true",
      sort: "name",
      order: "asc",
    });
    expect(generatedProductList.data[0]).toEqual(generatedProduct);
    expect(generatedProductList.pagination).toEqual({ total: 1, page: 1, limit: 15 });
  });

  it("validates list responses before returning them as confirmed product data", () => {
    expect(parseProductListResponse(generatedProductList)).toEqual(generatedProductList);
    expect(() =>
      parseProductListResponse({ data: [{ ...generatedProduct, isActive: "yes" }] }),
    ).toThrow(ProductResponseContractError);
  });

  it("validates the product data envelope before confirming a create response", () => {
    expect(parseProductDataResponse(generatedProductData)).toEqual(generatedProduct);
    expect(() => parseProductDataResponse({ data: {} })).toThrow(ProductResponseContractError);
  });
});
