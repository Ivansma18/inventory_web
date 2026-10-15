import type { paths } from "@/shared/api/generated/product-contracts";
import { httpClient } from "@/shared/api/http-client";

import {
  parseProductDataResponse,
  parseProductListResponse,
  type ProductCreatePayload,
  type ProductListResponse,
} from "./product-contract";

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

export const createProduct = async (payload: ProductCreatePayload) => {
  const response = await httpClient.request<unknown, ProductCreatePayload>({
    path: "/products",
    method: "POST",
    data: payload,
  });

  return parseProductDataResponse(response);
};
