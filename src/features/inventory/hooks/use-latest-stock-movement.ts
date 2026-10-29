import { useQuery } from "@tanstack/react-query";

import { getLatestStockMovement } from "../api/latest-movement-api";

export const latestStockMovementQueryKey = (sessionId: string | null, productUuid: string) =>
  ["inventory", "latest-movement", sessionId, productUuid] as const;

export const useLatestStockMovement = (sessionId: string | null, productUuid: string) =>
  useQuery({
    queryKey: latestStockMovementQueryKey(sessionId, productUuid),
    queryFn: ({ signal }) => getLatestStockMovement(productUuid, signal),
    enabled: sessionId !== null,
    retry: false,
  });
