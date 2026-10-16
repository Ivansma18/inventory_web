import * as z from "zod";

import type { components } from "@/shared/api/generated/product-contracts";

export type Product = components["schemas"]["Product"];
export type ProductListResponse = components["schemas"]["ProductListResponse"];
export type ProductCreatePayload = components["schemas"]["CreateProduct"];
export type ProductUpdatePayload = components["schemas"]["UpdateProduct"];

export const productUuidSchema = z.uuid();

const priceSchema = z
  .number()
  .finite()
  .nonnegative()
  .refine((price) => Math.abs(price * 100 - Math.round(price * 100)) <= 1e-8);

const productSchema = z.object({
  uuid: productUuidSchema,
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  purchasePrice: priceSchema,
  salePrice: priceSchema,
  categoryUuid: productUuidSchema.nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
}) satisfies z.ZodType<Product>;

const productListResponseSchema = z.object({
  data: z.array(productSchema),
  pagination: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  }),
}) satisfies z.ZodType<ProductListResponse>;
const productDataResponseSchema = z.object({ data: productSchema });

export class ProductResponseContractError extends Error {
  readonly kind = "contract";

  constructor() {
    super("The products server returned a malformed successful response.");
    this.name = "ProductResponseContractError";
  }
}

export const parseProductListResponse = (value: unknown): ProductListResponse => {
  const result = productListResponseSchema.safeParse(value);

  if (!result.success) {
    throw new ProductResponseContractError();
  }

  return result.data;
};

export const parseProductDataResponse = (value: unknown): Product => {
  const result = productDataResponseSchema.safeParse(value);

  if (!result.success) {
    throw new ProductResponseContractError();
  }

  return result.data.data;
};
