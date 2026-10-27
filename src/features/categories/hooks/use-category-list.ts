import { useQuery } from "@tanstack/react-query";

import { buildCategoryListQuery, listCategories } from "../api/categories-api";
import type { CategoryListCriteria } from "../utils/category-list-url-state";

export const categoryListQueryKey = (
  sessionId: string | null,
  params: ReturnType<typeof buildCategoryListQuery>,
) => ["categories", "management-list", sessionId, params] as const;

export const useCategoryList = (
  sessionId: string | null,
  page: number,
  criteria: CategoryListCriteria,
) => {
  const params = buildCategoryListQuery(criteria, page);

  return useQuery({
    queryKey: categoryListQueryKey(sessionId, params),
    queryFn: ({ signal }) => listCategories(params, signal),
    enabled: sessionId !== null,
  });
};
