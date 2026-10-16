import { useMutation } from "@tanstack/react-query";

import { updateProduct } from "../api/products-api";

export const useUpdateProduct = () =>
  useMutation({
    mutationFn: updateProduct,
  });
