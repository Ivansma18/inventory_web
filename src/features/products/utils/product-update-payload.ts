import type { ProductUpdatePayload } from "../api/product-contract";
import type { Product } from "../api/product-contract";
import type { ProductEditFormValues } from "../schemas/product-edit.schema";

export const buildProductUpdatePayload = (
  original: Product,
  values: ProductEditFormValues,
): ProductUpdatePayload => {
  const payload: ProductUpdatePayload = {};

  if (values.sku !== original.sku) {
    payload.sku = values.sku;
  }

  if (values.name !== original.name) {
    payload.name = values.name;
  }

  if (values.description !== original.description) {
    payload.description = values.description;
  }

  if (values.purchasePrice !== original.purchasePrice) {
    payload.purchasePrice = values.purchasePrice;
  }

  if (values.salePrice !== original.salePrice) {
    payload.salePrice = values.salePrice;
  }

  if (values.categoryUuid !== null && values.categoryUuid !== original.categoryUuid) {
    payload.categoryUuid = values.categoryUuid;
  }

  return payload;
};
