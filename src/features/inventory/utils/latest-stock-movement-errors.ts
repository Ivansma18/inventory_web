import { LatestStockMovementResponseContractError } from "../api/latest-movement-contract";

const getLatestStockMovementHttpStatus = (error: unknown): number | null => {
  if (
    typeof error !== "object" ||
    error === null ||
    !("kind" in error) ||
    error.kind !== "http" ||
    !("status" in error) ||
    typeof error.status !== "number"
  ) {
    return null;
  }

  return error.status;
};

export const isRetryableLatestStockMovementError = (error: unknown): boolean => {
  if (error instanceof LatestStockMovementResponseContractError) {
    return true;
  }

  if (typeof error !== "object" || error === null || !("kind" in error)) {
    return false;
  }

  if (error.kind === "network") {
    return true;
  }

  const status = getLatestStockMovementHttpStatus(error);
  return status !== null && status >= 500 && status < 600;
};

export const isLatestStockMovementAuthenticationError = (error: unknown): boolean => {
  const status = getLatestStockMovementHttpStatus(error);
  return status === 401 || status === 403;
};

export const isForbiddenLatestStockMovementError = (error: unknown): boolean =>
  getLatestStockMovementHttpStatus(error) === 403;
