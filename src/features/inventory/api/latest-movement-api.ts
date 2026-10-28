import type { paths } from "@/shared/api/generated/inventory-contracts";
import { httpClient } from "@/shared/api/http-client";

import { parseLatestStockMovementResponse, type StockMovement } from "./latest-movement-contract";

type LatestStockMovementPath = NonNullable<
  paths["/inventory/{productUuid}/movements"]["get"]["parameters"]["path"]
>;
type LatestStockMovementQuery = NonNullable<
  paths["/inventory/{productUuid}/movements"]["get"]["parameters"]["query"]
>;

const LATEST_STOCK_MOVEMENT_QUERY = {
  page: 1,
  limit: 1,
} as const satisfies LatestStockMovementQuery;

export const getLatestStockMovement = async (
  productUuid: LatestStockMovementPath["productUuid"],
  signal?: AbortSignal,
): Promise<StockMovement | null> => {
  const response = await httpClient.request<unknown>({
    path: `/inventory/${encodeURIComponent(productUuid)}/movements`,
    method: "GET",
    params: LATEST_STOCK_MOVEMENT_QUERY,
    signal,
  });

  return parseLatestStockMovementResponse(response, {
    productUuid,
    limit: LATEST_STOCK_MOVEMENT_QUERY.limit,
  });
};
