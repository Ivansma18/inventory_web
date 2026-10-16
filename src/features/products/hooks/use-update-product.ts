import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateProduct } from "../api/products-api";
import { productListQueryPrefix } from "./use-product-list";

export const useUpdateProduct = (sessionId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProduct,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: productListQueryPrefix(sessionId),
        refetchType: "none",
      }),
  });
};
