import type { paths } from "@/shared/api/generated/product-contracts";
import { httpClient } from "@/shared/api/http-client";

import { parseProductListResponse, type ProductListResponse } from "./product-contract";

export type ProductListQuery = NonNullable<paths["/products"]["get"]["parameters"]["query"]>;

export const listProducts = async (
  params: ProductListQuery,
  signal?: AbortSignal,
): Promise<ProductListResponse> => {
  const response = await httpClient.request<unknown>({
    path: "/products",
    method: "GET",
    params,
    signal,
  });

  return parseProductListResponse(response);
};
