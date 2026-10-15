import { useQuery } from "@tanstack/react-query";

import type { ProductListQuery } from "../api/products-api";
import { listProducts } from "../api/products-api";

export const PRODUCT_LIST_PAGE_SIZE = 15;

export type ProductListStatus = "active" | "inactive";
export type ProductListSortField = NonNullable<ProductListQuery["sort"]>;
export type ProductListSortOrder = NonNullable<ProductListQuery["order"]>;

export interface ProductListCriteria {
  search: string;
  status: ProductListStatus;
  sort: ProductListSortField;
  order: ProductListSortOrder;
}

export const DEFAULT_PRODUCT_LIST_CRITERIA = {
  search: "",
  status: "active",
  sort: "name",
  order: "asc",
} as const satisfies ProductListCriteria;

export const buildProductListQuery = (
  criteria: ProductListCriteria,
  page: number,
): ProductListQuery => {
  const search = criteria.search.trim();

  return {
    page,
    limit: PRODUCT_LIST_PAGE_SIZE,
    ...(search ? { search } : {}),
    isActive: criteria.status === "active" ? "true" : "false",
    sort: criteria.sort,
    order: criteria.order,
  };
};

export const productListQueryKey = (sessionId: string | null, params: ProductListQuery) => [
  "products",
  "list",
  sessionId,
  params,
];

export const useProductList = (
  sessionId: string | null,
  page: number,
  criteria: ProductListCriteria,
) => {
  const params = buildProductListQuery(criteria, page);
  return useQuery({
    queryKey: productListQueryKey(sessionId, params),
    queryFn: ({ signal }) => listProducts(params, signal),
    enabled: sessionId !== null,
  });
};
