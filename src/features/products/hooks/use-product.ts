import { useQuery } from "@tanstack/react-query";

import { productUuidSchema } from "../api/product-contract";
import { getProduct } from "../api/products-api";

export const productDetailQueryKey = (sessionId: string | null, uuid: string) => [
  "products",
  "detail",
  sessionId,
  uuid,
];

export const useProduct = (sessionId: string | null, uuid: string) =>
  useQuery({
    queryKey: productDetailQueryKey(sessionId, uuid),
    queryFn: ({ signal }) => getProduct({ uuid }, signal),
    enabled: sessionId !== null && productUuidSchema.safeParse(uuid).success,
  });
