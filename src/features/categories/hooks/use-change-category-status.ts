import { useMutation, useQueryClient } from "@tanstack/react-query";

import { isCurrentSession } from "@/features/auth";

import { changeCategoryStatus, type CategoryStatusVariables } from "../api/categories-api";
import { categoryDetailQueryKey } from "./use-category";

export interface ChangeCategoryStatusMutationVariables extends CategoryStatusVariables {
  sessionId: string;
}

export const useChangeCategoryStatus = (sessionId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["categories", "mutation", sessionId, "status"] as const,
    mutationFn: ({ uuid, isActive }: ChangeCategoryStatusMutationVariables) =>
      changeCategoryStatus({ uuid, isActive }),
    retry: false,
    onSuccess: (_category, variables) => {
      if (variables.sessionId !== sessionId || !isCurrentSession(variables.sessionId)) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: ["categories", "management-list", variables.sessionId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["categories", "active-list", variables.sessionId],
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: categoryDetailQueryKey(variables.sessionId, variables.uuid),
        exact: true,
        refetchType: "none",
      });
    },
  });
};
