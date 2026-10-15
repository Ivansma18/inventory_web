import { useQuery } from "@tanstack/react-query";

import {
  buildActiveCategoryListQuery,
  listActiveCategories,
  type ActiveCategoryListCriteria,
} from "../api/categories-api";

export const activeCategoryListQueryKey = (
  sessionId: string | null,
  params: ReturnType<typeof buildActiveCategoryListQuery>,
) => ["categories", "active-list", sessionId, params];

export const useActiveCategories = (
  sessionId: string | null,
  criteria: ActiveCategoryListCriteria,
) => {
  const params = buildActiveCategoryListQuery(criteria);

  return useQuery({
    queryKey: activeCategoryListQueryKey(sessionId, params),
    queryFn: ({ signal }) => listActiveCategories(params, signal),
    enabled: sessionId !== null,
  });
};
