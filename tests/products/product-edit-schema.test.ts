import type { components } from "@/shared/api/generated/product-contracts";
import { describe, expect, it } from "vitest";

import { productEditSchema } from "@/features/products/schemas/product-edit.schema";

const validProductEdit = {
  sku: "SKU-001",
  name: "Mesa de trabajo",
  description: "Descripción actual",
  purchasePrice: "20,50",
  salePrice: "10.25",
};

describe("product edit schema", () => {
  it.each([
    { field: "sku", value: "   ", message: "El SKU es obligatorio." },
    { field: "name", value: "  ", message: "El nombre es obligatorio." },
    {
      field: "purchasePrice",
      value: " ",
      message: "El precio de compra es obligatorio.",
    },
    {
      field: "salePrice",
      value: "-1",
      message: "El precio de venta no puede ser negativo.",
    },
    {
      field: "purchasePrice",
      value: "1.234",
      message: "El precio de compra admite como máximo dos decimales.",
    },
    {
      field: "salePrice",
      value: "1.234,56",
      message: "No mezcles coma y punto ni uses separadores de miles.",
    },
  ] as const)("applies the creation rule to $field", ({ field, value, message }) => {
    const result = productEditSchema.safeParse({ ...validProductEdit, [field]: value });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: [field], message }),
      );
    }
  });

  it("converts a cleared description to null accepted by the PATCH contract", () => {
    const result = productEditSchema.safeParse({ ...validProductEdit, description: "   " });

    expect(result.success).toBe(true);
    if (result.success) {
      const updatePayload: components["schemas"]["UpdateProduct"] = {
        description: result.data.description,
      };

      expect(updatePayload).toEqual({ description: null });
      expect(result.data.purchasePrice).toBe(20.5);
      expect(result.data.salePrice).toBe(10.25);
    }
  });

  it("preserves a non-empty description", () => {
    const result = productEditSchema.safeParse(validProductEdit);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("Descripción actual");
    }
  });
});
