export interface ProductEditNavigationIntegration {
  /** Returns a canonical destination only when the complete return query is valid. */
  resolveReturnTo: (searchParams: URLSearchParams) => string | null;
}
