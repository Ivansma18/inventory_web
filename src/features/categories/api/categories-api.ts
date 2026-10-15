import type { paths } from "@/shared/api/generated/category-contracts";
import { httpClient } from "@/shared/api/http-client";

import { parseCategoryListResponse, type CategoryListResponse } from "./category-contract";

export type CategoryListQuery = NonNullable<paths["/categories"]["get"]["parameters"]["query"]>;

export interface ActiveCategoryListCriteria {
  page: number;
  search: string;
}

export const CATEGORY_LIST_PAGE_SIZE = 15;

export const buildActiveCategoryListQuery = (
  criteria: ActiveCategoryListCriteria,
): CategoryListQuery => {
  const search = criteria.search.trim();

  return {
    page: criteria.page,
    limit: CATEGORY_LIST_PAGE_SIZE,
    isActive: "true",
    sort: "name",
    order: "asc",
    ...(search ? { search } : {}),
  };
};

export const listActiveCategories = async (
  params: CategoryListQuery,
  signal?: AbortSignal,
): Promise<CategoryListResponse> => {
  const response = await httpClient.request<unknown>({
    path: "/categories",
    method: "GET",
    params,
    signal,
  });

  return parseCategoryListResponse(response);
};
