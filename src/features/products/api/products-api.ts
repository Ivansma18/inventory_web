import type { paths } from "@/shared/api/generated/product-contracts";
import { httpClient } from "@/shared/api/http-client";

import {
  parseProductDataResponse,
  parseProductDeactivationResponse,
  parseProductListResponse,
  type ProductCreatePayload,
  type Product,
  type ProductListResponse,
  type ProductUpdatePayload,
  ProductResponseContractError,
} from "./product-contract";

export type ProductListQuery = NonNullable<paths["/products"]["get"]["parameters"]["query"]>;
export type ProductDetailPath = NonNullable<paths["/products/{uuid}"]["get"]["parameters"]["path"]>;
export type ProductUpdatePath = NonNullable<
  paths["/products/{uuid}"]["patch"]["parameters"]["path"]
>;

export interface ProductUpdateVariables {
  uuid: ProductUpdatePath["uuid"];
  payload: ProductUpdatePayload;
}

export interface ProductStatusVariables {
  uuid: ProductUpdatePath["uuid"];
  isActive: boolean;
}

export type ProductStatusResult = Pick<Product, "uuid" | "isActive">;

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

export const getProduct = async (
  { uuid }: ProductDetailPath,
  signal?: AbortSignal,
): Promise<Product> => {
  const response = await httpClient.request<unknown>({
    path: `/products/${encodeURIComponent(uuid)}`,
    method: "GET",
    signal,
  });

  return parseProductDataResponse(response);
};

export const createProduct = async (payload: ProductCreatePayload) => {
  const response = await httpClient.request<unknown, ProductCreatePayload>({
    path: "/products",
    method: "POST",
    data: payload,
  });

  return parseProductDataResponse(response);
};

export const updateProduct = async ({ uuid, payload }: ProductUpdateVariables) => {
  const response = await httpClient.request<unknown, ProductUpdatePayload>({
    path: `/products/${encodeURIComponent(uuid)}`,
    method: "PATCH",
    data: payload,
  });

  return parseProductDataResponse(response);
};

export const changeProductStatus = async ({
  uuid,
  isActive,
}: ProductStatusVariables): Promise<ProductStatusResult> => {
  const path = `/products/${encodeURIComponent(uuid)}`;

  if (isActive) {
    const response = await httpClient.request<unknown, ProductUpdatePayload>({
      path,
      method: "PATCH",
      data: { isActive: true },
    });
    const product = parseProductDataResponse(response);

    if (product.uuid !== uuid || !product.isActive) {
      throw new ProductResponseContractError();
    }

    return { uuid: product.uuid, isActive: product.isActive };
  }

  const response = await httpClient.request<unknown>({ path, method: "DELETE" });
  return parseProductDeactivationResponse(response, uuid);
};
