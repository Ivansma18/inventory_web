import * as z from "zod";

import type { components } from "@/shared/api/generated/category-contracts";

export type Category = components["schemas"]["Category"];
export type CategoryListResponse = components["schemas"]["CategoryListResponse"];
export type CategoryCreatePayload = components["schemas"]["CreateCategory"];
export type CategoryUpdatePayload = components["schemas"]["UpdateCategory"];
export type CategoryInformationUpdatePayload = Pick<CategoryUpdatePayload, "name" | "description">;

export const categoryUuidSchema = z.uuid();

const categorySchema = z.object({
  uuid: categoryUuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
}) satisfies z.ZodType<Category>;

const categoryListResponseSchema = z.object({
  data: z.array(categorySchema),
  pagination: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  }),
}) satisfies z.ZodType<CategoryListResponse>;
const categoryDataResponseSchema = z.object({ data: categorySchema });

export interface CategoryResponseExpectation {
  uuid?: string;
  isActive?: boolean;
}

export class CategoryResponseContractError extends Error {
  readonly kind = "contract";

  constructor() {
    super("The categories server returned a malformed successful response.");
    this.name = "CategoryResponseContractError";
  }
}

export const parseCategoryListResponse = (value: unknown): CategoryListResponse => {
  const result = categoryListResponseSchema.safeParse(value);

  if (!result.success) {
    throw new CategoryResponseContractError();
  }

  return result.data;
};

export const parseCategoryDataResponse = (
  value: unknown,
  expected: CategoryResponseExpectation = {},
): Category => {
  const result = categoryDataResponseSchema.safeParse(value);

  if (!result.success) {
    throw new CategoryResponseContractError();
  }

  const category = result.data.data;

  if (
    (expected.uuid !== undefined && category.uuid !== expected.uuid) ||
    (expected.isActive !== undefined && category.isActive !== expected.isActive)
  ) {
    throw new CategoryResponseContractError();
  }

  return category;
};
