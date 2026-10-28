import { useQuery } from "@tanstack/react-query";

import { listInventory } from "../api/inventory-api";
import type { InventoryListQuery } from "../utils/inventory-list-url-state";
import {
  buildInventoryListQuery,
  type InventoryListCriteria,
} from "../utils/inventory-list-url-state";

export const inventoryListQueryKey = (sessionId: string | null, params: InventoryListQuery) =>
  ["inventory", "list", sessionId, params] as const;

export const useInventoryList = (
  sessionId: string | null,
  page: number,
  criteria: InventoryListCriteria,
) => {
  const params = buildInventoryListQuery(criteria, page);

  return useQuery({
    queryKey: inventoryListQueryKey(sessionId, params),
    queryFn: ({ signal }) => listInventory(params, signal),
    enabled: sessionId !== null,
    retry: false,
  });
};
