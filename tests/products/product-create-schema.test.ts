import { describe, expect, it } from "vitest";

import { productCreateSchema } from "@/features/products/schemas/product-create.schema";

const validProduct = {
  sku: "SKU-001",
  name: "Mesa de trabajo",
  description: "",
  purchasePrice: "0",
  salePrice: "0",
  categoryUuid: "550e8400-e29b-41d4-a716-446655440000",
};

describe("product creation schema", () => {
  it("accepts an empty optional description when required fields are valid", () => {
    expect(productCreateSchema.safeParse(validProduct).success).toBe(true);
  });

  it.each([
    { field: "sku", value: "   " },
    { field: "name", value: "  " },
    { field: "purchasePrice", value: "  " },
    { field: "salePrice", value: "  " },
    { field: "categoryUuid", value: "" },
  ] as const)("requires a valid $field", ({ field, value }) => {
    const result = productCreateSchema.safeParse({ ...validProduct, [field]: value });

    expect(result.success).toBe(false);
  });
});
