import { useQuery } from "@tanstack/react-query";

import { getLatestStockMovement } from "../api/latest-movement-api";
import { isLatestStockMovementAuthenticationError } from "../utils/latest-stock-movement-errors";

export const latestStockMovementQueryPrefix = (sessionId: string | null) =>
  ["inventory", "latest-movement", sessionId] as const;

export const latestStockMovementQueryKey = (sessionId: string | null, productUuid: string) =>
  [...latestStockMovementQueryPrefix(sessionId), productUuid] as const;

export const useLatestStockMovement = (sessionId: string | null, productUuid: string) =>
  useQuery({
    queryKey: latestStockMovementQueryKey(sessionId, productUuid),
    queryFn: ({ signal }) => getLatestStockMovement(productUuid, signal),
    enabled: sessionId !== null,
    refetchOnMount: (query) => !isLatestStockMovementAuthenticationError(query.state.error),
    retryOnMount: false,
    retry: false,
  });
