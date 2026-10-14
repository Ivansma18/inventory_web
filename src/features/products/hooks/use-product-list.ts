import { useQuery } from "@tanstack/react-query";

import type { ProductListQuery } from "../api/products-api";
import { listProducts } from "../api/products-api";

export const PRODUCT_LIST_PAGE_SIZE = 15;

const productListDefaults = {
  limit: PRODUCT_LIST_PAGE_SIZE,
  isActive: "true",
  sort: "name",
  order: "asc",
} as const satisfies Omit<ProductListQuery, "page">;

export const useProductList = (sessionId: string | null, page: number) => {
  const params = { ...productListDefaults, page } satisfies ProductListQuery;

  return useQuery({
    queryKey: ["products", "list", sessionId, params],
    queryFn: ({ signal }) => listProducts(params, signal),
    enabled: sessionId !== null,
  });
};
