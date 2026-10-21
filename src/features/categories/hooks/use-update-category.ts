import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateCategory } from "../api/categories-api";
import { categoryDetailQueryKey } from "./use-category";

export const useUpdateCategory = (sessionId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["categories", "mutation", sessionId, "update"] as const,
    mutationFn: updateCategory,
    retry: false,
    onSuccess: (_category, variables) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["categories", "management-list", sessionId],
          refetchType: "none",
        }),
        queryClient.invalidateQueries({
          queryKey: ["categories", "active-list", sessionId],
          refetchType: "none",
        }),
        queryClient.invalidateQueries({
          queryKey: categoryDetailQueryKey(sessionId, variables.uuid),
          exact: true,
          refetchType: "none",
        }),
      ]),
  });
};
