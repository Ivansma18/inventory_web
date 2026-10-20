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
    const result = productCreateSchema.safeParse(validProduct);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.purchasePrice).toBe(0);
      expect(result.data.salePrice).toBe(0);
    }
  });

  it("converts comma and point decimals without requiring sale price to exceed purchase price", () => {
    const result = productCreateSchema.safeParse({
      ...validProduct,
      purchasePrice: "20,50",
      salePrice: "10.25",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.purchasePrice).toBe(20.5);
      expect(result.data.salePrice).toBe(10.25);
    }
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

  it.each([
    ["purchasePrice", "1.234", "El precio de compra admite como máximo dos decimales."],
    ["salePrice", "-1", "El precio de venta no puede ser negativo."],
    ["purchasePrice", "1.234,56", "No mezcles coma y punto ni uses separadores de miles."],
  ] as const)("identifies an invalid %s value", (field, value, message) => {
    const result = productCreateSchema.safeParse({ ...validProduct, [field]: value });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: [field], message }),
      );
    }
  });
});
