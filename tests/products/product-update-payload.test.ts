import type { Product } from "@/features/products/api/product-contract";
import type { ProductEditFormValues } from "@/features/products/schemas/product-edit.schema";
import { describe, expect, it } from "vitest";

import { buildProductUpdatePayload } from "@/features/products/utils/product-update-payload";

const originalProduct: Product = {
  uuid: "650e8400-e29b-41d4-a716-446655440000",
  sku: "SKU-001",
  name: "Mesa de trabajo",
  description: "Descripción actual",
  purchasePrice: 20.5,
  salePrice: 30,
  categoryUuid: "550e8400-e29b-41d4-a716-446655440000",
  isActive: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const originalFormValues: ProductEditFormValues = {
  sku: originalProduct.sku,
  name: originalProduct.name,
  description: originalProduct.description,
  purchasePrice: originalProduct.purchasePrice,
  salePrice: originalProduct.salePrice,
  categoryUuid: originalProduct.categoryUuid,
};

describe("buildProductUpdatePayload", () => {
  it("includes only fields that differ from the original product snapshot", () => {
    const payload = buildProductUpdatePayload(originalProduct, {
      ...originalFormValues,
      sku: "SKU-002",
      description: null,
      salePrice: 35,
      categoryUuid: "550e8400-e29b-41d4-a716-446655440001",
    });

    expect(payload).toEqual({
      sku: "SKU-002",
      description: null,
      salePrice: 35,
      categoryUuid: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(payload).not.toHaveProperty("isActive");
  });

  it("returns an empty payload when normalized values match the snapshot", () => {
    expect(buildProductUpdatePayload(originalProduct, originalFormValues)).toEqual({});
  });

  it("does not attempt to remove a category by serializing null", () => {
    const payload = buildProductUpdatePayload(originalProduct, {
      ...originalFormValues,
      categoryUuid: null,
    });

    expect(payload).not.toHaveProperty("categoryUuid");
  });

  it("keeps a legacy product without a category unchanged", () => {
    const uncategorizedProduct = { ...originalProduct, categoryUuid: null };
    const uncategorizedValues = { ...originalFormValues, categoryUuid: null };

    expect(buildProductUpdatePayload(uncategorizedProduct, uncategorizedValues)).toEqual({});
  });
});
