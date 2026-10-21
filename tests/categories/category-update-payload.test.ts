import type { Category } from "@/features/categories/api/category-contract";
import {
  categoryFormSchema,
  type CategoryFormValues,
} from "@/features/categories/schemas/category-form.schema";
import { describe, expect, it } from "vitest";

import { buildCategoryUpdatePayload } from "@/features/categories/utils/category-update-payload";

const originalCategory: Category = {
  uuid: "550e8400-e29b-41d4-a716-446655440000",
  name: "Herramientas",
  description: "Para mantenimiento",
  isActive: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const validatedValues = (values: { name: string; description: string }): CategoryFormValues =>
  categoryFormSchema.parse(values);

describe("buildCategoryUpdatePayload", () => {
  it("trims the validated name and omits unchanged fields", () => {
    const values = validatedValues({
      name: "  Herramientas nuevas  ",
      description: "Para mantenimiento",
    });

    expect(values.name).toBe("Herramientas nuevas");
    expect(buildCategoryUpdatePayload(originalCategory, values)).toEqual({
      name: "Herramientas nuevas",
    });
  });

  it("sends null to remove an existing description without changing category state", () => {
    const payload = buildCategoryUpdatePayload(
      originalCategory,
      validatedValues({ name: "Herramientas", description: "" }),
    );

    expect(payload).toEqual({ description: null });
    expect(payload).not.toHaveProperty("isActive");
  });

  it("treats an empty description as unchanged when the original value was null", () => {
    const categoryWithoutDescription = { ...originalCategory, description: null };

    expect(
      buildCategoryUpdatePayload(
        categoryWithoutDescription,
        validatedValues({ name: "Herramientas", description: "" }),
      ),
    ).toBeNull();
  });

  it("returns no update when the form matches the original snapshot", () => {
    expect(
      buildCategoryUpdatePayload(
        originalCategory,
        validatedValues({
          name: originalCategory.name,
          description: originalCategory.description!,
        }),
      ),
    ).toBeNull();
  });
});
