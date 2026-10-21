import type { Category } from "../api/category-contract";
import type { CategoryInformationUpdatePayload } from "../api/category-contract";
import type { CategoryFormValues } from "../schemas/category-form.schema";

export const buildCategoryUpdatePayload = (
  original: Category,
  values: CategoryFormValues,
): CategoryInformationUpdatePayload | null => {
  const payload: CategoryInformationUpdatePayload = {};

  if (values.name !== original.name) {
    payload.name = values.name;
  }

  const originalDescription = original.description ?? "";
  if (values.description !== originalDescription) {
    payload.description = values.description === "" ? null : values.description;
  }

  return Object.keys(payload).length > 0 ? payload : null;
};
