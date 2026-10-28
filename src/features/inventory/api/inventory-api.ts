import { httpClient } from "@/shared/api/http-client";

import type { InventoryListQuery } from "../utils/inventory-list-url-state";
import { parseInventoryListResponse, type InventoryListResponse } from "./inventory-contract";

export const listInventory = async (
  params: InventoryListQuery,
  signal?: AbortSignal,
): Promise<InventoryListResponse> => {
  const response = await httpClient.request<unknown>({
    path: "/inventory",
    method: "GET",
    params,
    signal,
  });

  return parseInventoryListResponse(response);
};
