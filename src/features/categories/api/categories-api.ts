import type { paths } from "@/shared/api/generated/category-contracts";
import { httpClient } from "@/shared/api/http-client";

import type { CategoryListCriteria } from "../utils/category-list-url-state";
import {
  parseCategoryDataResponse,
  parseCategoryListResponse,
  type Category,
  type CategoryCreatePayload,
  type CategoryListResponse,
} from "./category-contract";

export type CategoryListQuery = NonNullable<paths["/categories"]["get"]["parameters"]["query"]>;
export type CategoryDetailPath = NonNullable<
  paths["/categories/{uuid}"]["get"]["parameters"]["path"]
>;

export interface ActiveCategoryListCriteria {
  page: number;
  search: string;
}

export const CATEGORY_LIST_PAGE_SIZE = 15;

export const buildCategoryListQuery = (
  criteria: CategoryListCriteria,
  page: number,
): CategoryListQuery => {
  const search = criteria.search.trim();

  return {
    page,
    limit: CATEGORY_LIST_PAGE_SIZE,
    ...(search ? { search } : {}),
    isActive: criteria.status === "active" ? "true" : "false",
    sort: criteria.sort,
    order: criteria.order,
  };
};

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

export const listCategories = async (
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

export const listActiveCategories = listCategories;

export const getCategory = async (
  { uuid }: CategoryDetailPath,
  signal?: AbortSignal,
): Promise<Category> => {
  const response = await httpClient.request<unknown>({
    path: `/categories/${encodeURIComponent(uuid)}`,
    method: "GET",
    signal,
  });

  return parseCategoryDataResponse(response, { uuid });
};

export const createCategory = async (payload: CategoryCreatePayload): Promise<Category> => {
  const response = await httpClient.request<unknown, CategoryCreatePayload>({
    path: "/categories",
    method: "POST",
    data: payload,
  });

  return parseCategoryDataResponse(response);
};
