import { useMutation, useQueryClient } from "@tanstack/react-query";

import { isCurrentSession } from "@/features/auth";

import { createCategory } from "../api/categories-api";

export const useCreateCategory = (sessionId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["categories", "mutation", sessionId, "create"] as const,
    mutationFn: createCategory,
    retry: false,
    onSuccess: () => {
      if (sessionId === null || !isCurrentSession(sessionId)) {
        return;
      }

      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["categories", "management-list", sessionId],
          refetchType: "none",
        }),
        queryClient.invalidateQueries({
          queryKey: ["categories", "active-list", sessionId],
          refetchType: "none",
        }),
      ]);
    },
  });
};
