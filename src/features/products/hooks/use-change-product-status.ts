import { useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";

import { changeProductStatus, type ProductStatusVariables } from "../api/products-api";
import { productListQueryPrefix } from "./use-product-list";

const productStatusMutationKey = (sessionId: string | null) =>
  ["products", "status", sessionId] as const;

export interface ChangeProductStatusMutationVariables extends ProductStatusVariables {
  sessionId: string | null;
}

export const useChangeProductStatus = (sessionId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: productStatusMutationKey(sessionId),
    mutationFn: ({ uuid, isActive }: ChangeProductStatusMutationVariables) =>
      changeProductStatus({ uuid, isActive }),
    onSuccess: (_result, variables) => {
      if (variables.sessionId !== null) {
        void queryClient.invalidateQueries({
          queryKey: productListQueryPrefix(variables.sessionId),
        });
      }
    },
  });
};

export const usePendingProductStatusUuids = (sessionId: string | null) =>
  useMutationState({
    filters: { mutationKey: productStatusMutationKey(sessionId), status: "pending" },
    select: (currentMutation) =>
      (currentMutation.state.variables as ChangeProductStatusMutationVariables | undefined)?.uuid,
  });
