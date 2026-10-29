export const isRetryableInventoryListError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null || !("kind" in error)) {
    return false;
  }

  if (error.kind === "network") {
    return true;
  }

  return (
    error.kind === "http" &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 500 &&
    error.status < 600
  );
};

export const isForbiddenInventoryListError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "kind" in error &&
  error.kind === "http" &&
  "status" in error &&
  error.status === 403;
