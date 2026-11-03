export interface ProductEditNavigationIntegration {
  /** Returns a canonical destination only when the complete return query is valid. */
  resolveReturnTo: (searchParams: URLSearchParams) => string | null;
  /** Builds route state for a confirmed edit without exposing product data. */
  createSuccessState?: (sessionId: string | null, destination: string) => object | null;
}
