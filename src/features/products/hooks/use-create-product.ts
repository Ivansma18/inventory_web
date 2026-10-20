import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createProduct } from "../api/products-api";
import { productListQueryPrefix } from "./use-product-list";

export const useCreateProduct = (sessionId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: productListQueryPrefix(sessionId),
        refetchType: "none",
      }),
  });
};
